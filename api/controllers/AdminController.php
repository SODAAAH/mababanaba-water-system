<?php
require_once __DIR__ . '/../SecurityContext.php';
require_once __DIR__ . '/SuperAdminController.php';
require_once __DIR__ . '/StationAdminController.php';
require_once __DIR__ . '/DeliveryStaffController.php';

class AdminController {
    private $pdo;
    private $superAdmin = null;
    private $stationAdmin = null;
    private $deliveryStaff = null;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    private function getSuperAdmin(): SuperAdminController {
        if ($this->superAdmin === null) {
            $this->superAdmin = new SuperAdminController($this->pdo);
        }
        return $this->superAdmin;
    }

    private function getStationAdmin(): StationAdminController {
        if ($this->stationAdmin === null) {
            $this->stationAdmin = new StationAdminController($this->pdo);
        }
        return $this->stationAdmin;
    }

    private function getDeliveryStaff(): DeliveryStaffController {
        if ($this->deliveryStaff === null) {
            $this->deliveryStaff = new DeliveryStaffController($this->pdo);
        }
        return $this->deliveryStaff;
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
            if ($a['status'] === 'Revoked') { 
                echo json_encode(['error' => 'Access revoked.']); 
                exit; 
            }
            if ($a['station_id'] && $a['station_status'] === 'Suspended') { 
                echo json_encode(['error' => 'Station suspended.']); 
                exit; 
            }
            session_regenerate_id(true);
            $_SESSION['admin_id'] = $a['admin_id']; 
            $_SESSION['station_id'] = $a['station_id']; 
            $_SESSION['role'] = $a['role'];
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            SecurityContext::clearRateLimits($this->pdo, ['admin_login', 'customer_login']);
            unset($a['password'], $a['otp_code'], $a['otp_expiry'], $a['new_temp_contact'], $a['failed_otp_attempts']);
            echo json_encode(['success' => true, 'admin' => $a, 'csrf_token' => $_SESSION['csrf_token']]);
        } else { 
            echo json_encode(['error' => 'Invalid credentials']); 
        }
        exit;
    }

    public function saGetStations() { $this->getSuperAdmin()->getStations(); }
    public function saAddStation() { $this->getSuperAdmin()->addStation(); }
    public function saToggleStation() { $this->getSuperAdmin()->toggleStation(); }
    public function saDeleteStation() { $this->getSuperAdmin()->deleteStation(); }
    public function saGetUsers() { $this->getSuperAdmin()->getUsers(); }
    public function saSaveAdmin() { $this->getSuperAdmin()->saveAdmin(); }
    public function saToggleAdminStatus() { $this->getSuperAdmin()->toggleAdminStatus(); }
    public function saDeleteAdmin() { $this->getSuperAdmin()->deleteAdmin(); }
    public function saPollUsers() { $this->getSuperAdmin()->pollUsers(); }
    public function saUpdateStationLocation() { $this->getSuperAdmin()->updateStationLocation(); }
    public function saSaveCustomer() { $this->getSuperAdmin()->saveCustomer(); }
    public function saToggleCustomerVerification() { $this->getSuperAdmin()->toggleCustomerVerification(); }
    public function saDeleteCustomer() { $this->getSuperAdmin()->deleteCustomer(); }

    public function getAdminDashboardData() { $this->getStationAdmin()->getAdminDashboardData(); }
    public function getSalesReport() { $this->getStationAdmin()->getSalesReport(); }
    public function getAdminLoyalty() { $this->getStationAdmin()->getAdminLoyalty(); }
    public function adminUpdateLogistics() { $this->getStationAdmin()->updateLogistics(); }
    public function adminUpdateLocation() { $this->getStationAdmin()->updateLocation(); }
    public function adminUpdateAdvancedInventory() { $this->getStationAdmin()->updateAdvancedInventory(); }
    public function adminUpdateHours() { $this->getStationAdmin()->updateHours(); }
    public function adminUpdateClosure() { $this->getStationAdmin()->updateClosure(); }
    public function adminUpdateMaintenance() { $this->getStationAdmin()->updateMaintenance(); }
    public function adminUpdatePaymentProfile() { $this->getStationAdmin()->updatePaymentProfile(); }
    public function adminUpdateSecurity() { $this->getStationAdmin()->updateSecurity(); }
    public function adminAddProduct() { $this->getStationAdmin()->addProduct(); }
    public function adminEditProduct() { $this->getStationAdmin()->editProduct(); }
    public function adminDeleteProduct() { $this->getStationAdmin()->deleteProduct(); }
    public function adminAddStaff() { $this->getStationAdmin()->addStaff(); }
    public function adminToggleStaff() { $this->getStationAdmin()->toggleStaff(); }

    public function adminMarkReturned() { $this->getDeliveryStaff()->markReturned(); }
    public function updateOrderStatus() { $this->getDeliveryStaff()->updateOrderStatus(); }
}
