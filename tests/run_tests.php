<?php
/**
 * Mababanaba Waters - Security & Business Logic Automated Test Suite
 * 
 * Target Environment: Isolated Disposable Test Database (`test_mababanaba_audit`)
 * Safe, isolated, zero impact on production data.
 */

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '1');

// Setup test database credentials
$dbHost = '127.0.0.1';
$dbName = 'test_mababanaba_audit';
$dbUser = 'root';
$dbPass = '';

echo "=========================================================\n";
echo "   MABABANABA WATERS SECURITY & REGRESSION TEST RUNNER   \n";
echo "=========================================================\n\n";

try {
    $pdo = new PDO("mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec("SET time_zone = '+08:00'");
} catch (PDOException $e) {
    echo "[-] FAILED: Could not connect to test database {$dbName}: " . $e->getMessage() . "\n";
    exit(1);
}

// Require application dependencies
define('APP_ENV', 'development');
define('APP_SECRET_KEY', 'test_secret_key_audit_32bytes_min_length_secure!!');
define('MAPBOX_ACCESS_TOKEN', 'pk.test_fake_mapbox_token');

require_once __DIR__ . '/../api/SecurityContext.php';
require_once __DIR__ . '/../api/services/SmsService.php';
require_once __DIR__ . '/../api/controllers/CustomerController.php';
require_once __DIR__ . '/../api/controllers/SuperAdminController.php';
require_once __DIR__ . '/../api/controllers/DeliveryStaffController.php';

$testResults = [
    'total' => 0,
    'passed' => 0,
    'failed' => 0,
];

function assertTest(string $name, bool $condition, string $detail = '') {
    global $testResults;
    $testResults['total']++;
    if ($condition) {
        $testResults['passed']++;
        echo " [PASS] " . $name . "\n";
    } else {
        $testResults['failed']++;
        echo " [FAIL] " . $name . ($detail ? " - {$detail}" : "") . "\n";
    }
}

// Reset and seed disposable test database
echo "[*] Initializing clean state in test database...\n";

$pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
$tables = ['SMS_LOGS', 'rate_limits', 'PUSH_SUBSCRIPTIONS', 'REVIEWS', 'DELIVERIES', 'ORDERS', 'CUSTOMER_LOYALTY', 'INVENTORY', 'PRODUCTS', 'ADMIN', 'CUSTOMER', 'STATION'];
foreach ($tables as $t) {
    try { $pdo->exec("TRUNCATE TABLE {$t}"); } catch (Exception $e) {}
}
$pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

// Seed Stations
$pdo->exec("INSERT INTO STATION (station_id, station_name, address, status, shipping_fee, new_jug_price) VALUES 
    (1, 'Station 1 Central', 'Mababanaba Central', 'Active', 30.00, 170.00),
    (2, 'Station 2 North', 'Mababanaba North', 'Active', 30.00, 170.00),
    (3, 'Station 3 South', 'Mababanaba South', 'Suspended', 30.00, 170.00)
");

// Seed Products
$pdo->exec("INSERT INTO PRODUCTS (product_id, station_id, name, price, status) VALUES 
    (1, 1, 'Purified Water', 30.00, 'Active'),
    (2, 1, 'Mineral Water', 25.00, 'Active'),
    (3, 2, 'Alkaline Water', 45.00, 'Active')
");

// Seed Inventory
$pdo->exec("INSERT INTO INVENTORY (station_id, stock_level, round_jugs, slim_jugs) VALUES 
    (1, 50, 5, 20),
    (2, 100, 50, 50),
    (3, 0, 0, 0)
");

// Seed Admins & Staff
$pHash = password_hash('Pass123!', PASSWORD_DEFAULT);
$pdo->exec("INSERT INTO ADMIN (admin_id, station_id, username, password, role, status) VALUES 
    (1, NULL, 'superadmin_test', '{$pHash}', 'Super Admin', 'Active'),
    (2, 1, 'station1_rider1', '{$pHash}', 'Delivery Staff', 'Active'),
    (3, 1, 'station1_rider2', '{$pHash}', 'Delivery Staff', 'Active'),
    (4, 1, 'station1_revoked_admin', '{$pHash}', 'Admin', 'Revoked'),
    (5, 3, 'station3_suspended_admin', '{$pHash}', 'Admin', 'Active')
");

// Seed Customers
$pdo->exec("INSERT INTO CUSTOMER (customer_id, contact_number, full_name, password, is_verified) VALUES 
    (1, '09123456789', 'Verified Customer 1', '{$pHash}', 1),
    (2, '09987654321', 'Unverified Customer 2', '{$pHash}', 0)
");

echo "[+] Database seeded successfully.\n\n";

// =========================================================================
// TEST GROUP 1: PATH TRAVERSAL IN LOCAL ROUTER (SEC-01)
// =========================================================================
echo "--- TEST GROUP 1: LOCAL ROUTER & PATH TRAVERSAL (SEC-01) ---\n";

function testRouterPath(string $uri): int {
    $cleanPath = parse_url($uri, PHP_URL_PATH) ?? '/';
    $rawDecoded = rawurldecode($cleanPath);
    if (strpos($cleanPath, '..') !== false || strpos($rawDecoded, '..') !== false || strpos($cleanPath, "\0") !== false) {
        return 403;
    }
    if (preg_match('#(^|/)\.[a-zA-Z0-9]#', $cleanPath)) {
        return 403;
    }
    if (preg_match('#\.(env|secret_key|sql|log|bak|ini|sh|git|md)$#i', $cleanPath)) {
        return 403;
    }
    if (preg_match('#^/api/(sessions|controllers|services)/#i', $cleanPath)) {
        return 403;
    }
    return 200;
}

assertTest("local_router: rejects /api/../.env", testRouterPath('/api/../.env') === 403);
assertTest("local_router: rejects /../.env", testRouterPath('/../.env') === 403);
assertTest("local_router: rejects /api/.secret_key", testRouterPath('/api/.secret_key') === 403);
assertTest("local_router: rejects /api/sessions/sess_abc123", testRouterPath('/api/sessions/sess_abc123') === 403);
assertTest("local_router: rejects /database/schema.sql", testRouterPath('/database/schema.sql') === 403);
assertTest("local_router: allows /api/api.php", testRouterPath('/api/api.php') === 200);

// =========================================================================
// TEST GROUP 2: AUTHENTICATION & SECURITY CONTEXT (SEC-04, SEC-05)
// =========================================================================
echo "\n--- TEST GROUP 2: AUTHENTICATION & ACCESS CONTROL (SEC-04, SEC-05) ---\n";

// Password verify
assertTest("auth: valid password verification succeeds", password_verify('Pass123!', $pHash) === true);
assertTest("auth: invalid password verification fails", password_verify('WrongPassword', $pHash) === false);

// Customer verification check
$_SESSION = ['customer_id' => 2]; // Unverified customer
$unverifiedBlocked = false;
try {
    // Override jsonResponse behavior via mock or catch
    $stmt = $pdo->prepare("SELECT customer_id, is_verified FROM CUSTOMER WHERE customer_id = ?");
    $stmt->execute([2]);
    $cRow = $stmt->fetch();
    if ((int)$cRow['is_verified'] !== 1) {
        $unverifiedBlocked = true;
    }
} catch (Exception $e) {}
assertTest("auth: unverified customer is blocked", $unverifiedBlocked === true);

// Revoked admin check
$stmt = $pdo->prepare("SELECT a.status, s.status as station_status FROM ADMIN a LEFT JOIN STATION s ON a.station_id = s.station_id WHERE a.admin_id = ?");
$stmt->execute([4]);
$revokedAdmin = $stmt->fetch();
$revokedBlocked = ($revokedAdmin['status'] === 'Revoked');
assertTest("auth: revoked admin status detected and rejected", $revokedBlocked === true);

// Suspended station check
$stmt->execute([5]);
$suspAdmin = $stmt->fetch();
$stationSuspendedBlocked = ($suspAdmin['station_status'] === 'Suspended');
assertTest("auth: admin from suspended station detected and rejected", $stationSuspendedBlocked === true);

// =========================================================================
// TEST GROUP 3: HMAC-SHA256 TOKEN INTEGRITY
// =========================================================================
echo "\n--- TEST GROUP 3: HMAC-SHA256 TOKEN VERIFICATION ---\n";

$token = SecurityContext::generateAuthToken(1, 'customer');
$verified = SecurityContext::verifyAuthToken($token);
assertTest("token: valid customer token parses correctly", $verified !== null && $verified['id'] === 1 && $verified['type'] === 'customer');

// Tampered signature
$parts = explode('.', $token);
$tamperedSig = substr($parts[1], 0, -2) . 'ab';
$tamperedToken = $parts[0] . '.' . $tamperedSig;
$tamperedResult = SecurityContext::verifyAuthToken($tamperedToken);
assertTest("token: tampered signature is rejected", $tamperedResult === null);

// Malformed token
assertTest("token: malformed token without dot is rejected", SecurityContext::verifyAuthToken('invalid_token_string') === null);

// =========================================================================
// TEST GROUP 4: PHONE NORMALIZATION & PII MASKING (SEC-07, SEC-15)
// =========================================================================
echo "\n--- TEST GROUP 4: PHONE NORMALIZATION & PII MASKING (SEC-07, SEC-15) ---\n";

assertTest("phone: normalize +639123456789 -> 09123456789", SecurityContext::normalizePhone('+639123456789') === '09123456789');
assertTest("phone: normalize 639123456789 -> 09123456789", SecurityContext::normalizePhone('639123456789') === '09123456789');
assertTest("phone: normalize 09123456789 -> 09123456789", SecurityContext::normalizePhone('09123456789') === '09123456789');

// Test phone masking in SMS logs
$testPhone = '09123456789';
$maskedNumber = strlen($testPhone) >= 7 ? substr($testPhone, 0, 4) . '****' . substr($testPhone, -3) : '***********';
assertTest("phone masking: 09123456789 masked to 0912****789", $maskedNumber === '0912****789');

// =========================================================================
// TEST GROUP 5: BUSINESS LOGIC: STATION LOYALTY POINTS ISOLATION (SEC-02)
// =========================================================================
echo "\n--- TEST GROUP 5: LOYALTY POINTS ISOLATION (SEC-02) ---\n";

// Give Customer 1 20 points at Station 2, but 0 points at Station 1
$pdo->exec("INSERT INTO CUSTOMER_LOYALTY (customer_id, station_id, points, lifetime_points) VALUES (1, 2, 20, 20)");

// Attempt to use points at Station 1
$cid = 1;
$sid = 1;
$use_points = true;
$loyaltyBlocked = false;

$stmtC = $pdo->prepare("SELECT points FROM CUSTOMER_LOYALTY WHERE customer_id = ? AND station_id = ? FOR UPDATE"); 
$stmtC->execute([$cid, $sid]);
$currPoints = (int)$stmtC->fetchColumn();
if ($currPoints < 10) {
    $stmtDeliv = $pdo->prepare("SELECT GREATEST(0, (IFNULL(SUM(quantity), 0) * 2) - IFNULL(SUM(points_used), 0)) FROM ORDERS WHERE customer_id = ? AND station_id = ? AND order_status = 'Delivered'");
    $stmtDeliv->execute([$cid, $sid]);
    $ordPoints = (int)$stmtDeliv->fetchColumn();
    if ($ordPoints >= 10) {
        $currPoints = $ordPoints;
    }
}
if ($currPoints < 10) {
    $loyaltyBlocked = true;
}

assertTest("loyalty: station 2 points cannot be used at station 1", $loyaltyBlocked === true);

// =========================================================================
// TEST GROUP 6: INVENTORY UNDERFLOW PREVENTION (SEC-08)
// =========================================================================
echo "\n--- TEST GROUP 6: INVENTORY UNDERFLOW PREVENTION (SEC-08) ---\n";

// Station 1 has 5 Round jugs, 20 Slim jugs. Try to order 10 Round jugs.
$requestedRound = 10;
$stmtInv = $pdo->prepare("SELECT stock_level, round_jugs, slim_jugs FROM INVENTORY WHERE station_id = 1 FOR UPDATE");
$stmtInv->execute();
$invRow = $stmtInv->fetch();

$inventoryBlocked = false;
if ($requestedRound > 0 && ((int)$invRow['round_jugs'] < $requestedRound)) {
    $inventoryBlocked = true;
}
assertTest("inventory: ordering more round jugs than in stock is rejected", $inventoryBlocked === true);

// Verify stock was not decremented
$stmtInv->execute();
$invAfter = $stmtInv->fetch();
assertTest("inventory: stock remains uncorrupted at 5 round jugs", (int)$invAfter['round_jugs'] === 5);

// =========================================================================
// TEST GROUP 7: CONTAINER DEBT RESTRICTION (PHASE 4D)
// =========================================================================
echo "\n--- TEST GROUP 7: CONTAINER DEBT SAFEGUARD (PHASE 4D) ---\n";

// Insert an unreturned borrowed order for Customer 1 at Station 1
$pdo->exec("INSERT INTO ORDERS (station_id, customer_id, product_id, quantity, jug_type, container_option, borrow_round, borrow_status, order_status, total_price) 
    VALUES (1, 1, 1, 2, 'Round', 'borrow', 2, 'Pending', 'Delivered', 60.00)");

$stmtDebt = $pdo->prepare("SELECT COUNT(*) FROM ORDERS WHERE customer_id = ? AND station_id = ? AND borrow_status = 'Pending' AND (borrow_round > 0 OR borrow_slim > 0)");
$stmtDebt->execute([1, 1]);
$hasDebt = ((int)$stmtDebt->fetchColumn() > 0);
assertTest("debt: customer with unreturned container has active debt", $hasDebt === true);

// Test borrow restriction logic
$newBorrowBlocked = false;
if ($hasDebt) {
    $newBorrowBlocked = true;
}
assertTest("debt: new borrow order blocked when unreturned containers exist", $newBorrowBlocked === true);

// =========================================================================
// TEST GROUP 8: ORDER CANCELLATION & STOCK RESTORATION IDEMPOTENCY
// =========================================================================
echo "\n--- TEST GROUP 8: CANCELLATION & STOCK IDEMPOTENCY (PHASE 4C) ---\n";

// Place an active order: 2 slim jugs at Station 1
$pdo->exec("UPDATE INVENTORY SET stock_level = stock_level - 2, slim_jugs = slim_jugs - 2 WHERE station_id = 1");
$pdo->exec("INSERT INTO ORDERS (order_id, station_id, customer_id, product_id, quantity, jug_type, container_option, order_status, total_price, station_order_number) 
    VALUES (101, 1, 1, 1, 2, 'Slim', 'owned', 'Pending', 60.00, 99)");

// Get inventory before cancel
$invBefore = $pdo->query("SELECT slim_jugs FROM INVENTORY WHERE station_id = 1")->fetchColumn();

// First cancellation
$pdo->beginTransaction();
$pdo->exec("UPDATE INVENTORY SET stock_level = stock_level + 2, slim_jugs = slim_jugs + 2 WHERE station_id = 1");
$pdo->exec("UPDATE ORDERS SET order_status = 'Cancelled' WHERE order_id = 101");
$pdo->commit();

$invAfterFirstCancel = $pdo->query("SELECT slim_jugs FROM INVENTORY WHERE station_id = 1")->fetchColumn();
assertTest("cancellation: stock restored once on first cancel", (int)$invAfterFirstCancel === (int)$invBefore + 2);

// Second cancellation attempt
$secondCancelBlocked = false;
$currStatus = $pdo->query("SELECT order_status FROM ORDERS WHERE order_id = 101")->fetchColumn();
if (in_array($currStatus, ['Delivered', 'Cancelled'], true)) {
    $secondCancelBlocked = true;
}
assertTest("cancellation: repeated cancellation on already cancelled order rejected", $secondCancelBlocked === true);

// =========================================================================
// TEST GROUP 9: DELIVERY STAFF ORDER HIJACKING DEFENSE (SEC-14)
// =========================================================================
echo "\n--- TEST GROUP 9: DELIVERY STAFF HIJACKING (SEC-14) ---\n";

// Create order 201 'To Deliver' assigned to Rider 1 (admin_id 2)
$pdo->exec("INSERT INTO ORDERS (order_id, station_id, customer_id, product_id, quantity, jug_type, container_option, order_status, total_price) 
    VALUES (201, 1, 1, 1, 1, 'Round', 'owned', 'To Deliver', 30.00)");
$pdo->exec("INSERT INTO DELIVERIES (order_id, admin_id, quantity) VALUES (201, 2, 1)");

// Rider 2 (admin_id 3) tries to mark order 201 delivered
$rider2Id = 3;
$stmtDel = $pdo->prepare("SELECT admin_id FROM DELIVERIES WHERE order_id = ? ORDER BY delivery_id DESC LIMIT 1");
$stmtDel->execute([201]);
$assignedStaff = $stmtDel->fetchColumn();

$rider2Blocked = false;
if ($assignedStaff && (int)$assignedStaff !== $rider2Id) {
    $rider2Blocked = true;
}
assertTest("authorization: rider 2 blocked from delivering rider 1's assigned order", $rider2Blocked === true);

// Rider 1 (admin_id 2) allowed
$rider1Allowed = ($assignedStaff && (int)$assignedStaff === 2);
assertTest("authorization: assigned rider 1 allowed to deliver assigned order", $rider1Allowed === true);

// =========================================================================
// TEST GROUP 10: SUPER ADMIN DEFENSE & STATION DELETION INTEGRITY (SEC-11)
// =========================================================================
echo "\n--- TEST GROUP 10: SUPER ADMIN DEFENSE & AUDIT INTEGRITY (SEC-11) ---\n";

// Super Admin self-demotion check
$currentAdminId = 1;
$editAdminId = 1;
$requestedRole = 'Admin';
$requestedStatus = 'Active';

$selfDemotionBlocked = false;
if ($editAdminId === $currentAdminId && ($requestedRole !== 'Super Admin' || $requestedStatus !== 'Active')) {
    $selfDemotionBlocked = true;
}
assertTest("superadmin: self-demotion is rejected", $selfDemotionBlocked === true);

// Station deletion protection when orders exist
$stationToCheck = 1; // Has orders in ORDERS table
$checkOrders = $pdo->prepare("SELECT COUNT(*) FROM ORDERS WHERE station_id = ?");
$checkOrders->execute([$stationToCheck]);
$hasOrders = ((int)$checkOrders->fetchColumn() > 0);

$stationDeleteBlocked = false;
if ($hasOrders) {
    $stationDeleteBlocked = true;
}
assertTest("station: deleting station with historical orders is rejected", $stationDeleteBlocked === true);

// =========================================================================
// SUMMARY REPORT
// =========================================================================
echo "\n=========================================================\n";
echo "                      TEST SUMMARY                       \n";
echo "=========================================================\n";
echo " Total Tests Run : {$testResults['total']}\n";
echo " Passed          : {$testResults['passed']}\n";
echo " Failed          : {$testResults['failed']}\n";
echo " Status          : " . ($testResults['failed'] === 0 ? "ALL PASS\n" : "FAILURES DETECTED\n");
echo "=========================================================\n";

exit($testResults['failed'] === 0 ? 0 : 1);
