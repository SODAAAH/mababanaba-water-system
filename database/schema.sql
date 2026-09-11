CREATE TABLE IF NOT EXISTS STATION (
    station_id INT AUTO_INCREMENT PRIMARY KEY,
    station_name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    last_cleaned_date DATE DEFAULT NULL,
    last_filter_changed_date DATE DEFAULT NULL,
    status ENUM('Active', 'Suspended') DEFAULT 'Active',
    opening_time TIME DEFAULT '08:00:00',
    closing_time TIME DEFAULT '17:00:00',
    shipping_fee DECIMAL(10,2) DEFAULT 0.00,
    jug_discount DECIMAL(10,2) DEFAULT 0.00,
    new_jug_price DECIMAL(10,2) DEFAULT 0.00,
    is_manually_closed TINYINT(1) DEFAULT 0,
    closure_message TEXT NULL,
    gcash_qr LONGTEXT NULL,
    gcash_name VARCHAR(100) NULL,
    gcash_number VARCHAR(20) NULL,
    maya_qr LONGTEXT NULL,
    maya_name VARCHAR(100) NULL,
    maya_number VARCHAR(20) NULL
);

CREATE TABLE IF NOT EXISTS ADMIN (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    station_id INT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('Super Admin', 'Admin', 'Delivery Staff') DEFAULT 'Admin',
    status ENUM('Active', 'Revoked') DEFAULT 'Active',
    contact_number VARCHAR(20) NULL,
    otp_code VARCHAR(10) DEFAULT NULL,
    otp_expiry DATETIME DEFAULT NULL,
    new_temp_contact VARCHAR(20) DEFAULT NULL,
    failed_otp_attempts INT DEFAULT 0,
    FOREIGN KEY (station_id) REFERENCES STATION(station_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS CUSTOMER (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    password VARCHAR(255) NOT NULL,

    otp_code VARCHAR(10) DEFAULT NULL,
    otp_expiry DATETIME DEFAULT NULL,
    is_verified TINYINT(1) DEFAULT 0,
    new_temp_contact VARCHAR(20) DEFAULT NULL,
    failed_otp_attempts INT DEFAULT 0,
    
    last_active TIMESTAMP NULL DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS CUSTOMER_LOYALTY (
    customer_id INT NOT NULL,
    station_id INT NOT NULL,
    points INT DEFAULT 0,
    lifetime_points INT DEFAULT 0,
    PRIMARY KEY (customer_id, station_id),
    FOREIGN KEY (customer_id) REFERENCES CUSTOMER(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES STATION(station_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS INVENTORY (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    station_id INT NOT NULL,
    stock_level INT NOT NULL DEFAULT 0,
    round_jugs INT DEFAULT 0,
    slim_jugs INT DEFAULT 0,
    last_updated_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES STATION(station_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PRODUCTS (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    station_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    status ENUM('Active', 'Deleted') DEFAULT 'Active',
    FOREIGN KEY (station_id) REFERENCES STATION(station_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ORDERS (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    station_id INT NOT NULL,
    customer_id INT NOT NULL,
    product_id INT NOT NULL,
    station_order_number INT DEFAULT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scheduled_date DATETIME NULL DEFAULT NULL,
    order_status ENUM('Pending', 'Preparing', 'To Deliver', 'Delivered', 'Cancelled') DEFAULT 'Pending',
    total_price DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('COD', 'GCash', 'Maya') NOT NULL,
    payment_proof LONGTEXT NULL, 
    quantity INT NOT NULL,
    delivery_address TEXT NOT NULL,
    points_used INT DEFAULT 0,
    
    return_round INT DEFAULT 0,
    return_slim INT DEFAULT 0,
    borrow_round INT DEFAULT 0,
    borrow_slim INT DEFAULT 0,
    borrow_status ENUM('Pending', 'Returned') DEFAULT 'Pending',
    container_option VARCHAR(20) DEFAULT 'borrow',
    returning_borrowed_flag TINYINT(1) DEFAULT 0,
    jug_type VARCHAR(20) DEFAULT 'Round',
    shipping_fee DECIMAL(10, 2) DEFAULT 0,
    jug_fee DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    
    FOREIGN KEY (station_id) REFERENCES STATION(station_id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES CUSTOMER(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id) ON DELETE CASCADE,
    INDEX idx_orders_status_date (order_status, order_date),
    INDEX idx_orders_station_status (station_id, order_status),
    INDEX idx_orders_customer_date (customer_id, order_date)
);

CREATE TABLE IF NOT EXISTS DELIVERIES (
    delivery_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    admin_id INT NOT NULL,
    quantity INT NOT NULL,
    delivery_status ENUM('In Transit', 'Completed') DEFAULT 'In Transit',
    delivery_date TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (order_id) REFERENCES ORDERS(order_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES ADMIN(admin_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS REVIEWS (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    station_id INT NOT NULL,
    customer_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES ORDERS(order_id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES STATION(station_id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES CUSTOMER(customer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS SMS_LOGS (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    contact_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    api_response TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO ADMIN (station_id, username, password, role) VALUES 
(NULL, 'superadmin', '$2y$10$tZ9.1M0pS5O5R5o4k5K.E.QkM6EwV1zL5n1Wq2Z5kX6eY7A8B9C0D', 'Super Admin');

CREATE TABLE IF NOT EXISTS rate_limits (
    ip_address VARCHAR(45) NOT NULL,
    action VARCHAR(50) NOT NULL,
    attempts INT DEFAULT 1,
    last_attempt DATETIME,
    PRIMARY KEY (ip_address, action)
);