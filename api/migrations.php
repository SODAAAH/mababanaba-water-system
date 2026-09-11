<?php
function run_migrations($pdo) {
    $migrationLockFile = __DIR__ . '/.migrated_v2';
    if (!file_exists($migrationLockFile)) {
        try { $pdo->query("SELECT shipping_fee FROM STATION LIMIT 1"); } catch (Exception $e) { $pdo->exec("ALTER TABLE STATION ADD COLUMN shipping_fee DECIMAL(10,2) DEFAULT 0.00"); }
        try { $pdo->query("SELECT jug_discount FROM STATION LIMIT 1"); } catch (Exception $e) { $pdo->exec("ALTER TABLE STATION ADD COLUMN jug_discount DECIMAL(10,2) DEFAULT 0.00"); }
        try { $pdo->query("SELECT round_jugs FROM INVENTORY LIMIT 1"); } catch (Exception $e) { $pdo->exec("ALTER TABLE INVENTORY ADD COLUMN round_jugs INT DEFAULT 0, ADD COLUMN slim_jugs INT DEFAULT 0"); }
        try { $pdo->query("SELECT return_round FROM ORDERS LIMIT 1"); } catch (Exception $e) { $pdo->exec("ALTER TABLE ORDERS ADD COLUMN return_round INT DEFAULT 0, ADD COLUMN return_slim INT DEFAULT 0, ADD COLUMN borrow_round INT DEFAULT 0, ADD COLUMN borrow_slim INT DEFAULT 0, ADD COLUMN borrow_status ENUM('Pending', 'Returned') DEFAULT 'Pending'"); }
        try { $pdo->query("SELECT new_jug_price FROM STATION LIMIT 1"); } catch (Exception $e) { $pdo->exec("ALTER TABLE STATION ADD COLUMN new_jug_price DECIMAL(10,2) DEFAULT 150.00"); }
        try { $pdo->query("SELECT container_option FROM ORDERS LIMIT 1"); } catch (Exception $e) { $pdo->exec("ALTER TABLE ORDERS ADD COLUMN container_option VARCHAR(20) DEFAULT 'borrow'"); }
        try { $pdo->query("SELECT returning_borrowed_flag FROM ORDERS LIMIT 1"); } catch (Exception $e) { $pdo->exec("ALTER TABLE ORDERS ADD COLUMN returning_borrowed_flag TINYINT(1) DEFAULT 0"); }
        try { $pdo->query("SELECT otp_code FROM CUSTOMER LIMIT 1"); } catch (Exception $e) { $pdo->exec("ALTER TABLE CUSTOMER ADD COLUMN otp_code VARCHAR(10) DEFAULT NULL, ADD COLUMN otp_expiry DATETIME DEFAULT NULL, ADD COLUMN is_verified TINYINT(1) DEFAULT 0"); }
        try { $pdo->query("SELECT log_id FROM SMS_LOGS LIMIT 1"); } catch (Exception $e) { $pdo->exec("CREATE TABLE SMS_LOGS (log_id INT AUTO_INCREMENT PRIMARY KEY, contact_number VARCHAR(20) NOT NULL, message TEXT NOT NULL, api_response TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"); }
        try { $pdo->query("SELECT jug_type FROM ORDERS LIMIT 1"); } catch (Exception $e) { $pdo->exec("ALTER TABLE ORDERS ADD COLUMN jug_type VARCHAR(20) DEFAULT 'Round'"); }
        try { $pdo->query("SELECT last_active FROM CUSTOMER LIMIT 1"); } catch (Exception $e) { $pdo->exec("ALTER TABLE CUSTOMER ADD COLUMN last_active TIMESTAMP NULL DEFAULT NULL"); }
        try { $pdo->query("SELECT attempts FROM rate_limits LIMIT 1"); } catch (Exception $e) { $pdo->exec("CREATE TABLE rate_limits (ip_address VARCHAR(45) NOT NULL, action VARCHAR(50) NOT NULL, attempts INT DEFAULT 1, last_attempt DATETIME, PRIMARY KEY (ip_address, action))"); }
        try { $pdo->query("SELECT role FROM ADMIN LIMIT 1"); } catch (Exception $e) { $pdo->exec("ALTER TABLE ADMIN ADD COLUMN role ENUM('Super Admin', 'Admin', 'Delivery Staff') DEFAULT 'Admin'"); }
        try { 
            $pdo->query("SELECT id FROM PUSH_SUBSCRIPTIONS LIMIT 1"); 
        } catch (Exception $e) { 
            $pdo->exec("CREATE TABLE PUSH_SUBSCRIPTIONS (id INT AUTO_INCREMENT PRIMARY KEY, customer_id INT NULL, user_id INT NULL, endpoint TEXT NOT NULL, p256dh VARCHAR(255) NOT NULL, auth VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX (customer_id), INDEX (user_id))"); 
        }
        try { 
            $pdo->query("SELECT lifetime_points FROM CUSTOMER_LOYALTY LIMIT 1"); 
        } catch (Exception $e) { 
            $pdo->exec("ALTER TABLE CUSTOMER_LOYALTY ADD COLUMN lifetime_points INT DEFAULT 0"); 
        }
        try { 
            $pdo->query("SELECT capacity_gallons FROM PRODUCTS LIMIT 1"); 
        } catch (Exception $e) { 
            $pdo->exec("ALTER TABLE PRODUCTS ADD COLUMN capacity_gallons DECIMAL(5,2) DEFAULT 5.00, ADD COLUMN capacity_liters DECIMAL(5,2) DEFAULT 20.00"); 
        }
        try { $pdo->query("SELECT new_temp_contact FROM CUSTOMER LIMIT 1"); } catch (Exception $e) { $pdo->exec("ALTER TABLE CUSTOMER ADD COLUMN new_temp_contact VARCHAR(20) DEFAULT NULL"); }
        try { $pdo->query("SELECT contact_number FROM ADMIN LIMIT 1"); } catch (Exception $e) { $pdo->exec("ALTER TABLE ADMIN ADD COLUMN contact_number VARCHAR(20) NULL, ADD COLUMN otp_code VARCHAR(10) DEFAULT NULL, ADD COLUMN otp_expiry DATETIME DEFAULT NULL, ADD COLUMN new_temp_contact VARCHAR(20) DEFAULT NULL"); }
        try {
            $pdo->exec("
                INSERT INTO CUSTOMER_LOYALTY (customer_id, station_id, points, lifetime_points)
                SELECT customer_id, 
                       station_id, 
                       GREATEST(0, (SUM(quantity) * 2) - IFNULL(SUM(points_used), 0)) as points,
                       (SUM(quantity) * 3) as lifetime_points
                FROM ORDERS 
                WHERE order_status = 'Delivered'
                GROUP BY customer_id, station_id
                ON DUPLICATE KEY UPDATE 
                    lifetime_points = GREATEST(CUSTOMER_LOYALTY.lifetime_points, VALUES(lifetime_points)),
                    points = GREATEST(CUSTOMER_LOYALTY.points, VALUES(points))
            ");
        } catch (Exception $e) {}

        try { $pdo->query("SELECT new_temp_contact FROM CUSTOMER LIMIT 1"); } catch (Exception $e) { $pdo->exec("ALTER TABLE CUSTOMER ADD COLUMN new_temp_contact VARCHAR(20) DEFAULT NULL"); }
        try { $pdo->query("SELECT contact_number FROM ADMIN LIMIT 1"); } catch (Exception $e) { $pdo->exec("ALTER TABLE ADMIN ADD COLUMN contact_number VARCHAR(20) NULL, ADD COLUMN otp_code VARCHAR(10) DEFAULT NULL, ADD COLUMN otp_expiry DATETIME DEFAULT NULL, ADD COLUMN new_temp_contact VARCHAR(20) DEFAULT NULL"); }
        try { $pdo->query("SELECT failed_otp_attempts FROM CUSTOMER LIMIT 1"); } catch (Exception $e) { $pdo->exec("ALTER TABLE CUSTOMER ADD COLUMN failed_otp_attempts INT DEFAULT 0"); }
        try { $pdo->query("SELECT failed_otp_attempts FROM ADMIN LIMIT 1"); } catch (Exception $e) { $pdo->exec("ALTER TABLE ADMIN ADD COLUMN failed_otp_attempts INT DEFAULT 0"); }
        try { $pdo->exec("CREATE INDEX idx_orders_status_date ON ORDERS(order_status, order_date)"); } catch (Exception $e) {}
        try { $pdo->exec("CREATE INDEX idx_orders_station_status ON ORDERS(station_id, order_status)"); } catch (Exception $e) {}
        try { $pdo->exec("CREATE INDEX idx_orders_customer_date ON ORDERS(customer_id, order_date)"); } catch (Exception $e) {}
        try { $pdo->exec("DELETE FROM rate_limits WHERE action IN ('customer_login', 'admin_login')"); } catch (Exception $e) {}

        @file_put_contents($migrationLockFile, date('c'));
    }

    $migrationLockFileV3 = __DIR__ . '/.migrated_v3';
    if (!file_exists($migrationLockFileV3)) {
        try { $pdo->exec("CREATE INDEX idx_orders_station_cust_status ON ORDERS(station_id, customer_id, order_status)"); } catch (Exception $e) {}
        try { $pdo->exec("CREATE INDEX idx_orders_station_order_date ON ORDERS(station_id, order_date DESC)"); } catch (Exception $e) {}
        try { $pdo->exec("CREATE INDEX idx_orders_station_borrow ON ORDERS(station_id, borrow_status)"); } catch (Exception $e) {}
        try { $pdo->exec("CREATE INDEX idx_orders_station_status_date ON ORDERS(station_id, order_status, order_date)"); } catch (Exception $e) {}

        try {
            // Seed products for Station 2 if missing
            $st2 = (int)$pdo->query("SELECT COUNT(*) FROM PRODUCTS WHERE station_id = 2 AND status = 'Active'")->fetchColumn();
            if ($st2 === 0) {
                $pdo->exec("INSERT INTO PRODUCTS (station_id, name, price, status, capacity_gallons, capacity_liters) VALUES 
                    (2, 'Purified Water', 45.00, 'Active', 5.00, 20.00),
                    (2, 'Mineral Water', 35.00, 'Active', 5.00, 20.00),
                    (2, 'Alkaline Water', 50.00, 'Active', 5.00, 20.00)");
            }
            // Seed products for Station 3 if missing
            $st3 = (int)$pdo->query("SELECT COUNT(*) FROM PRODUCTS WHERE station_id = 3 AND status = 'Active'")->fetchColumn();
            if ($st3 === 0) {
                $pdo->exec("INSERT INTO PRODUCTS (station_id, name, price, status, capacity_gallons, capacity_liters) VALUES 
                    (3, 'Purified Water', 40.00, 'Active', 5.00, 20.00),
                    (3, 'Mineral Water', 30.00, 'Active', 5.00, 20.00),
                    (3, 'Alkaline Water', 55.00, 'Active', 5.00, 20.00)");
            }
            // Ensure INVENTORY records exist with positive stock for Station 1, 2, 3
            foreach ([1, 2, 3] as $sid) {
                $inv = $pdo->prepare("SELECT COUNT(*) FROM INVENTORY WHERE station_id = ?");
                $inv->execute([$sid]);
                if ((int)$inv->fetchColumn() === 0) {
                    $pdo->prepare("INSERT INTO INVENTORY (station_id, stock_level, round_jugs, slim_jugs) VALUES (?, 500, 250, 250)")->execute([$sid]);
                } else {
                    $pdo->prepare("UPDATE INVENTORY SET stock_level = GREATEST(stock_level, 500), round_jugs = GREATEST(round_jugs, 200), slim_jugs = GREATEST(slim_jugs, 200) WHERE station_id = ?")->execute([$sid]);
                }
            }
            // Seed dedicated test station admins for Station 1, 2, 3
            $testPass = password_hash('StationTest@123', PASSWORD_DEFAULT);
            foreach ([1 => 'station1_admin', 2 => 'station2_admin', 3 => 'station3_admin'] as $sid => $uname) {
                $chk = $pdo->prepare("SELECT admin_id FROM ADMIN WHERE username = ?");
                $chk->execute([$uname]);
                if (!$chk->fetch()) {
                    $pdo->prepare("INSERT INTO ADMIN (station_id, username, password, role, status) VALUES (?, ?, ?, 'Admin', 'Active')")->execute([$sid, $uname, $testPass]);
                }
            }
            // Seed verified test customers
            $custPass = password_hash('CustTest@123', PASSWORD_DEFAULT);
            foreach ([
                ['09111111111', 'Test Customer 1', '123 Station 1 St'],
                ['09222222222', 'Test Customer 2', '456 Station 2 Ave'],
                ['09333333333', 'Test Customer 3', '789 Station 3 Blvd']
            ] as $cdata) {
                $cchk = $pdo->prepare("SELECT customer_id FROM CUSTOMER WHERE contact_number = ?");
                $cchk->execute([$cdata[0]]);
                if (!$cchk->fetch()) {
                    $pdo->prepare("INSERT INTO CUSTOMER (contact_number, full_name, address, password, is_verified) VALUES (?, ?, ?, ?, 1)")
                        ->execute([$cdata[0], $cdata[1], $cdata[2], $custPass]);
                }
            }
            // Clear stations cache to reflect fresh seed data
            CustomerController::clearStationsCache();
        } catch (Exception $e) {
            error_log("Migration v3 error: " . $e->getMessage());
        }

        @file_put_contents($migrationLockFileV3, date('c'));
    }

    $migrationLockFileV4 = __DIR__ . '/.migrated_v4';
    if (!file_exists($migrationLockFileV4)) {
        try {
            $staffPass = password_hash('StaffTest@123', PASSWORD_DEFAULT);
            foreach ([1 => 'station1_staff', 2 => 'station2_staff', 3 => 'station3_staff'] as $sid => $uname) {
                $chk = $pdo->prepare("SELECT admin_id FROM ADMIN WHERE username = ?");
                $chk->execute([$uname]);
                if (!$chk->fetch()) {
                    $pdo->prepare("INSERT INTO ADMIN (station_id, username, password, role, status) VALUES (?, ?, ?, 'Delivery Staff', 'Active')")->execute([$sid, $uname, $staffPass]);
                }
            }
        } catch (Exception $e) {
            error_log("Migration v4 error: " . $e->getMessage());
        }
        @file_put_contents($migrationLockFileV4, date('c'));
    }

    $migrationLockFileV5 = __DIR__ . '/.migrated_v5';
    if (!file_exists($migrationLockFileV5)) {
        try {
            $staffPass = password_hash('StaffTest@123', PASSWORD_DEFAULT);
            $staffList = [
                [1, 'station1_staff1'], [1, 'station1_staff2'],
                [2, 'station2_staff1'], [2, 'station2_staff2'],
                [3, 'station3_staff1'], [3, 'station3_staff2']
            ];
            foreach ($staffList as $s) {
                $chk = $pdo->prepare("SELECT admin_id FROM ADMIN WHERE username = ?");
                $chk->execute([$s[1]]);
                if (!$chk->fetch()) {
                    $pdo->prepare("INSERT INTO ADMIN (station_id, username, password, role, status) VALUES (?, ?, ?, 'Delivery Staff', 'Active')")->execute([$s[0], $s[1], $staffPass]);
                }
            }

            // Seed 98 distinct verified customer accounts
            $custPass = password_hash('CustTest@123', PASSWORD_DEFAULT);
            $values = [];
            $params = [];
            for ($i = 1; $i <= 98; $i++) {
                $num = sprintf('%02d', $i);
                $phone = '091000000' . $num;
                $name = 'Customer ' . $num;
                $addr = 'Address Customer ' . $num;
                $values[] = "(?, ?, ?, ?, 1)";
                $params[] = $phone;
                $params[] = $name;
                $params[] = $addr;
                $params[] = $custPass;
            }
            $sql = "INSERT INTO CUSTOMER (contact_number, full_name, address, password, is_verified) VALUES " . implode(',', $values) . " ON DUPLICATE KEY UPDATE is_verified = 1";
            $pdo->prepare($sql)->execute($params);

            // Ensure ample inventory for 98 orders across all 3 stations
            $pdo->exec("UPDATE INVENTORY SET stock_level = GREATEST(stock_level, 2000), round_jugs = GREATEST(round_jugs, 1000), slim_jugs = GREATEST(slim_jugs, 1000) WHERE station_id IN (1, 2, 3)");
        } catch (Exception $e) {
            error_log("Migration v5 error: " . $e->getMessage());
        }
        @file_put_contents($migrationLockFileV5, date('c'));
    }
}
