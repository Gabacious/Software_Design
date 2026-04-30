-- =========================================
-- StockSenseDB Schema and Initial Data (Baking Shop Version)
-- =========================================

-- Create Database
CREATE DATABASE StockSenseDB;
GO

USE StockSenseDB;
GO

-- ==================== USERS TABLE ====================
CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    employeeId VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
);
GO

INSERT INTO Users (username, password, role, employeeId, name) VALUES
('admin', 'Admin@1234567890abc', 'admin', 'EMP-2024-001', 'Admin User'),
('staff', 'Staff@1234567890xyz', 'staff', 'EMP-2024-002', 'Staff User');
GO

-- ==================== INVENTORY TABLE ====================
CREATE TABLE Inventory (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(18,2) NOT NULL,
    stock INT NOT NULL,
    reorderLevel INT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    supplier_id INT,
    CONSTRAINT FK_Inventory_Suppliers FOREIGN KEY (supplier_id) REFERENCES Suppliers(id)
);
GO

INSERT INTO Inventory (name, sku, category, price, stock, reorderLevel, supplier_id) VALUES
('Pan de Sal (10pcs)', 'BAKE-BRD-001', 'Bread', 50.00, 100, 20, 1),
('Chocolate Moist Cake', 'BAKE-CAK-002', 'Cakes', 850.00, 15, 5, 2),
('Blueberry Cheesecake', 'BAKE-CAK-003', 'Cakes', 950.00, 10, 3, 2),
('Glazed Donut', 'BAKE-DON-004', 'Donuts', 45.00, 50, 15, 1),
('Spanish Bread', 'BAKE-BRD-005', 'Bread', 15.00, 80, 20, 1),
('Egg Tart', 'BAKE-PAS-006', 'Pastries', 35.00, 40, 10, 3),
('Iced Coffee (Large)', 'BAKE-BEV-007', 'Beverages', 120.00, 60, 15, 4),
('Cinnamon Roll', 'BAKE-PAS-008', 'Pastries', 65.00, 25, 8, 3),
('Pandan Cake', 'BAKE-CAK-009', 'Cakes', 750.00, 8, 3, 2),
('Hot Chocolate', 'BAKE-BEV-010', 'Beverages', 95.00, 45, 10, 4);
GO

-- ==================== SALES TABLE ====================
-- ... (rest of sales table) ...

-- ==================== SALES TABLE ====================
CREATE TABLE Sales (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    customer VARCHAR(100) NOT NULL,
    items INT NOT NULL,
    total DECIMAL(18,2) NOT NULL,
    payment VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL
);
GO

-- Seed Sales (April 20 to 24)
INSERT INTO Sales (id, date, customer, items, total, payment, status) VALUES
('INV-2024-1001', '2026-04-20', 'Juan Dela Cruz', 2, 900.00, 'GCash', 'Completed'),
('INV-2024-1002', '2026-04-21', 'Maria Santos', 1, 45.00, 'Maya', 'Completed'),
('INV-2024-1003', '2026-04-22', 'Jose Rizal III', 3, 1150.00, 'Bank Transfer', 'Completed'),
('INV-2024-1004', '2026-04-23', 'Ana Marie Reyes', 2, 100.00, 'COD', 'Pending'),
('INV-2024-1005', '2026-04-24', 'Carlos Mercado', 4, 180.00, 'GCash', 'Completed');
GO

-- ==================== SUPPLIERS TABLE ====================
CREATE TABLE Suppliers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contactPerson VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(50) NOT NULL,
    address VARCHAR(255),
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active'
);
GO

INSERT INTO Suppliers (name, contactPerson, email, phone, address, category) VALUES
('Golden Grain Flour Mill', 'Mark Singson', 'sales@goldengrain.ph', '02-8888-1111', 'Bulacan', 'Flour & Grains'),
('Sweet Valley Sugar Co.', 'Elena Cruz', 'support@sweetvalley.com', '02-7777-2222', 'Tarlac', 'Sugar & Sweeteners'),
('Dairy Fresh Farm', 'John Doe', 'john@dairyfresh.ph', '0917-555-6677', 'Batangas', 'Dairy & Eggs'),
('Brew Masters Coffee', 'Sarah Lee', 'sarah@brewmasters.com', '0928-333-4455', 'Manila', 'Beverages');
GO

-- ==================== SALES_ITEMS TABLE ====================
CREATE TABLE SalesItems (
    id INT IDENTITY(1,1) PRIMARY KEY,
    sale_id VARCHAR(50) NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(18,2) NOT NULL,
    subtotal DECIMAL(18,2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES Sales(id),
    FOREIGN KEY (product_id) REFERENCES Inventory(id)
);
GO

INSERT INTO SalesItems (sale_id, product_id, quantity, price, subtotal) VALUES
('INV-2024-1001', 1, 1, 50.00, 50.00),
('INV-2024-1001', 2, 1, 850.00, 850.00),
('INV-2024-1002', 4, 1, 45.00, 45.00),
('INV-2024-1003', 3, 1, 950.00, 950.00),
('INV-2024-1003', 7, 2, 120.00, 240.00);
GO

-- ==================== AUDIT_LOGS TABLE ====================
CREATE TABLE AuditLogs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    timestamp DATETIME DEFAULT GETDATE(),
    username VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details NVARCHAR(MAX),
    ip_address VARCHAR(45)
);
GO

-- ==================== ORDERS TABLE ====================
CREATE TABLE Orders (
    id VARCHAR(50) PRIMARY KEY,
    date DATETIME DEFAULT GETDATE(),
    supplier_id INT NOT NULL,
    total DECIMAL(18,2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    FOREIGN KEY (supplier_id) REFERENCES Suppliers(id)
);
GO

-- ==================== ORDER_ITEMS TABLE ====================
CREATE TABLE OrderItems (
    id INT IDENTITY(1,1) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(18,2) NOT NULL,
    subtotal DECIMAL(18,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES Orders(id),
    FOREIGN KEY (product_id) REFERENCES Inventory(id)
);
GO
