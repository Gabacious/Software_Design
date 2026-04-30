<?php
header('Content-Type: application/json');
require_once 'db_connect.php';
require_once 'audit.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $sql = "SELECT * FROM Suppliers";
    $stmt = sqlsrv_query($conn, $sql);
    
    if ($stmt === false) {
        echo json_encode(["success" => false, "errors" => sqlsrv_errors()]);
        exit;
    }
    
    $suppliers = [];
    while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        $suppliers[] = $row;
    }
    
    echo json_encode($suppliers);
}
elseif ($method === 'POST') {
    $rawData = file_get_contents("php://input");
    $data = json_decode($rawData, true);
    $action = $data['action'] ?? '';

    if ($action === 'add') {
        $name = $data['name'] ?? null;
        $contactPerson = $data['contactPerson'] ?? null;
        $email = $data['email'] ?? null;
        $phone = $data['phone'] ?? null;
        $address = $data['address'] ?? null;
        $category = $data['category'] ?? null;
        $status = $data['status'] ?? 'active';

        if (!$name || !$contactPerson || !$phone) {
            echo json_encode(["success" => false, "message" => "Missing required fields"]);
            exit;
        }

        $sql = "INSERT INTO Suppliers (name, contactPerson, email, phone, address, category, status) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $params = array($name, $contactPerson, $email, $phone, $address, $category, $status);
        $stmt = sqlsrv_query($conn, $sql, $params);

        if ($stmt === false) {
            echo json_encode(["success" => false, "message" => "Database Insert error.", "errors" => sqlsrv_errors()]);
            exit;
        }
        logAction($conn, 'Add Supplier', "Added supplier: $name");
        echo json_encode(["success" => true, "message" => "Supplier added successfully"]);
    } 
    elseif ($action === 'update') {
        $id = $data['id'] ?? null;
        $name = $data['name'] ?? null;
        $contactPerson = $data['contactPerson'] ?? null;
        $email = $data['email'] ?? null;
        $phone = $data['phone'] ?? null;
        $address = $data['address'] ?? null;
        $category = $data['category'] ?? null;
        $status = $data['status'] ?? 'active';

        if (!$id || !$name || !$contactPerson || !$phone) {
            echo json_encode(["success" => false, "message" => "Missing required fields"]);
            exit;
        }

        $sql = "UPDATE Suppliers SET name = ?, contactPerson = ?, email = ?, phone = ?, address = ?, category = ?, status = ? WHERE id = ?";
        $params = array($name, $contactPerson, $email, $phone, $address, $category, $status, $id);
        $stmt = sqlsrv_query($conn, $sql, $params);

        if ($stmt === false) {
            echo json_encode(["success" => false, "message" => "Database Update error.", "errors" => sqlsrv_errors()]);
            exit;
        }
        logAction($conn, 'Update Supplier', "Updated supplier: $name (ID: $id)");
        echo json_encode(["success" => true, "message" => "Supplier updated successfully"]);
    }
    elseif ($action === 'updateProducts') {
        $supplierId = $data['supplier_id'] ?? null;
        $productIds = $data['product_ids'] ?? [];
        
        if ($supplierId === null) {
            echo json_encode(["success" => false, "message" => "Supplier ID required"]);
            exit;
        }

        sqlsrv_begin_transaction($conn);
        $sqlUnlink = "UPDATE Inventory SET supplier_id = NULL WHERE supplier_id = ?";
        sqlsrv_query($conn, $sqlUnlink, [$supplierId]);

        if (!empty($productIds)) {
            $productIds = array_map('intval', $productIds);
            $idsList = implode(',', $productIds);
            $sqlLink = "UPDATE Inventory SET supplier_id = ? WHERE id IN ($idsList)";
            sqlsrv_query($conn, $sqlLink, [$supplierId]);
        }

        sqlsrv_commit($conn);
        logAction($conn, 'Link Products', "Updated product offerings for supplier ID: $supplierId");
        echo json_encode(["success" => true]);
        exit;
    }
    elseif ($action === 'delete') {
        $id = $data['id'] ?? null;
        if ($id === null) {
            echo json_encode(["success" => false, "message" => "Missing ID"]);
            exit;
        }

        $sql = "DELETE FROM Suppliers WHERE id = ?";
        $params = array($id);
        $stmt = sqlsrv_query($conn, $sql, $params);

        if ($stmt === false) {
            echo json_encode(["success" => false, "message" => "Database Delete error.", "errors" => sqlsrv_errors()]);
            exit;
        }
        logAction($conn, 'Delete Supplier', "Deleted supplier ID: $id");
        echo json_encode(["success" => true, "message" => "Supplier deleted successfully"]);
    }
    else {
        echo json_encode(["success" => false, "message" => "Invalid action"]);
    }
}
else {
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
}
?>
