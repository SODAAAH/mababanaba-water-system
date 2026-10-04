<?php
require_once __DIR__ . '/WebPush.php';

class OrderHelper {
    public static function autoCancelExpiredOrders(PDO $pdo): int {
        $lockFile = sys_get_temp_dir() . '/mbbnb_auto_cancel.lock';
        if (file_exists($lockFile) && (time() - filemtime($lockFile)) < 30) {
            return 0;
        }
        @touch($lockFile);

        try {
            $threshold = date('Y-m-d H:i:s', time() - 300);
            $stmt = $pdo->prepare("SELECT o.order_id, o.station_id, o.customer_id, o.station_order_number, o.quantity, o.jug_type, o.points_used, o.order_date, o.scheduled_date 
                                   FROM ORDERS o 
                                   WHERE o.order_status = 'Pending' 
                                   AND (
                                       ((o.scheduled_date IS NULL OR o.scheduled_date = '' OR o.scheduled_date = '0000-00-00 00:00:00') AND o.order_date < ?)
                                       OR
                                       ((o.scheduled_date IS NOT NULL AND o.scheduled_date != '' AND o.scheduled_date != '0000-00-00 00:00:00') AND o.scheduled_date < ?)
                                   )");
            $stmt->execute([$threshold, $threshold]);
            $stuckRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if (empty($stuckRows)) return 0;

            $orderGroups = [];
            foreach ($stuckRows as $row) {
                $key = !empty($row['station_order_number']) 
                    ? "{$row['station_id']}_{$row['customer_id']}_{$row['station_order_number']}" 
                    : "solo_{$row['order_id']}";
                if (!isset($orderGroups[$key])) {
                    $orderGroups[$key] = [
                        'station_id' => $row['station_id'],
                        'customer_id' => $row['customer_id'],
                        'station_order_number' => $row['station_order_number'],
                        'is_scheduled' => !empty($row['scheduled_date']),
                        'order_ids' => [],
                        'tot_qty' => 0,
                        'tot_round' => 0,
                        'tot_slim' => 0,
                        'tot_pts' => 0
                    ];
                }
                $orderGroups[$key]['order_ids'][] = $row['order_id'];
                $orderGroups[$key]['tot_qty'] += (int)$row['quantity'];
                if (($row['jug_type'] ?? 'Round') === 'Round') {
                    $orderGroups[$key]['tot_round'] += (int)$row['quantity'];
                } else {
                    $orderGroups[$key]['tot_slim'] += (int)$row['quantity'];
                }
                $orderGroups[$key]['tot_pts'] += (int)($row['points_used'] ?? 0);
            }

            $cancelledCount = 0;
            foreach ($orderGroups as $grp) {
                $pdo->beginTransaction();
                try {
                    $inPlaceholders = implode(',', array_fill(0, count($grp['order_ids']), '?'));
                    $selStmt = $pdo->prepare("SELECT order_id, quantity, jug_type, points_used FROM ORDERS WHERE order_id IN ($inPlaceholders) AND order_status = 'Pending' FOR UPDATE");
                    $selStmt->execute($grp['order_ids']);
                    $pendingOrders = $selStmt->fetchAll(PDO::FETCH_ASSOC);

                    if (!empty($pendingOrders)) {
                        $pendingIds = array_column($pendingOrders, 'order_id');
                        $cancelPlaceholders = implode(',', array_fill(0, count($pendingIds), '?'));
                        $stmtCancel = $pdo->prepare("UPDATE ORDERS SET order_status = 'Cancelled' WHERE order_id IN ($cancelPlaceholders)");
                        $stmtCancel->execute($pendingIds);

                        $actualQty = 0;
                        $actualRound = 0;
                        $actualSlim = 0;
                        $actualPts = 0;
                        foreach ($pendingOrders as $po) {
                            $q = (int)$po['quantity'];
                            $actualQty += $q;
                            if (($po['jug_type'] ?? 'Round') === 'Round') {
                                $actualRound += $q;
                            } else {
                                $actualSlim += $q;
                            }
                            $actualPts += (int)($po['points_used'] ?? 0);
                        }

                        $pdo->prepare("UPDATE INVENTORY SET stock_level = stock_level + ?, round_jugs = round_jugs + ?, slim_jugs = slim_jugs + ? WHERE station_id = ?")
                            ->execute([$actualQty, $actualRound, $actualSlim, $grp['station_id']]);

                        if ($actualPts > 0) {
                            $pdo->prepare("UPDATE CUSTOMER_LOYALTY SET points = points + ? WHERE customer_id = ? AND station_id = ?")
                                ->execute([$actualPts, $grp['customer_id'], $grp['station_id']]);
                        }

                        $pdo->commit();
                        $cancelledCount++;

                        $son = !empty($grp['station_order_number']) ? $grp['station_order_number'] : $pendingIds[0];
                        $cancelReason = !empty($grp['is_scheduled'])
                            ? "Your scheduled order was automatically cancelled because the station did not accept it within the scheduled delivery window."
                            : "Your order was automatically cancelled because the station did not accept it within 5 minutes.";
                        try {
                            WebPush::sendToCustomer(
                                $pdo,
                                $grp['customer_id'],
                                "Order #{$son} Cancelled",
                                $cancelReason,
                                '/#customer_orders'
                            );
                        } catch (Exception $pe) {
                            error_log("autoCancel WebPush error: " . $pe->getMessage());
                        }
                    } else {
                        $pdo->rollBack();
                    }
                } catch (Exception $e) {
                    if ($pdo->inTransaction()) $pdo->rollBack();
                    error_log("autoCancelExpiredOrders group error: " . $e->getMessage());
                }
            }
            return $cancelledCount;
        } catch (Exception $e) {
            error_log("autoCancelExpiredOrders error: " . $e->getMessage());
            return 0;
        }
    }
}
