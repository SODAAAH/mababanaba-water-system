<?php
require_once __DIR__ . '/../SecurityContext.php';
require_once __DIR__ . '/../WebPush.php';

class DeliveryStaffController {
    private $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    private function requireStationStaff(): array {
        return SecurityContext::requireStationStaff($this->pdo);
    }

    public function markReturned() {
        $admin = $this->requireStationStaff();
        $sid = $admin['station_id'];
        $oid = (int)($_POST['order_id'] ?? 0);
        $bRound = (int)($_POST['borrow_round'] ?? 0);
        $bSlim = (int)($_POST['borrow_slim'] ?? 0);
        
        $stmtOrder = $this->pdo->prepare("SELECT customer_id, station_order_number FROM ORDERS WHERE order_id = ? AND station_id = ?");
        $stmtOrder->execute([$oid, $sid]);
        $oInfo = $stmtOrder->fetch();
        if (!$oInfo) {
            SecurityContext::jsonResponse(404, ['error' => 'Order not found for your station.']);
        }
        
        $this->pdo->prepare("UPDATE ORDERS SET borrow_status = 'Returned' WHERE station_order_number = ? AND customer_id = ? AND station_id = ?")
             ->execute([$oInfo['station_order_number'], $oInfo['customer_id'], $sid]);
        $this->pdo->prepare("UPDATE INVENTORY SET stock_level = stock_level + ?, round_jugs = round_jugs + ?, slim_jugs = slim_jugs + ? WHERE station_id = ?")
            ->execute([$bRound + $bSlim, $bRound, $bSlim, $sid]);
        echo json_encode(['success' => true]); 
        exit;
    }

