<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
date_default_timezone_set('Asia/Manila'); 

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/SecurityContext.php';
require_once __DIR__ . '/WebPush.php';
require_once __DIR__ . '/controllers/CustomerController.php';
require_once __DIR__ . '/controllers/AdminController.php';
require_once __DIR__ . '/OrderHelper.php';


$lifetime = 60 * 60 * 24 * 30; 
ini_set('session.cookie_lifetime', $lifetime);
ini_set('session.gc_maxlifetime', $lifetime);
ini_set('session.use_strict_mode', 1);

$session_path = __DIR__ . '/sessions';
if (!is_dir($session_path)) {
    @mkdir($session_path, 0755, true);
    @file_put_contents($session_path . '/.htaccess', "<IfModule !mod_authz_core.c>\nOrder allow,deny\nDeny from all\n</IfModule>\n<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n");
}
session_save_path($session_path);

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);

session_set_cookie_params([
    'lifetime' => $lifetime,
    'path' => '/',
    'domain' => '',
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start();
header("Content-Type: application/json");
header("X-Content-Type-Options: nosniff");

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
    $pdo->exec("SET time_zone = '+08:00'");

    if (!file_exists(__DIR__ . '/.migrated_v5')) {
        require_once __DIR__ . '/migrations.php';
        run_migrations($pdo);
    }
    
} catch (PDOException $e) { 
    error_log("Database connection failed: " . $e->getMessage());
    echo json_encode(['error' => 'Database connection failed.']); 
    exit; 
}



if (!isset($_SESSION['last_auto_cancel_check']) || (time() - $_SESSION['last_auto_cancel_check']) > 30) {
    $_SESSION['last_auto_cancel_check'] = time();
    OrderHelper::autoCancelExpiredOrders($pdo);
}

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$action = $_GET['action'] ?? '';

// Public authentication and guest actions exempt from pre-session CSRF validation
$csrfExempt = [
    'customer_login',
    'admin_login',
    'customer_register',
    'verify_registration_otp',
    'forgot_password_request',
    'reset_password_submit',
    'logout',
    'get_vapid_public_key'
];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !in_array($action, $csrfExempt, true)) {
    $clientToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';

    if (!hash_equals($_SESSION['csrf_token'], $clientToken)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid CSRF token. Refresh the page and try again.']);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && empty($_POST)) {
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        $jsonDecoded = json_decode($rawInput, true);
        if (is_array($jsonDecoded)) {
            $_POST = $jsonDecoded;
        }
    }
}

$rate_limit_actions = ['customer_login', 'customer_register', 'verify_registration_otp', 'forgot_password_request', 'reset_password_submit', 'request_password_change_otp', 'change_password_submit', 'request_phone_change_otp', 'change_phone_submit', 'admin_login'];
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
if (in_array($action, $rate_limit_actions) && !in_array($ip, ['127.0.0.1', '::1'])) {
    $stmt = $pdo->prepare("SELECT attempts, last_attempt FROM rate_limits WHERE ip_address = ? AND action = ?");
    $stmt->execute([$ip, $action]);
    $row = $stmt->fetch();
    
    $max_attempts = 5;
    if ($row) {
        $minutes_passed = (time() - strtotime($row['last_attempt'])) / 60;
        if ($minutes_passed > 5) {
            $pdo->prepare("UPDATE rate_limits SET attempts = 1, last_attempt = NOW() WHERE ip_address = ? AND action = ?")->execute([$ip, $action]);
        } else {
            if ($row['attempts'] >= $max_attempts) {
                http_response_code(429);
                echo json_encode(['error' => 'Too many attempts. Please try again in 5 minutes.']);
                exit;
            }
            $pdo->prepare("UPDATE rate_limits SET attempts = attempts + 1, last_attempt = NOW() WHERE ip_address = ? AND action = ?")->execute([$ip, $action]);
        }
    } else {
        $pdo->prepare("INSERT INTO rate_limits (ip_address, action, attempts, last_attempt) VALUES (?, ?, 1, NOW())")->execute([$ip, $action]);
    }
}

$customerController = null;
$adminController = null;
function getCustomerController($pdo) {
    global $customerController;
    if ($customerController === null) {
        $customerController = new CustomerController($pdo);
    }
    return $customerController;
}
function getAdminController($pdo) {
    global $adminController;
    if ($adminController === null) {
        $adminController = new AdminController($pdo);
    }
    return $adminController;
}

