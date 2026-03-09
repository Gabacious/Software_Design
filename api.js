// ==========================================
// STOCKSENSE PH API - PHP Backend Integrated
// ==========================================

const StockSenseAPI = (function () {
    console.log('🔥 StockSense API initializing (Fetch)...');

    // Security state (local only)
    let security = {
        failures: 0,
        stage: 0,
        lockedUntil: null,
        permanentlyLocked: false,
        permanentLockTime: null
    };

    function loadFromStorage() {
        const saved = localStorage.getItem('stockSenseSecurity');
        if (saved) {
            try {
                security = JSON.parse(saved);
            } catch (e) { }
        }
    }

    function saveToStorage() {
        localStorage.setItem('stockSenseSecurity', JSON.stringify(security));
    }

    loadFromStorage();

    return {
        // ===== AUTHENTICATION =====
        validateUser: async function (username, password) {
            try {
                const response = await fetch('api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'login', username, password })
                });
                const data = await response.json();
                if (data.success) {
                    return data.user;
                }
                return null;
            } catch (err) {
                console.error("Login Error:", err);
                return null;
            }
        },

        // ===== SECURITY =====
        getSecurityState: function () {
            return { ...security };
        },

        checkLocked: function () {
            if (security.permanentlyLocked) {
                return { locked: true, permanent: true, lockTime: security.permanentLockTime };
            }
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
                            seconds: seconds,
                            display: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                        }
                    };
                } else {
                    security.lockedUntil = null;
                    security.stage = 0;
                    saveToStorage();
                }
            }
            return { locked: false };
        },

        recordFailure: function () {
            security.failures++;

            if (security.failures >= 6) {
                security.permanentlyLocked = true;
                security.permanentLockTime = new Date().toISOString();
                security.stage = 4;
                security.lockedUntil = null;
                saveToStorage();
                return { locked: true, permanent: true, failures: security.failures, lockTime: security.permanentLockTime };
            }

            if (security.failures >= 3 && security.failures <= 5) {
                security.stage = security.failures - 2;
                const minutes = [0.5, 0.5, 1][security.stage - 1];
                const lockTime = new Date(Date.now() + minutes * 60 * 1000);
                security.lockedUntil = lockTime.toISOString();
                saveToStorage();

                const remainingMs = lockTime - new Date();
                const remainingSec = Math.floor(remainingMs / 1000);
                const mins = Math.floor(remainingSec / 60);
                const secs = remainingSec % 60;

                return {
                    locked: true,
                    permanent: false,
                    stage: security.stage,
                    lockUntil: security.lockedUntil,
                    minutes: minutes,
                    failures: security.failures,
                    remaining: {
                        minutes: mins,
                        seconds: secs,
                        display: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                    }
                };
            }

            saveToStorage();
            return { locked: false, failures: security.failures };
        },

        resetSecurity: function () {
            security = { failures: 0, stage: 0, lockedUntil: null, permanentlyLocked: false, permanentLockTime: null };
            saveToStorage();
        },

        // ===== SESSION MANAGEMENT =====
        createSession: function (user) {
            // Already handled by PHP session but we also sync to sessionStorage for UI fast-checks if we want.
            // Using sessionStorage like original to avoid refactoring everything right now.
            const session = {
                username: user.username,
                role: user.role,
                employeeId: user.employeeId,
                name: user.name,
                loginTime: new Date().toISOString()
            };
            sessionStorage.setItem('stockSenseUser', JSON.stringify(session));
            return session;
        },

        getSession: function () {
            const session = sessionStorage.getItem('stockSenseUser');
            return session ? JSON.parse(session) : null;
        },

        destroySession: async function () {
            sessionStorage.removeItem('stockSenseUser');
            try {
                await fetch('api/auth.php?action=logout');
            } catch (err) { }
        },

        validateSession: async function () {
            try {
                const response = await fetch('api/auth.php?action=session');
                const data = await response.json();
                if (data.valid) {
                    sessionStorage.setItem('stockSenseUser', JSON.stringify(data.session));
                    return { valid: true, session: data.session };
                } else {
                    sessionStorage.removeItem('stockSenseUser');
                    return { valid: false, reason: data.reason };
                }
            } catch (e) {
                return { valid: false };
            }
        },

        // ===== DATA ACCESS METHODS =====
        getInventory: async function () {
            try {
                const res = await fetch('api/inventory.php');
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error(err);
                return [];
            }
        },

        updateInventory: async function (id, data) {
            try {
                const res = await fetch('api/inventory.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update', id, ...data })
                });
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error("Update Error:", err);
                return { success: false, message: err.message };
            }
        },

        addInventory: async function (data) {
            try {
                const res = await fetch('api/inventory.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'add', ...data })
                });
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error("Add Error:", err);
                return { success: false, message: err.message };
            }
        },

        deleteInventory: async function (id) {
            try {
                const res = await fetch('api/inventory.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete', id })
                });
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error("Delete Error:", err);
                return { success: false, message: err.message };
            }
        },

        getSales: async function () {
            try {
                const res = await fetch('api/sales.php');
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error(err);
                return [];
            }
        },

        getCustomers: async function () {
            try {
                const res = await fetch('api/customers.php');
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error(err);
                return [];
            }
        },

        // ===== DASHBOARD DATA =====
        getDashboardStats: async function () {
            try {
                const res = await fetch('api/dashboard.php?action=stats');
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error(err);
                return { products: 0, lowStock: 0, salesToday: 0, orders: 0, productsTrend: '', lowStockTrend: '', salesTrend: '', ordersTrend: '' };
            }
        },

        getRecentOrders: async function (limit = 5) {
            try {
                const res = await fetch('api/dashboard.php?action=recentOrders&limit=' + limit);
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error(err);
                return [];
            }
        },

        // ===== UTILITIES =====
        formatCurrency: function (amount) {
            if (amount === undefined || amount === null) return '₱0.00';
            return '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },

        formatDate: function (isoString) {
            if (!isoString) return '';
            return new Date(isoString).toLocaleString('en-PH', {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
                timeZone: 'Asia/Manila'
            });
        },

        getStatusBadge: function (status) {
            const colors = {
                'Completed': 'bg-success bg-opacity-10 text-success',
                'Pending': 'bg-warning bg-opacity-10 text-warning',
                'Processing': 'bg-info bg-opacity-10 text-info',
                'active': 'bg-success bg-opacity-10 text-success',
                'inactive': 'bg-secondary bg-opacity-10 text-secondary'
            };
            return `<span class="badge ${colors[status] || 'bg-secondary bg-opacity-10 text-secondary'} px-3 py-2 rounded-pill">${status}</span>`;
        },

        getStatusClass: function (stock) {
            if (stock <= 0) return 'status-outofstock';
            if (stock < 20) return 'status-lowstock';
            return 'status-instock';
        },

        getStatusText: function (stock) {
            if (stock <= 0) return 'Out of Stock';
            if (stock < 20) return 'Low Stock';
            return 'In Stock';
        }
    };
})();

// Make sure it's globally available
window.StockSenseAPI = StockSenseAPI;
console.log('✅ StockSense API ready (Async)');