    public function updateOrderStatus() {
        $admin = $this->requireStationStaff();
        $sid = $admin['station_id'];
        $aid = $admin['admin_id'];
        $oid = (int)($_POST['order_id'] ?? 0);
        $status = trim($_POST['status'] ?? '');
        
        $allowedStatuses = ['Pending', 'Preparing', 'To Deliver', 'Delivered', 'Cancelled'];
        if (!in_array($status, $allowedStatuses, true)) {
            SecurityContext::jsonResponse(400, ['error' => 'Invalid order status.']);
        }
        
        try {
            $stmtOrder = $this->pdo->prepare("SELECT o.order_status, o.customer_id, o.station_order_number, o.payment_method, c.full_name, c.contact_number, c.last_active FROM ORDERS o JOIN CUSTOMER c ON o.customer_id = c.customer_id WHERE o.order_id = ? AND o.station_id = ? FOR UPDATE"); 
            $stmtOrder->execute([$oid, $sid]);
            $oInfo = $stmtOrder->fetch();
            
            if (!$oInfo) {
                SecurityContext::jsonResponse(404, ['error' => 'Order not found for your station.']);
            }

            if ($oInfo['order_status'] === $status) {
                SecurityContext::jsonResponse(200, [
                    'success' => true,
                    'message' => "Order #{$oid} is already {$status}.",
                    'already_completed' => true
                ]);
            }
            if (in_array($oInfo['order_status'], ['Delivered', 'Cancelled'], true)) {
                SecurityContext::jsonResponse(400, [
                    'error' => "Order #{$oid} is already {$oInfo['order_status']} and cannot be changed to {$status}."
                ]);
            }

            if ($oInfo['order_status'] === 'Pending' && $status !== 'Preparing') {
                SecurityContext::jsonResponse(400, [
                    'error' => "Order #{$oid} must be accepted before its status can be changed."
                ]);
            }

            if ($status === 'Pending') {
                SecurityContext::jsonResponse(400, [
                    'error' => "Order status cannot be reverted to Pending."
                ]);
            }
            $son = $oInfo['station_order_number'];

            if (!empty($son)) {
                $stmtGroup = $this->pdo->prepare("SELECT SUM(quantity) as tot_qty, MAX(container_option) as container_option, SUM(IF(jug_type='Round', quantity, 0)) as tot_round, SUM(IF(jug_type='Slim', quantity, 0)) as tot_slim, SUM(points_used) as tot_pts, MAX(returning_borrowed_flag) as returning_borrowed_flag FROM ORDERS WHERE station_order_number = ? AND customer_id = ? AND station_id = ?");
                $stmtGroup->execute([$son, $oInfo['customer_id'], $sid]);
            } else {
                $stmtGroup = $this->pdo->prepare("SELECT quantity as tot_qty, container_option, IF(jug_type='Round', quantity, 0) as tot_round, IF(jug_type='Slim', quantity, 0) as tot_slim, points_used as tot_pts, returning_borrowed_flag FROM ORDERS WHERE order_id = ? AND station_id = ?");
                $stmtGroup->execute([$oid, $sid]);
            }
            $grp = $stmtGroup->fetch();

            if ($status === 'Cancelled' && in_array($oInfo['order_status'], ['Pending', 'Preparing', 'To Deliver'])) {
                $this->pdo->prepare("UPDATE INVENTORY SET stock_level = stock_level + ?, round_jugs = round_jugs + ?, slim_jugs = slim_jugs + ? WHERE station_id = ?")
                    ->execute([$grp['tot_qty'], $grp['tot_round'], $grp['tot_slim'], $sid]);
                    
                if ($grp['tot_pts'] > 0) { 
                    $this->pdo->prepare("UPDATE CUSTOMER_LOYALTY SET points = points + ? WHERE customer_id = ? AND station_id = ?")
                        ->execute([$grp['tot_pts'], $oInfo['customer_id'], $sid]); 
                }
            }

            if (!empty($son)) {
                $this->pdo->prepare("UPDATE ORDERS SET order_status = ? WHERE station_order_number = ? AND customer_id = ? AND station_id = ?")->execute([$status, $son, $oInfo['customer_id'], $sid]);
            } else {
                $this->pdo->prepare("UPDATE ORDERS SET order_status = ? WHERE order_id = ? AND station_id = ?")->execute([$status, $oid, $sid]);
            }
            
            if ($status === 'To Deliver') {
                if (!empty($son)) {
                    $this->pdo->prepare("INSERT INTO DELIVERIES (order_id, admin_id, quantity) SELECT order_id, ?, quantity FROM ORDERS WHERE station_order_number = ? AND customer_id = ? AND station_id = ?")->execute([$aid, $son, $oInfo['customer_id'], $sid]);
                } else {
                    $this->pdo->prepare("INSERT INTO DELIVERIES (order_id, admin_id, quantity) SELECT order_id, ?, quantity FROM ORDERS WHERE order_id = ? AND station_id = ?")->execute([$aid, $oid, $sid]);
                }
            } elseif ($status === 'Delivered') {
                $jugs_returned = isset($_POST['jugs_returned']) ? filter_var($_POST['jugs_returned'], FILTER_VALIDATE_BOOLEAN) : true;
                
                if ($jugs_returned) {
                    if ($grp['container_option'] === 'owned') {
                        $this->pdo->prepare("UPDATE INVENTORY SET stock_level = stock_level + ?, round_jugs = round_jugs + ?, slim_jugs = slim_jugs + ? WHERE station_id = ?")
                            ->execute([$grp['tot_qty'], $grp['tot_round'], $grp['tot_slim'], $sid]);
                    }
                    
                    if ($grp['returning_borrowed_flag'] == 1) {
                        $stmtPending = $this->pdo->prepare("SELECT SUM(borrow_round) as p_round, SUM(borrow_slim) as p_slim FROM ORDERS WHERE customer_id = ? AND station_id = ? AND borrow_status = 'Pending' AND order_id != ?");
                        $stmtPending->execute([$oInfo['customer_id'], $sid, $oid]);
                        $pending = $stmtPending->fetch();
                        
                        if ($pending && ($pending['p_round'] > 0 || $pending['p_slim'] > 0)) {
                            $this->pdo->prepare("UPDATE ORDERS SET borrow_status = 'Returned' WHERE customer_id = ? AND station_id = ? AND borrow_status = 'Pending' AND order_id != ?")
                                 ->execute([$oInfo['customer_id'], $sid, $oid]);
                                 
                            $this->pdo->prepare("UPDATE INVENTORY SET stock_level = stock_level + ?, round_jugs = round_jugs + ?, slim_jugs = slim_jugs + ? WHERE station_id = ?")
                                 ->execute([$pending['p_round'] + $pending['p_slim'], $pending['p_round'], $pending['p_slim'], $sid]);
                        }
                    }
                } else {
                    if ($grp['container_option'] === 'owned') {
                        if (!empty($son)) {
                            $this->pdo->prepare("UPDATE ORDERS SET container_option = 'borrow', borrow_round = IF(jug_type='Round', quantity, 0), borrow_slim = IF(jug_type='Slim', quantity, 0), borrow_status = 'Pending' WHERE station_order_number = ? AND customer_id = ? AND station_id = ? AND container_option = 'owned'")
                                ->execute([$son, $oInfo['customer_id'], $sid]);
                        } else {
                            $this->pdo->prepare("UPDATE ORDERS SET container_option = 'borrow', borrow_round = IF(jug_type='Round', quantity, 0), borrow_slim = IF(jug_type='Slim', quantity, 0), borrow_status = 'Pending' WHERE order_id = ? AND station_id = ? AND container_option = 'owned'")
                                ->execute([$oid, $sid]);
                        }
                    }
                }

                if (!empty($son)) {
                    $this->pdo->prepare("UPDATE DELIVERIES d JOIN ORDERS o ON d.order_id = o.order_id SET d.delivery_status = 'Completed', d.delivery_date = CURRENT_TIMESTAMP WHERE o.station_order_number = ? AND o.customer_id = ? AND o.station_id = ?")->execute([$son, $oInfo['customer_id'], $sid]);
                } else {
                    $this->pdo->prepare("UPDATE DELIVERIES SET delivery_status = 'Completed', delivery_date = CURRENT_TIMESTAMP WHERE order_id = ?")->execute([$oid]);
                }
                $redeemPointsEarned = (int)$grp['tot_qty'] * 2;
                $rankPointsEarned = (int)$grp['tot_qty'] * 3;
                if ($rankPointsEarned > 0 || $redeemPointsEarned > 0) { 
                    $this->pdo->prepare("INSERT INTO CUSTOMER_LOYALTY (customer_id, station_id, points, lifetime_points) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE points = points + VALUES(points), lifetime_points = lifetime_points + VALUES(lifetime_points)")->execute([$oInfo['customer_id'], $sid, $redeemPointsEarned, $rankPointsEarned]); 
                }
            }
            
            $pushTitle = "💧 Order #{$son} Update";
            $pushBody = "Your order status has been updated to {$status}.";
            if ($status === 'Preparing') {
                $pushTitle = "🧪 Order #{$son} Being Prepared";
                $pushBody = "Your water refilling order is now being prepared.";
            } elseif ($status === 'To Deliver') {
                $pushTitle = "🛵 Order #{$son} Out for Delivery!";
                $pushBody = "Your delivery is on its way! Please expect the driver shortly.";
            } elseif ($status === 'Delivered') {
                $pushTitle = "🎉 Order #{$son} Delivered!";
                $pushBody = "Your water has been delivered. Thank You!";
            } elseif ($status === 'Cancelled') {
                $pushTitle = "⚠️ Order #{$son} Cancelled";
                $pushBody = "Your order has been cancelled by the station.";
            }

            WebPush::flushFastResponse(['success' => true]);

            WebPush::sendToCustomer($this->pdo, $oInfo['customer_id'], $pushTitle, $pushBody, '/#customer_orders');
            if ($status === 'To Deliver') {
                WebPush::sendToStationAdmins($this->pdo, $sid, "🛵 Order #{$son} Out for Delivery", "Order #{$son} has been dispatched for delivery.", '/#delivery_dashboard');
            } elseif (($admin['role'] ?? '') === 'Delivery Staff' && in_array($status, ['Delivered', 'Cancelled'], true)) {
                WebPush::sendToStationAdmins($this->pdo, $sid, "📋 Order #{$son} {$status}", "Order was marked {$status} by {$admin['username']}.", '/#admin_dashboard');
            }
            exit;
        } catch (PDOException $e) { 
            error_log($e->getMessage()); 
            echo json_encode(['error' => 'Failed to update order status']); 
        }
        exit;
    }
}