switch ($action) {
    case 'check_session':
        try {
            if (isset($_SESSION['customer_id'])) {
                $stmt = $pdo->prepare("SELECT customer_id, full_name, contact_number, address, is_verified FROM CUSTOMER WHERE customer_id = ?");
                $stmt->execute([$_SESSION['customer_id']]);
                if ($c = $stmt->fetch()) { 
                    if ($c['is_verified'] == 0) {
                        unset($_SESSION['customer_id']);
                        echo json_encode(['logged_in' => false, 'csrf_token' => $_SESSION['csrf_token']]);
                        exit;
                    }
                    $pdo->prepare("UPDATE CUSTOMER SET last_active = CURRENT_TIMESTAMP WHERE customer_id = ?")->execute([$_SESSION['customer_id']]);
                    echo json_encode(['logged_in' => true, 'type' => 'customer', 'data' => $c, 'csrf_token' => $_SESSION['csrf_token']]); 
                    exit;
                }
            } elseif (isset($_SESSION['admin_id'])) {
                $stmt = $pdo->prepare("SELECT a.*, s.station_name FROM ADMIN a LEFT JOIN STATION s ON a.station_id = s.station_id WHERE a.admin_id = ?");
                $stmt->execute([$_SESSION['admin_id']]);
                if ($a = $stmt->fetch()) { 
                    $_SESSION['station_id'] = $a['station_id'];
                    $_SESSION['role'] = $a['role'];
                    unset($a['password'], $a['otp_code'], $a['otp_expiry'], $a['new_temp_contact'], $a['failed_otp_attempts']);
                    echo json_encode(['logged_in' => true, 'type' => 'admin', 'data' => $a, 'csrf_token' => $_SESSION['csrf_token']]); 
                    exit; 
                }
            }
        } catch(PDOException $e) { error_log($e->getMessage()); }
        
        echo json_encode(['logged_in' => false, 'csrf_token' => $_SESSION['csrf_token']]);
        exit;
    case 'get_payment_proof':
        $rawInput = file_get_contents('php://input');
        $jsonData = json_decode($rawInput, true) ?? [];
        $oid = $_POST['order_id'] ?? $jsonData['order_id'] ?? $_GET['order_id'] ?? null;
        $cid = $_SESSION['customer_id'] ?? null;
        $aid = $_SESSION['admin_id'] ?? null;
        $sid = $_SESSION['station_id'] ?? null;
        $role = $_SESSION['role'] ?? '';

        if (!$oid || (!$cid && !$aid)) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']); 
            exit;
        }

        try {
            if ($cid) {
                $stmt = $pdo->prepare("SELECT order_id, station_order_number, payment_proof FROM ORDERS WHERE order_id = ? AND customer_id = ?");
                $stmt->execute([$oid, $cid]);
            } elseif ($role === 'Super Admin') {
                $stmt = $pdo->prepare("SELECT order_id, station_order_number, payment_proof FROM ORDERS WHERE order_id = ?");
                $stmt->execute([$oid]);
            } else {
                $stmt = $pdo->prepare("SELECT order_id, station_order_number, payment_proof FROM ORDERS WHERE order_id = ? AND station_id = ?");
                $stmt->execute([$oid, $sid]);
            }
            $targetOrder = $stmt->fetch();

            if (!$targetOrder) {
                echo json_encode(['payment_proof' => null, 'error' => 'Order not found']);
                exit;
            }

            if (!empty($targetOrder['payment_proof'])) {
                echo json_encode(['payment_proof' => $targetOrder['payment_proof']]);
                exit;
            }

            if (!empty($targetOrder['station_order_number'])) {
                if ($cid) {
                    $stmtSib = $pdo->prepare("SELECT payment_proof FROM ORDERS WHERE station_order_number = ? AND customer_id = ? AND payment_proof IS NOT NULL AND payment_proof != '' LIMIT 1");
                    $stmtSib->execute([$targetOrder['station_order_number'], $cid]);
                } elseif ($role === 'Super Admin') {
                    $stmtSib = $pdo->prepare("SELECT payment_proof FROM ORDERS WHERE station_order_number = ? AND payment_proof IS NOT NULL AND payment_proof != '' LIMIT 1");
                    $stmtSib->execute([$targetOrder['station_order_number']]);
                } else {
                    $stmtSib = $pdo->prepare("SELECT payment_proof FROM ORDERS WHERE station_order_number = ? AND station_id = ? AND payment_proof IS NOT NULL AND payment_proof != '' LIMIT 1");
                    $stmtSib->execute([$targetOrder['station_order_number'], $sid]);
                }
                $sibProof = $stmtSib->fetchColumn();
                if (!empty($sibProof)) {
                    echo json_encode(['payment_proof' => $sibProof]);
                    exit;
                }
            }

            echo json_encode(['payment_proof' => null]);
            exit;
        } catch (Exception $e) {
            error_log("get_payment_proof error: " . $e->getMessage());
            echo json_encode(['payment_proof' => null, 'error' => $e->getMessage()]);
            exit;
        }

    case 'ping':
        if (isset($_SESSION['customer_id'])) {
            $pdo->prepare("UPDATE CUSTOMER SET last_active = CURRENT_TIMESTAMP WHERE customer_id = ?")->execute([$_SESSION['customer_id']]);
        }
        echo json_encode(['success' => true]);
        exit;
    case 'logout': 
        $cid = $_SESSION['customer_id'] ?? null;
        $uid = $_SESSION['admin_id'] ?? null;
        if ($cid) {
            $pdo->prepare("DELETE FROM PUSH_SUBSCRIPTIONS WHERE customer_id = ?")->execute([$cid]);
        }
        if ($uid) {
            $pdo->prepare("DELETE FROM PUSH_SUBSCRIPTIONS WHERE user_id = ?")->execute([$uid]);
        }
        $rawInput = file_get_contents('php://input');
        $sub = json_decode($rawInput, true);
        if (!empty($sub['endpoint'])) {
            $pdo->prepare("DELETE FROM PUSH_SUBSCRIPTIONS WHERE endpoint = ?")->execute([$sub['endpoint']]);
        }
        session_destroy(); 
        echo json_encode(['success' => true]); 
        exit;

    case 'get_stations': getCustomerController($pdo)->getStations(); break;
    case 'customer_login': getCustomerController($pdo)->login(); break;
    case 'customer_register': getCustomerController($pdo)->register(); break;
    case 'verify_registration_otp': getCustomerController($pdo)->verifyOtp(); break;
    case 'forgot_password_request': getCustomerController($pdo)->forgotPasswordRequest(); break;
    case 'reset_password_submit': getCustomerController($pdo)->resetPasswordSubmit(); break;
    case 'request_password_change_otp': getCustomerController($pdo)->requestPasswordChangeOtp(); break;
    case 'change_password_submit': getCustomerController($pdo)->changePasswordSubmit(); break;
    case 'request_phone_change_otp': getCustomerController($pdo)->requestPhoneChangeOtp(); break;
    case 'change_phone_submit': getCustomerController($pdo)->changePhoneSubmit(); break;
    case 'place_order': getCustomerController($pdo)->placeOrder(); break;
    case 'get_customer_orders': getCustomerController($pdo)->getOrders(); break;
    case 'submit_review': getCustomerController($pdo)->submitReview(); break;

    case 'admin_login': getAdminController($pdo)->login(); break;
    case 'sa_get_stations': getAdminController($pdo)->saGetStations(); break;
    case 'sa_add_station': getAdminController($pdo)->saAddStation(); break;
    case 'sa_toggle_station': getAdminController($pdo)->saToggleStation(); break;
    case 'sa_delete_station': getAdminController($pdo)->saDeleteStation(); break;
    case 'sa_get_users': getAdminController($pdo)->saGetUsers(); break;
    case 'sa_save_admin': getAdminController($pdo)->saSaveAdmin(); break;
    case 'sa_toggle_admin_status': getAdminController($pdo)->saToggleAdminStatus(); break;
    case 'sa_delete_admin': getAdminController($pdo)->saDeleteAdmin(); break;
    case 'sa_save_customer': getAdminController($pdo)->saSaveCustomer(); break;
    case 'sa_toggle_customer_verification': getAdminController($pdo)->saToggleCustomerVerification(); break;
    case 'sa_delete_customer': getAdminController($pdo)->saDeleteCustomer(); break;
    case 'get_admin_dashboard_data': getAdminController($pdo)->getAdminDashboardData(); break;
    case 'get_sales_report': getAdminController($pdo)->getSalesReport(); break;
    case 'admin_update_logistics': getAdminController($pdo)->adminUpdateLogistics(); break;
    case 'admin_update_advanced_inventory': getAdminController($pdo)->adminUpdateAdvancedInventory(); break;
    case 'admin_mark_returned': getAdminController($pdo)->adminMarkReturned(); break;
    case 'admin_update_hours': getAdminController($pdo)->adminUpdateHours(); break;
    case 'admin_update_closure': getAdminController($pdo)->adminUpdateClosure(); break;
    case 'admin_update_maintenance': getAdminController($pdo)->adminUpdateMaintenance(); break;
    case 'admin_update_payment_profile': getAdminController($pdo)->adminUpdatePaymentProfile(); break;
    case 'admin_update_security': getAdminController($pdo)->adminUpdateSecurity(); break;
    case 'admin_add_product': getAdminController($pdo)->adminAddProduct(); break;
    case 'admin_edit_product': getAdminController($pdo)->adminEditProduct(); break;
    case 'admin_delete_product': getAdminController($pdo)->adminDeleteProduct(); break;
    case 'admin_add_staff': getAdminController($pdo)->adminAddStaff(); break;
    case 'admin_toggle_staff': getAdminController($pdo)->adminToggleStaff(); break;
    case 'get_admin_loyalty': getAdminController($pdo)->getAdminLoyalty(); break;
    case 'update_order_status': getAdminController($pdo)->updateOrderStatus(); break;
    case 'admin_test_push': getAdminController($pdo)->adminTestPush(); break;

    case 'get_vapid_public_key':
        echo json_encode(['vapid_public_key' => WebPush::getVapidPublicKey()]);
        exit;

    case 'save_push_subscription':
        $rawInput = file_get_contents('php://input');
        $sub = json_decode($rawInput, true);
        if (is_string($sub)) {
            $sub = json_decode($sub, true);
        }
        if (!$sub && !empty($_POST['endpoint'])) {
            $sub = [
                'endpoint' => $_POST['endpoint'],
                'keys' => [
                    'p256dh' => $_POST['p256dh'] ?? '',
                    'auth' => $_POST['auth'] ?? ''
                ]
            ];
        }
        if (!$sub || empty($sub['endpoint']) || empty($sub['keys']['p256dh']) || empty($sub['keys']['auth'])) {
            echo json_encode(['error' => 'Invalid subscription payload', 'received' => substr($rawInput, 0, 100)]);
            exit;
        }
        $cid = $_SESSION['customer_id'] ?? null;
        $uid = $_SESSION['admin_id'] ?? null;
        if (!$cid && !$uid) {
            echo json_encode(['error' => 'Must be logged in to enable push notifications']);
            exit;
        }
        
        $endpoint = $sub['endpoint'];
        if (!WebPush::isValidPushEndpoint($endpoint)) {
            echo json_encode(['error' => 'Invalid or untrusted push endpoint']);
            exit;
        }
        $p256dh = $sub['keys']['p256dh'];
        $auth = $sub['keys']['auth'];

        $stmtDel = $pdo->prepare("DELETE FROM PUSH_SUBSCRIPTIONS WHERE endpoint = ?");
        $stmtDel->execute([$endpoint]);

        $stmt = $pdo->prepare("INSERT INTO PUSH_SUBSCRIPTIONS (customer_id, user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$cid, $uid, $endpoint, $p256dh, $auth]);
        
        $testPush = !empty($_GET['test']) || !empty($_POST['test']) || !empty($sub['test']);
        $pushResult = null;
        if ($testPush) {
            $pushResult = WebPush::sendPush($endpoint, $p256dh, $auth, [
                'title' => '💧 Notifications Enabled!',
                'body' => 'You will now receive instant order updates on your lock screen.',
                'url' => '/#customer_orders'
            ]);
        }

        echo json_encode([
            'success' => true,
            'pushed' => !empty($pushResult['success']),
            'push_http' => $pushResult['http_code'] ?? null
        ]);
        exit;

    default:
        echo json_encode(['error' => 'Invalid action']);
        exit;
}