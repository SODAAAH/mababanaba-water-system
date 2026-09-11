<?php
class AdminController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getAuthAdmin() {
        return SecurityContext::getAuthAdmin($this->pdo);
    }

    public function requireStationAdmin() {
        return SecurityContext::requireStationAdmin($this->pdo);
    }

    public function requireStationStaff() {
        return SecurityContext::requireStationStaff($this->pdo);
    }

    public function requireSuperAdmin() {
        return SecurityContext::requireSuperAdmin($this->pdo);
    }

    public function login() {
        $user = $_POST['username'] ?? ''; 
        $pass = $_POST['password'] ?? '';
        
        $stmt = $this->pdo->prepare("SELECT a.*, s.station_name, s.status as station_status FROM ADMIN a LEFT JOIN STATION s ON a.station_id = s.station_id WHERE a.username = ?"); 
        $stmt->execute([$user]);
        $a = $stmt->fetch();
        
        if ($a && password_verify($pass, $a['password'])) {
            if ($a['status'] === 'Revoked') { echo json_encode(['error' => 'Access revoked.']); exit; }
            if ($a['station_id'] && $a['station_status'] === 'Suspended') { echo json_encode(['error' => 'Station suspended.']); exit; }
            session_regenerate_id(true);
            $_SESSION['admin_id'] = $a['admin_id']; 
            $_SESSION['station_id'] = $a['station_id']; 
            $_SESSION['role'] = $a['role'];
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            $ip = $_SERVER['REMOTE_ADDR'] ?? '';
            if ($ip) {
                $this->pdo->prepare("DELETE FROM rate_limits WHERE ip_address = ? AND action IN ('admin_login', 'customer_login')")->execute([$ip]);
            }
            unset($a['password'], $a['otp_code'], $a['otp_expiry'], $a['new_temp_contact'], $a['failed_otp_attempts']);
            echo json_encode(['success' => true, 'admin' => $a, 'csrf_token' => $_SESSION['csrf_token']]);
        } else { 
            echo json_encode(['error' => 'Invalid credentials']); 
        }
        exit;
    }

    public function saGetStations() {
        $this->requireSuperAdmin();
        $stmt = $this->pdo->query("SELECT s.*, a.username as admin_username FROM STATION s LEFT JOIN ADMIN a ON s.station_id = a.station_id AND a.role = 'Admin' ORDER BY s.station_id DESC");
        echo json_encode($stmt->fetchAll());
        exit;
    }

    public function saAddStation() {
        $this->requireSuperAdmin();
        $this->pdo->beginTransaction();
        try {
            $this->pdo->prepare("INSERT INTO STATION (station_name, address, contact_number) VALUES (?, ?, ?)")->execute([$_POST['station_name'], $_POST['address'], $_POST['contact']]);
            $sid = $this->pdo->lastInsertId();
            $this->pdo->prepare("INSERT INTO INVENTORY (station_id, stock_level, round_jugs, slim_jugs) VALUES (?, 0, 0, 0)")->execute([$sid]);
            $hp = password_hash($_POST['admin_password'], PASSWORD_DEFAULT);
            $this->pdo->prepare("INSERT INTO ADMIN (station_id, username, password, role) VALUES (?, ?, ?, 'Admin')")->execute([$sid, $_POST['admin_username'], $hp]);
            $this->pdo->commit(); 
            echo json_encode(['success'=>true]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log($e->getMessage());
            echo json_encode(['error' => $e->getMessage()]);
        }
        exit;
    }

    public function saToggleStation() {
        $this->requireSuperAdmin();
        $this->pdo->prepare("UPDATE STATION SET status = ? WHERE station_id = ?")->execute([$_POST['status'], $_POST['station_id']]);
        CustomerController::clearStationsCache();
        echo json_encode(['success'=>true]); 
        exit;
    }

    public function saDeleteStation() {
        $this->requireSuperAdmin();
        $stmt = $this->pdo->prepare("DELETE FROM STATION WHERE station_id = ? AND status = 'Suspended'"); 
        $stmt->execute([$_POST['station_id']]);
        if($stmt->rowCount() > 0) { echo json_encode(['success'=>true]); } else { echo json_encode(['error'=>'Must be Suspended first.']); }
        exit;
    }

    public function saGetUsers() {
        $this->requireSuperAdmin();
        
        $admins = $this->pdo->query("
            SELECT a.admin_id, a.station_id, a.username, a.role, a.status, s.station_name 
            FROM ADMIN a 
            LEFT JOIN STATION s ON a.station_id = s.station_id 
            ORDER BY FIELD(a.role, 'Super Admin', 'Admin', 'Delivery Staff'), a.admin_id ASC
        ")->fetchAll();

        $customers = $this->pdo->query("
            SELECT c.customer_id, c.full_name, c.contact_number, c.address, c.is_verified, c.last_active,
                   COUNT(DISTINCT o.order_id) as total_orders,
                   IFNULL(SUM(IF(o.order_status = 'Delivered', o.quantity, 0)), 0) as total_containers,
                   IFNULL(SUM(IF(o.order_status = 'Delivered', o.total_price + o.shipping_fee + o.jug_fee - o.discount_amount, 0)), 0) as total_spent
            FROM CUSTOMER c
            LEFT JOIN ORDERS o ON c.customer_id = o.customer_id
            GROUP BY c.customer_id
            ORDER BY c.customer_id DESC
        ")->fetchAll();

        $stations = $this->pdo->query("SELECT station_id, station_name, status FROM STATION ORDER BY station_name ASC")->fetchAll();

        echo json_encode([
            'admins' => $admins,
            'customers' => $customers,
            'stations' => $stations
        ]);
        exit;
    }

    public function saSaveAdmin() {
        $this->requireSuperAdmin();
        $adminId = !empty($_POST['admin_id']) ? (int)$_POST['admin_id'] : null;
        $username = trim($_POST['username'] ?? '');
        $role = $_POST['role'] ?? 'Admin';
        $stationId = !empty($_POST['station_id']) ? (int)$_POST['station_id'] : null;
        $status = $_POST['status'] ?? 'Active';
        $password = $_POST['password'] ?? '';

        if ($role === 'Super Admin') {
            $stationId = null;
        }

        if (empty($username)) {
            echo json_encode(['error' => 'Username is required']);
            exit;
        }

        try {
            if ($adminId) {
                if ($password) {
                    $hp = password_hash($password, PASSWORD_DEFAULT);
                    $stmt = $this->pdo->prepare("UPDATE ADMIN SET username = ?, role = ?, station_id = ?, status = ?, password = ? WHERE admin_id = ?");
                    $stmt->execute([$username, $role, $stationId, $status, $hp, $adminId]);
                } else {
                    $stmt = $this->pdo->prepare("UPDATE ADMIN SET username = ?, role = ?, station_id = ?, status = ? WHERE admin_id = ?");
                    $stmt->execute([$username, $role, $stationId, $status, $adminId]);
                }
            } else {
                if (empty($password)) {
                    echo json_encode(['error' => 'Password is required for new accounts']);
                    exit;
                }
                $hp = password_hash($password, PASSWORD_DEFAULT);
                $stmt = $this->pdo->prepare("INSERT INTO ADMIN (username, password, role, station_id, status) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$username, $hp, $role, $stationId, $status]);
            }
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['error' => 'Username already exists or database error occurred.']);
        }
        exit;
    }

    public function saToggleAdminStatus() {
        $this->requireSuperAdmin();
        $adminId = (int)($_POST['admin_id'] ?? 0);
        $status = $_POST['status'] ?? 'Active';

        if ($adminId == ($_SESSION['admin_id'] ?? 0)) {
            echo json_encode(['error' => 'You cannot suspend your own Super Admin account.']);
            exit;
        }

        $this->pdo->prepare("UPDATE ADMIN SET status = ? WHERE admin_id = ?")->execute([$status, $adminId]);
        echo json_encode(['success' => true]);
        exit;
    }

    public function saDeleteAdmin() {
        $this->requireSuperAdmin();
        $adminId = (int)($_POST['admin_id'] ?? 0);

        if ($adminId == ($_SESSION['admin_id'] ?? 0)) {
            echo json_encode(['error' => 'You cannot delete your own Super Admin account.']);
            exit;
        }

        $stmt = $this->pdo->prepare("DELETE FROM ADMIN WHERE admin_id = ?");
        $stmt->execute([$adminId]);
        echo json_encode(['success' => true]);
        exit;
    }

    public function saSaveCustomer() {
        $this->requireSuperAdmin();
        $customerId = (int)($_POST['customer_id'] ?? 0);
        $fullName = trim($_POST['full_name'] ?? '');
        $contact = trim($_POST['contact_number'] ?? '');
        $address = trim($_POST['address'] ?? '');
        $isVerified = isset($_POST['is_verified']) ? (int)$_POST['is_verified'] : 1;
        $password = $_POST['password'] ?? '';

        if (!$customerId || empty($fullName) || empty($contact)) {
            echo json_encode(['error' => 'Customer ID, Name, and Contact Number are required.']);
            exit;
        }

        try {
            if ($password) {
                $hp = password_hash($password, PASSWORD_DEFAULT);
                $stmt = $this->pdo->prepare("UPDATE CUSTOMER SET full_name = ?, contact_number = ?, address = ?, is_verified = ?, password = ? WHERE customer_id = ?");
                $stmt->execute([$fullName, $contact, $address, $isVerified, $hp, $customerId]);
            } else {
                $stmt = $this->pdo->prepare("UPDATE CUSTOMER SET full_name = ?, contact_number = ?, address = ?, is_verified = ? WHERE customer_id = ?");
                $stmt->execute([$fullName, $contact, $address, $isVerified, $customerId]);
            }
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['error' => 'Contact number is already in use by another customer.']);
        }
        exit;
    }

    public function saToggleCustomerVerification() {
        $this->requireSuperAdmin();
        $customerId = (int)($_POST['customer_id'] ?? 0);
        $isVerified = (int)($_POST['is_verified'] ?? 0);

        $this->pdo->prepare("UPDATE CUSTOMER SET is_verified = ? WHERE customer_id = ?")->execute([$isVerified, $customerId]);
        echo json_encode(['success' => true]);
        exit;
    }

    public function saDeleteCustomer() {
        $this->requireSuperAdmin();
        $customerId = (int)($_POST['customer_id'] ?? 0);

        $stmt = $this->pdo->prepare("DELETE FROM CUSTOMER WHERE customer_id = ?");
        $stmt->execute([$customerId]);
        echo json_encode(['success' => true]);
        exit;
    }

    public function getAdminDashboardData() {
        $admin = $this->getAuthAdmin();
        if (!$admin) {
            echo json_encode(['error' => 'Unauthorized or session expired', 'orders' => []]);
            exit;
        }
        $sid = $admin['station_id'];
        $role = $admin['role'];

        if (!$sid || $role === 'Super Admin') {
            echo json_encode(['orders' => [], 'inventory' => null, 'station' => null, 'products' => [], 'staff' => [], 'borrow_ledger' => []]);
            exit;
        }

        $stmtOrders = $this->pdo->prepare("SELECT o.order_id, o.station_id, o.customer_id, o.product_id, o.station_order_number, o.order_date, o.scheduled_date, o.order_status, o.total_price, o.payment_method, o.quantity, o.delivery_address, o.points_used, o.return_round, o.return_slim, o.borrow_round, o.borrow_slim, o.borrow_status, o.container_option, o.returning_borrowed_flag, o.jug_type, o.shipping_fee, o.jug_fee, o.discount_amount, IF(o.payment_proof IS NOT NULL AND o.payment_proof != '', 1, 0) as has_payment_proof, c.contact_number, c.full_name, p.name as product_name, IFNULL(l.points, 0) as user_points, IFNULL(l.lifetime_points, IFNULL(l.points, 0)) as user_lifetime_points FROM ORDERS o LEFT JOIN CUSTOMER c ON o.customer_id = c.customer_id LEFT JOIN PRODUCTS p ON o.product_id = p.product_id LEFT JOIN CUSTOMER_LOYALTY l ON o.customer_id = l.customer_id AND o.station_id = l.station_id WHERE o.station_id = ? ORDER BY o.order_date DESC"); 
        $stmtOrders->execute([$sid]);
        $orders = $stmtOrders->fetchAll();

        $inventory = null; $station = null; $products = []; $staff = []; $borrowLedger = [];
        if ($role === 'Admin') {
            $stmtInv = $this->pdo->prepare("SELECT * FROM INVENTORY WHERE station_id = ?"); $stmtInv->execute([$sid]); $inventory = $stmtInv->fetch();
            $stmtStation = $this->pdo->prepare("SELECT * FROM STATION WHERE station_id = ?"); $stmtStation->execute([$sid]); $station = $stmtStation->fetch();
            $stmtProd = $this->pdo->prepare("SELECT * FROM PRODUCTS WHERE station_id = ? AND status = 'Active'"); $stmtProd->execute([$sid]); $products = $stmtProd->fetchAll();
            $stmtStaff = $this->pdo->prepare("SELECT admin_id, username, status FROM ADMIN WHERE station_id = ? AND role = 'Delivery Staff'"); $stmtStaff->execute([$sid]); $staff = $stmtStaff->fetchAll();
            $stmtB = $this->pdo->prepare("SELECT o.order_id, o.station_order_number, o.borrow_round, o.borrow_slim, o.order_date, c.full_name, c.contact_number FROM ORDERS o LEFT JOIN CUSTOMER c ON o.customer_id = c.customer_id WHERE o.station_id = ? AND o.borrow_status = 'Pending' AND (o.borrow_round > 0 OR o.borrow_slim > 0) GROUP BY o.customer_id, o.station_order_number ORDER BY o.order_date ASC");
            $stmtB->execute([$sid]); $borrowLedger = $stmtB->fetchAll();
        }
        echo json_encode(['orders' => $orders, 'inventory' => $inventory, 'station' => $station, 'products' => $products, 'staff' => $staff, 'borrow_ledger' => $borrowLedger]);
        exit;
    }

    public function getSalesReport() {
        $admin = $this->requireStationAdmin();
        $sid = $admin['station_id'];
        $start = $_GET['start'] ?? null;
        $end = $_GET['end'] ?? null;
        
        $stmtBounds = $this->pdo->prepare("SELECT MIN(DATE(order_date)) as min_date, MAX(DATE(order_date)) as max_date FROM ORDERS WHERE station_id = ? AND order_status = 'Delivered'");
        $stmtBounds->execute([$sid]);
        $bounds = $stmtBounds->fetch();
        $minDate = $bounds['min_date'] ?? date('Y-m-d');
        $maxDate = $bounds['max_date'] ?? date('Y-m-d');

        $orderFields = "o.order_id, o.station_id, o.customer_id, o.product_id, o.station_order_number, o.order_date, o.scheduled_date, o.order_status, o.total_price, o.payment_method, o.quantity, o.delivery_address, o.points_used, o.return_round, o.return_slim, o.borrow_round, o.borrow_slim, o.borrow_status, o.container_option, o.returning_borrowed_flag, o.jug_type, o.shipping_fee, o.jug_fee, o.discount_amount, IF(o.payment_proof IS NOT NULL AND o.payment_proof != '', 1, 0) as has_payment_proof";

        if ($start && $end) {
            $stmtOrders = $this->pdo->prepare("SELECT $orderFields, p.name as product_name, p.price as product_price, c.full_name, c.contact_number, IFNULL(l.points, 0) as user_points, IFNULL(l.lifetime_points, IFNULL(l.points, 0)) as user_lifetime_points FROM ORDERS o JOIN PRODUCTS p ON o.product_id = p.product_id JOIN CUSTOMER c ON o.customer_id = c.customer_id LEFT JOIN CUSTOMER_LOYALTY l ON o.customer_id = l.customer_id AND o.station_id = l.station_id WHERE o.station_id = ? AND o.order_status = 'Delivered' AND DATE(o.order_date) >= ? AND DATE(o.order_date) <= ? ORDER BY o.order_date DESC");
            $stmtOrders->execute([$sid, $start, $end]);
        } else {
            $stmtOrders = $this->pdo->prepare("SELECT $orderFields, p.name as product_name, p.price as product_price, c.full_name, c.contact_number, IFNULL(l.points, 0) as user_points, IFNULL(l.lifetime_points, IFNULL(l.points, 0)) as user_lifetime_points FROM ORDERS o JOIN PRODUCTS p ON o.product_id = p.product_id JOIN CUSTOMER c ON o.customer_id = c.customer_id LEFT JOIN CUSTOMER_LOYALTY l ON o.customer_id = l.customer_id AND o.station_id = l.station_id WHERE o.station_id = ? AND o.order_status = 'Delivered' ORDER BY o.order_date DESC");
            $stmtOrders->execute([$sid]);
        }
        echo json_encode(['orders' => $stmtOrders->fetchAll(), 'date_bounds' => ['min' => $minDate, 'max' => $maxDate]]);
        exit;
    }

    public function getAdminLoyalty() {
        $admin = $this->requireStationAdmin();
        $sid = $admin['station_id'];

        $stmt = $this->pdo->prepare("
            SELECT c.customer_id, c.full_name, c.contact_number, c.last_active,
                   GREATEST(IFNULL(l.points, 0), GREATEST(0, (IFNULL(SUM(IF(o.order_status = 'Delivered', o.quantity, 0)), 0) * 2) - IFNULL(SUM(IF(o.order_status = 'Delivered', o.points_used, 0)), 0))) as points,
                   GREATEST(IFNULL(l.lifetime_points, 0), IFNULL(SUM(IF(o.order_status = 'Delivered', o.quantity, 0)), 0) * 3) as lifetime_points,
                   COUNT(DISTINCT o.order_id) as total_orders,
                   IFNULL(SUM(IF(o.order_status = 'Delivered', o.quantity, 0)), 0) as total_containers,
                   IFNULL(SUM(IF(o.order_status = 'Delivered', o.total_price + o.shipping_fee + o.jug_fee - o.discount_amount, 0)), 0) as total_spent,
                   MAX(o.order_date) as last_order_date
            FROM CUSTOMER c
            LEFT JOIN CUSTOMER_LOYALTY l ON c.customer_id = l.customer_id AND l.station_id = ?
            LEFT JOIN ORDERS o ON c.customer_id = o.customer_id AND o.station_id = ?
            WHERE l.points > 0 OR l.lifetime_points > 0 OR o.order_id IS NOT NULL
            GROUP BY c.customer_id
            ORDER BY lifetime_points DESC, points DESC, total_spent DESC
        ");
        $stmt->execute([$sid, $sid]);
        $customers = $stmt->fetchAll();

        $stmtRedeemed = $this->pdo->prepare("SELECT IFNULL(SUM(points_used), 0) FROM ORDERS WHERE station_id = ? AND points_used > 0");
        $stmtRedeemed->execute([$sid]);
        $totalRedeemed = (int)$stmtRedeemed->fetchColumn();

        $summary = [
            'total_members' => count($customers),
            'total_points_balance' => 0,
            'total_points_redeemed' => $totalRedeemed,
            'tiers' => [
                'Diamond' => 0,
                'Platinum' => 0,
                'Gold' => 0,
                'Silver' => 0,
                'Bronze' => 0,
                'Normal' => 0
            ]
        ];

        foreach ($customers as &$cust) {
            $computedLifetime = (int)$cust['total_containers'] * 3;
            $pts = max((int)$cust['lifetime_points'], $computedLifetime);
            $cust['lifetime_points'] = $pts;
            $summary['total_points_balance'] += (int)$cust['points'];

            if ($pts >= 600) { $cust['rank'] = 'Diamond'; $summary['tiers']['Diamond']++; }
            elseif ($pts >= 300) { $cust['rank'] = 'Platinum'; $summary['tiers']['Platinum']++; }
            elseif ($pts >= 150) { $cust['rank'] = 'Gold'; $summary['tiers']['Gold']++; }
            elseif ($pts >= 75) { $cust['rank'] = 'Silver'; $summary['tiers']['Silver']++; }
            elseif ($pts >= 30) { $cust['rank'] = 'Bronze'; $summary['tiers']['Bronze']++; }
            else { $cust['rank'] = 'Normal'; $summary['tiers']['Normal']++; }
        }

        echo json_encode(['customers' => $customers, 'summary' => $summary]);
        exit;
    }

    public function adminUpdateLogistics() {
        $admin = $this->requireStationAdmin();
        $this->pdo->prepare("UPDATE STATION SET shipping_fee = ?, jug_discount = ?, new_jug_price = ? WHERE station_id = ?")->execute([$_POST['shipping_fee'], $_POST['jug_discount'], $_POST['new_jug_price'], $admin['station_id']]);
        echo json_encode(['success'=>true]); 
        exit;
    }
        
    public function adminUpdateAdvancedInventory() {
        $admin = $this->requireStationAdmin();
        $this->pdo->prepare("UPDATE INVENTORY SET stock_level = ?, round_jugs = ?, slim_jugs = ? WHERE station_id = ?")->execute([$_POST['stock_level'], $_POST['round_jugs'], $_POST['slim_jugs'], $admin['station_id']]);
        echo json_encode(['success'=>true]); 
        exit;
    }

    public function adminMarkReturned() {
        $admin = $this->requireStationStaff();
        $sid = $admin['station_id'];
        $oid = (int)($_POST['order_id'] ?? 0);
        $bRound = (int)($_POST['borrow_round'] ?? 0);
        $bSlim = (int)($_POST['borrow_slim'] ?? 0);
        
        $stmtOrder = $this->pdo->prepare("SELECT customer_id, station_order_number FROM ORDERS WHERE order_id = ? AND station_id = ?");
        $stmtOrder->execute([$oid, $sid]);
        $oInfo = $stmtOrder->fetch();
        if (!$oInfo) {
            SecurityContext::jsonResponse(404, ['error' => 'Order not found for your station.']);
        }
        
        $this->pdo->prepare("UPDATE ORDERS SET borrow_status = 'Returned' WHERE station_order_number = ? AND customer_id = ? AND station_id = ?")
             ->execute([$oInfo['station_order_number'], $oInfo['customer_id'], $sid]);
        $this->pdo->prepare("UPDATE INVENTORY SET stock_level = stock_level + ?, round_jugs = round_jugs + ?, slim_jugs = slim_jugs + ? WHERE station_id = ?")
            ->execute([$bRound + $bSlim, $bRound, $bSlim, $sid]);
        echo json_encode(['success'=>true]); 
        exit;
    }

    public function adminUpdateHours() {
        $admin = $this->requireStationAdmin();
        $this->pdo->prepare("UPDATE STATION SET opening_time = ?, closing_time = ? WHERE station_id = ?")->execute([$_POST['opening'], $_POST['closing'], $admin['station_id']]);
        CustomerController::clearStationsCache();
        echo json_encode(['success'=>true]); 
        exit;
    }

    public function adminUpdateClosure() {
        $admin = $this->requireStationAdmin();
        $is_closed = isset($_POST['is_closed']) && $_POST['is_closed'] == '1' ? 1 : 0;
        $message = !empty($_POST['closure_message']) ? $_POST['closure_message'] : null;
        $this->pdo->prepare("UPDATE STATION SET is_manually_closed = ?, closure_message = ? WHERE station_id = ?")->execute([$is_closed, $message, $admin['station_id']]);
        CustomerController::clearStationsCache();
        echo json_encode(['success'=>true]); 
        exit;
    }

    public function adminUpdateMaintenance() {
        $admin = $this->requireStationAdmin();
        $this->pdo->prepare("UPDATE STATION SET last_cleaned_date = ?, last_filter_changed_date = ? WHERE station_id = ?")->execute([$_POST['last_cleaned_date'], $_POST['last_filter_changed_date'], $admin['station_id']]);
        CustomerController::clearStationsCache();
        echo json_encode(['success'=>true]); 
        exit;
    }

    public function adminUpdatePaymentProfile() {
        $admin = $this->requireStationAdmin();
        $g_qr = $_POST['gcash_qr'] ?? null; $m_qr = $_POST['maya_qr'] ?? null;
        $sql = "UPDATE STATION SET gcash_name=?, gcash_number=?, maya_name=?, maya_number=? ";
        $params = [$_POST['gcash_name'], $_POST['gcash_number'], $_POST['maya_name'], $_POST['maya_number']];
        if ($g_qr) { $sql .= ", gcash_qr=? "; $params[] = $g_qr; }
        if ($m_qr) { $sql .= ", maya_qr=? "; $params[] = $m_qr; }
        $sql .= " WHERE station_id=?"; $params[] = $admin['station_id'];
        $this->pdo->prepare($sql)->execute($params); 
        CustomerController::clearStationsCache();
        echo json_encode(['success'=>true]); 
        exit;
    }

    public function adminUpdateSecurity() {
        $admin = $this->getAuthAdmin();
        if (!$admin) {
            SecurityContext::jsonResponse(401, ['error' => 'Unauthorized']);
        }
        $aid = $admin['admin_id'];
        $user = trim($_POST['username'] ?? ''); 
        $pass = $_POST['password'] ?? '';
        if (empty($user)) {
            SecurityContext::jsonResponse(400, ['error' => 'Username is required.']);
        }
        $stmt = $this->pdo->prepare("SELECT admin_id FROM ADMIN WHERE username = ? AND admin_id != ?"); 
        $stmt->execute([$user, $aid]);
        if($stmt->fetch()) { echo json_encode(['error' => 'Username already taken.']); exit; }
        if (!empty($pass)) { $this->pdo->prepare("UPDATE ADMIN SET username = ?, password = ? WHERE admin_id = ?")->execute([$user, password_hash($pass, PASSWORD_DEFAULT), $aid]); } else { $this->pdo->prepare("UPDATE ADMIN SET username = ? WHERE admin_id = ?")->execute([$user, $aid]); }
        echo json_encode(['success' => true]); 
        exit;
    }

    public function adminAddProduct() {
        $admin = $this->requireStationAdmin();
        $gallons = isset($_POST['capacity_gallons']) && is_numeric($_POST['capacity_gallons']) ? (float)$_POST['capacity_gallons'] : 5.0;
        $liters = isset($_POST['capacity_liters']) && is_numeric($_POST['capacity_liters']) ? (float)$_POST['capacity_liters'] : ($gallons == 5.0 ? 20.0 : round($gallons * 3.78541, 1));
        $this->pdo->prepare("INSERT INTO PRODUCTS (station_id, name, price, capacity_gallons, capacity_liters) VALUES (?, ?, ?, ?, ?)")
            ->execute([$admin['station_id'], $_POST['name'], $_POST['price'], $gallons, $liters]); 
        CustomerController::clearStationsCache();
        echo json_encode(['success'=>true]); 
        exit;
    }
        
    public function adminEditProduct() {
        $admin = $this->requireStationAdmin();
        $name = $_POST['name'] ?? null;
        $price = $_POST['price'];
        $gallons = isset($_POST['capacity_gallons']) && is_numeric($_POST['capacity_gallons']) ? (float)$_POST['capacity_gallons'] : 5.0;
        $liters = isset($_POST['capacity_liters']) && is_numeric($_POST['capacity_liters']) ? (float)$_POST['capacity_liters'] : ($gallons == 5.0 ? 20.0 : round($gallons * 3.78541, 1));
        
        if ($name) {
            $this->pdo->prepare("UPDATE PRODUCTS SET name = ?, price = ?, capacity_gallons = ?, capacity_liters = ? WHERE product_id = ? AND station_id = ?")
                ->execute([$name, $price, $gallons, $liters, $_POST['product_id'], $admin['station_id']]); 
        } else {
            $this->pdo->prepare("UPDATE PRODUCTS SET price = ?, capacity_gallons = ?, capacity_liters = ? WHERE product_id = ? AND station_id = ?")
                ->execute([$price, $gallons, $liters, $_POST['product_id'], $admin['station_id']]); 
        }
        CustomerController::clearStationsCache();
        echo json_encode(['success'=>true]); 
        exit;
    }

    public function adminDeleteProduct() {
        $admin = $this->requireStationAdmin();
        $this->pdo->prepare("UPDATE PRODUCTS SET status = 'Deleted' WHERE product_id = ? AND station_id = ?")->execute([$_POST['product_id'], $admin['station_id']]); 
        CustomerController::clearStationsCache();
        echo json_encode(['success'=>true]); 
        exit;
    }

    public function adminAddStaff() {
        $admin = $this->requireStationAdmin();
        $this->pdo->prepare("INSERT INTO ADMIN (station_id, username, password, role) VALUES (?, ?, ?, 'Delivery Staff')")->execute([$admin['station_id'], $_POST['username'], password_hash($_POST['password'], PASSWORD_DEFAULT)]); 
        echo json_encode(['success'=>true]); 
        exit;
    }

    public function adminToggleStaff() {
        $admin = $this->requireStationAdmin();
        $this->pdo->prepare("UPDATE ADMIN SET status = ? WHERE admin_id = ? AND station_id = ?")->execute([$_POST['status'], $_POST['admin_id'], $admin['station_id']]); 
        echo json_encode(['success'=>true]); 
        exit;
    }

    public function updateOrderStatus() {
        $admin = $this->requireStationStaff();
        $sid = $admin['station_id'];
        $aid = $admin['admin_id'];
        $oid = (int)($_POST['order_id'] ?? 0);
        $status = trim($_POST['status'] ?? '');
        
        $allowedStatuses = ['Pending', 'Preparing', 'To Deliver', 'Delivered', 'Cancelled'];
        if (!in_array($status, $allowedStatuses, true)) {
            SecurityContext::jsonResponse(400, ['error' => 'Invalid order status.']);
        }
        
        try {
            $stmtOrder = $this->pdo->prepare("SELECT o.order_status, o.customer_id, o.station_order_number, o.payment_method, c.full_name, c.contact_number, c.last_active FROM ORDERS o JOIN CUSTOMER c ON o.customer_id = c.customer_id WHERE o.order_id = ? AND o.station_id = ? FOR UPDATE"); 
            $stmtOrder->execute([$oid, $sid]);
            $oInfo = $stmtOrder->fetch();
            
            if (!$oInfo) {
                SecurityContext::jsonResponse(404, ['error' => 'Order not found for your station.']);
            }

            if ($oInfo['order_status'] === $status) {
                SecurityContext::jsonResponse(200, [
                    'success' => true,
                    'message' => "Order #{$oid} is already {$status}.",
                    'already_completed' => true
                ]);
            }
            if (in_array($oInfo['order_status'], ['Delivered', 'Cancelled'], true)) {
                SecurityContext::jsonResponse(400, [
                    'error' => "Order #{$oid} is already {$oInfo['order_status']} and cannot be changed to {$status}."
                ]);
            }
            $son = $oInfo['station_order_number'];

            if (!empty($son)) {
                $stmtGroup = $this->pdo->prepare("SELECT SUM(quantity) as tot_qty, MAX(container_option) as container_option, SUM(IF(jug_type='Round', quantity, 0)) as tot_round, SUM(IF(jug_type='Slim', quantity, 0)) as tot_slim, SUM(points_used) as tot_pts, MAX(returning_borrowed_flag) as returning_borrowed_flag FROM ORDERS WHERE station_order_number = ? AND customer_id = ? AND station_id = ?");
                $stmtGroup->execute([$son, $oInfo['customer_id'], $sid]);
            } else {
                $stmtGroup = $this->pdo->prepare("SELECT quantity as tot_qty, container_option, IF(jug_type='Round', quantity, 0) as tot_round, IF(jug_type='Slim', quantity, 0) as tot_slim, points_used as tot_pts, returning_borrowed_flag FROM ORDERS WHERE order_id = ? AND station_id = ?");
                $stmtGroup->execute([$oid, $sid]);
            }
            $grp = $stmtGroup->fetch();

            if ($status === 'Cancelled' && in_array($oInfo['order_status'], ['Pending', 'Preparing', 'To Deliver'])) {
                $this->pdo->prepare("UPDATE INVENTORY SET stock_level = stock_level + ?, round_jugs = round_jugs + ?, slim_jugs = slim_jugs + ? WHERE station_id = ?")
                    ->execute([$grp['tot_qty'], $grp['tot_round'], $grp['tot_slim'], $sid]);
                    
                if ($grp['tot_pts'] > 0) { 
                    $this->pdo->prepare("UPDATE CUSTOMER_LOYALTY SET points = points + ? WHERE customer_id = ? AND station_id = ?")
                        ->execute([$grp['tot_pts'], $oInfo['customer_id'], $sid]); 
                }
            }

            if (!empty($son)) {
                $this->pdo->prepare("UPDATE ORDERS SET order_status = ? WHERE station_order_number = ? AND customer_id = ? AND station_id = ?")->execute([$status, $son, $oInfo['customer_id'], $sid]);
            } else {
                $this->pdo->prepare("UPDATE ORDERS SET order_status = ? WHERE order_id = ? AND station_id = ?")->execute([$status, $oid, $sid]);
            }
            
            if ($status === 'To Deliver') {
                if (!empty($son)) {
                    $this->pdo->prepare("INSERT INTO DELIVERIES (order_id, admin_id, quantity) SELECT order_id, ?, quantity FROM ORDERS WHERE station_order_number = ? AND customer_id = ? AND station_id = ?")->execute([$aid, $son, $oInfo['customer_id'], $sid]);
                } else {
                    $this->pdo->prepare("INSERT INTO DELIVERIES (order_id, admin_id, quantity) SELECT order_id, ?, quantity FROM ORDERS WHERE order_id = ? AND station_id = ?")->execute([$aid, $oid, $sid]);
                }
            } elseif ($status === 'Delivered') {
                $jugs_returned = isset($_POST['jugs_returned']) ? filter_var($_POST['jugs_returned'], FILTER_VALIDATE_BOOLEAN) : true;
                
                if ($jugs_returned) {
                    if ($grp['container_option'] === 'owned') {
                        $this->pdo->prepare("UPDATE INVENTORY SET stock_level = stock_level + ?, round_jugs = round_jugs + ?, slim_jugs = slim_jugs + ? WHERE station_id = ?")
                            ->execute([$grp['tot_qty'], $grp['tot_round'], $grp['tot_slim'], $sid]);
                    }
                    
                    if ($grp['returning_borrowed_flag'] == 1) {
                        $stmtPending = $this->pdo->prepare("SELECT SUM(borrow_round) as p_round, SUM(borrow_slim) as p_slim FROM ORDERS WHERE customer_id = ? AND station_id = ? AND borrow_status = 'Pending' AND order_id != ?");
                        $stmtPending->execute([$oInfo['customer_id'], $sid, $oid]);
                        $pending = $stmtPending->fetch();
                        
                        if ($pending && ($pending['p_round'] > 0 || $pending['p_slim'] > 0)) {
                            $this->pdo->prepare("UPDATE ORDERS SET borrow_status = 'Returned' WHERE customer_id = ? AND station_id = ? AND borrow_status = 'Pending' AND order_id != ?")
                                 ->execute([$oInfo['customer_id'], $sid, $oid]);
                                 
                            $this->pdo->prepare("UPDATE INVENTORY SET stock_level = stock_level + ?, round_jugs = round_jugs + ?, slim_jugs = slim_jugs + ? WHERE station_id = ?")
                                 ->execute([$pending['p_round'] + $pending['p_slim'], $pending['p_round'], $pending['p_slim'], $sid]);
                        }
                    }
                } else {
                    if ($grp['container_option'] === 'owned') {
                        if (!empty($son)) {
                            $this->pdo->prepare("UPDATE ORDERS SET container_option = 'borrow', borrow_round = IF(jug_type='Round', quantity, 0), borrow_slim = IF(jug_type='Slim', quantity, 0), borrow_status = 'Pending' WHERE station_order_number = ? AND customer_id = ? AND station_id = ? AND container_option = 'owned'")
                                ->execute([$son, $oInfo['customer_id'], $sid]);
                        } else {
                            $this->pdo->prepare("UPDATE ORDERS SET container_option = 'borrow', borrow_round = IF(jug_type='Round', quantity, 0), borrow_slim = IF(jug_type='Slim', quantity, 0), borrow_status = 'Pending' WHERE order_id = ? AND station_id = ? AND container_option = 'owned'")
                                ->execute([$oid, $sid]);
                        }
                    }
                }

                if (!empty($son)) {
                    $this->pdo->prepare("UPDATE DELIVERIES SET delivery_status = 'Completed', delivery_date = CURRENT_TIMESTAMP WHERE order_id IN (SELECT order_id FROM ORDERS WHERE station_order_number = ? AND customer_id = ? AND station_id = ?)")->execute([$son, $oInfo['customer_id'], $sid]);
                } else {
                    $this->pdo->prepare("UPDATE DELIVERIES SET delivery_status = 'Completed', delivery_date = CURRENT_TIMESTAMP WHERE order_id = ?")->execute([$oid]);
                }
                $redeemPointsEarned = (int)$grp['tot_qty'] * 2;
                $rankPointsEarned = (int)$grp['tot_qty'] * 3;
                if ($rankPointsEarned > 0 || $redeemPointsEarned > 0) { 
                    $this->pdo->prepare("INSERT INTO CUSTOMER_LOYALTY (customer_id, station_id, points, lifetime_points) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE points = points + VALUES(points), lifetime_points = lifetime_points + VALUES(lifetime_points)")->execute([$oInfo['customer_id'], $sid, $redeemPointsEarned, $rankPointsEarned]); 
                }
            }
            
            $pushTitle = "💧 Order #{$son} Update";
            $pushBody = "Your order status has been updated to {$status}.";
            if ($status === 'Preparing') {
                $pushTitle = "🧪 Order #{$son} Being Prepared";
                $pushBody = "Your water refilling order is now being prepared.";
            } elseif ($status === 'To Deliver') {
                $pushTitle = "🛵 Order #{$son} Out for Delivery!";
                $pushBody = "Your delivery is on its way! Please expect the driver shortly.";
            } elseif ($status === 'Delivered') {
                $pushTitle = "🎉 Order #{$son} Delivered!";
                $pushBody = "Your water has been delivered. Thank You!";
            } elseif ($status === 'Cancelled') {
                $pushTitle = "⚠️ Order #{$son} Cancelled";
                $pushBody = "Your order has been cancelled by the station.";
            }
            WebPush::sendToCustomer($this->pdo, $oInfo['customer_id'], $pushTitle, $pushBody, '/#customer_orders');
            
            echo json_encode(['success' => true]);
        } catch (PDOException $e) { error_log($e->getMessage()); echo json_encode(['error' => 'Failed to update order status']); }
        exit;
    }
}
