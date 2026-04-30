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
                    security.failures = 0; // Explicitly reset failures counter when countdown is done
                    // Stage is deliberately not reset here so the next lockout time doubles
                    saveToStorage();
                }
            }
            return { locked: false };
        },

        recordFailure: function () {
            security.failures++;

            if (security.failures >= 3) {
                security.stage++;
                security.failures = 0; // Reset for next stage
                
                // Double from 30 seconds: 30, 60, 120, 240...
                const seconds = 30 * Math.pow(2, security.stage - 1); 
                const lockTime = new Date(Date.now() + seconds * 1000);
                security.lockedUntil = lockTime.toISOString();
                saveToStorage();

                const remainingMs = lockTime - new Date();
                const remainingSec = Math.floor(remainingMs / 1000);
                const mins = Math.floor(remainingSec / 60);
                const secs = remainingSec % 60;

                return {
                    locked: true,
                    lockUntil: security.lockedUntil,
                    failures: 3,
                    stage: security.stage,
                    remaining: {
                        minutes: mins,
                        seconds: secs,
                        display: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                    }
                };
            }

            saveToStorage();
            return { locked: false, failures: security.failures, stage: security.stage };
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

        // ===== ORDERS =====
        getOrders: async function () {
            try {
                const res = await fetch('api/orders.php');
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error(err);
                return [];
            }
        },

        getOrderDetails: async function (orderId) {
            try {
                const res = await fetch(`api/orders.php?action=orderDetails&order_id=${orderId}`);
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error(err);
                return { success: false, items: [] };
            }
        },

        getRecentSupplierOrders: async function (limit = 5, date = null) {
            try {
                let url = 'api/dashboard.php?action=recentSupplierOrders&limit=' + limit;
                if (date) url += '&date=' + date;
                const res = await fetch(url);
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error(err);
                return [];
            }
        },

        getSales: async function (date = null) {
            try {
                let url = 'api/sales.php';
                if (date) url += '?date=' + date;
                const res = await fetch(url);
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error(err);
                return [];
            }
        },

        createOrder: async function (orderData) {
            try {
                const res = await fetch('api/orders.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error("Create Order Error:", err);
                return { success: false, message: err.message };
            }
        },

        deleteOrder: async function (orderId) {
            try {
                const res = await fetch('api/orders.php?action=delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order_id: orderId })
                });
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error("Delete Order Error:", err);
                return { success: false, message: err.message };
            }
        },

        triggerAutoDraftPOs: async function () {
            try {
                const res = await fetch('api/orders.php?action=autoDraftPOs', {
                    method: 'POST'
                });
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error("Auto Draft Error:", err);
                return { success: false, message: err.message };
            }
        },

        approveOrder: async function (orderId) {
            try {
                const res = await fetch('api/orders.php?action=approve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order_id: orderId })
                });
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error("Approve Order Error:", err);
                return { success: false, message: err.message };
            }
        },

        receiveOrder: async function (orderId) {
            try {
                const res = await fetch('api/orders.php?action=receive', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order_id: orderId })
                });
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error("Receive Order Error:", err);
                return { success: false, message: err.message };
            }
        },

        getInventoryBySupplier: async function (supplierId) {
            try {
                const res = await fetch(`api/orders.php?action=productsBySupplier&supplier_id=${supplierId}`);
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error(err);
                return [];
            }
        },

        // ===== SUPPLIERS =====
        getSuppliers: async function () {
            try {
                const res = await fetch('api/suppliers.php');
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error(err);
                return [];
            }
        },

        saveSupplier: async function (data) {
            try {
                const action = data.id ? 'update' : 'add';
                const res = await fetch('api/suppliers.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, ...data })
                });
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error("Save Supplier Error:", err);
                return { success: false, message: err.message };
            }
        },

        updateSupplierProducts: async function (supplierId, productIds) {
            try {
                const res = await fetch('api/suppliers.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'updateProducts', supplier_id: supplierId, product_ids: productIds })
                });
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error("Update Supplier Products Error:", err);
                return { success: false, message: err.message };
            }
        },

        deleteSupplier: async function (id) {
            try {
                const res = await fetch('api/suppliers.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete', id })
                });
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error("Delete Supplier Error:", err);
                return { success: false, message: err.message };
            }
        },

        // ===== AUDIT LOGS =====
        getAuditLogs: async function (date = null) {
            try {
                let url = 'api/audit.php?action=getLogs';
                if (date) url += '&date=' + date;
                const res = await fetch(url);
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error("Audit Logs Error:", err);
                return [];
            }
        },

        // ===== DASHBOARD DATA =====
        getDashboardStats: async function (date = null) {
            try {
                let url = 'api/dashboard.php?action=stats';
                if (date) url += '&date=' + date;
                const res = await fetch(url);
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error(err);
                return { products: 0, lowStock: 0, salesToday: 0, orders: 0, productsTrend: '', lowStockTrend: '', salesTrend: '', ordersTrend: '' };
            }
        },

        getReportStats: async function (date = null) {
            try {
                let url = 'api/dashboard.php?action=reports';
                if (date) url += '&date=' + date;
                const res = await fetch(url);
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error("Report Stats Error:", err);
                return null;
            }
        },

        getRecentOrders: async function (limit = 5, date = null) {
            try {
                let url = 'api/dashboard.php?action=recentOrders&limit=' + limit;
                if (date) url += '&date=' + date;
                const res = await fetch(url);
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error(err);
                return [];
            }
        },

        getRecentSupplierOrders: async function (limit = 5, date = null) {
            try {
                let url = 'api/dashboard.php?action=recentSupplierOrders&limit=' + limit;
                if (date) url += '&date=' + date;
                const res = await fetch(url);
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error(err);
                return [];
            }
        },

        // ===== USERS =====
        getUsers: async function () {
            try {
                const res = await fetch('api/users.php');
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error(err);
                return [];
            }
        },

        saveUser: async function (userData) {
            try {
                const res = await fetch('api/users.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error(err);
                return { success: false, errors: [err.message] };
            }
        },

        deleteUser: async function (id, username) {
            try {
                const res = await fetch('api/users.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete', id: id })
                });
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error(err);
                return { success: false, errors: [err.message] };
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
                'Received': 'bg-success bg-opacity-10 text-success',
                'Pending': 'bg-warning bg-opacity-10 text-warning',
                'Processing': 'bg-info bg-opacity-10 text-info',
                'Draft': 'bg-primary bg-opacity-10 text-primary',
                'active': 'bg-success bg-opacity-10 text-success',
                'inactive': 'bg-secondary bg-opacity-10 text-secondary'
            };
            return `<span class="badge ${colors[status] || 'bg-secondary bg-opacity-10 text-secondary'} px-3 py-2 rounded-pill">${status}</span>`;
        },

        getStatusClass: function (stock, reorderLevel = 20) {
            if (stock <= 0) return 'status-outofstock';
            if (stock < reorderLevel) return 'status-lowstock';
            return 'status-instock';
        },

        getStatusText: function (stock, reorderLevel = 20) {
            if (stock <= 0) return 'Out of Stock';
            if (stock < reorderLevel) return 'Low Stock';
            return 'In Stock';
        },

        // ===== NOTIFICATIONS & ALERTS =====
        showNotification: function (title, message, type = 'primary') {
            const container = document.getElementById('toastContainer');
            if (!container) {
                console.warn('Toast container not found');
                return;
            }

            const toastId = 'toast-' + Date.now();
            const icon = type === 'danger' ? 'bi-exclamation-octagon' :
                type === 'warning' ? 'bi-exclamation-triangle' :
                    'bi-info-circle';

            const html = `
                <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="toast-header border-0 ${type === 'danger' ? 'bg-danger text-white' : (type === 'warning' ? 'bg-warning text-dark' : 'bg-primary text-white')}">
                        <i class="bi ${icon} me-2"></i>
                        <strong class="me-auto">${title}</strong>
                        <button type="button" class="btn-close ${type !== 'warning' ? 'btn-close-white' : ''}" data-bs-dismiss="modal" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                    <div class="toast-body bg-white shadow-sm">
                        ${message}
                    </div>
                </div>
            `;

            container.insertAdjacentHTML('beforeend', html);
            const toastEl = document.getElementById(toastId);
            const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
            toast.show();

            // Cleanup after hidden
            toastEl.addEventListener('hidden.bs.toast', () => {
                toastEl.remove();
            });
        },

        checkLowStock: async function () {
            try {
                const lowStockItems = await this.getLowStockItems();
                if (lowStockItems.length > 0) {
                    const message = `
                        <div class="small">
                            <p class="mb-2">The following items are running low:</p>
                            <ul class="mb-0 ps-3">
                                ${lowStockItems.slice(0, 3).map(i => `<li><strong>${i.name}</strong> (${i.stock} left)</li>`).join('')}
                                ${lowStockItems.length > 3 ? `<li>...and ${lowStockItems.length - 3} more</li>` : ''}
                            </ul>
                            <a href="inventory.html" class="btn btn-sm btn-outline-primary mt-2 w-100">View Inventory</a>
                        </div>
                    `;
                    this.showNotification('Low Stock Alert', message, 'warning');
                }
                this.updateNotificationUI(lowStockItems);
            } catch (err) {
                console.error("Failed to check low stock:", err);
            }
        },

        getLowStockItems: async function () {
            const inventory = await this.getInventory();
            return inventory.filter(item =>
                item.stock < item.reorderLevel &&
                item.status !== 'inactive' &&
                item.status !== 'discontinued'
            );
        },

        updateNotificationUI: function (lowStockItems) {
            const badges = document.querySelectorAll('.noti-badge');
            const list = document.getElementById('notificationList');
            const count = lowStockItems.length;

            badges.forEach(badge => {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline-block' : 'none';
            });

            if (list) {
                if (count === 0) {
                    list.innerHTML = '<div class="p-3 text-center text-secondary small">No new notifications</div>';
                } else {
                    list.innerHTML = lowStockItems.map(item => `
                        <a href="inventory.html" class="dropdown-item p-3 border-bottom">
                            <div class="d-flex align-items-center gap-3">
                                <div class="bg-warning bg-opacity-10 text-warning rounded-circle p-2">
                                    <i class="bi bi-exclamation-triangle"></i>
                                </div>
                                <div>
                                    <p class="mb-0 fw-bold small">${item.name}</p>
                                    <p class="mb-0 text-secondary tiny" style="font-size: 0.75rem;">Only ${item.stock} left in stock</p>
                                </div>
                            </div>
                        </a>
                    `).join('') + `
                        <div class="p-2 text-center">
                            <a href="inventory.html" class="btn btn-link btn-sm text-primary text-decoration-none">View All Inventory</a>
                        </div>
                    `;
                }
            }
        },

        // ===== SALES API =====
        getSales: async function () {
            try {
                const res = await fetch('api/sales.php');
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error("Get Sales Error:", err);
                return [];
            }
        },

        createSale: async function (data) {
            try {
                const res = await fetch('api/sales.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'create', ...data })
                });
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error("Create Sale Error:", err);
                return { success: false, message: err.message };
            }
        },

        updateSaleStatus: async function (saleId, status) {
            try {
                const res = await fetch('api/sales.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'updateStatus', id: saleId, status: status })
                });
                if (!res.ok) throw new Error("HTTP " + res.status);
                return await res.json();
            } catch (err) {
                console.error("Update Sale Status Error:", err);
                return { success: false, message: err.message };
            }
        }
    };
})();

// Make sure it's globally available
window.StockSenseAPI = StockSenseAPI;
console.log('✅ StockSense API ready (Async)');