<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
date_default_timezone_set('Asia/Manila'); 

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/WebPush.php';
require_once __DIR__ . '/OrderHelper.php';

$isCli = (php_sapi_name() === 'cli');
$cronToken = $_GET['token'] ?? '';
$expectedToken = defined('CRON_SECRET') ? CRON_SECRET : ($_ENV['CRON_SECRET'] ?? '');

if (!$isCli && (empty($expectedToken) || !hash_equals($expectedToken, $cronToken))) {
    http_response_code(403);
    die("Access denied.\n");
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
    $pdo->exec("SET time_zone = '+08:00'");
} catch (PDOException $e) {
    error_log("Database connection failed in cron: " . $e->getMessage());
    die("Database connection failed.\n");
}

$processed = OrderHelper::autoCancelExpiredOrders($pdo);

try {
    $cleanedLimits = $pdo->exec("DELETE FROM rate_limits WHERE last_attempt < (NOW() - INTERVAL 1 DAY)");
} catch (Exception $e) {
    error_log("Failed to clean up stale rate limits: " . $e->getMessage());
}

echo "Cron completed. Processed $processed orders.\n";
