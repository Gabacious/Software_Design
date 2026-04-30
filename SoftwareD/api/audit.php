<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Logs an action to the AuditLogs table
 */
function logAction($conn, $action, $details = null) {
    $username = $_SESSION['stockSenseUser']['username'] ?? 'System';
    $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
    
    $sql = "INSERT INTO AuditLogs (username, action, details, ip_address) VALUES (?, ?, ?, ?)";
    $params = array($username, $action, $details, $ip_address);
    
    $stmt = sqlsrv_query($conn, $sql, $params);
    return $stmt !== false;
}

// Check if this script is being accessed directly via API
if (basename($_SERVER['PHP_SELF']) == 'audit.php') {
    $action = $_GET['action'] ?? '';

    if ($action === 'getLogs') {
        // Admin only check
        if (!isset($_SESSION['stockSenseUser']) || $_SESSION['stockSenseUser']['role'] !== 'admin') {
            echo json_encode(["success" => false, "message" => "Unauthorized access"]);
            exit;
        }

        $filterDate = $_GET['date'] ?? null;
        
        $sql = "SELECT id, timestamp, username, action, details, ip_address FROM AuditLogs";
        $params = [];
        
        if ($filterDate) {
            $sql .= " WHERE CAST(timestamp AS DATE) = ?";
            $params = [$filterDate];
        }
        
        $sql .= " ORDER BY timestamp DESC";
        $stmt = sqlsrv_query($conn, $sql, $params);

        if ($stmt === false) {
            echo json_encode(["success" => false, "message" => "Database error.", "errors" => sqlsrv_errors()]);
            exit;
        }

        $logs = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            $logs[] = $row;
        }
        echo json_encode($logs);
    } else {
        // This script can be included in other files without executing the API logic
    }
}
?>
