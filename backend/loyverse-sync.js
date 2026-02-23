/**
 * Loyverse POS sync: fetch receipts from Loyverse API and insert into orders/order_items.
 * Run twice daily. Uses receipt_number as unique key to avoid duplicates.
 */

const https = require('https');

const LOYVERSE_API_BASE = 'https://api.loyverse.com/v1.0';
const RECEIPTS_PATH = '/v1.0/receipts';
const MAX_PER_PAGE = 250;

/**
 * Fetch one page of receipts from Loyverse API.
 * Free plan allows only last 31 days; use created_at_min to avoid 402 PAYMENT_REQUIRED.
 * @param {string} token - Bearer token
 * @param {string} [cursor] - Pagination cursor
 * @returns {Promise<{ receipts: any[], cursor?: string }>}
 */
function fetchReceiptsPage(token, cursor = null) {
    return new Promise((resolve, reject) => {
        const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const path = cursor
            ? `${RECEIPTS_PATH}?limit=${MAX_PER_PAGE}&created_at_min=${encodeURIComponent(dateFrom)}&cursor=${encodeURIComponent(cursor)}`
            : `${RECEIPTS_PATH}?limit=${MAX_PER_PAGE}&created_at_min=${encodeURIComponent(dateFrom)}`;
        const options = {
            hostname: 'api.loyverse.com',
            path: path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode !== 200) {
                        reject(new Error(json.message || json.error || `HTTP ${res.statusCode}: ${data}`));
                        return;
                    }
                    resolve({
                        receipts: json.receipts || [],
                        cursor: json.cursor || null
                    });
                } catch (e) {
                    reject(new Error(`Invalid JSON: ${e.message}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

/**
 * Fetch all receipts (all pages).
 * @param {string} token
 * @returns {Promise<any[]>}
 */
async function fetchAllReceipts(token) {
    const all = [];
    let cursor = null;
    do {
        const { receipts, cursor: next } = await fetchReceiptsPage(token, cursor);
        all.push(...(receipts || []));
        cursor = next;
    } while (cursor);
    return all;
}

/**
 * Build map SKU -> dish_id from menu_items.
 * @param {object} db - { query }
 * @returns {Promise<Map<string, string>>}
 */
async function getSkuToDishIdMap(db) {
    const result = await db.query(
        'SELECT dish_id, sku FROM menu_items WHERE sku IS NOT NULL AND sku <> \'\''
    );
    const map = new Map();
    for (const row of result.rows) {
        map.set(String(row.sku).trim(), row.dish_id);
    }
    return map;
}

/**
 * Normalize Loyverse line item to { sku, quantity, price }.
 * API may use "price" or "unit_price" and quantity.
 */
function normalizeLineItem(item) {
    if (!item || item.quantity == null) return null;
    const qty = Number(item.quantity);
    if (!Number.isFinite(qty) || qty <= 0) return null;
    const rawPrice = item.price ?? item.unit_price ?? 0;
    const priceVal = typeof rawPrice === 'object' && rawPrice != null && rawPrice.amount != null ? rawPrice.amount : rawPrice;
    const price = Number(priceVal);
    if (!Number.isFinite(price) || price < 0) return null;
    const sku = item.sku != null ? String(item.sku).trim() : null;
    return { sku, quantity: qty, price: Math.round(price) };
}

/**
 * Insert one Loyverse receipt as order + order_items. Skips if receipt_number already exists.
 * @param {object} db - { query, pool }
 * @param {Map<string, string>} skuToDishId
 * @param {object} receipt - Loyverse receipt: receipt_number, created_at, total_money, line_items
 * @returns {Promise<{ inserted: boolean, orderId?: number, skippedReason?: string }>}
 */
async function insertLoyverseReceipt(db, skuToDishId, receipt) {
    const receiptNumber = receipt.receipt_number;
    if (!receiptNumber) {
        return { inserted: false, skippedReason: 'missing receipt_number' };
    }

    const existing = await db.query(
        'SELECT id FROM orders WHERE receipt_number = $1',
        [String(receiptNumber)]
    );
    if (existing.rows.length > 0) {
        return { inserted: false, skippedReason: 'duplicate receipt_number' };
    }

    const createdAt = receipt.created_at || new Date().toISOString();
    const totalMoney = receipt.total_money;
    const totalRaw = totalMoney != null && typeof totalMoney === 'object' && totalMoney.amount != null
        ? totalMoney.amount
        : totalMoney;
    const total = totalRaw != null ? Math.round(Number(totalRaw)) : 0;
    const lineItems = Array.isArray(receipt.line_items) ? receipt.line_items : [];
    const normalizedItems = lineItems.map(normalizeLineItem).filter(Boolean);

    const publicId = `loyverse_${receiptNumber}`;
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const orderResult = await client.query(
            `INSERT INTO orders (public_id, receipt_number, customer_name, customer_phone, communication, created_at, status, total, type)
             VALUES ($1, $2, '', '', '', $3, 'completed', $4, 'DINE IN')
             RETURNING id`,
            [publicId, String(receiptNumber), createdAt, total]
        );
        const orderId = orderResult.rows[0].id;

        for (const item of normalizedItems) {
            const dishId = item.sku ? skuToDishId.get(item.sku) : null;
            if (!dishId) {
                continue;
            }
            await client.query(
                `INSERT INTO order_items (order_id, dish_id, quantity, price)
                 VALUES ($1, $2, $3, $4)`,
                [orderId, dishId, item.quantity, item.price]
            );
        }

        await client.query('COMMIT');
        return { inserted: true, orderId };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Run full sync: fetch all receipts from Loyverse, insert new ones (by unique receipt_number).
 * @param {object} db - db module
 * @param {string} token - Loyverse API Bearer token
 * @returns {Promise<{ fetched: number, inserted: number, skipped: number, errors: string[] }>}
 */
async function syncLoyverseReceipts(db, token) {
    const result = { fetched: 0, inserted: 0, skipped: 0, errors: [] };
    let receipts = [];
    try {
        receipts = await fetchAllReceipts(token);
    } catch (err) {
        result.errors.push(`Loyverse API: ${err.message}`);
        return result;
    }
    result.fetched = receipts.length;

    const skuToDishId = await getSkuToDishIdMap(db);

    for (const receipt of receipts) {
        try {
            const out = await insertLoyverseReceipt(db, skuToDishId, receipt);
            if (out.inserted) result.inserted++;
            else result.skipped++;
        } catch (err) {
            result.errors.push(`Receipt ${receipt.receipt_number || '?'}: ${err.message}`);
        }
    }
    return result;
}

module.exports = {
    fetchReceiptsPage,
    fetchAllReceipts,
    getSkuToDishIdMap,
    insertLoyverseReceipt,
    syncLoyverseReceipts
};
