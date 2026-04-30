<?php
// ==========================================
// Database Connection (db_connect.php)
// ==========================================

$serverName = "Clint\SQLEXPRESS"; // Update with your SQL Server instance name, e.g., "localhost\SQLEXPRESS"
$database = "StockSenseDB";

// If using SQL Server Authentication, set UID and PWD
// $uid = "your_username";
// $pwd = "your_password";

// Connection Options for Windows Authentication
$connectionOptions = array(
    "Database" => $database,
    // "Uid" => $uid,       // Uncomment if using SQL Server Authentication
    // "PWD" => $pwd,       // Uncomment if using SQL Server Authentication
    "ReturnDatesAsStrings" => true
);

// Establishes the connection
$conn = sqlsrv_connect($serverName, $connectionOptions);

if ($conn === false) {
    // If connection fails, return JSON error to the frontend
    header('Content-Type: application/json');
    echo json_encode([
        "success" => false, 
        "message" => "Could not connect to the database.",
        "errors" => sqlsrv_errors()
    ]);
    die();
}
?>
