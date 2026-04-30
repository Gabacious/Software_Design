<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

// Set timezone
date_default_timezone_set('Asia/Manila');

$action = $_GET['action'] ?? '';
$filterDate = $_GET['date'] ?? null;
$whereClause = $filterDate ? "WHERE CAST(date AS DATE) = ?" : "";
$params = $filterDate ? [$filterDate] : [];

if ($action === 'stats') {
    $stats = [
        'products' => 0,
        'lowStock' => 0,
        'salesToday' => 0,
        'orders' => 0,
        'productsTrend' => '+12%',
        'lowStockTrend' => '-5%',
        'salesTrend' => '+8.3%',
        'ordersTrend' => '+23'
    ];
    
    // Total Products (Active/Inactive only)
    $result = sqlsrv_query($conn, "SELECT COUNT(*) as count FROM Inventory WHERE status <> 'discontinued'");
    if ($result) {
        $row = sqlsrv_fetch_array($result, SQLSRV_FETCH_ASSOC);
        $stats['products'] = (int) $row['count'];
    }
    
    // Low Stock
    $result = sqlsrv_query($conn, "SELECT COUNT(*) as count FROM Inventory WHERE stock < reorderLevel AND status <> 'discontinued'");
    if ($result) {
        $row = sqlsrv_fetch_array($result, SQLSRV_FETCH_ASSOC);
        $stats['lowStock'] = (int) $row['count'];
    }
    
    // Total Sales Sum
    $sqlSales = "SELECT SUM(total) as sumTotal FROM Sales $whereClause";
    $resultSales = sqlsrv_query($conn, $sqlSales, $params);
    if ($resultSales && $rowSales = sqlsrv_fetch_array($resultSales, SQLSRV_FETCH_ASSOC)) {
        $stats['salesToday'] = $rowSales['sumTotal'] ? (float) $rowSales['sumTotal'] : 0;
    }

    // Total Procurement Orders
    $sqlProc = "SELECT COUNT(*) as count FROM Orders $whereClause";
    $resultProc = sqlsrv_query($conn, $sqlProc, $params);
    if ($resultProc && $rowProc = sqlsrv_fetch_array($resultProc, SQLSRV_FETCH_ASSOC)) {
        $stats['orders'] = (int) $rowProc['count'];
    }
    
    $stats['effectiveDate'] = $filterDate;
    $stats['isOverall'] = $filterDate === null;
    echo json_encode($stats);
}
elseif ($action === 'recentOrders') {
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 5;
    $sqlTop = "SELECT TOP ($limit) id, customer, total, status FROM Sales $whereClause ORDER BY date DESC, id DESC";
    $stmt = sqlsrv_query($conn, $sqlTop, $params);
    $orders = [];
    if ($stmt) {
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            $row['total'] = (float) $row['total'];
            $orders[] = $row;
        }
    }
    echo json_encode($orders);
}
elseif ($action === 'recentSupplierOrders') {
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 5;
    $sqlTop = "SELECT TOP ($limit) O.id, S.name as supplier_name, O.total, O.status 
               FROM Orders O 
               LEFT JOIN Suppliers S ON O.supplier_id = S.id 
               $whereClause 
               ORDER BY O.date DESC, O.id DESC";
    $stmt = sqlsrv_query($conn, $sqlTop, $params);
    $orders = [];
    if ($stmt) {
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            $row['total'] = (float) $row['total'];
            // Handle null supplier gracefully
            if (!$row['supplier_name']) $row['supplier_name'] = 'Unknown Supplier';
            $orders[] = $row;
        }
    }
    echo json_encode($orders);
}
elseif ($action === 'reports') {
    $data = [
        'effectiveDate' => $filterDate,
        'isOverall' => $filterDate === null,
        'monthlySales' => [],
        'topProducts' => [],
        'summary' => [
            'totalRevenue' => 0,
            'totalOrders' => 0,
            'averageOrderValue' => 0,
            'inventoryValue' => 0
        ],
        'quickStats' => [
            'bestCategory' => '',
            'bestCategorySalesPct' => 0,
            'topCustomer' => '',
            'topCustomerSpent' => 0,
            'topPayment' => '',
            'topPaymentPct' => 0
        ]
    ];

    // 1. Monthly Sales (Trend) - Always Overall
    $sql = "SELECT TOP 6 FORMAT(date, 'MMM') as month, SUM(total) as sales, COUNT(*) as orders, MONTH(date) as m, YEAR(date) as y
            FROM Sales 
            GROUP BY FORMAT(date, 'MMM'), MONTH(date), YEAR(date)
            ORDER BY y DESC, m DESC";
    $stmt = sqlsrv_query($conn, $sql);
    if ($stmt) {
        $months = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            $months[] = [
                'month' => $row['month'],
                'sales' => (float)$row['sales'],
                'orders' => (int)$row['orders']
            ];
        }
        $data['monthlySales'] = array_reverse($months);
    }

    // 2. Top Selling Products
    $sql = "SELECT TOP 5 I.name, SUM(SI.quantity) as sales, SUM(SI.subtotal) as revenue, MAX(I.stock) as stock
            FROM SalesItems SI
            JOIN Sales S ON SI.sale_id = S.id
            JOIN Inventory I ON SI.product_id = I.id
            $whereClause
            GROUP BY I.name
            ORDER BY sales DESC";
    $stmt = sqlsrv_query($conn, $sql, $params);
    
    if ($stmt) {
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            $data['topProducts'][] = [
                'name' => $row['name'],
                'sales' => (int)$row['sales'],
                'revenue' => (float)$row['revenue'],
                'stock' => (int)$row['stock']
            ];
        }
    }

    // 3. Summary stats
    $sql = "SELECT SUM(total) as totalRevenue, COUNT(*) as totalOrders FROM Sales $whereClause";
    $stmt = sqlsrv_query($conn, $sql, $params);
    if ($stmt && $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        $data['summary']['totalRevenue'] = (float)($row['totalRevenue'] ?? 0);
        $data['summary']['totalOrders'] = (int)($row['totalOrders'] ?? 0);
        if ($data['summary']['totalOrders'] > 0) {
            $data['summary']['averageOrderValue'] = $data['summary']['totalRevenue'] / $data['summary']['totalOrders'];
        }
    }

    $invRes = sqlsrv_query($conn, "SELECT SUM(price * stock) as inventoryValue FROM Inventory WHERE status <> 'discontinued' OR status IS NULL");
    if ($invRes && $row = sqlsrv_fetch_array($invRes, SQLSRV_FETCH_ASSOC)) {
        $data['summary']['inventoryValue'] = (float)($row['inventoryValue'] ?? 0);
    }

    // 4. Quick Stats
    $sql = "SELECT TOP 1 customer as name, SUM(total) as spent FROM Sales $whereClause GROUP BY customer ORDER BY spent DESC";
    $stmt = sqlsrv_query($conn, $sql, $params);
    if ($stmt && $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        $data['quickStats']['topCustomer'] = $row['name'];
        $data['quickStats']['topCustomerSpent'] = (float)$row['spent'];
    }

    $paymentWhere = $filterDate ? "WHERE CAST(date AS DATE) = ?" : "";
    $sql = "SELECT TOP 1 payment, COUNT(*) as count, (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Sales $paymentWhere)) as pct FROM Sales $whereClause GROUP BY payment ORDER BY count DESC";
    $pParams = $filterDate ? [$filterDate, $filterDate] : [];
    $stmt = sqlsrv_query($conn, $sql, $pParams);
    if ($stmt && $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        $data['quickStats']['topPayment'] = $row['payment'];
        $data['quickStats']['topPaymentPct'] = round((float)$row['pct']);
    }

    $sql = "SELECT TOP 1 category, COUNT(*) as count, (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Inventory)) as pct FROM Inventory GROUP BY category ORDER BY count DESC";
    $stmt = sqlsrv_query($conn, $sql);
    if ($stmt && $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        $data['quickStats']['bestCategory'] = $row['category'];
        $data['quickStats']['bestCategorySalesPct'] = round((float)$row['pct']);
    }

    echo json_encode($data);
}
else {
    echo json_encode(["success" => false, "message" => "Invalid action"]);
}
?>
