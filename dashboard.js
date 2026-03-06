// ==========================================
// STOCKSENSE DASHBOARD UTILITIES
// ==========================================

const DashboardAPI = (function() {
    return {
        getSession: function() {
            return StockSenseAPI.getSession();
        },
        
        validateSession: function() {
            const result = StockSenseAPI.validateSession();
            if (!result.valid) {
                window.location.replace('login.html');
                return null;
            }
            return result.session;
        },
        
        logout: function() {
            StockSenseAPI.destroySession();
            window.location.replace('login.html');
        },
        
        getStats: function() {
            return StockSenseAPI.getDashboardStats();
        },
        
        getOrders: function(limit) {
            return StockSenseAPI.getRecentOrders(limit);
        },
        
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