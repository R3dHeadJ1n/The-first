/**
 * Restaurant Analytics - Sales performance and dish popularity
 * Only includes orders where status = "Completed"
 * Revenue from orders.total (order date), NOT accrual logic
 */
(function () {
    'use strict';

    let BACKEND_URL;
    const CURRENCY = 'THB';

    let chartDaily = null;
    let chartTopDishes = null;
    let ordersCache = [];
    let menuItemsCache = [];
    let menuItemsMap = null; // dish_id -> menuItem for O(1) lookup

    const dateFromEl = document.getElementById('dateFrom');
    const dateToEl = document.getElementById('dateTo');
    const categoryFilterEl = document.getElementById('categoryFilter');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const backToDashboardEl = document.getElementById('backToDashboard');
    const kpiTotalRevenue = document.getElementById('kpiTotalRevenue');
    const kpiTotalOrders = document.getElementById('kpiTotalOrders');
    const kpiAOV = document.getElementById('kpiAOV');
    const kpiDishesSold = document.getElementById('kpiDishesSold');
    const topDishesBody = document.querySelector('#topDishesTable tbody');
    const analyticsEmptyEl = document.getElementById('analyticsEmpty');
    const toastEl = document.getElementById('analyticsToast');

    /**
     * Parse date string to local Date (timezone-safe, no UTC shift)
     */
    function parseLocalDate(dateStr) {
        if (!dateStr) return null;
        if (typeof dateStr === 'string' && dateStr.length >= 10) {
            const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
            return new Date(y, m - 1, d);
        }
        const d = new Date(dateStr);
        return Number.isNaN(d.valueOf()) ? null : d;
    }

    /**
     * Format date for display (YYYY-MM-DD)
     */
    function formatDate(date) {
        if (!date || !(date instanceof Date)) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /**
     * Get all dates in range [from, to] inclusive
     */
    function getDatesInRange(from, to) {
        const dates = [];
        const fromDate = parseLocalDate(from);
        const toDate = parseLocalDate(to);
        if (!fromDate || !toDate || toDate < fromDate) return dates;
        const current = new Date(fromDate);
        while (current <= toDate) {
            dates.push(formatDate(current));
            current.setDate(current.getDate() + 1);
        }
        return dates;
    }

    /**
     * Build menuItems map by dish_id for O(1) lookup
     */
    function buildMenuMap(items) {
        const map = new Map();
        if (!items || !Array.isArray(items)) return map;
        for (const mi of items) {
            const id = String(mi.id || mi.dish_id || '');
            if (id) map.set(id, mi);
        }
        return map;
    }

    /**
     * Core: getAnalyticsData(orders, orderItems, menuItems, filters)
     * Process orders client-side with efficient Maps/objects
     */
    function getAnalyticsData(orders, menuItems, filters) {
        const {
            dateFrom = '',
            dateTo = '',
            category = '',
            status = 'completed'
        } = filters || {};

        const result = {
            totalRevenue: 0,
            totalOrders: 0,
            totalDishesSold: 0,
            aov: 0,
            dailyRevenue: {}, // { "YYYY-MM-DD": number }
            topDishes: [],    // [{ dish_id, name, category, quantity, revenue, avgPrice }]
            topDishesByQty: [] // top 10 for bar chart
        };

        if (!orders || !Array.isArray(orders)) return result;

        const menuMap = buildMenuMap(menuItems);
        const statusLower = String(status || 'completed').toLowerCase();
        const fromDate = parseLocalDate(dateFrom);
        const toDate = parseLocalDate(dateTo);
        const hasDateFilter = fromDate && toDate && toDate >= fromDate;

        // Filter completed orders
        let filteredOrders = orders.filter(o => {
            const s = String(o.status || '').toLowerCase();
            if (s !== statusLower) return false;
            if (hasDateFilter && o.createdAt) {
                const orderDate = parseLocalDate(o.createdAt);
                if (!orderDate) return false;
                const dateStr = formatDate(orderDate);
                if (dateStr < formatDate(fromDate) || dateStr > formatDate(toDate)) return false;
            }
            return true;
        });

        // Build order lookup by id for joining order_items
        const orderMap = new Map();
        for (const o of filteredOrders) {
            orderMap.set(o.id, o);
        }

        // Flatten order_items from orders (orders already have items embedded)
        const orderItems = [];
        for (const o of filteredOrders) {
            const items = o.items || [];
            for (const it of items) {
                orderItems.push({
                    order_id: o.id,
                    dish_id: it.dish_id || it.dishId,
                    quantity: Number(it.quantity) || 0,
                    price: Number(it.price) || 0,
                    subtotal: Number(it.subtotal) ?? (Number(it.quantity) || 0) * (Number(it.price) || 0),
                    order_created_at: o.createdAt,
                    order_total: Number(o.total) || 0
                });
            }
        }

        // Apply category filter to order items (affects dish-level metrics only)
        let itemsForDishes = orderItems;
        if (category) {
            const catLower = String(category).toLowerCase();
            itemsForDishes = orderItems.filter(it => {
                const mi = menuMap.get(String(it.dish_id || ''));
                const itemCategory = (mi && mi.category) ? String(mi.category).toLowerCase() : '';
                return itemCategory === catLower;
            });
        }

        // Aggregate total revenue from orders.total (CRITICAL: NOT from order_items)
        for (const o of filteredOrders) {
            result.totalRevenue += Number(o.total) || 0;
        }
        result.totalOrders = filteredOrders.length;
        result.aov = result.totalOrders > 0 ? result.totalRevenue / result.totalOrders : 0;

        // Total dishes sold (from order_items of filtered orders)
        for (const it of orderItems) {
            result.totalDishesSold += it.quantity;
        }

        // Daily revenue: group by DATE(created_at), sum orders.total
        const dailyMap = new Map();
        for (const o of filteredOrders) {
            if (!o.createdAt) continue;
            const orderDate = parseLocalDate(o.createdAt);
            if (!orderDate) continue;
            const dateStr = formatDate(orderDate);
            const prev = dailyMap.get(dateStr) || 0;
            dailyMap.set(dateStr, prev + (Number(o.total) || 0));
        }
        result.dailyRevenue = Object.fromEntries(dailyMap);

        // Top dishes: aggregate by dish_id
        const dishAgg = new Map(); // dish_id -> { quantity, revenue }
        for (const it of itemsForDishes) {
            const did = String(it.dish_id || '');
            if (!did) continue;
            let agg = dishAgg.get(did);
            if (!agg) {
                agg = { quantity: 0, revenue: 0 };
                dishAgg.set(did, agg);
            }
            agg.quantity += it.quantity;
            agg.revenue += it.subtotal;
        }

        result.topDishes = Array.from(dishAgg.entries()).map(([dish_id, agg]) => {
            const mi = menuMap.get(dish_id);
            const name = (mi && mi.name) || dish_id || 'Unknown';
            const itemCategory = (mi && mi.category) || '';
            const avgPrice = agg.quantity > 0 ? agg.revenue / agg.quantity : 0;
            return {
                dish_id,
                name,
                category: itemCategory,
                quantity: agg.quantity,
                revenue: agg.revenue,
                avgPrice
            };
        });

        result.topDishes.sort((a, b) => b.quantity - a.quantity);
        result.topDishesByQty = result.topDishes.slice(0, 10);

        return result;
    }

    function formatNum(n) {
        return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0 });
    }

    function formatMoney(n) {
        return formatNum(n) + ' ' + CURRENCY;
    }

    function renderKPIs(data) {
        kpiTotalRevenue.textContent = formatMoney(data.totalRevenue);
        kpiTotalOrders.textContent = formatNum(data.totalOrders);
        kpiAOV.textContent = formatMoney(data.aov);
        kpiDishesSold.textContent = formatNum(data.totalDishesSold);
    }

    function renderDailyChart(dailyRevenue, dateFrom, dateTo) {
        const ctx = document.getElementById('dailyRevenueChart');
        if (!ctx) return;

        const days = getDatesInRange(dateFrom, dateTo);
        const labels = days;
        const values = days.map(d => dailyRevenue[d] || 0);

        if (chartDaily) chartDaily.destroy();

        chartDaily = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Revenue (THB)',
                    data: values,
                    borderColor: '#f28a2f',
                    backgroundColor: 'rgba(242, 138, 47, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { maxRotation: 45 }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { callback: v => formatNum(v) + ' THB' }
                    }
                }
            }
        });
    }

    function renderTopDishesChart(topDishesByQty) {
        const ctx = document.getElementById('topDishesChart');
        if (!ctx) return;

        const labels = topDishesByQty.map(d => d.name);
        const values = topDishesByQty.map(d => d.quantity);

        if (chartTopDishes) chartTopDishes.destroy();

        chartTopDishes = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Quantity Sold',
                    data: values,
                    backgroundColor: 'rgba(242, 138, 47, 0.7)',
                    borderColor: '#f28a2f',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { size: 12 } }
                    }
                }
            }
        });
    }

    function renderTable(topDishes) {
        if (topDishes.length === 0) {
            topDishesBody.innerHTML = '';
            analyticsEmptyEl.textContent = 'No data for selected filters';
            analyticsEmptyEl.style.display = 'block';
            return;
        }
        analyticsEmptyEl.style.display = 'none';
        topDishesBody.innerHTML = topDishes.map(d => `
            <tr>
                <td><strong>${escapeHtml(d.name)}</strong></td>
                <td>${escapeHtml(d.category)}</td>
                <td>${formatNum(d.quantity)}</td>
                <td>${formatMoney(d.revenue)}</td>
                <td>${formatMoney(d.avgPrice)}</td>
            </tr>
        `).join('');
    }

    function escapeHtml(s) {
        if (s == null) return '';
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    function applyFilters() {
        let dateFrom = dateFromEl?.value || '';
        let dateTo = dateToEl?.value || '';
        if (!dateFrom || !dateTo) {
            setDefaultDateRange();
            dateFrom = dateFromEl?.value || '';
            dateTo = dateToEl?.value || '';
        }
        const category = categoryFilterEl?.value || '';
        const filters = {
            dateFrom,
            dateTo,
            category,
            status: 'completed'
        };
        const data = getAnalyticsData(ordersCache, menuItemsCache, filters);
        renderKPIs(data);
        renderDailyChart(data.dailyRevenue, dateFrom, dateTo);
        renderTopDishesChart(data.topDishesByQty);
        renderTable(data.topDishes);
    }

    function setDefaultDateRange() {
        const now = new Date();
        const toStr = formatDate(now);
        const from = new Date(now);
        from.setDate(from.getDate() - 30);
        const fromStr = formatDate(from);
        dateFromEl.value = fromStr;
        dateToEl.value = toStr;
    }

    function populateCategoryFilter() {
        const categories = new Set();
        for (const mi of menuItemsCache) {
            const c = (mi.category || '').trim();
            if (c) categories.add(c);
        }
        const opts = ['<option value="">All categories</option>'];
        [...categories].sort().forEach(c => {
            opts.push(`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`);
        });
        categoryFilterEl.innerHTML = opts.join('');
    }

    async function loadData() {
        try {
            const [ordersRes, menuRes] = await Promise.all([
                fetch(`${BACKEND_URL}/admin/orders/all?includeDeleted=true`, { credentials: 'include' }),
                fetch(`${BACKEND_URL}/api/menu`, { credentials: 'include' })
            ]);
            if (!ordersRes.ok) throw new Error('Failed to load orders');
            if (!menuRes.ok) throw new Error('Failed to load menu');

            const ordersData = await ordersRes.json();
            const menuData = await menuRes.json();

            ordersCache = Array.isArray(ordersData) ? ordersData : (ordersData.orders || []);
            menuItemsCache = Array.isArray(menuData) ? menuData : (menuData.items || menuData || []);

            populateCategoryFilter();
            applyFilters();
        } catch (err) {
            console.error(err);
            showToast(err.message || 'Failed to load data', true);
        }
    }

    function showToast(message, isError = false) {
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.classList.toggle('error', !!isError);
        toastEl.classList.add('visible');
        setTimeout(() => toastEl.classList.remove('visible'), 3000);
    }

    function ensureAuth() {
        const authed = sessionStorage.getItem('admin_authenticated') === 'true' || !!localStorage.getItem('admin_auth_token');
        if (!authed) {
            window.location.href = `${window.location.origin}/admin.html`;
            return false;
        }
        return true;
    }

    async function initBackend() {
        const res = await fetch('/config.json');
        const cfg = await res.json();
        BACKEND_URL = cfg.backend;
    }

    function init() {
        if (!ensureAuth()) return;
        setDefaultDateRange();
        populateCategoryFilter();

        backToDashboardEl?.addEventListener('click', () => {
            window.location.href = `${window.location.origin}/admin.html`;
        });
        refreshBtn?.addEventListener('click', loadData);
        applyFiltersBtn?.addEventListener('click', applyFilters);
        categoryFilterEl?.addEventListener('change', applyFilters);

        loadData();
    }

    async function start() {
        await initBackend();
        init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => start());
    } else {
        start();
    }
})();
