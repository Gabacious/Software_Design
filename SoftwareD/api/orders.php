<?php
header('Content-Type: application/json');
require_once 'db_connect.php';
require_once 'audit.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $supplierId = $_GET['supplier_id'] ?? null;
    $action = $_GET['action'] ?? 'list';

    if ($action === 'productsBySupplier') {
        if (!$supplierId) {
            echo json_encode(["success" => false, "message" => "Supplier ID required"]);
            exit;
        }
        $sql = "SELECT id, name, price, stock, sku FROM Inventory WHERE supplier_id = ? AND status != 'inactive'";
        $stmt = sqlsrv_query($conn, $sql, [$supplierId]);
        
        $products = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            $products[] = $row;
        }
        echo json_encode($products);
    } elseif ($action === 'orderDetails') {
        $orderId = $_GET['order_id'] ?? null;
        if (!$orderId) {
            echo json_encode(["success" => false, "message" => "Order ID required"]);
            exit;
        }

        // Fetch Order Items
        $sql = "SELECT oi.*, i.name as product_name, i.sku 
                FROM OrderItems oi 
                JOIN Inventory i ON oi.product_id = i.id 
                WHERE oi.order_id = ?";
        $stmt = sqlsrv_query($conn, $sql, [$orderId]);
        
        $items = [];
        if ($stmt) {
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                $row['price'] = (float)$row['price'];
                $row['quantity'] = (int)$row['quantity'];
                $row['subtotal'] = (float)$row['subtotal'];
                $items[] = $row;
            }
        }
        echo json_encode(["success" => true, "items" => $items]);
    } else {
        // List Orders
        $sql = "SELECT o.*, s.name as supplier_name 
                FROM Orders o 
                JOIN Suppliers s ON o.supplier_id = s.id 
                ORDER BY o.date DESC";
        $stmt = sqlsrv_query($conn, $sql);
        
        $orders = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            $orders[] = $row;
        }
        echo json_encode($orders);
    }
} elseif ($method === 'POST') {
    $action = $_GET['action'] ?? 'create';

    if ($action === 'autoDraftPOs') {
        $sql = "SELECT id, price, stock, reorderLevel, supplier_id 
                FROM Inventory 
                WHERE stock <= reorderLevel AND status != 'inactive' AND supplier_id IS NOT NULL";
        $stmt = sqlsrv_query($conn, $sql);
        
        $lowStockItems = [];
        if ($stmt) {
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                $lowStockItems[] = $row;
            }
        }

        if (empty($lowStockItems)) {
            echo json_encode(["success" => true, "message" => "No items need drafting"]);
            exit;
        }

        $draftsCreated = 0;
        $itemsBySupplier = [];
        foreach ($lowStockItems as $item) {
            $itemsBySupplier[$item['supplier_id']][] = $item;
        }

        foreach ($itemsBySupplier as $supplierId => $items) {
            $sqlCheck = "SELECT id FROM Orders WHERE supplier_id = ? AND status = 'Pending'";
            $stmtCheck = sqlsrv_query($conn, $sqlCheck, [$supplierId]);
            $existingOrder = sqlsrv_fetch_array($stmtCheck, SQLSRV_FETCH_ASSOC);

            if (!$existingOrder) {
                $orderId = 'PO-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));
                $total = 0;

                sqlsrv_begin_transaction($conn);

                $sqlOrder = "INSERT INTO Orders (id, supplier_id, total, status) VALUES (?, ?, ?, 'Pending')";
                sqlsrv_query($conn, $sqlOrder, [$orderId, $supplierId, 0]);

                foreach ($items as $item) {
                    $qty = max(10, ($item['reorderLevel'] * 2) - $item['stock']);
                    $subtotal = $qty * $item['price'];
                    $total += $subtotal;

                    $sqlItem = "INSERT INTO OrderItems (order_id, product_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)";
                    sqlsrv_query($conn, $sqlItem, [$orderId, $item['id'], $qty, $item['price'], $subtotal]);
                }

                $sqlUpdateTotal = "UPDATE Orders SET total = ? WHERE id = ?";
                sqlsrv_query($conn, $sqlUpdateTotal, [$total, $orderId]);

                sqlsrv_commit($conn);
                logAction($conn, 'AUTO_DRAFT_PO', "System auto-drafted order $orderId for supplier ID: $supplierId");
                $draftsCreated++;
            }
        }

        echo json_encode(["success" => true, "drafts_created" => $draftsCreated]);
        exit;

    } elseif ($action === 'receive') {
        $data = json_decode(file_get_contents('php://input'), true);
        $orderId = $data['order_id'] ?? null;
        if (!$orderId) {
            echo json_encode(["success" => false, "message" => "Order ID required"]);
            exit;
        }

        sqlsrv_begin_transaction($conn);

        // 1. Get current items in order
        $sqlItems = "SELECT product_id, quantity FROM OrderItems WHERE order_id = ?";
        $stmtItems = sqlsrv_query($conn, $sqlItems, [$orderId]);
        
        if ($stmtItems) {
            while ($item = sqlsrv_fetch_array($stmtItems, SQLSRV_FETCH_ASSOC)) {
                // 2. Update Inventory stock
                $sqlInv = "UPDATE Inventory SET stock = stock + ? WHERE id = ?";
                sqlsrv_query($conn, $sqlInv, [$item['quantity'], $item['product_id']]);
            }
        }

        // 3. Update Order status
        $sqlOrder = "UPDATE Orders SET status = 'Received' WHERE id = ?";
        $stmtOrder = sqlsrv_query($conn, $sqlOrder, [$orderId]);

        if ($stmtOrder === false) {
            sqlsrv_rollback($conn);
            echo json_encode(["success" => false, "message" => "Failed to update order status", "errors" => sqlsrv_errors()]);
            exit;
        }

        sqlsrv_commit($conn);
        logAction($conn, 'RECEIVE_ORDER', "Marked order $orderId as Received and updated inventory stock.");
        echo json_encode(["success" => true]);
        exit;
        
    } elseif ($action === 'approve') {
        $data = json_decode(file_get_contents('php://input'), true);
        $orderId = $data['order_id'] ?? null;
        if (!$orderId) {
            echo json_encode(["success" => false, "message" => "Order ID required"]);
            exit;
        }
        
        $sql = "UPDATE Orders SET status = 'Pending' WHERE id = ?";
        $stmt = sqlsrv_query($conn, $sql, [$orderId]);
        if ($stmt === false) {
            echo json_encode(["success" => false, "message" => "Failed to approve order", "errors" => sqlsrv_errors()]);
            exit;
        }
        logAction($conn, 'APPROVE_ORDER', "Approved draft order $orderId");
        echo json_encode(["success" => true]);
        exit;
        
    } elseif ($action === 'delete') {
        $data = json_decode(file_get_contents('php://input'), true);
        $orderId = $data['order_id'] ?? null;
        if (!$orderId) {
            echo json_encode(["success" => false, "message" => "Order ID required"]);
            exit;
        }

        sqlsrv_begin_transaction($conn);
        sqlsrv_query($conn, "DELETE FROM OrderItems WHERE order_id = ?", [$orderId]);
        $stmt = sqlsrv_query($conn, "DELETE FROM Orders WHERE id = ?", [$orderId]);
        
        if ($stmt === false) {
            sqlsrv_rollback($conn);
            echo json_encode(["success" => false, "message" => "Failed to delete order", "errors" => sqlsrv_errors()]);
            exit;
        }

        sqlsrv_commit($conn);
        logAction($conn, 'DELETE_ORDER', "Deleted order $orderId");
        echo json_encode(["success" => true]);
        exit;

    } else {
        // Default create action
        $data = json_decode(file_get_contents('php://input'), true);
        
        $has_supplier = array_key_exists('supplier_id', $data);
        $has_items = isset($data['items']);
        $items_not_empty = !empty($data['items']);

        if (!$has_supplier || !$has_items || !$items_not_empty) {
            $missing = [];
            if (!$has_supplier) $missing[] = 'supplier_id';
            if (!$has_items) $missing[] = 'items';
            if ($has_items && !$items_not_empty) $missing[] = 'items (empty)';
            echo json_encode(["success" => false, "message" => "Missing order data: " . implode(', ', $missing)]);
            exit;
        }

        if ($data['supplier_id'] === null || $data['supplier_id'] === 'null') {
            echo json_encode(["success" => false, "message" => "This product has no linked supplier. Please assign a supplier first."]);
            exit;
        }

        $orderId = 'PO-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));
        $supplierId = $data['supplier_id'];
        $total = $data['total'];
        $status = 'Pending'; // Default status for new orders

        // Start transaction
        if (sqlsrv_begin_transaction($conn) === false) {
            echo json_encode(["success" => false, "message" => "Failed to start transaction"]);
            exit;
        }

        $sqlOrder = "INSERT INTO Orders (id, supplier_id, total, status) VALUES (?, ?, ?, ?)";
        $stmtOrder = sqlsrv_query($conn, $sqlOrder, [$orderId, $supplierId, $total, $status]);

        if ($stmtOrder === false) {
            sqlsrv_rollback($conn);
            echo json_encode(["success" => false, "message" => "Failed to create order", "errors" => sqlsrv_errors()]);
            exit;
        }

        foreach ($data['items'] as $item) {
            $sqlItem = "INSERT INTO OrderItems (order_id, product_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)";
            $paramsItem = [$orderId, $item['product_id'], $item['quantity'], $item['price'], $item['subtotal']];
            $stmtItem = sqlsrv_query($conn, $sqlItem, $paramsItem);

            if ($stmtItem === false) {
                sqlsrv_rollback($conn);
                echo json_encode(["success" => false, "message" => "Failed to add order items", "errors" => sqlsrv_errors()]);
                exit;
            }
        }

        sqlsrv_commit($conn);
        
        logAction($conn, 'CREATE_ORDER', "Created purchase order $orderId for supplier ID: $supplierId");
        
        echo json_encode(["success" => true, "order_id" => $orderId]);
    }
}
?>
