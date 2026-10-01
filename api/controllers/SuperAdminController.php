<?php
require_once __DIR__ . '/../SecurityContext.php';

class SuperAdminController {
    private $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    private function requireSuperAdmin(): array {
        return SecurityContext::requireSuperAdmin($this->pdo);
    }

    public function getStations() {
        $this->requireSuperAdmin();
        $stmt = $this->pdo->query("SELECT s.*, a.username as admin_username FROM STATION s LEFT JOIN ADMIN a ON s.station_id = a.station_id AND a.role = 'Admin' ORDER BY s.station_id DESC");
        echo json_encode($stmt->fetchAll());
        exit;
    }

    public function addStation() {
        $this->requireSuperAdmin();
        $stName = trim($_POST['station_name'] ?? '');
        $addr = trim($_POST['address'] ?? '');
        $contact = trim($_POST['contact'] ?? '');
        $adminUser = trim($_POST['admin_username'] ?? '');
        $adminPass = $_POST['admin_password'] ?? '';

        if (empty($stName) || empty($addr) || empty($contact) || empty($adminUser) || empty($adminPass)) {
            echo json_encode(['error' => 'All fields are required.']);
            exit;
        }
        if (strlen($adminPass) < 6) {
            echo json_encode(['error' => 'Admin password must be at least 6 characters.']);
            exit;
        }

        $this->pdo->beginTransaction();
        try {
            $this->pdo->prepare("INSERT INTO STATION (station_name, address, contact_number) VALUES (?, ?, ?)")->execute([$stName, $addr, $contact]);
            $sid = $this->pdo->lastInsertId();
            $this->pdo->prepare("INSERT INTO INVENTORY (station_id, stock_level, round_jugs, slim_jugs) VALUES (?, 0, 0, 0)")->execute([$sid]);
            $hp = password_hash($adminPass, PASSWORD_DEFAULT);
            $this->pdo->prepare("INSERT INTO ADMIN (station_id, username, password, role) VALUES (?, ?, ?, 'Admin')")->execute([$sid, $adminUser, $hp]);
            $this->pdo->commit(); 
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log("saAddStation error: " . $e->getMessage());
            echo json_encode(['error' => 'Failed to create station. Username or contact number may already exist.']);
        }
        exit;
    }

    public function toggleStation() {
        $this->requireSuperAdmin();
        $this->pdo->prepare("UPDATE STATION SET status = ? WHERE station_id = ?")->execute([$_POST['status'], $_POST['station_id']]);
        if (class_exists('CustomerController')) {
            CustomerController::clearStationsCache();
        }
        echo json_encode(['success' => true]); 
        exit;
    }

    public function deleteStation() {
        $this->requireSuperAdmin();
        $stmt = $this->pdo->prepare("DELETE FROM STATION WHERE station_id = ? AND status = 'Suspended'"); 
        $stmt->execute([$_POST['station_id']]);
        if ($stmt->rowCount() > 0) { 
            echo json_encode(['success' => true]); 
        } else { 
            echo json_encode(['error' => 'Must be Suspended first.']); 
        }
        exit;
    }

    public function getUsers() {
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

    public function saveAdmin() {
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

    public function toggleAdminStatus() {
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

    public function deleteAdmin() {
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

    public function saveCustomer() {
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

    public function toggleCustomerVerification() {
        $this->requireSuperAdmin();
        $customerId = (int)($_POST['customer_id'] ?? 0);
        $isVerified = (int)($_POST['is_verified'] ?? 0);

        $this->pdo->prepare("UPDATE CUSTOMER SET is_verified = ? WHERE customer_id = ?")->execute([$isVerified, $customerId]);
        echo json_encode(['success' => true]);
        exit;
    }

    public function deleteCustomer() {
        $this->requireSuperAdmin();
        $customerId = (int)($_POST['customer_id'] ?? 0);

        $stmt = $this->pdo->prepare("DELETE FROM CUSTOMER WHERE customer_id = ?");
        $stmt->execute([$customerId]);
        echo json_encode(['success' => true]);
        exit;
    }
}
