<?php
require_once __DIR__ . '/../SecurityContext.php';
require_once __DIR__ . '/SuperAdminController.php';
require_once __DIR__ . '/StationAdminController.php';
require_once __DIR__ . '/DeliveryStaffController.php';

/**
 * AdminController
 * Unified Admin facade composing specialized role controllers:
 * - SuperAdminController: platform-wide stations, admins, customers
 * - StationAdminController: station inventory, catalog, hours, settings, staff, reports
 * - DeliveryStaffController: delivery fulfillment, order transitions, jug returns
 */
class AdminController {
    private $pdo;
    private $superAdmin;
    private $stationAdmin;
    private $deliveryStaff;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
        $this->superAdmin = new SuperAdminController($pdo);
        $this->stationAdmin = new StationAdminController($pdo);
        $this->deliveryStaff = new DeliveryStaffController($pdo);
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

    // --- Super Admin Delegation ---
    public function saGetStations() { $this->superAdmin->getStations(); }
    public function saAddStation() { $this->superAdmin->addStation(); }
    public function saToggleStation() { $this->superAdmin->toggleStation(); }
    public function saDeleteStation() { $this->superAdmin->deleteStation(); }
    public function saGetUsers() { $this->superAdmin->getUsers(); }
    public function saSaveAdmin() { $this->superAdmin->saveAdmin(); }
    public function saToggleAdminStatus() { $this->superAdmin->toggleAdminStatus(); }
    public function saDeleteAdmin() { $this->superAdmin->deleteAdmin(); }
    public function saSaveCustomer() { $this->superAdmin->saveCustomer(); }
    public function saToggleCustomerVerification() { $this->superAdmin->toggleCustomerVerification(); }
    public function saDeleteCustomer() { $this->superAdmin->deleteCustomer(); }

    // --- Station Admin Delegation ---
    public function getAdminDashboardData() { $this->stationAdmin->getAdminDashboardData(); }
    public function getSalesReport() { $this->stationAdmin->getSalesReport(); }
    public function getAdminLoyalty() { $this->stationAdmin->getAdminLoyalty(); }
    public function adminUpdateLogistics() { $this->stationAdmin->updateLogistics(); }
    public function adminUpdateAdvancedInventory() { $this->stationAdmin->updateAdvancedInventory(); }
    public function adminUpdateHours() { $this->stationAdmin->updateHours(); }
    public function adminUpdateClosure() { $this->stationAdmin->updateClosure(); }
    public function adminUpdateMaintenance() { $this->stationAdmin->updateMaintenance(); }
    public function adminUpdatePaymentProfile() { $this->stationAdmin->updatePaymentProfile(); }
    public function adminUpdateSecurity() { $this->stationAdmin->updateSecurity(); }
    public function adminAddProduct() { $this->stationAdmin->addProduct(); }
    public function adminEditProduct() { $this->stationAdmin->editProduct(); }
    public function adminDeleteProduct() { $this->stationAdmin->deleteProduct(); }
    public function adminAddStaff() { $this->stationAdmin->addStaff(); }
    public function adminToggleStaff() { $this->stationAdmin->toggleStaff(); }

    // --- Delivery Staff Delegation ---
    public function adminMarkReturned() { $this->deliveryStaff->markReturned(); }
    public function updateOrderStatus() { $this->deliveryStaff->updateOrderStatus(); }
}
