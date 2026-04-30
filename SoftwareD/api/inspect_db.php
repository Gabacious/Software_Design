<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

$sql = "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SalesItems'";
$stmt = sqlsrv_query($conn, $sql);

if ($stmt === false) {
    echo json_encode(["success" => false, "errors" => sqlsrv_errors()]);
    exit;
}

$columns = [];
while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
    $columns[] = $row['COLUMN_NAME'];
}

echo json_encode([
    "success" => true,
    "table" => "SalesItems",
    "columns" => $columns
]);
?>
