// ==========================================
// STOCKSENSE DASHBOARD UTILITIES
// ==========================================

const DashboardAPI = (function() {
    return {
        getSession: async function() {
            return StockSenseAPI.getSession();
        },
        
        validateSession: async function() {
            const result = StockSenseAPI.validateSession();
            if (!result.valid) {
                window.location.replace('login.html');
                return null;
            }
            return result.session;
        },
        
        logout: async function() {
            StockSenseAPI.destroySession();
            window.location.replace('login.html');
        },
        
        getStats: async function() {
            return await StockSenseAPI.getDashboardStats();
        },
        
        getOrders: async function(limit) {
            return await StockSenseAPI.getRecentOrders(limit);
        },
        
        formatCurrency: async function(amount) {
            return StockSenseAPI.formatCurrency(amount);
        },
        
        formatDate: async function(isoString) {
            return StockSenseAPI.formatDate(isoString);
        },
        
        getStatusBadge: async function(status) {
            return StockSenseAPI.getStatusBadge(status);
        }
    };
})();