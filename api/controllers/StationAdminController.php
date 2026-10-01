<?php
require_once __DIR__ . '/../SecurityContext.php';

class StationAdminController {
    private $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    private function requireStationAdmin(): array {
        return SecurityContext::requireStationAdmin($this->pdo);
    }

    private function getAuthAdmin(): ?array {
        return SecurityContext::getAuthAdmin($this->pdo);
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

    public function updateLogistics() {
        $admin = $this->requireStationAdmin();
        $shipping = max(0, (float)($_POST['shipping_fee'] ?? 0));
        $discount = max(0, (float)($_POST['jug_discount'] ?? 0));
        $newPrice = max(0, (float)($_POST['new_jug_price'] ?? 0));
        $this->pdo->prepare("UPDATE STATION SET shipping_fee = ?, jug_discount = ?, new_jug_price = ? WHERE station_id = ?")->execute([$shipping, $discount, $newPrice, $admin['station_id']]);
        if (class_exists('CustomerController')) {
            CustomerController::clearStationsCache();
        }
        echo json_encode(['success' => true]); 
        exit;
    }

    public function updateLocation() {
        $admin = $this->requireStationAdmin();
        $lat = isset($_POST['latitude']) && $_POST['latitude'] !== '' ? (float)$_POST['latitude'] : null;
        $lng = isset($_POST['longitude']) && $_POST['longitude'] !== '' ? (float)$_POST['longitude'] : null;
        
        if ($lat !== null && ($lat < -90 || $lat > 90)) {
            echo json_encode(['error' => 'Invalid latitude (-90 to 90 expected).']);
            exit;
        }
        if ($lng !== null && ($lng < -180 || $lng > 180)) {
            echo json_encode(['error' => 'Invalid longitude (-180 to 180 expected).']);
            exit;
        }

        $this->pdo->prepare("UPDATE STATION SET latitude = ?, longitude = ? WHERE station_id = ?")->execute([$lat, $lng, $admin['station_id']]);
        if (class_exists('CustomerController')) {
            CustomerController::clearStationsCache();
        }
        echo json_encode(['success' => true, 'latitude' => $lat, 'longitude' => $lng]);
        exit;
    }
        
    public function updateAdvancedInventory() {
        $admin = $this->requireStationAdmin();
        $stock = max(0, (int)($_POST['stock_level'] ?? 0));
        $round = max(0, (int)($_POST['round_jugs'] ?? 0));
        $slim = max(0, (int)($_POST['slim_jugs'] ?? 0));
        $this->pdo->prepare("UPDATE INVENTORY SET stock_level = ?, round_jugs = ?, slim_jugs = ? WHERE station_id = ?")->execute([$stock, $round, $slim, $admin['station_id']]);
        echo json_encode(['success' => true]); 
        exit;
    }

    public function updateHours() {
        $admin = $this->requireStationAdmin();
        $opening = trim($_POST['opening'] ?? '');
        $closing = trim($_POST['closing'] ?? '');
        if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/', $opening) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/', $closing)) {
            echo json_encode(['error' => 'Invalid operating hours format (HH:MM expected).']);
            exit;
        }
        $this->pdo->prepare("UPDATE STATION SET opening_time = ?, closing_time = ? WHERE station_id = ?")->execute([$opening, $closing, $admin['station_id']]);
        if (class_exists('CustomerController')) {
            CustomerController::clearStationsCache();
        }
        echo json_encode(['success' => true]); 
        exit;
    }

    public function updateClosure() {
        $admin = $this->requireStationAdmin();
        $is_closed = isset($_POST['is_closed']) && $_POST['is_closed'] == '1' ? 1 : 0;
        $message = !empty($_POST['closure_message']) ? substr(trim($_POST['closure_message']), 0, 255) : null;
        $this->pdo->prepare("UPDATE STATION SET is_manually_closed = ?, closure_message = ? WHERE station_id = ?")->execute([$is_closed, $message, $admin['station_id']]);
        if (class_exists('CustomerController')) {
            CustomerController::clearStationsCache();
        }
        echo json_encode(['success' => true]); 
        exit;
    }

    public function updateMaintenance() {
        $admin = $this->requireStationAdmin();
        $clean = !empty($_POST['last_cleaned_date']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_POST['last_cleaned_date']) ? $_POST['last_cleaned_date'] : null;
        $filter = !empty($_POST['last_filter_changed_date']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_POST['last_filter_changed_date']) ? $_POST['last_filter_changed_date'] : null;
        $this->pdo->prepare("UPDATE STATION SET last_cleaned_date = ?, last_filter_changed_date = ? WHERE station_id = ?")->execute([$clean, $filter, $admin['station_id']]);
        if (class_exists('CustomerController')) {
            CustomerController::clearStationsCache();
        }
        echo json_encode(['success' => true]); 
        exit;
    }

    public function updatePaymentProfile() {
        $admin = $this->requireStationAdmin();
        $g_name = substr(trim($_POST['gcash_name'] ?? ''), 0, 100);
        $g_num = substr(trim($_POST['gcash_number'] ?? ''), 0, 20);
        $m_name = substr(trim($_POST['maya_name'] ?? ''), 0, 100);
        $m_num = substr(trim($_POST['maya_number'] ?? ''), 0, 20);
        $g_qr = $_POST['gcash_qr'] ?? null;
        $m_qr = $_POST['maya_qr'] ?? null;

        $validateQr = function($qr) {
            if (empty($qr)) return null;
            if (!preg_match('/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+\/=\s]+$/', $qr) || strlen($qr) > 7 * 1024 * 1024) {
                return false;
            }
            return $qr;
        };

        $sql = "UPDATE STATION SET gcash_name=?, gcash_number=?, maya_name=?, maya_number=? ";
        $params = [$g_name, $g_num, $m_name, $m_num];
        if ($g_qr) {
            $checked = $validateQr($g_qr);
            if ($checked === false) { echo json_encode(['error' => 'Invalid GCash QR image format.']); exit; }
            $sql .= ", gcash_qr=? "; $params[] = $checked;
        }
        if ($m_qr) {
            $checked = $validateQr($m_qr);
            if ($checked === false) { echo json_encode(['error' => 'Invalid Maya QR image format.']); exit; }
            $sql .= ", maya_qr=? "; $params[] = $checked;
        }
        $sql .= " WHERE station_id=?"; $params[] = $admin['station_id'];
        $this->pdo->prepare($sql)->execute($params); 
        if (class_exists('CustomerController')) {
            CustomerController::clearStationsCache();
        }
        echo json_encode(['success' => true]); 
        exit;
    }

    public function updateSecurity() {
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
        if ($stmt->fetch()) { echo json_encode(['error' => 'Username already taken.']); exit; }
        if (!empty($pass)) {
            if (strlen($pass) < 6) { echo json_encode(['error' => 'Password must be at least 6 characters.']); exit; }
            $this->pdo->prepare("UPDATE ADMIN SET username = ?, password = ? WHERE admin_id = ?")->execute([$user, password_hash($pass, PASSWORD_DEFAULT), $aid]);
        } else {
            $this->pdo->prepare("UPDATE ADMIN SET username = ? WHERE admin_id = ?")->execute([$user, $aid]);
        }
        echo json_encode(['success' => true]); 
        exit;
    }

    public function addProduct() {
        $admin = $this->requireStationAdmin();
        $name = trim($_POST['name'] ?? '');
        $price = (float)($_POST['price'] ?? 0);
        if (empty($name) || $price <= 0) {
            echo json_encode(['error' => 'Product name and a positive price are required.']);
            exit;
        }
        $gallons = isset($_POST['capacity_gallons']) && is_numeric($_POST['capacity_gallons']) ? max(0.1, (float)$_POST['capacity_gallons']) : 5.0;
        $liters = isset($_POST['capacity_liters']) && is_numeric($_POST['capacity_liters']) ? max(0.1, (float)$_POST['capacity_liters']) : ($gallons == 5.0 ? 20.0 : round($gallons * 3.78541, 1));
        $this->pdo->prepare("INSERT INTO PRODUCTS (station_id, name, price, capacity_gallons, capacity_liters) VALUES (?, ?, ?, ?, ?)")
            ->execute([$admin['station_id'], $name, $price, $gallons, $liters]); 
        if (class_exists('CustomerController')) {
            CustomerController::clearStationsCache();
        }
        echo json_encode(['success' => true]); 
        exit;
    }
        
    public function editProduct() {
        $admin = $this->requireStationAdmin();
        $pid = (int)($_POST['product_id'] ?? 0);
        $name = isset($_POST['name']) ? trim($_POST['name']) : null;
        $price = (float)($_POST['price'] ?? 0);
        if ($price <= 0 || ($name !== null && empty($name))) {
            echo json_encode(['error' => 'Valid product details and a positive price are required.']);
            exit;
        }
        $gallons = isset($_POST['capacity_gallons']) && is_numeric($_POST['capacity_gallons']) ? max(0.1, (float)$_POST['capacity_gallons']) : 5.0;
        $liters = isset($_POST['capacity_liters']) && is_numeric($_POST['capacity_liters']) ? max(0.1, (float)$_POST['capacity_liters']) : ($gallons == 5.0 ? 20.0 : round($gallons * 3.78541, 1));
        
        if ($name !== null) {
            $this->pdo->prepare("UPDATE PRODUCTS SET name = ?, price = ?, capacity_gallons = ?, capacity_liters = ? WHERE product_id = ? AND station_id = ?")
                ->execute([$name, $price, $gallons, $liters, $pid, $admin['station_id']]); 
        } else {
            $this->pdo->prepare("UPDATE PRODUCTS SET price = ?, capacity_gallons = ?, capacity_liters = ? WHERE product_id = ? AND station_id = ?")
                ->execute([$price, $gallons, $liters, $pid, $admin['station_id']]); 
        }
        if (class_exists('CustomerController')) {
            CustomerController::clearStationsCache();
        }
        echo json_encode(['success' => true]); 
        exit;
    }

    public function deleteProduct() {
        $admin = $this->requireStationAdmin();
        $this->pdo->prepare("UPDATE PRODUCTS SET status = 'Deleted' WHERE product_id = ? AND station_id = ?")->execute([$_POST['product_id'], $admin['station_id']]); 
        if (class_exists('CustomerController')) {
            CustomerController::clearStationsCache();
        }
        echo json_encode(['success' => true]); 
        exit;
    }

    public function addStaff() {
        $admin = $this->requireStationAdmin();
        $user = trim($_POST['username'] ?? '');
        $pass = $_POST['password'] ?? '';
        if (empty($user) || strlen($pass) < 6) {
            echo json_encode(['error' => 'Username is required and password must be at least 6 characters.']);
            exit;
        }
        $this->pdo->prepare("INSERT INTO ADMIN (station_id, username, password, role) VALUES (?, ?, ?, 'Delivery Staff')")
            ->execute([$admin['station_id'], $user, password_hash($pass, PASSWORD_DEFAULT)]); 
        echo json_encode(['success' => true]); 
        exit;
    }

    public function toggleStaff() {
        $admin = $this->requireStationAdmin();
        $targetAdminId = (int)($_POST['admin_id'] ?? 0);
        $status = in_array($_POST['status'] ?? '', ['Active', 'Revoked'], true) ? $_POST['status'] : 'Active';

        if ($targetAdminId === (int)$admin['admin_id']) {
            echo json_encode(['error' => 'You cannot modify your own administrative account status.']);
            exit;
        }

        $stmt = $this->pdo->prepare("UPDATE ADMIN SET status = ? WHERE admin_id = ? AND station_id = ? AND role = 'Delivery Staff'");
        $stmt->execute([$status, $targetAdminId, $admin['station_id']]);
        if ($stmt->rowCount() === 0) {
            echo json_encode(['error' => 'Staff account not found or cannot be modified.']);
            exit;
        }
        echo json_encode(['success' => true]); 
        exit;
    }
}
