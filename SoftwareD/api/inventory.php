<?php
header('Content-Type: application/json');
require_once 'db_connect.php';
require_once 'audit.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $sql = "SELECT i.*, s.name as supplier_name FROM Inventory i LEFT JOIN Suppliers s ON i.supplier_id = s.id";
    $stmt = sqlsrv_query($conn, $sql);
    
    if ($stmt === false) {
        echo json_encode(["success" => false, "errors" => sqlsrv_errors()]);
        exit;
    }
    
    $inventory = [];
    while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        // Convert numeric strings to numbers for JS compatibility
        $row['price'] = (float) $row['price'];
        $row['stock'] = (int) $row['stock'];
        $row['reorderLevel'] = (int) $row['reorderLevel'];
        $inventory[] = $row;
    }
    
    echo json_encode($inventory);
}
elseif ($method === 'POST') {
    $rawData = file_get_contents("php://input");
    $data = json_decode($rawData, true);
    $action = $data['action'] ?? '';

    if ($action === 'add') {
        $name = $data['name'] ?? null;
        $sku = $data['sku'] ?? null;
        $category = $data['category'] ?? null;
        $price = $data['price'] ?? null;
        $stock = $data['stock'] ?? null;
        $reorderLevel = $data['reorderLevel'] ?? 10;
        $status = $data['status'] ?? 'active';
        $supplier_id = $data['supplier_id'] ?? null;

        if (!$name || !$sku || !$category || $price === null || $stock === null) {
            echo json_encode(["success" => false, "message" => "Missing required fields"]);
            exit;
        }

        $sql = "INSERT INTO Inventory (name, sku, category, price, stock, reorderLevel, status, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $params = array($name, $sku, $category, $price, $stock, $reorderLevel, $status, $supplier_id);
        $stmt = sqlsrv_query($conn, $sql, $params);

        if ($stmt === false) {
            echo json_encode(["success" => false, "message" => "Database Insert error.", "errors" => sqlsrv_errors()]);
            exit;
        }
        logAction($conn, 'Add Inventory', "Added product: $name (SKU: $sku)");
        echo json_encode(["success" => true, "message" => "Product added successfully"]);
    } 
    elseif ($action === 'update') {
        $id = $data['id'] ?? null;
        $name = $data['name'] ?? null;
        $sku = $data['sku'] ?? null;
        $category = $data['category'] ?? null;
        $price = $data['price'] ?? null;
        $stock = $data['stock'] ?? null;
        $reorderLevel = $data['reorderLevel'] ?? null;
        $status = $data['status'] ?? null;
        $supplier_id = $data['supplier_id'] ?? null;

        if ($id === null || !$name || !$sku || !$category || $price === null || $stock === null) {
            echo json_encode(["success" => false, "message" => "Missing required fields"]);
            exit;
        }

        $sql = "UPDATE Inventory SET name = ?, sku = ?, category = ?, price = ?, stock = ?, reorderLevel = ?, status = ?, supplier_id = ? WHERE id = ?";
        $params = array($name, $sku, $category, $price, $stock, $reorderLevel, $status, $supplier_id, $id);
        $stmt = sqlsrv_query($conn, $sql, $params);

        if ($stmt === false) {
            echo json_encode(["success" => false, "message" => "Database Update error.", "errors" => sqlsrv_errors()]);
            exit;
        }
        logAction($conn, 'Update Inventory', "Updated product: $name (ID: $id)");
        echo json_encode(["success" => true, "message" => "Inventory updated successfully"]);
    } 
    elseif ($action === 'delete') {
        $id = $data['id'] ?? null;
        if ($id === null) {
            echo json_encode(["success" => false, "message" => "Missing ID"]);
            exit;
        }

        $sql = "DELETE FROM Inventory WHERE id = ?";
        $params = array($id);
        $stmt = sqlsrv_query($conn, $sql, $params);

        if ($stmt === false) {
            echo json_encode(["success" => false, "message" => "Database Delete error.", "errors" => sqlsrv_errors()]);
            exit;
        }
        logAction($conn, 'Delete Inventory', "Deleted product ID: $id");
        echo json_encode(["success" => true, "message" => "Product deleted successfully"]);
    }
    else {
        echo json_encode(["success" => false, "message" => "Invalid action"]);
    }
}
else {
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
}
?>
