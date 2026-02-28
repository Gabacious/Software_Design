// ==========================================
// STOCKSENSE DASHBOARD UTILITIES
// ==========================================

const DashboardAPI = (function() {
    return {
        // Session management
        getSession: function() {
            return StockSenseAPI.getSession();
        },
        
        validateSession: function() {
            const result = StockSenseAPI.validateSession();
            if (!result.valid) {
                if (result.reason === 'expired') {
                    alert('Your session has expired. Please login again.');
                }
                window.location.replace('login.html');
                return null;
            }
            return result.session;
        },
        
        logout: function() {
            StockSenseAPI.destroySession();
            window.location.replace('login.html');
        },
        
        // Dashboard data
        getStats: function() {
            return StockSenseAPI.getDashboardStats();
        },
        
        getOrders: function(limit) {
            return StockSenseAPI.getRecentOrders(limit);
        },
        
        // UI helpers (passthrough to API)
        formatCurrency: function(amount) {
            return StockSenseAPI.formatCurrency(amount);
        },
        
        formatDate: function(isoString) {
            return StockSenseAPI.formatDate(isoString);
        },
        
        getStatusBadge: function(status) {
            return StockSenseAPI.getStatusBadge(status);
        }
    };
})();