<?php
header('Content-Type: application/json');
require_once 'db_connect.php';
require_once 'audit.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $sql = "SELECT id, username, role, employeeId, name FROM Users ORDER BY name ASC";
    $stmt = sqlsrv_query($conn, $sql);
    
    if ($stmt === false) {
        echo json_encode(["success" => false, "errors" => sqlsrv_errors()]);
        exit;
    }
    
    $users = [];
    while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        $users[] = $row;
    }
    echo json_encode($users);
}
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (isset($data['action']) && $data['action'] === 'delete') {
        $sql = "DELETE FROM Users WHERE id = ?";
        $stmt = sqlsrv_query($conn, $sql, [$data['id']]);
        if ($stmt) {
            logAction($conn, 'DELETE_USER', "Deleted user with ID: " . $data['id']);
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["success" => false, "errors" => sqlsrv_errors()]);
        }
    } else {
        // Add or Update
        $id = $data['id'] ?? null;
        $username = $data['username'];
        $name = $data['name'];
        $role = $data['role'];
        $employeeId = $data['employeeId'];
        
        if ($id) {
            // Update
            if (!empty($data['password'])) {
                $sql = "UPDATE Users SET username=?, name=?, role=?, employeeId=?, password=? WHERE id=?";
                $params = [$username, $name, $role, $employeeId, $data['password'], $id];
            } else {
                $sql = "UPDATE Users SET username=?, name=?, role=?, employeeId=? WHERE id=?";
                $params = [$username, $name, $role, $employeeId, $id];
            }
        } else {
            // Add
            $password = $data['password'] ?? 'User@123';
            $sql = "INSERT INTO Users (username, name, role, employeeId, password) VALUES (?, ?, ?, ?, ?)";
            $params = [$username, $name, $role, $employeeId, $password];
        }
        
        $stmt = sqlsrv_query($conn, $sql, $params);
        if ($stmt) {
            if ($id) {
                logAction($conn, 'UPDATE_USER', "Updated user: $username ($name)");
            } else {
                logAction($conn, 'CREATE_USER', "Created new user: $username ($name)");
            }
            echo json_encode(["success" => true]);
        } else {
            $errors = sqlsrv_errors();
            $errorMsg = "Database error.";
            if ($errors && isset($errors[0]['message'])) {
                $errorMsg = $errors[0]['message'];
            }
            echo json_encode(["success" => false, "message" => $errorMsg]);
        }
    }
}
?>
