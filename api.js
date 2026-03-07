// ==========================================
// STOCKSENSE PH API - Core System
// ==========================================

const StockSenseAPI = (function() {
    console.log('🔥 StockSense API initializing...');
    
    // ==================== USER DATABASE ====================
    const users = [
        { 
            username: 'admin', 
            password: 'Admin@1234567890abc',
            role: 'admin', 
            employeeId: 'EMP-2024-001',
            name: 'Admin User'
        },
        { 
            username: 'staff', 
            password: 'Staff@1234567890xyz',
            role: 'staff', 
            employeeId: 'EMP-2024-002',
            name: 'Staff User'
        }
    ];

    // ==================== SECURITY STATE ====================
    let security = {
        failures: 0,
        stage: 0,
        lockedUntil: null,
        permanentlyLocked: false,
        permanentLockTime: null
    };

    // ==================== INVENTORY DATA ====================
    const inventory = [
        { id: 1, name: 'Laptop - Dell XPS 15', sku: 'LAP-DEL-001', category: 'Electronics', price: 75000, stock: 45, reorderLevel: 10 },
        { id: 2, name: 'Wireless Mouse', sku: 'ACC-MOU-002', category: 'Accessories', price: 850, stock: 230, reorderLevel: 30 },
        { id: 3, name: 'Mechanical Keyboard', sku: 'ACC-KEY-003', category: 'Accessories', price: 2500, stock: 120, reorderLevel: 20 },
        { id: 4, name: 'Monitor 24"', sku: 'MON-24-004', category: 'Electronics', price: 8500, stock: 67, reorderLevel: 15 },
        { id: 5, name: 'Printer - LaserJet', sku: 'PRI-LAS-005', category: 'Office', price: 5500, stock: 8, reorderLevel: 10 },
        { id: 6, name: 'USB-C Hub', sku: 'ACC-USB-006', category: 'Accessories', price: 1200, stock: 0, reorderLevel: 15 },
        { id: 7, name: 'External SSD 1TB', sku: 'STR-SSD-007', category: 'Storage', price: 4500, stock: 34, reorderLevel: 10 },
        { id: 8, name: 'Webcam 1080p', sku: 'ACC-WEB-008', category: 'Accessories', price: 2300, stock: 18, reorderLevel: 10 },
        { id: 9, name: 'Headset', sku: 'ACC-HEAD-009', category: 'Accessories', price: 1800, stock: 42, reorderLevel: 15 },
        { id: 10, name: 'Tablet Stand', sku: 'ACC-STD-010', category: 'Accessories', price: 650, stock: 55, reorderLevel: 20 }
    ];

    // ==================== SALES DATA ====================
    const sales = [
        { id: 'INV-2024-1001', date: '2024-02-28', customer: 'Juan Dela Cruz', items: 3, total: 14275, payment: 'GCash', status: 'Completed' },
        { id: 'INV-2024-1002', date: '2024-02-28', customer: 'Maria Santos', items: 1, total: 5299.99, payment: 'Maya', status: 'Completed' },
        { id: 'INV-2024-1003', date: '2024-02-27', customer: 'Jose Rizal III', items: 5, total: 32567.50, payment: 'Bank Transfer', status: 'Completed' },
        { id: 'INV-2024-1004', date: '2024-02-27', customer: 'Ana Marie Reyes', items: 2, total: 8456.00, payment: 'COD', status: 'Pending' },
        { id: 'INV-2024-1005', date: '2024-02-26', customer: 'Carlos Mercado', items: 4, total: 24932.25, payment: 'GCash', status: 'Completed' },
        { id: 'INV-2024-1006', date: '2024-02-26', customer: 'Kristine Flores', items: 6, total: 41280.75, payment: 'Maya', status: 'Processing' },
        { id: 'INV-2024-1007', date: '2024-02-25', customer: 'Roberto Garcia', items: 2, total: 12500.00, payment: 'Bank Transfer', status: 'Completed' },
        { id: 'INV-2024-1008', date: '2024-02-25', customer: 'Lisa Wong', items: 3, total: 8900.50, payment: 'GCash', status: 'Completed' }
    ];

    // ==================== CUSTOMER DATA ====================
    const customers = [
        { id: 1, name: 'Juan Dela Cruz', email: 'juan.delacruz@email.com', phone: '0917-123-4567', city: 'Mandaluyong City', orders: 15, totalSpent: 187500, status: 'active', type: 'regular' },
        { id: 2, name: 'Maria Santos', email: 'maria.santos@email.com', phone: '0928-234-5678', city: 'Quezon City', orders: 8, totalSpent: 84500, status: 'active', type: 'vip' },
        { id: 3, name: 'Jose Rizal III', email: 'jose.rizal@email.com', phone: '0939-345-6789', city: 'Calamba, Laguna', orders: 23, totalSpent: 312000, status: 'active', type: 'vip' },
        { id: 4, name: 'Ana Marie Reyes', email: 'ana.reyes@email.com', phone: '0945-456-7890', city: 'Cebu City', orders: 5, totalSpent: 32450, status: 'active', type: 'regular' },
        { id: 5, name: 'Carlos Mercado', email: 'carlos.mercado@email.com', phone: '0956-567-8901', city: 'Davao City', orders: 12, totalSpent: 98750, status: 'inactive', type: 'regular' },
        { id: 6, name: 'Kristine Flores', email: 'kristine.flores@email.com', phone: '0967-678-9012', city: 'Pasig City', orders: 7, totalSpent: 62300, status: 'active', type: 'regular' },
        { id: 7, name: 'Roberto Garcia', email: 'roberto.garcia@email.com', phone: '0978-789-0123', city: 'Makati City', orders: 19, totalSpent: 245800, status: 'active', type: 'vip' },
        { id: 8, name: 'Lisa Wong', email: 'lisa.wong@email.com', phone: '0989-890-1234', city: 'Manila', orders: 4, totalSpent: 28900, status: 'active', type: 'regular' }
    ];

    // ==================== DASHBOARD DATA ====================
    const dashboardData = {
        stats: {
            products: 2543,
            lowStock: 23,
            salesToday: 724500,
            orders: 156,
            productsTrend: '+12%',
            lowStockTrend: '-5%',
            salesTrend: '+8.3%',
            ordersTrend: '+23'
        },
        recentOrders: [
            { id: 'INV-2024-1001', customer: 'Juan Dela Cruz', total: 14275, status: 'Completed' },
            { id: 'INV-2024-1002', customer: 'Maria Santos', total: 5299.99, status: 'Pending' },
            { id: 'INV-2024-1003', customer: 'Jose Rizal III', total: 32567.50, status: 'Processing' },
            { id: 'INV-2024-1004', customer: 'Ana Marie Reyes', total: 8456.00, status: 'Completed' },
            { id: 'INV-2024-1005', customer: 'Carlos Mercado', total: 24932.25, status: 'Completed' }
        ]
    };

    // ==================== PRIVATE METHODS ====================
    function loadFromStorage() {
        const saved = localStorage.getItem('stockSenseSecurity');
        if (saved) {
            try {
                security = JSON.parse(saved);
                console.log('📦 Security data loaded:', security);
            } catch (e) {
                console.error('Failed to load security data');
            }
        }
    }

    function saveToStorage() {
        localStorage.setItem('stockSenseSecurity', JSON.stringify(security));
        console.log('💾 Security data saved:', security);
    }

    // Initialize
    loadFromStorage();

    // ==================== PUBLIC API ====================
    return {
        // ===== AUTHENTICATION =====
        validateUser: function(username, password) {
            console.log('🔍 Validating user:', username);
            const user = users.find(u => u.username === username && u.password === password);
            console.log('User found:', user ? '✅ Yes' : '❌ No');
            return user;
        },

        getUserByUsername: function(username) {
            return users.find(u => u.username === username);
        },

        // ===== SECURITY =====
        getSecurityState: function() {
            return { ...security };
        },

        recordFailure: function() {
            security.failures++;
            console.log('⚠️ Failed attempt #', security.failures);
            
            if (security.failures >= 6) {
                security.permanentlyLocked = true;
                security.permanentLockTime = new Date().toISOString();
                security.stage = 4;
                security.lockedUntil = null;
                saveToStorage();
                return {
                    locked: true,
                    permanent: true,
                    failures: security.failures,
                    lockTime: security.permanentLockTime
                };
            }
            
            if (security.failures >= 3 && security.failures <= 5) {
                security.stage = security.failures - 2;
                const minutes = [0.5, 0.5, 1][security.stage - 1];
                const lockTime = new Date(Date.now() + minutes * 60 * 1000);
                security.lockedUntil = lockTime.toISOString();
                saveToStorage();
                return {
                    locked: true,
                    permanent: false,
                    stage: security.stage,
                    lockUntil: security.lockedUntil,
                    minutes: minutes,
                    failures: security.failures
                };
            }
            
            saveToStorage();
            return {
                locked: false,
                failures: security.failures
            };
        },

        checkLocked: function() {
            // Check permanent lock first
            if (security.permanentlyLocked) {
                return {
                    locked: true,
                    permanent: true,
                    lockTime: security.permanentLockTime
                };
            }
            
            // Check temporary lock
            if (security.lockedUntil) {
                const now = new Date();
                const lockTime = new Date(security.lockedUntil);
                
                if (now < lockTime) {
                    const remainingMs = lockTime - now;
                    const remainingSec = Math.floor(remainingMs / 1000);
                    const minutes = Math.floor(remainingSec / 60);
                    const seconds = remainingSec % 60;
                    
                    return {
                        locked: true,
                        permanent: false,
                        stage: security.stage,
                        lockUntil: security.lockedUntil,
                        remaining: {
                            ms: remainingMs,
                            seconds: remainingSec,
                            minutes: minutes,
                            seconds_: seconds,
                            display: `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`
                        }
                    };
                } else {
                    // Lock expired, clear it
                    security.lockedUntil = null;
                    security.stage = 0;
                    saveToStorage();
                }
            }
            
            return { locked: false };
        },

        resetSecurity: function() {
            security = {
                failures: 0,
                stage: 0,
                lockedUntil: null,
                permanentlyLocked: false,
                permanentLockTime: null
            };
            saveToStorage();
            console.log('🔄 Security reset completed');
            return { success: true };
        },

        // ===== SESSION MANAGEMENT =====
        createSession: function(user) {
            const session = {
                username: user.username,
                role: user.role,
                employeeId: user.employeeId,
                name: user.name,
                loginTime: new Date().toISOString(),
                sessionId: 'sess_' + Math.random().toString(36).substr(2, 9)
            };
            sessionStorage.setItem('stockSenseUser', JSON.stringify(session));
            console.log('🔐 Session created for:', user.role, user.name);
            return session;
        },

        getSession: function() {
            const session = sessionStorage.getItem('stockSenseUser');
            return session ? JSON.parse(session) : null;
        },

        validateSession: function() {
            const session = this.getSession();
            if (!session) return { valid: false, reason: 'no_session' };
            
            const loginTime = new Date(session.loginTime);
            const now = new Date();
            const elapsedMinutes = (now - loginTime) / 60000;
            
            if (elapsedMinutes > 30) {
                this.destroySession();
                return { valid: false, reason: 'expired' };
            }
            
            return { valid: true, session };
        },

        destroySession: function() {
            sessionStorage.removeItem('stockSenseUser');
            console.log('🚪 Session destroyed');
        },

        // ===== DATA ACCESS METHODS =====
        getInventory: function() {
            console.log('📦 Returning inventory data:', inventory.length, 'items');
            return inventory;
        },

        getSales: function() {
            console.log('💰 Returning sales data:', sales.length, 'transactions');
            return sales;
        },

        getCustomers: function() {
            console.log('👥 Returning customers data:', customers.length, 'customers');
            return customers;
        },

        // ===== DASHBOARD DATA =====
        getDashboardStats: function() {
            return { ...dashboardData.stats };
        },

        getRecentOrders: function(limit = 5) {
            return dashboardData.recentOrders.slice(0, limit);
        },

        // ===== UTILITIES =====
        getFailureMessage: function(failures) {
            const messages = {
                1: 'Failed attempts: 1/5 before permanent lock',
                2: 'Failed attempts: 2/5 before permanent lock',
                3: 'Failed attempts: 3/5 - 2 more until permanent lock',
                4: 'Failed attempts: 4/5 - 1 more until final warning',
                5: 'WARNING: Next attempt will permanently lock your account!',
                6: 'Account permanently locked. Contact IT support.'
            };
            return messages[failures] || `Failed attempts: ${failures}/5`;
        },

        formatCurrency: function(amount) {
            if (amount === undefined || amount === null) return '₱0.00';
            return '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },

        formatDate: function(isoString) {
            if (!isoString) return '';
            return new Date(isoString).toLocaleString('en-PH', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Manila'
            });
        },

        getStatusBadge: function(status) {
            const colors = {
                'Completed': 'bg-success bg-opacity-10 text-success',
                'Pending': 'bg-warning bg-opacity-10 text-warning',
                'Processing': 'bg-info bg-opacity-10 text-info'
            };
            return `<span class="badge ${colors[status] || 'bg-secondary bg-opacity-10 text-secondary'} px-3 py-2 rounded-pill">${status}</span>`;
        },

        getStatusClass: function(stock) {
            if (stock <= 0) return 'status-outofstock';
            if (stock < 20) return 'status-lowstock';
            return 'status-instock';
        },

        getStatusText: function(stock) {
            if (stock <= 0) return 'Out of Stock';
            if (stock < 20) return 'Low Stock';
            return 'In Stock';
        }
    };
})();

// Make sure it's globally available
window.StockSenseAPI = StockSenseAPI;
console.log('✅ StockSense API ready and fully loaded');