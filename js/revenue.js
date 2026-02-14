/**
 * Revenue Analytics - Hotel Accrual Accounting
 * Revenue is distributed per night of stay [check_in, check_out)
 * Uses existing bookings API - no DB changes.
 */
(function () {
    'use strict';

    let BACKEND_URL;
    const TOTAL_ROOMS = 12;

    async function initBackend() {
        const res = await fetch('/config.json');
        const cfg = await res.json();
        BACKEND_URL = cfg.backend;
    }
    const CURRENCY = 'THB';

    // DOM refs
    let chart = null;
    let bookingsCache = [];

    const dateFromEl = document.getElementById('dateFrom');
    const dateToEl = document.getElementById('dateTo');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const backToDashboardEl = document.getElementById('backToDashboard');
    const kpiTotalRevenue = document.getElementById('kpiTotalRevenue');
    const kpiOccupancy = document.getElementById('kpiOccupancy');
    const kpiRevPAR = document.getElementById('kpiRevPAR');
    const dailyAnalyticsBody = document.querySelector('#dailyAnalyticsTable tbody');
    const revenueEmptyEl = document.getElementById('revenueEmpty');
    const toastEl = document.getElementById('revenueToast');

    /**
     * Parse date string to local Date (avoids UTC shifts)
     */
    function parseLocalDate(dateStr) {
        if (!dateStr) return null;
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
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
     * Calculate days between two dates (exclusive end)
     * nights = check_out - check_in in days
     */
    function nightsBetween(checkInStr, checkOutStr) {
        const ci = parseLocalDate(checkInStr);
        const co = parseLocalDate(checkOutStr);
        if (!ci || !co) return 0;
        const diff = (co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24);
        return Math.max(0, Math.floor(diff));
    }

    /**
     * Core: Hotel accrual - distribute revenue per night [check_in, check_out)
     * Returns { "YYYY-MM-DD": { revenue, roomsSold: Set<roomKey> } }
     */
    function calculateDailyMetrics(bookings, dateFrom, dateTo) {
        const result = {};
        if (!dateFrom || !dateTo) return result;

        const rangeFrom = parseLocalDate(dateFrom);
        const rangeTo = parseLocalDate(dateTo);
        if (!rangeFrom || !rangeTo || rangeTo < rangeFrom) return result;

        for (const b of bookings) {
            const status = String(b.status || '').trim().toLowerCase();
            if (status !== 'confirmed') continue;

            const checkIn = b.checkIn || b.checkin_date;
            const checkOut = b.checkOut || b.checkout_date;
            const totalPrice = Number(b.total) ?? Number(b.total_price) ?? 0;
            const roomKey = b.roomId || b.room_id ? String(b.roomId || b.room_id) : `b-${b.id}`;

            const nights = nightsBetween(checkIn, checkOut);
            if (nights <= 0 || totalPrice <= 0) continue;

            const dailyRevenue = totalPrice / nights;
            const ciDate = parseLocalDate(checkIn);
            const coDate = parseLocalDate(checkOut);

            for (let d = new Date(ciDate); d < coDate; d.setDate(d.getDate() + 1)) {
                const dateStr = formatDate(d);
                if (dateStr < dateFrom || dateStr > dateTo) continue;

                if (!result[dateStr]) {
                    result[dateStr] = { revenue: 0, roomKeys: new Set() };
                }
                result[dateStr].revenue += dailyRevenue;
                result[dateStr].roomKeys.add(roomKey);
            }
        }

        const daysInRange = getDatesInRange(dateFrom, dateTo);
        const aggregated = {};
        for (const d of daysInRange) {
            const row = result[d] || { revenue: 0, roomKeys: new Set() };
            const roomsSold = row.roomKeys.size;
            const occupancy = TOTAL_ROOMS > 0 ? (roomsSold / TOTAL_ROOMS) * 100 : 0;
            aggregated[d] = {
                revenue: row.revenue,
                roomsSold,
                occupancy
            };
        }
        return aggregated;
    }

    /**
     * Compute KPIs from daily metrics
     */
    function computeKPIs(daily) {
        const entries = Object.entries(daily);
        const totalRevenue = entries.reduce((s, [, v]) => s + v.revenue, 0);
        const numDays = entries.length;
        const roomNightsAvailable = TOTAL_ROOMS * numDays;

        const revpar = roomNightsAvailable > 0 ? totalRevenue / roomNightsAvailable : 0;
        const avgOccupancy = entries.length > 0
            ? entries.reduce((s, [, v]) => s + v.occupancy, 0) / entries.length
            : 0;

        return {
            totalRevenue,
            occupancy: avgOccupancy,
            revpar
        };
    }

    function formatNum(n) {
        return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0 });
    }

    function formatMoney(n) {
        return formatNum(n) + ' ' + CURRENCY;
    }

    function renderKPIs(daily) {
        const kpis = computeKPIs(daily);
        kpiTotalRevenue.textContent = formatMoney(kpis.totalRevenue);
        kpiOccupancy.textContent = formatNum(kpis.occupancy) + ' %';
        kpiRevPAR.textContent = formatMoney(kpis.revpar);
    }

    function renderTable(daily) {
        const sorted = Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0]));
        if (sorted.length === 0) {
            dailyAnalyticsBody.innerHTML = '';
            revenueEmptyEl.textContent = 'No data for selected date range';
            revenueEmptyEl.style.display = 'block';
            return;
        }
        revenueEmptyEl.style.display = 'none';
        dailyAnalyticsBody.innerHTML = sorted.map(([date, v]) => `
            <tr>
                <td>${date}</td>
                <td>${v.roomsSold}</td>
                <td>${formatNum(v.occupancy)} %</td>
                <td>${formatMoney(v.revenue)}</td>
            </tr>
        `).join('');
    }

    function renderChart(daily) {
        const sorted = Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0]));
        const labels = sorted.map(([d]) => d);
        const data = sorted.map(([, v]) => Math.round(v.revenue));

        if (chart) chart.destroy();
        const ctx = document.getElementById('dailyRevenueChart');
        if (!ctx) return;

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Revenue (THB)',
                    data,
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
                        title: { display: true, text: 'Date' },
                        grid: { display: false }
                    },
                    y: {
                        title: { display: true, text: 'Revenue (THB)' },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function applyFilters() {
        const dateFrom = dateFromEl.value;
        const dateTo = dateToEl.value;
        if (!dateFrom || !dateTo) {
            showToast('Please select both Date From and Date To', true);
            return;
        }
        if (dateTo < dateFrom) {
            showToast('Date To must be on or after Date From', true);
            return;
        }

        const daily = calculateDailyMetrics(bookingsCache, dateFrom, dateTo);
        renderKPIs(daily);
        renderTable(daily);
        renderChart(daily);
    }

    function showToast(msg, isError) {
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.classList.toggle('error', !!isError);
        toastEl.classList.add('visible');
        setTimeout(() => toastEl.classList.remove('visible'), 3000);
    }

    async function loadBookings() {
        try {
            const headers = window.getAdminAuthHeaders ? window.getAdminAuthHeaders() : {};
            const res = await fetch(`${BACKEND_URL}/admin/bookings/all?includeDeleted=true`, { headers });
            if (!res.ok) throw new Error('Failed to load bookings');
            bookingsCache = await res.json();
            applyFilters();
        } catch (e) {
            console.error(e);
            showToast('Failed to load bookings', true);
        }
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

    function ensureAuth() {
        const authed = sessionStorage.getItem('admin_authenticated') === 'true' || (window.isAdminAuthenticated && window.isAdminAuthenticated());
        if (!authed) {
            window.location.href = `${window.location.origin}/ty-admin-portal.html`;
            return false;
        }
        return true;
    }

    function init() {
        if (!ensureAuth()) return;
        setDefaultDateRange();
        backToDashboardEl && backToDashboardEl.addEventListener('click', () => {
            window.location.href = `${window.location.origin}/admin-bookings.html`;
        });
        refreshBtn && refreshBtn.addEventListener('click', loadBookings);
        applyFiltersBtn && applyFiltersBtn.addEventListener('click', applyFilters);

        loadBookings();
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
