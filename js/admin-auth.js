/**
 * Admin auth helper - token storage and auth headers for API requests
 * Token stored in localStorage as admin_token
 */
(function () {
    'use strict';
    const TOKEN_KEY = 'admin_token';

    window.getAdminToken = function () {
        return localStorage.getItem(TOKEN_KEY);
    };

    window.setAdminToken = function (token) {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
    };

    window.clearAdminToken = function () {
        localStorage.removeItem(TOKEN_KEY);
    };

    window.getAdminAuthHeaders = function () {
        const token = getAdminToken();
        if (!token) return {};
        return { Authorization: 'Bearer ' + token };
    };

    window.isAdminAuthenticated = function () {
        return !!getAdminToken();
    };
})();
