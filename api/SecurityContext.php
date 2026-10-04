<?php
class SecurityContext {
    public static function jsonResponse(int $statusCode, array $data): void {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data);
        exit;
    }

    private static function getSecret(): string {
        if (defined('APP_SECRET_KEY') && !empty(constant('APP_SECRET_KEY'))) {
            return constant('APP_SECRET_KEY');
        }
        $envKey = getenv('APP_SECRET_KEY') ?: ($_ENV['APP_SECRET_KEY'] ?? '');
        if (!empty($envKey)) {
            return $envKey;
        }
        if (defined('CRON_SECRET') && strlen(CRON_SECRET) >= 32) {
            return CRON_SECRET;
        }
        if (defined('VAPID_PRIVATE_KEY') && strlen(VAPID_PRIVATE_KEY) >= 32) {
            return VAPID_PRIVATE_KEY;
        }

        $keyFile = __DIR__ . '/.secret_key';
        if (file_exists($keyFile)) {
            $key = trim((string)@file_get_contents($keyFile));
            if (strlen($key) >= 32) {
                return $key;
            }
        }

        // Auto-generate a secure random 256-bit key and persist it locally
        try {
            $newKey = bin2hex(random_bytes(32));
        } catch (\Throwable $e) {
            $newKey = hash('sha256', uniqid(mt_rand(), true) . microtime(true));
        }
        @file_put_contents($keyFile, $newKey, LOCK_EX);
        @chmod($keyFile, 0600);
        return $newKey;
    }

    public static function generateAuthToken(int $id, string $type = 'customer'): string {
        $secret = self::getSecret();
        $payload = json_encode([
            'id' => $id, 
            'type' => $type, 
            'exp' => time() + (86400 * 30),
            'iat' => time()
        ]);
        $b64 = rtrim(strtr(base64_encode($payload), '+/', '-_'), '=');
        $sig = hash_hmac('sha256', $b64, $secret);
        return $b64 . '.' . $sig;
    }

    public static function verifyAuthToken(?string $token): ?array {
        if (empty($token)) return null;
        $token = trim($token);
        $parts = explode('.', $token);
        if (count($parts) !== 2) return null;
        [$b64, $sig] = $parts;
        $secret = self::getSecret();
        $expectedSig = hash_hmac('sha256', $b64, $secret);
        if (!hash_equals($expectedSig, $sig)) {
            return null;
        }
        $padded = strtr($b64, '-_', '+/');
        $rem = strlen($padded) % 4;
        if ($rem) {
            $padded .= str_repeat('=', 4 - $rem);
        }
        $json = base64_decode($padded);
        $data = json_decode($json, true);
        if (!$data || !isset($data['id'], $data['type'], $data['exp'])) {
            return null;
        }
        if ((int)$data['exp'] < time()) {
            return null;
        }
        return $data;
    }

    public static function requireCustomer(PDO $pdo): array {
        $cid = $_SESSION['customer_id'] ?? null;

        // Auto-heal session if customer_id was dropped but valid signed token is present
        if (!$cid) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['HTTP_X_AUTH_TOKEN'] ?? $_POST['auth_token'] ?? '';
            if (str_starts_with($authHeader, 'Bearer ')) {
                $authHeader = substr($authHeader, 7);
            }
            if (!empty($authHeader)) {
                $tokenData = self::verifyAuthToken($authHeader);
                if ($tokenData && ($tokenData['type'] ?? '') === 'customer' && !empty($tokenData['id'])) {
                    $cid = (int)$tokenData['id'];
                    $_SESSION['customer_id'] = $cid;
                }
            }
        }

        if (!$cid) {
            self::jsonResponse(401, ['error' => 'Unauthorized: Please log in as a customer.']);
        }

        $stmt = $pdo->prepare("SELECT customer_id, full_name, contact_number, address, is_verified FROM CUSTOMER WHERE customer_id = ?");
        $stmt->execute([$cid]);
        $customer = $stmt->fetch();

        if (!$customer || (int)$customer['is_verified'] !== 1) {
            unset($_SESSION['customer_id']);
            self::jsonResponse(401, ['error' => 'Unauthorized: Account not found or unverified.']);
        }

        return $customer;
    }

    public static function getAuthAdmin(PDO $pdo): ?array {
        $aid = $_SESSION['admin_id'] ?? null;

        // Auto-heal admin session if admin_id was dropped but valid signed token is present
        if (!$aid) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['HTTP_X_AUTH_TOKEN'] ?? $_POST['auth_token'] ?? '';
            if (str_starts_with($authHeader, 'Bearer ')) {
                $authHeader = substr($authHeader, 7);
            }
            if (!empty($authHeader)) {
                $tokenData = self::verifyAuthToken($authHeader);
                if ($tokenData && ($tokenData['type'] ?? '') === 'admin' && !empty($tokenData['id'])) {
                    $aid = (int)$tokenData['id'];
                    $_SESSION['admin_id'] = $aid;
                }
            }
        }

        if (!$aid) {
            return null;
        }

        $stmt = $pdo->prepare("SELECT a.admin_id, a.station_id, a.username, a.role, a.status, a.contact_number, s.station_name, s.status as station_status FROM ADMIN a LEFT JOIN STATION s ON a.station_id = s.station_id WHERE a.admin_id = ?");
        $stmt->execute([$aid]);
        $admin = $stmt->fetch();

        if (!$admin || $admin['status'] === 'Revoked') {
            return null;
        }

        if (!empty($admin['station_id']) && ($admin['station_status'] ?? '') === 'Suspended') {
            return null;
        }

        $_SESSION['station_id'] = $admin['station_id'];
        $_SESSION['role'] = $admin['role'];

        return $admin;
    }

    public static function requireStationAdmin(PDO $pdo): array {
        $admin = self::getAuthAdmin($pdo);
        if (!$admin || ($admin['role'] ?? '') !== 'Admin') {
            self::jsonResponse(403, ['error' => 'Forbidden: Station Admin privileges required.']);
        }
        if (empty($admin['station_id'])) {
            self::jsonResponse(403, ['error' => 'Forbidden: No station associated with this administrator.']);
        }
        return $admin;
    }

    public static function requireStationStaff(PDO $pdo): array {
        $admin = self::getAuthAdmin($pdo);
        if (!$admin || !in_array($admin['role'] ?? '', ['Admin', 'Delivery Staff'], true)) {
            self::jsonResponse(403, ['error' => 'Forbidden: Station Staff privileges required.']);
        }
        if (empty($admin['station_id'])) {
            self::jsonResponse(403, ['error' => 'Forbidden: No station associated with this staff account.']);
        }
        return $admin;
    }

    public static function requireSuperAdmin(PDO $pdo): array {
        $admin = self::getAuthAdmin($pdo);
        if (!$admin || ($admin['role'] ?? '') !== 'Super Admin') {
            self::jsonResponse(403, ['error' => 'Forbidden: Super Admin privileges required.']);
        }
        return $admin;
    }

    public static function normalizePhone(string $contact): string {
        $cleaned = preg_replace('/[^0-9]/', '', $contact);
        if (strlen($cleaned) === 10 && str_starts_with($cleaned, '9')) {
            $cleaned = '0' . $cleaned;
        }
        return $cleaned;
    }

    public static function clearRateLimits(PDO $pdo, array $actions): void {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        if ($ip && !empty($actions)) {
            $placeholders = implode(',', array_fill(0, count($actions), '?'));
            $pdo->prepare("DELETE FROM rate_limits WHERE ip_address = ? AND action IN ($placeholders)")->execute(array_merge([$ip], $actions));
        }
    }

    private const ALLOWED_OTP_TARGETS = [
        'CUSTOMER' => 'customer_id',
        'ADMIN' => 'admin_id'
    ];

    public static function verifyOtp(PDO $pdo, string $table, string $idCol, int $idVal, ?string $expectedOtp, ?string $expiry, int $failedAttempts, string $code): array {
        $validTarget = false;
        foreach (self::ALLOWED_OTP_TARGETS as $tbl => $col) {
            if (strcasecmp($tbl, $table) === 0 && strcasecmp($col, $idCol) === 0) {
                $table = $tbl;
                $idCol = $col;
                $validTarget = true;
                break;
            }
        }
        if (!$validTarget) {
            throw new InvalidArgumentException("Invalid target table or column for OTP verification.");
        }

        if ($failedAttempts >= 5) {
            $pdo->prepare("UPDATE {$table} SET otp_code = NULL, otp_expiry = NULL, failed_otp_attempts = 0 WHERE {$idCol} = ?")->execute([$idVal]);
            return ['valid' => false, 'error' => 'Too many failed attempts. This OTP has been invalidated. Please request a new code.'];
        }
        if (empty($expectedOtp) || !hash_equals((string)$expectedOtp, (string)$code)) {
            $pdo->prepare("UPDATE {$table} SET failed_otp_attempts = failed_otp_attempts + 1 WHERE {$idCol} = ?")->execute([$idVal]);
            $attemptsLeft = 5 - ($failedAttempts + 1);
            $msg = $attemptsLeft > 0 ? "Invalid OTP code. {$attemptsLeft} attempt(s) remaining." : "Invalid OTP code. Code invalidated due to multiple failed attempts.";
            return ['valid' => false, 'error' => $msg];
        }
        if (strtotime($expiry ?? '') < time()) {
            return ['valid' => false, 'error' => 'OTP has expired. Please request a new code.'];
        }
        return ['valid' => true];
    }
}
