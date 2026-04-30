<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $sql = "SELECT * FROM Sales ORDER BY date DESC, id DESC";
    $stmt = sqlsrv_query($conn, $sql);
    
    if ($stmt === false) {
        echo json_encode(["success" => false, "errors" => sqlsrv_errors()]);
        exit;
    }
    
    $sales = [];
    while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        // Formatting for JSON
        $row['total'] = (float) $row['total'];
        $row['items'] = (int) $row['items'];
        // Format date string from SQLSRV if not already string
        // PDO/SQLSRV can return DateTime objects depending on settings
        if ($row['date'] instanceof DateTime) {
            $row['date'] = $row['date']->format('Y-m-d');
        }
        $sales[] = $row;
    }
    
    echo json_encode($sales);
}
elseif ($method === 'POST') {
    $rawData = file_get_contents("php://input");
    $data = json_decode($rawData, true);
    $action = $data['action'] ?? 'create';

    if ($action === 'create') {
        $customer = $data['customer'] ?? 'Walk-in';
        $total = $data['total'] ?? 0;
        $itemsCount = $data['itemsCount'] ?? 0;
        $payment = $data['payment'] ?? 'Cash';
        $cart = $data['cart'] ?? []; 

        if (empty($cart)) {
            echo json_encode(["success" => false, "message" => "Cart is empty"]);
            exit;
        }

        $saleId = 'INV-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));
        $today = date('Y-m-d');

        if (sqlsrv_begin_transaction($conn) === false) {
            echo json_encode(["success" => false, "message" => "Failed to start transaction"]);
            exit;
        }

        $sqlSale = "INSERT INTO Sales (id, date, customer, items, total, payment, status) VALUES (?, ?, ?, ?, ?, ?, 'Pending')";
        $paramsSale = array($saleId, $today, $customer, $itemsCount, $total, $payment);
        $stmtSale = sqlsrv_query($conn, $sqlSale, $paramsSale);

        if ($stmtSale === false) {
            sqlsrv_rollback($conn);
            echo json_encode(["success" => false, "message" => "Failed to save sale", "errors" => sqlsrv_errors()]);
            exit;
        }

        foreach ($cart as $item) {
            $sqlItem = "INSERT INTO SalesItems (sale_id, product_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)";
            $paramsItem = array($saleId, $item['product_id'], $item['quantity'], $item['price'], $item['subtotal']);
            $stmtItem = sqlsrv_query($conn, $sqlItem, $paramsItem);

            if ($stmtItem === false) {
                sqlsrv_rollback($conn);
                echo json_encode(["success" => false, "message" => "Failed to save sale items", "errors" => sqlsrv_errors()]);
                exit;
            }
        }

        sqlsrv_commit($conn);
        echo json_encode(["success" => true, "sale_id" => $saleId]);
    }
    elseif ($action === 'updateStatus') {
        $saleId = $data['id'] ?? null;
        $status = $data['status'] ?? null; // 'Completed' or 'Cancelled'

        if (!$saleId || !$status) {
            echo json_encode(["success" => false, "message" => "Missing data"]);
            exit;
        }

        sqlsrv_begin_transaction($conn);

        // 1. Update status
        $sql = "UPDATE Sales SET status = ? WHERE id = ?";
        $stmt = sqlsrv_query($conn, $sql, [$status, $saleId]);
        if ($stmt === false) {
            sqlsrv_rollback($conn);
            echo json_encode(["success" => false, "errors" => sqlsrv_errors()]);
            exit;
        }

        // 2. If status is Completed, deduct inventory
        if ($status === 'Completed') {
            $sqlItems = "SELECT product_id, quantity FROM SalesItems WHERE sale_id = ?";
            $stmtItems = sqlsrv_query($conn, $sqlItems, [$saleId]);
            while ($item = sqlsrv_fetch_array($stmtItems, SQLSRV_FETCH_ASSOC)) {
                $sqlInv = "UPDATE Inventory SET stock = stock - ? WHERE id = ?";
                $stmtInv = sqlsrv_query($conn, $sqlInv, [$item['quantity'], $item['product_id']]);
                if ($stmtInv === false) {
                    sqlsrv_rollback($conn);
                    echo json_encode(["success" => false, "message" => "Failed to update stock", "errors" => sqlsrv_errors()]);
                    exit;
                }
            }
        }

        sqlsrv_commit($conn);
        echo json_encode(["success" => true]);
    }
}
else {
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
}
?>
