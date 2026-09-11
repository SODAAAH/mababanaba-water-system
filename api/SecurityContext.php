<?php
class SecurityContext {
    public static function jsonResponse(int $statusCode, array $data): void {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data);
        exit;
    }

    public static function requireCustomer(PDO $pdo): array {
        $cid = $_SESSION['customer_id'] ?? null;
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

    public static function canAccessOrder(PDO $pdo, int $orderId, ?int $stationId = null, ?int $customerId = null, string $role = ''): bool {
        if ($role === 'Super Admin') {
            return true;
        }

        if ($customerId) {
            $stmt = $pdo->prepare("SELECT 1 FROM ORDERS WHERE order_id = ? AND customer_id = ?");
            $stmt->execute([$orderId, $customerId]);
            return (bool)$stmt->fetchColumn();
        }

        if ($stationId) {
            $stmt = $pdo->prepare("SELECT 1 FROM ORDERS WHERE order_id = ? AND station_id = ?");
            $stmt->execute([$orderId, $stationId]);
            return (bool)$stmt->fetchColumn();
        }

        return false;
    }
}
