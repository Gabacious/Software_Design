<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

// Start a session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Get the raw POST data
$rawData = file_get_contents("php://input");
$data = json_decode($rawData, true);

$action = $_GET['action'] ?? ($data['action'] ?? '');

if ($action === 'login') {
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    $sql = "SELECT username, role, employeeId, name FROM Users WHERE username = ? AND password = ?";
    $params = array($username, $password);
    
    $stmt = sqlsrv_query($conn, $sql, $params);
    
    if ($stmt === false) {
        echo json_encode(["success" => false, "message" => "Database error.", "errors" => sqlsrv_errors()]);
        exit;
    }
    
    if ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        // Create session
        $sessionData = [
            'username' => $row['username'],
            'role' => $row['role'],
            'employeeId' => $row['employeeId'],
            'name' => $row['name'],
            'loginTime' => date('c'),
            'sessionId' => 'sess_' . bin2hex(random_bytes(5))
        ];
        $_SESSION['stockSenseUser'] = $sessionData;
        
        require_once 'audit.php';
        logAction($conn, 'Login', 'User logged in successfully');
        
        echo json_encode(["success" => true, "user" => $sessionData]);
    } else {
        require_once 'audit.php';
        logAction($conn, 'Failed Login', "Failed login attempt for username: $username");
        echo json_encode(["success" => false, "message" => "Invalid credentials"]);
    }
}
elseif ($action === 'session') {
    if (isset($_SESSION['stockSenseUser'])) {
        $session = $_SESSION['stockSenseUser'];
        
        // Validate session time
        $loginTime = strtotime($session['loginTime']);
        $now = time();
        $elapsedMinutes = ($now - $loginTime) / 60;
        
        if ($elapsedMinutes > 30) {
            unset($_SESSION['stockSenseUser']);
            echo json_encode(["valid" => false, "reason" => "expired"]);
        } else {
            echo json_encode(["valid" => true, "session" => $session]);
        }
    } else {
        echo json_encode(["valid" => false, "reason" => "no_session"]);
    }
}
elseif ($action === 'logout') {
    require_once 'audit.php';
    logAction($conn, 'Logout', 'User logged out');
    unset($_SESSION['stockSenseUser']);
    session_destroy();
    echo json_encode(["success" => true]);
}
else {
    echo json_encode(["success" => false, "message" => "Invalid action"]);
}
?>
