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
                    $stmtCancel = $pdo->prepare("UPDATE ORDERS SET order_status = 'Cancelled' WHERE order_id IN ($inPlaceholders) AND order_status = 'Pending'");
                    $stmtCancel->execute($grp['order_ids']);
                    $affected = $stmtCancel->rowCount();

                    if ($affected > 0) {
                        $pdo->prepare("UPDATE INVENTORY SET stock_level = stock_level + ?, round_jugs = round_jugs + ?, slim_jugs = slim_jugs + ? WHERE station_id = ?")
                            ->execute([$grp['tot_qty'], $grp['tot_round'], $grp['tot_slim'], $grp['station_id']]);

                        if ($grp['tot_pts'] > 0) {
                            $pdo->prepare("UPDATE CUSTOMER_LOYALTY SET points = points + ? WHERE customer_id = ? AND station_id = ?")
                                ->execute([$grp['tot_pts'], $grp['customer_id'], $grp['station_id']]);
                        }

                        $pdo->commit();
                        $cancelledCount++;

                        $son = !empty($grp['station_order_number']) ? $grp['station_order_number'] : $grp['order_ids'][0];
                        $cancelReason = !empty($grp['is_scheduled'])
                            ? "Your scheduled order was automatically cancelled because the station did not accept it within the scheduled delivery window."
                            : "Your order was automatically cancelled because the station did not accept it within 5 minutes.";
                        try {
                            WebPush::sendToCustomer(
                                $pdo,
                                $grp['customer_id'],
                                "⚠️ Order #{$son} Cancelled",
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
