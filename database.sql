-- =========================================
-- StockSenseDB Schema and Initial Data
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
    reorderLevel INT NOT NULL
);
GO

INSERT INTO Inventory (name, sku, category, price, stock, reorderLevel) VALUES
('Laptop - Dell XPS 15', 'LAP-DEL-001', 'Electronics', 75000, 45, 10),
('Wireless Mouse', 'ACC-MOU-002', 'Accessories', 850, 230, 30),
('Mechanical Keyboard', 'ACC-KEY-003', 'Accessories', 2500, 120, 20),
('Monitor 24"', 'MON-24-004', 'Electronics', 8500, 67, 15),
('Printer - LaserJet', 'PRI-LAS-005', 'Office', 5500, 8, 10),
('USB-C Hub', 'ACC-USB-006', 'Accessories', 1200, 0, 15),
('External SSD 1TB', 'STR-SSD-007', 'Storage', 4500, 34, 10),
('Webcam 1080p', 'ACC-WEB-008', 'Accessories', 2300, 18, 10),
('Headset', 'ACC-HEAD-009', 'Accessories', 1800, 42, 15),
('Tablet Stand', 'ACC-STD-010', 'Accessories', 650, 55, 20);
GO

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

INSERT INTO Sales (id, date, customer, items, total, payment, status) VALUES
('INV-2024-1001', '2024-02-28', 'Juan Dela Cruz', 3, 14275, 'GCash', 'Completed'),
('INV-2024-1002', '2024-02-28', 'Maria Santos', 1, 5299.99, 'Maya', 'Completed'),
('INV-2024-1003', '2024-02-27', 'Jose Rizal III', 5, 32567.50, 'Bank Transfer', 'Completed'),
('INV-2024-1004', '2024-02-27', 'Ana Marie Reyes', 2, 8456.00, 'COD', 'Pending'),
('INV-2024-1005', '2024-02-26', 'Carlos Mercado', 4, 24932.25, 'GCash', 'Completed'),
('INV-2024-1006', '2024-02-26', 'Kristine Flores', 6, 41280.75, 'Maya', 'Processing'),
('INV-2024-1007', '2024-02-25', 'Roberto Garcia', 2, 12500.00, 'Bank Transfer', 'Completed'),
('INV-2024-1008', '2024-02-25', 'Lisa Wong', 3, 8900.50, 'GCash', 'Completed');
GO

-- ==================== CUSTOMERS TABLE ====================
CREATE TABLE Customers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    city VARCHAR(100) NOT NULL,
    orders INT NOT NULL,
    totalSpent DECIMAL(18,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL
);
GO

INSERT INTO Customers (name, email, phone, city, orders, totalSpent, status, type) VALUES
('Juan Dela Cruz', 'juan.delacruz@email.com', '0917-123-4567', 'Mandaluyong City', 15, 187500, 'active', 'regular'),
('Maria Santos', 'maria.santos@email.com', '0928-234-5678', 'Quezon City', 8, 84500, 'active', 'vip'),
('Jose Rizal III', 'jose.rizal@email.com', '0939-345-6789', 'Calamba, Laguna', 23, 312000, 'active', 'vip'),
('Ana Marie Reyes', 'ana.reyes@email.com', '0945-456-7890', 'Cebu City', 5, 32450, 'active', 'regular'),
('Carlos Mercado', 'carlos.mercado@email.com', '0956-567-8901', 'Davao City', 12, 98750, 'inactive', 'regular'),
('Kristine Flores', 'kristine.flores@email.com', '0967-678-9012', 'Pasig City', 7, 62300, 'active', 'regular'),
('Roberto Garcia', 'roberto.garcia@email.com', '0978-789-0123', 'Makati City', 19, 245800, 'active', 'vip'),
('Lisa Wong', 'lisa.wong@email.com', '0989-890-1234', 'Manila', 4, 28900, 'active', 'regular');
GO
