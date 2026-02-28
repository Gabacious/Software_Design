// ==========================================
// STOCKSENSE PH API - Central Authentication Service
// ==========================================

const StockSenseAPI = (function() {
    // ==================== PRIVATE DATA ====================
    const users = [
        { 
            username: 'admin', 
            password: 'Admin@123', 
            role: 'admin', 
            employeeId: 'EMP-2024-001',
            name: 'Admin User'
        },
        { 
            username: 'staff', 
            password: 'Staff@123', 
            role: 'staff', 
            employeeId: 'EMP-2024-002',
            name: 'Staff User'
        }
    ];

    // Security state
    let security = {
        failures: 0,
        stage: 0,
        lockedUntil: null,
        permanentlyLocked: false,
        permanentLockTime: null
    };

    // Dashboard data
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
            { id: 'INV-2024-1001', customer: 'Juan Dela Cruz', city: 'Mandaluyong City', items: 3, total: 14275, payment: 'GCash', status: 'Completed', date: '2024-02-28T10:30:00' },
            { id: 'INV-2024-1002', customer: 'Maria Santos', city: 'Quezon City', items: 1, total: 5299.99, payment: 'Maya', status: 'Pending', date: '2024-02-28T09:15:00' },
            { id: 'INV-2024-1003', customer: 'Jose Rizal III', city: 'Calamba, Laguna', items: 5, total: 32567.50, payment: 'Bank Transfer', status: 'Processing', date: '2024-02-27T16:20:00' },
            { id: 'INV-2024-1004', customer: 'Ana Marie Reyes', city: 'Cebu City', items: 2, total: 8456.00, payment: 'COD', status: 'Completed', date: '2024-02-27T14:45:00' },
            { id: 'INV-2024-1005', customer: 'Carlos Mercado', city: 'Davao City', items: 4, total: 24932.25, payment: 'GCash', status: 'Completed', date: '2024-02-27T11:30:00' }
        ]
    };

    // ==================== PRIVATE METHODS ====================
    function loadFromStorage() {
        const saved = localStorage.getItem('stockSenseSecurity');
        if (saved) {
            try {
                security = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load security data');
            }
        }
    }

    function saveToStorage() {
        localStorage.setItem('stockSenseSecurity', JSON.stringify(security));
    }

    // Initialize
    loadFromStorage();

    // ==================== PUBLIC API ====================
    return {
        // ===== AUTHENTICATION =====
        validateUser: function(username, password) {
            return users.find(u => u.username === username && u.password === password);
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
            
            // Check for permanent lock (6th failure)
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
            
            // Progressive lockout on 3rd, 4th, 5th failures
            if (security.failures >= 3 && security.failures <= 5) {
                security.stage = security.failures - 2; // 3->1, 4->2, 5->3
                
                // Lock durations: stage1=30s, stage2=30s, stage3=1min
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
            
            // Just a failure, no lock yet
            saveToStorage();
            return {
                locked: false,
                failures: security.failures
            };
        },

        checkLocked: function() {
            // Check permanent lock
            if (security.permanentlyLocked) {
                return {
                    locked: true,
                    permanent: true,
                    lockTime: security.permanentLockTime
                };
            }
            
            // Check temporary lock
            if (!security.lockedUntil) {
                return { locked: false };
            }
            
            const now = new Date();
            const lockTime = new Date(security.lockedUntil);
            
            if (now < lockTime) {
                // Calculate remaining time for countdown
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
            }
            
            // Lock expired - reset
            security.lockedUntil = null;
            security.stage = 0;
            saveToStorage();
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
        },

        // ===== DASHBOARD DATA =====
        getDashboardStats: function() {
            return { ...dashboardData.stats };
        },

        getRecentOrders: function(limit = 5) {
            return dashboardData.recentOrders.slice(0, limit);
        },

        getAllOrders: function() {
            return [...dashboardData.recentOrders];
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
            return '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },

        formatDate: function(isoString) {
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
                'Completed': 'bg-emerald-100 text-emerald-700',
                'Pending': 'bg-amber-100 text-amber-700',
                'Processing': 'bg-blue-100 text-blue-700'
            };
            return `<span class="${colors[status] || 'bg-slate-100 text-slate-700'} px-3 py-1 rounded-full text-xs font-semibold">${status}</span>`;
        }
    };
})();