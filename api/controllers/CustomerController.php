<?php
require_once __DIR__ . '/../services/SmsService.php';

class CustomerController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    private function sendSemaphoreSMS($number, $message) {
        return SmsService::send($this->pdo, $number, $message);
    }

    public function login() {
        $contact = SecurityContext::normalizePhone(trim($_POST['contact_number'] ?? '')); 
        $pass = $_POST['password'] ?? '';

        $stmt = $this->pdo->prepare("SELECT * FROM CUSTOMER WHERE contact_number = ?"); 
        $stmt->execute([$contact]);
        $u = $stmt->fetch();
        
        if ($u && password_verify($pass, $u['password'])) {
            if ($u['is_verified'] == 0) {
                $otp = random_int(100000, 999999);
                $expiry = date('Y-m-d H:i:s', strtotime('+10 minutes'));
                $this->pdo->prepare("UPDATE CUSTOMER SET otp_code = ?, otp_expiry = ? WHERE customer_id = ?")->execute([$otp, $expiry, $u['customer_id']]);
                $msg = "Your Mababanaba Waters verification code is {$otp}. Valid for 10 minutes. Do not share.";
                $this->sendSemaphoreSMS($u['contact_number'], $msg);
                echo json_encode([
                    'requires_otp' => true, 
                    'contact_number' => $u['contact_number'],
                    'message' => 'Account is not yet verified. An OTP code was sent to complete your registration.'
                ]);
                exit;
            }

            session_regenerate_id(true);
            $_SESSION['customer_id'] = $u['customer_id'];
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            SecurityContext::clearRateLimits($this->pdo, ['customer_login', 'admin_login']);
            $this->pdo->prepare("UPDATE CUSTOMER SET last_active = CURRENT_TIMESTAMP WHERE customer_id = ?")->execute([$u['customer_id']]);

            $loyaltyStmt = $this->pdo->prepare("SELECT IFNULL(SUM(points), 0) as total_points, IFNULL(SUM(lifetime_points), 0) as lifetime_points FROM CUSTOMER_LOYALTY WHERE customer_id = ?");
            $loyaltyStmt->execute([$u['customer_id']]);
            $loyaltyData = $loyaltyStmt->fetch();

            echo json_encode([
                'success' => true, 
                'customer_id' => $u['customer_id'], 
                'full_name' => $u['full_name'], 
                'contact_number' => $u['contact_number'], 
                'address' => $u['address'],
                'total_points' => (int)($loyaltyData['total_points'] ?? 0),
                'lifetime_points' => (int)($loyaltyData['lifetime_points'] ?? 0),
                'csrf_token' => $_SESSION['csrf_token']
            ]);
        } else { 
            echo json_encode(['error' => 'Invalid mobile number or password']); 
        }
        exit;
    }

    public function register() {
        $name = trim($_POST['full_name'] ?? ''); 
        $contact = SecurityContext::normalizePhone(trim($_POST['contact_number'] ?? '')); 
        $addr = trim($_POST['address'] ?? ''); 
        $pass = $_POST['password'] ?? '';
        
        if (empty($name) || empty($contact) || empty($addr) || empty($pass)) { 
            echo json_encode(['error' => 'Missing required fields.']); 
            exit; 
        }

        if (!preg_match('/^09\d{9}$/', $contact)) {
            echo json_encode(['error' => 'Please enter a valid 11-digit mobile number starting with 09.']);
            exit;
        }
        
        $stmt = $this->pdo->prepare("SELECT * FROM CUSTOMER WHERE contact_number = ?"); 
        $stmt->execute([$contact]);
        $existing = $stmt->fetch();
        
        $otp = random_int(100000, 999999);
        $expiry = date('Y-m-d H:i:s', strtotime('+10 minutes'));
        $hp = password_hash($pass, PASSWORD_DEFAULT);

        if ($existing) { 
            if ($existing['is_verified'] == 1) {
                echo json_encode(['error' => 'Mobile number is already registered. Please log in.']); 
                exit;
            } else {
                $this->pdo->prepare("UPDATE CUSTOMER SET full_name = ?, address = ?, password = ?, otp_code = ?, otp_expiry = ?, is_verified = 0 WHERE contact_number = ?")
                    ->execute([$name, $addr, $hp, $otp, $expiry, $contact]);
            }
        } else {
            $this->pdo->prepare("INSERT INTO CUSTOMER (full_name, contact_number, address, password, otp_code, otp_expiry, is_verified) VALUES (?, ?, ?, ?, ?, ?, 0)")
                ->execute([$name, $contact, $addr, $hp, $otp, $expiry]);
        }
        
        $msg = "Your Mababanaba Waters verification code is {$otp}. Valid for 10 minutes. Do not share.";
        $this->sendSemaphoreSMS($contact, $msg);
        
        echo json_encode(['requires_otp' => true, 'contact_number' => $contact]);
        exit;
    }

    public function verifyOtp() {
        $contact = SecurityContext::normalizePhone(trim($_POST['contact_number'] ?? ''));
        $code = trim($_POST['otp_code'] ?? '');

        $stmt = $this->pdo->prepare("SELECT customer_id, full_name, contact_number, address, otp_code, otp_expiry, failed_otp_attempts FROM CUSTOMER WHERE contact_number = ?");
        $stmt->execute([$contact]);
        $u = $stmt->fetch();

        if (!$u) { echo json_encode(['error' => 'Mobile number not found.']); exit; }

        $chk = SecurityContext::verifyOtp($this->pdo, 'CUSTOMER', 'customer_id', (int)$u['customer_id'], $u['otp_code'], $u['otp_expiry'], (int)($u['failed_otp_attempts'] ?? 0), $code);
        if (!$chk['valid']) {
            echo json_encode(['error' => $chk['error']]);
            exit;
        }

        $this->pdo->prepare("UPDATE CUSTOMER SET is_verified = 1, otp_code = NULL, otp_expiry = NULL, failed_otp_attempts = 0, last_active = CURRENT_TIMESTAMP WHERE customer_id = ?")->execute([$u['customer_id']]);
        
        session_regenerate_id(true);
        $_SESSION['customer_id'] = $u['customer_id'];
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        SecurityContext::clearRateLimits($this->pdo, ['customer_register', 'verify_registration_otp', 'customer_login']);
        echo json_encode([
            'success' => true, 
            'customer_id' => $u['customer_id'], 
            'full_name' => $u['full_name'], 
            'contact_number' => $u['contact_number'], 
            'address' => $u['address'],
            'csrf_token' => $_SESSION['csrf_token']
        ]);
        exit;
    }

    public static function clearStationsCache() {
        $cacheFile = sys_get_temp_dir() . '/mbbnb_stations_public_cache.json';
        if (file_exists($cacheFile)) {
            @unlink($cacheFile);
        }
    }

    public function getStations() {
        $cid = $_SESSION['customer_id'] ?? null;
        $cacheFile = sys_get_temp_dir() . '/mbbnb_stations_public_cache.json';
        $cacheTtl = 5;

        if ($cid === null && file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTtl) {
            header('X-Cache: HIT');
            header('Cache-Control: public, max-age=5, stale-while-revalidate=5');
            echo file_get_contents($cacheFile);
            exit;
        }

        if ($cid === null) {
            $sql = "SELECT s.*, i.stock_level, i.round_jugs, i.slim_jugs, 
                    0 as user_points, 
                    0 as user_lifetime_points, 
                    IFNULL(AVG(r.rating), 0) as avg_rating,
                    0 as pending_borrowed,
                    IFNULL(q.active_queue_count, 0) as active_queue_count
                    FROM STATION s 
                    JOIN INVENTORY i ON s.station_id = i.station_id 
                    LEFT JOIN REVIEWS r ON s.station_id = r.station_id 
                    LEFT JOIN (
                        SELECT station_id, COUNT(order_id) as active_queue_count 
                        FROM ORDERS 
                        WHERE order_status IN ('Pending', 'Preparing') 
                        GROUP BY station_id
                    ) q ON s.station_id = q.station_id
                    WHERE s.status = 'Active' 
                    GROUP BY s.station_id";
            $stmt = $this->pdo->query($sql);
            $stations = $stmt->fetchAll();
        } else {
            $sql = "SELECT s.*, i.stock_level, i.round_jugs, i.slim_jugs, 
                    IFNULL(l.points, 0) as user_points, 
                    IFNULL(l.lifetime_points, IFNULL(l.points, 0)) as user_lifetime_points, 
                    IFNULL(AVG(r.rating), 0) as avg_rating,
                    IFNULL(b.pending_borrowed, 0) as pending_borrowed,
                    IFNULL(q.active_queue_count, 0) as active_queue_count
                    FROM STATION s 
                    JOIN INVENTORY i ON s.station_id = i.station_id 
                    LEFT JOIN CUSTOMER_LOYALTY l ON s.station_id = l.station_id AND l.customer_id = ? 
                    LEFT JOIN REVIEWS r ON s.station_id = r.station_id 
                    LEFT JOIN (
                        SELECT station_id, COUNT(order_id) as pending_borrowed 
                        FROM ORDERS 
                        WHERE customer_id = ? AND borrow_status = 'Pending' AND (borrow_round > 0 OR borrow_slim > 0) 
                        GROUP BY station_id
                    ) b ON s.station_id = b.station_id
                    LEFT JOIN (
                        SELECT station_id, COUNT(order_id) as active_queue_count 
                        FROM ORDERS 
                        WHERE order_status IN ('Pending', 'Preparing') 
                        GROUP BY station_id
                    ) q ON s.station_id = q.station_id
                    WHERE s.status = 'Active' 
                    GROUP BY s.station_id";
            $stmt = $this->pdo->prepare($sql); 
            $stmt->execute([$cid, $cid]);
            $stations = $stmt->fetchAll();
        }
        
        $prodStmt = $this->pdo->query("SELECT * FROM PRODUCTS WHERE status = 'Active'");
        $allProducts = $prodStmt->fetchAll();
        
        $productsByStation = [];
        foreach ($allProducts as $p) {
            $productsByStation[$p['station_id']][] = $p;
        }
        foreach ($stations as &$st) { 
            $st['products'] = $productsByStation[$st['station_id']] ?? []; 
        }
        
        $json = json_encode($stations);
        if ($cid === null) {
            @file_put_contents($cacheFile, $json);
            header('X-Cache: MISS');
            header('Cache-Control: public, max-age=5, stale-while-revalidate=5');
        }

        echo $json;
        exit;
    }

    public function getOrders() {
        $customer = SecurityContext::requireCustomer($this->pdo);
        $cid = $customer['customer_id'];
        $stmt = $this->pdo->prepare("SELECT o.order_id, o.station_id, o.customer_id, o.product_id, o.station_order_number, o.order_date, o.scheduled_date, o.order_status, o.total_price, o.payment_method, o.quantity, o.delivery_address, o.delivery_latitude, o.delivery_longitude, o.receipt_viewed, o.points_used, o.return_round, o.return_slim, o.borrow_round, o.borrow_slim, o.borrow_status, o.container_option, o.returning_borrowed_flag, o.jug_type, o.shipping_fee, o.jug_fee, o.discount_amount, IF(o.payment_proof IS NOT NULL AND o.payment_proof != '', 1, 0) as has_payment_proof, COALESCE(s.station_name, 'Water Station') as station_name, s.latitude as station_latitude, s.longitude as station_longitude, COALESCE(p.name, 'Purified Water') as product_name, p.capacity_gallons, p.capacity_liters, r.rating FROM ORDERS o LEFT JOIN STATION s ON o.station_id = s.station_id LEFT JOIN PRODUCTS p ON o.product_id = p.product_id LEFT JOIN REVIEWS r ON o.order_id = r.order_id WHERE o.customer_id = ? ORDER BY o.order_date DESC");
        $stmt->execute([$cid]);
        echo json_encode($stmt->fetchAll());
        exit;
    }

    public function forgotPasswordRequest() {
        $contact = SecurityContext::normalizePhone(trim($_POST['contact_number'] ?? ''));
        if (!preg_match('/^09\d{9}$/', $contact)) {
            echo json_encode(['error' => 'Please enter a valid 11-digit mobile number starting with 09.']);
            exit;
        }

        $stmt = $this->pdo->prepare("SELECT * FROM CUSTOMER WHERE contact_number = ?");
        $stmt->execute([$contact]);
        $u = $stmt->fetch();

        if (!$u) { echo json_encode(['error' => 'This mobile number is not registered.']); exit; }

        if (!empty($u['otp_expiry'])) {
            $secondsLeft = strtotime($u['otp_expiry']) - time();
            if ($secondsLeft > 540) {
                $cooldown = $secondsLeft - 540;
                echo json_encode(['error' => "Please wait {$cooldown} second(s) before requesting another code."]);
                exit;
            }
        }

        $otp = random_int(100000, 999999); 
        $expiry = date('Y-m-d H:i:s', strtotime('+10 minutes'));
        $this->pdo->prepare("UPDATE CUSTOMER SET otp_code = ?, otp_expiry = ? WHERE customer_id = ?")->execute([$otp, $expiry, $u['customer_id']]);

        $msg = "Your password reset code is {$otp}. This code is valid for 10 minutes. If you did not request this, please ignore this message.";
        $this->sendSemaphoreSMS($contact, $msg);

        echo json_encode(['success' => true, 'contact_number' => $contact]);
        exit;
    }

    public function resetPasswordSubmit() {
        $contact = SecurityContext::normalizePhone(trim($_POST['contact_number'] ?? ''));
        $code = trim($_POST['otp_code'] ?? '');
        $new_pass = $_POST['new_password'] ?? '';

        if (empty($new_pass) || strlen($new_pass) < 6) {
            echo json_encode(['error' => 'Password must be at least 6 characters.']);
            exit;
        }

        $stmt = $this->pdo->prepare("SELECT customer_id, otp_code, otp_expiry, failed_otp_attempts FROM CUSTOMER WHERE contact_number = ?");
        $stmt->execute([$contact]);
        $u = $stmt->fetch();

        if (!$u) { echo json_encode(['error' => 'Invalid mobile number.']); exit; }

        $chk = SecurityContext::verifyOtp($this->pdo, 'CUSTOMER', 'customer_id', (int)$u['customer_id'], $u['otp_code'], $u['otp_expiry'], (int)($u['failed_otp_attempts'] ?? 0), $code);
        if (!$chk['valid']) {
            echo json_encode(['error' => $chk['error']]);
            exit;
        }

        $hp = password_hash($new_pass, PASSWORD_DEFAULT);
        $this->pdo->prepare("UPDATE CUSTOMER SET password = ?, otp_code = NULL, otp_expiry = NULL, failed_otp_attempts = 0 WHERE customer_id = ?")->execute([$hp, $u['customer_id']]);
        SecurityContext::clearRateLimits($this->pdo, ['forgot_password_request', 'reset_password_submit', 'customer_login']);
        echo json_encode(['success' => true]);
        exit;
    }

    public function requestPasswordChangeOtp() {
        $cid = $_SESSION['customer_id'] ?? null;
        $aid = $_SESSION['admin_id'] ?? null;
        if (!$cid && !$aid) { echo json_encode(['error' => 'Unauthorized']); exit; }

        if ($cid) {
            $stmt = $this->pdo->prepare("SELECT * FROM CUSTOMER WHERE customer_id = ?");
            $stmt->execute([$cid]);
            $u = $stmt->fetch();
            if (!$u) { echo json_encode(['error' => 'Customer not found.']); exit; }
            $contact = $u['contact_number'];
            $otp = random_int(100000, 999999); 
            $expiry = date('Y-m-d H:i:s', strtotime('+10 minutes'));
            $this->pdo->prepare("UPDATE CUSTOMER SET otp_code = ?, otp_expiry = ? WHERE customer_id = ?")->execute([$otp, $expiry, $cid]);
        } else {
            $stmt = $this->pdo->prepare("SELECT * FROM ADMIN WHERE admin_id = ?");
            $stmt->execute([$aid]);
            $u = $stmt->fetch();
            if (!$u) { echo json_encode(['error' => 'Staff account not found.']); exit; }
            $contact = $u['contact_number'] ?? null;
            if (!$contact) {
                echo json_encode(['error' => 'No mobile number set for this account. Please update your mobile number first.']);
                exit;
            }
            $otp = random_int(100000, 999999); 
            $expiry = date('Y-m-d H:i:s', strtotime('+10 minutes'));
            $this->pdo->prepare("UPDATE ADMIN SET otp_code = ?, otp_expiry = ? WHERE admin_id = ?")->execute([$otp, $expiry, $aid]);
        }

        $msg = "Your Mababanaba Waters password change OTP is {$otp}. Valid for 10 minutes. Do not share.";
        $this->sendSemaphoreSMS($contact, $msg);

        $masked = substr($contact, 0, 4) . '****' . substr($contact, -3);
        echo json_encode(['success' => true, 'masked_contact' => $masked]);
        exit;
    }

    public function changePasswordSubmit() {
        $cid = $_SESSION['customer_id'] ?? null;
        $aid = $_SESSION['admin_id'] ?? null;
        if (!$cid && !$aid) { echo json_encode(['error' => 'Unauthorized']); exit; }

        $code = trim($_POST['otp_code'] ?? '');
        $new_pass = $_POST['new_password'] ?? '';

        if (empty($code) || empty($new_pass)) {
            echo json_encode(['error' => 'Please provide the OTP code and new password.']);
            exit;
        }

        if (strlen($new_pass) < 6) {
            echo json_encode(['error' => 'Password must be at least 6 characters.']);
            exit;
        }

        if ($cid) {
            $stmt = $this->pdo->prepare("SELECT customer_id, otp_code, otp_expiry, failed_otp_attempts FROM CUSTOMER WHERE customer_id = ?");
            $stmt->execute([$cid]);
            $u = $stmt->fetch();
            if (!$u) { echo json_encode(['error' => 'Customer not found.']); exit; }

            $chk = SecurityContext::verifyOtp($this->pdo, 'CUSTOMER', 'customer_id', (int)$cid, $u['otp_code'], $u['otp_expiry'], (int)($u['failed_otp_attempts'] ?? 0), $code);
            if (!$chk['valid']) {
                echo json_encode(['error' => $chk['error']]);
                exit;
            }

            $hp = password_hash($new_pass, PASSWORD_DEFAULT);
            $this->pdo->prepare("UPDATE CUSTOMER SET password = ?, otp_code = NULL, otp_expiry = NULL, failed_otp_attempts = 0 WHERE customer_id = ?")->execute([$hp, $cid]);
        } else {
            $stmt = $this->pdo->prepare("SELECT admin_id, otp_code, otp_expiry, failed_otp_attempts FROM ADMIN WHERE admin_id = ?");
            $stmt->execute([$aid]);
            $u = $stmt->fetch();
            if (!$u) { echo json_encode(['error' => 'Staff account not found.']); exit; }

            $chk = SecurityContext::verifyOtp($this->pdo, 'ADMIN', 'admin_id', (int)$aid, $u['otp_code'], $u['otp_expiry'], (int)($u['failed_otp_attempts'] ?? 0), $code);
            if (!$chk['valid']) {
                echo json_encode(['error' => $chk['error']]);
                exit;
            }

            $hp = password_hash($new_pass, PASSWORD_DEFAULT);
            $this->pdo->prepare("UPDATE ADMIN SET password = ?, otp_code = NULL, otp_expiry = NULL, failed_otp_attempts = 0 WHERE admin_id = ?")->execute([$hp, $aid]);
        }
        
        SecurityContext::clearRateLimits($this->pdo, ['request_password_change_otp', 'change_password_submit']);
        echo json_encode(['success' => true, 'message' => 'Password updated successfully!']);
        exit;
    }

    public function requestPhoneChangeOtp() {
        $cid = $_SESSION['customer_id'] ?? null;
        $aid = $_SESSION['admin_id'] ?? null;
        if (!$cid && !$aid) { echo json_encode(['error' => 'Unauthorized']); exit; }

        $newContact = SecurityContext::normalizePhone(trim($_POST['new_contact_number'] ?? ''));
        if (empty($newContact) || !preg_match('/^09\d{9}$/', $newContact)) {
            echo json_encode(['error' => 'Please enter a valid 11-digit mobile number starting with 09.']);
            exit;
        }

        if ($cid) {
            $stmt = $this->pdo->prepare("SELECT customer_id FROM CUSTOMER WHERE contact_number = ? AND customer_id != ?");
            $stmt->execute([$newContact, $cid]);
            if ($stmt->fetch()) {
                echo json_encode(['error' => 'This mobile number is already registered by another customer.']);
                exit;
            }
        }
        if ($aid) {
            $stmt = $this->pdo->prepare("SELECT admin_id FROM ADMIN WHERE contact_number = ? AND admin_id != ?");
            $stmt->execute([$newContact, $aid]);
            if ($stmt->fetch()) {
                echo json_encode(['error' => 'This mobile number is already associated with another staff account.']);
                exit;
            }
        }

        $otp = random_int(100000, 999999);
        $expiry = date('Y-m-d H:i:s', strtotime('+10 minutes'));

        if ($cid) {
            $this->pdo->prepare("UPDATE CUSTOMER SET new_temp_contact = ?, otp_code = ?, otp_expiry = ? WHERE customer_id = ?")
                ->execute([$newContact, $otp, $expiry, $cid]);
        } else {
            $this->pdo->prepare("UPDATE ADMIN SET new_temp_contact = ?, otp_code = ?, otp_expiry = ? WHERE admin_id = ?")
                ->execute([$newContact, $otp, $expiry, $aid]);
        }

        $msg = "Your Mababanaba Waters OTP to update your mobile number is {$otp}. Valid for 10 minutes. Do not share.";
        $this->sendSemaphoreSMS($newContact, $msg);

        $masked = substr($newContact, 0, 4) . '****' . substr($newContact, -3);
        echo json_encode(['success' => true, 'masked_new_contact' => $masked, 'raw_new_contact' => $newContact]);
        exit;
    }

    public function changePhoneSubmit() {
        $cid = $_SESSION['customer_id'] ?? null;
        $aid = $_SESSION['admin_id'] ?? null;
        if (!$cid && !$aid) { echo json_encode(['error' => 'Unauthorized']); exit; }

        $code = trim($_POST['otp_code'] ?? '');
        if (empty($code)) {
            echo json_encode(['error' => 'Please provide the 6-digit OTP code.']);
            exit;
        }

        if ($cid) {
            $stmt = $this->pdo->prepare("SELECT customer_id, new_temp_contact, otp_code, otp_expiry, failed_otp_attempts FROM CUSTOMER WHERE customer_id = ?");
            $stmt->execute([$cid]);
            $u = $stmt->fetch();
            if (!$u) { echo json_encode(['error' => 'Customer not found.']); exit; }

            $chk = SecurityContext::verifyOtp($this->pdo, 'CUSTOMER', 'customer_id', (int)$cid, $u['otp_code'], $u['otp_expiry'], (int)($u['failed_otp_attempts'] ?? 0), $code);
            if (!$chk['valid']) {
                echo json_encode(['error' => $chk['error']]);
                exit;
            }
            if (empty($u['new_temp_contact'])) { echo json_encode(['error' => 'No pending phone number change found.']); exit; }

            $newContact = $u['new_temp_contact'];
            $this->pdo->prepare("UPDATE CUSTOMER SET contact_number = ?, new_temp_contact = NULL, otp_code = NULL, otp_expiry = NULL, failed_otp_attempts = 0 WHERE customer_id = ?")
                ->execute([$newContact, $cid]);

            SecurityContext::clearRateLimits($this->pdo, ['request_phone_change_otp', 'change_phone_submit']);
            echo json_encode(['success' => true, 'new_contact' => $newContact, 'message' => 'Mobile number updated successfully!']);
            exit;
        } else {
            $stmt = $this->pdo->prepare("SELECT admin_id, new_temp_contact, otp_code, otp_expiry, failed_otp_attempts FROM ADMIN WHERE admin_id = ?");
            $stmt->execute([$aid]);
            $u = $stmt->fetch();
            if (!$u) { echo json_encode(['error' => 'Staff account not found.']); exit; }

            $chk = SecurityContext::verifyOtp($this->pdo, 'ADMIN', 'admin_id', (int)$aid, $u['otp_code'], $u['otp_expiry'], (int)($u['failed_otp_attempts'] ?? 0), $code);
            if (!$chk['valid']) {
                echo json_encode(['error' => $chk['error']]);
                exit;
            }
            if (empty($u['new_temp_contact'])) { echo json_encode(['error' => 'No pending phone number change found.']); exit; }

            $newContact = $u['new_temp_contact'];
            $this->pdo->prepare("UPDATE ADMIN SET contact_number = ?, new_temp_contact = NULL, otp_code = NULL, otp_expiry = NULL, failed_otp_attempts = 0 WHERE admin_id = ?")
                ->execute([$newContact, $aid]);

            SecurityContext::clearRateLimits($this->pdo, ['request_phone_change_otp', 'change_phone_submit']);
            echo json_encode(['success' => true, 'new_contact' => $newContact, 'message' => 'Mobile number updated successfully!']);
            exit;
        }
    }

    public function placeOrder() {
        $customer = SecurityContext::requireCustomer($this->pdo);
        $cid = $customer['customer_id'];
        $sid = (int)($_POST['station_id'] ?? 0);
        $cart = json_decode($_POST['cart'] ?? '[]', true);
        if (empty($cart) || !is_array($cart)) {
            echo json_encode(['error' => 'Cart cannot be empty.']);
            exit;
        }

        $allowedPay = ['COD', 'GCash', 'Maya'];
        $pay = $_POST['payment_method'] ?? 'COD';
        if (!in_array($pay, $allowedPay, true)) {
            echo json_encode(['error' => 'Invalid payment method selected.']);
            exit;
        }

        $addr = trim($_POST['delivery_address'] ?? '');
        if (empty($addr) || strlen($addr) > 500) {
            echo json_encode(['error' => 'Delivery address is required and must not exceed 500 characters.']);
            exit;
        }

        $proof = $_POST['payment_proof'] ?? null;
        $delivLat = isset($_POST['delivery_latitude']) && $_POST['delivery_latitude'] !== '' ? (float)$_POST['delivery_latitude'] : null;
        $delivLng = isset($_POST['delivery_longitude']) && $_POST['delivery_longitude'] !== '' ? (float)$_POST['delivery_longitude'] : null;
        $schedule = !empty($_POST['scheduled_date']) ? date('Y-m-d H:i:s', strtotime($_POST['scheduled_date'])) : null;
        $use_points = (isset($_POST['use_points']) && $_POST['use_points'] == '1');
        $returning_borrowed = (isset($_POST['returning_borrowed']) && $_POST['returning_borrowed'] == '1') ? 1 : 0;

        if (!empty($proof)) {
            if (!preg_match('/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+\/=\s]+$/', $proof)) {
                echo json_encode(['error' => 'Invalid payment proof format. Please upload a valid image file (JPEG, PNG, or WebP).']);
                exit;
            }
            if (strlen($proof) > 7 * 1024 * 1024) {
                echo json_encode(['error' => 'Payment proof image is too large. Maximum size is 5MB.']);
                exit;
            }
        }
        
        if (!empty($schedule)) {
            $schedTime = strtotime($schedule);
            $now = time();
            if ($schedTime < ($now - 300)) {
                echo json_encode(['error' => 'Scheduled delivery date and time cannot be in the past.']);
                exit;
            }
            if ($schedTime > ($now + (7 * 86400) + 3600)) {
                echo json_encode(['error' => 'Pre-orders can only be scheduled up to 1 week (7 days) ahead.']);
                exit;
            }
        }

        try {
            $this->pdo->beginTransaction();
            $stmtSt = $this->pdo->prepare("SELECT opening_time, closing_time, shipping_fee, jug_discount, new_jug_price, is_manually_closed, closure_message, status FROM STATION WHERE station_id = ? FOR UPDATE"); 
            $stmtSt->execute([$sid]);
            $st = $stmtSt->fetch();
            
            if (!$st || $st['status'] !== 'Active') {
                throw new Exception("The selected station is not currently active.");
            }
            if ($st['is_manually_closed'] == 1) { throw new Exception($st['closure_message'] ?: "Station is currently closed."); }
            if (empty($schedule) && (date('H:i:s') < $st['opening_time'] || date('H:i:s') > $st['closing_time'])) { throw new Exception("Station is closed. Please schedule delivery."); }

            if (!empty($schedule)) {
                $schedDateObj = new DateTime($schedule);
                $schedTimeString = $schedDateObj->format('H:i:s');
                if ($schedTimeString < $st['opening_time'] || $schedTimeString > $st['closing_time']) {
                    throw new Exception("Pre-orders must be scheduled within operating hours (".date('h:i A', strtotime($st['opening_time']))." - ".date('h:i A', strtotime($st['closing_time'])).").");
                }
            }

            $allowedOptions = ['owned', 'borrow', 'buy'];
            $allowedJugTypes = ['Round', 'Slim'];
            $totalQty = 0; $cartHash = 0; $totRound = 0; $totSlim = 0;
            $pIds = [];
            foreach($cart as $item) { 
                $qty = (int)($item['quantity'] ?? 0);
                if (empty($item['product_id']) || $qty <= 0 || $qty > 500) {
                    throw new Exception("Invalid item or quantity in your cart (maximum 500 units per item).");
                }
                $c_opt = $item['container_option'] ?? 'owned';
                if (!in_array($c_opt, $allowedOptions, true)) {
                    throw new Exception("Invalid container option selected.");
                }
                $j_type = $item['jug_type'] ?? 'Round';
                if (!in_array($j_type, $allowedJugTypes, true)) {
                    throw new Exception("Invalid jug type selected.");
                }
                $totalQty += $qty; 
                $cartHash += (int)$item['product_id']; 
                $pIds[] = (int)$item['product_id'];
                if ($j_type === 'Round') $totRound += $qty;
                else $totSlim += $qty;
            }
            
            $stmt = $this->pdo->prepare("SELECT stock_level FROM INVENTORY WHERE station_id = ? FOR UPDATE"); $stmt->execute([$sid]);
            if ($stmt->fetch()['stock_level'] < $totalQty) { throw new Exception("Insufficient general stock."); }

            $shippingFee = (float)$st['shipping_fee'];

            if ($use_points) {
                $stmtC = $this->pdo->prepare("SELECT points FROM CUSTOMER_LOYALTY WHERE customer_id = ? AND station_id = ? FOR UPDATE"); $stmtC->execute([$cid, $sid]);
                if ((int)$stmtC->fetchColumn() < 10) { throw new Exception("Not enough loyalty points."); }
                $this->pdo->prepare("UPDATE CUSTOMER_LOYALTY SET points = points - 10 WHERE customer_id = ? AND station_id = ?")->execute([$cid, $sid]);
            }
            
            $stationOrderNumber = 1;
            try { 
                $stmtSON = $this->pdo->prepare("SELECT IFNULL(MAX(station_order_number), 0) + 1 FROM ORDERS WHERE station_id = ? AND customer_id = ?");
                $stmtSON->execute([$sid, $cid]);
                $stationOrderNumber = $stmtSON->fetchColumn(); 
            } catch (Exception $e) { error_log($e->getMessage()); }

            $this->pdo->prepare("UPDATE INVENTORY SET stock_level = stock_level - ?, round_jugs = round_jugs - ?, slim_jugs = slim_jugs - ? WHERE station_id = ?")
                ->execute([$totalQty, $totRound, $totSlim, $sid]);

            $uniquePids = array_values(array_unique($pIds));
            $pPlaceholders = implode(',', array_fill(0, count($uniquePids), '?'));
            $stmtBatchP = $this->pdo->prepare("SELECT product_id, price FROM PRODUCTS WHERE product_id IN ($pPlaceholders) AND station_id = ? AND status = 'Active'");
            $stmtBatchP->execute(array_merge($uniquePids, [$sid]));
            $prodMap = [];
            while ($pRow = $stmtBatchP->fetch()) {
                $prodMap[(int)$pRow['product_id']] = (float)$pRow['price'];
            }

            if ($delivLat !== null && $delivLng !== null) {
                try {
                    $this->pdo->prepare("UPDATE CUSTOMER SET latitude = IFNULL(latitude, ?), longitude = IFNULL(longitude, ?) WHERE customer_id = ?")
                        ->execute([$delivLat, $delivLng, $cid]);
                } catch (Exception $e) {}
            }

            $stmtInsertOrder = $this->pdo->prepare("INSERT INTO ORDERS (station_id, customer_id, product_id, station_order_number, total_price, payment_method, payment_proof, quantity, delivery_address, delivery_latitude, delivery_longitude, scheduled_date, points_used, return_round, return_slim, borrow_round, borrow_slim, container_option, returning_borrowed_flag, jug_type, shipping_fee, jug_fee, discount_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            
            $isFirst = true; $i = 0; $discountIndex = count($cart) > 0 ? ($cartHash % count($cart)) : 0;

            foreach($cart as $c) {
                $pid = (int)$c['product_id'];
                if (!isset($prodMap[$pid])) {
                    throw new Exception("Product #{$pid} is not available at this station.");
                }
                $pricePerItem = $prodMap[$pid];
                $cQty = (int)$c['quantity'];
                $item_total = ($cQty * $pricePerItem);
                
                $c_opt = in_array($c['container_option'] ?? '', $allowedOptions, true) ? $c['container_option'] : 'owned';
                $isRound = (($c['jug_type'] ?? 'Round') === 'Round');
                $jType = $isRound ? 'Round' : 'Slim';
                
                $curr_rr = ($c_opt === 'owned' && $isRound) ? $cQty : 0;
                $curr_rs = ($c_opt === 'owned' && !$isRound) ? $cQty : 0;
                $curr_br = ($c_opt === 'borrow' && $isRound) ? $cQty : 0;
                $curr_bs = ($c_opt === 'borrow' && !$isRound) ? $cQty : 0;
                $curr_jug_buy = ($c_opt === 'buy') ? ($cQty * (float)$st['new_jug_price']) : 0;
                
                $curr_shipping = 0; $curr_discount = 0;
                if($isFirst) { $curr_shipping = $shippingFee; }
                if($use_points && $i === $discountIndex) { $curr_discount = $pricePerItem; }
                
                $proofToSave = $isFirst ? $proof : null;
                $stmtInsertOrder->execute([$sid, $cid, $pid, $stationOrderNumber, $item_total, $pay, $proofToSave, $cQty, $addr, $delivLat, $delivLng, $schedule, ($use_points && $i === $discountIndex ? 10 : 0), $curr_rr, $curr_rs, $curr_br, $curr_bs, $c_opt, $returning_borrowed, $jType, $curr_shipping, $curr_jug_buy, $curr_discount]);
                
                $isFirst = false; $i++;
            }
            $this->pdo->commit(); 

            WebPush::flushFastResponse(['success' => true, 'station_order_number' => $stationOrderNumber]);

            WebPush::sendToStationAdmins($this->pdo, $sid, "🔔 New Order #{$stationOrderNumber}", "A new order ({$totalQty} jugs) was placed. Tap to review.", '/#admin_dashboard');
            WebPush::sendToCustomer($this->pdo, $cid, "✅ Order #{$stationOrderNumber} Placed", "Your refilling order of {$totalQty} jugs was placed successfully. Waiting for station acceptance.", '/#customer_orders');
            exit;
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log("placeOrder error: " . $e->getMessage());
            if ($e instanceof PDOException) {
                echo json_encode(['error' => 'A database error occurred while placing your order. Please try again.']);
            } else {
                echo json_encode(['error' => $e->getMessage()]);
            }
        }
        exit;
    }

    public function submitReview() {
        $customer = SecurityContext::requireCustomer($this->pdo);
        $cid = $customer['customer_id'];
        $oid = (int)($_POST['order_id'] ?? 0);
        $rating = max(1, min(5, intval($_POST['rating'] ?? 5)));

        $stmt = $this->pdo->prepare("SELECT order_id, station_id, station_order_number, order_status FROM ORDERS WHERE order_id = ? AND customer_id = ?"); 
        $stmt->execute([$oid, $cid]);
        $ord = $stmt->fetch();

        if (!$ord) {
            SecurityContext::jsonResponse(404, ['error' => 'Order not found or does not belong to your account.']);
        }
        if ($ord['order_status'] !== 'Delivered') {
            SecurityContext::jsonResponse(400, ['error' => 'You can only review delivered orders.']);
        }

        if (!empty($ord['station_order_number'])) {
            $sibStmt = $this->pdo->prepare("SELECT order_id FROM ORDERS WHERE station_order_number = ? AND station_id = ? AND customer_id = ?");
            $sibStmt->execute([$ord['station_order_number'], $ord['station_id'], $cid]);
            $siblings = $sibStmt->fetchAll(PDO::FETCH_COLUMN);
            foreach ($siblings as $sId) {
                $this->pdo->prepare("INSERT INTO REVIEWS (order_id, station_id, customer_id, rating) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating)")->execute([$sId, $ord['station_id'], $cid, $rating]);
            }
        } else {
            $this->pdo->prepare("INSERT INTO REVIEWS (order_id, station_id, customer_id, rating) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating)")->execute([$oid, $ord['station_id'], $cid, $rating]); 
        }
        CustomerController::clearStationsCache();
        echo json_encode(['success' => true]); 
        exit;
    }

    public function updateLocation() {
        $customer = SecurityContext::requireCustomer($this->pdo);
        $cid = $customer['customer_id'];
        $lat = isset($_POST['latitude']) && $_POST['latitude'] !== '' ? (float)$_POST['latitude'] : null;
        $lng = isset($_POST['longitude']) && $_POST['longitude'] !== '' ? (float)$_POST['longitude'] : null;
        $addr = trim($_POST['address'] ?? '');

        if (!empty($addr)) {
            $stmt = $this->pdo->prepare("UPDATE CUSTOMER SET latitude = ?, longitude = ?, address = ? WHERE customer_id = ?");
            $stmt->execute([$lat, $lng, $addr, $cid]);
        } else {
            $stmt = $this->pdo->prepare("UPDATE CUSTOMER SET latitude = ?, longitude = ? WHERE customer_id = ?");
            $stmt->execute([$lat, $lng, $cid]);
        }
        echo json_encode(['success' => true, 'latitude' => $lat, 'longitude' => $lng, 'address' => $addr]);
        exit;
    }
}
