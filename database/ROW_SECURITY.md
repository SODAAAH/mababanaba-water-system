# Row Security Policy

| Table | Actor / Role | Allowed Operations | Security Scope & Predicate |
|---|---|---|---|
| **`ORDERS`** | **Customer** | SELECT, INSERT | Only own orders (`WHERE customer_id = $_SESSION['customer_id']`). Products must belong to station. |
| | **Station Admin** | SELECT, UPDATE | Only orders for their station (`WHERE station_id = $_SESSION['station_id']`). |
| | **Delivery Staff** | SELECT, UPDATE | Orders in their station (`WHERE station_id = $_SESSION['station_id']`). |
| | **Super Admin** | SELECT | All stations. |
| | **Guest** | NONE | Denied (HTTP 401). |
| **`PRODUCTS`** | **Guest / Customer** | SELECT | Active products only (`WHERE status = 'Active'`). |
| | **Station Admin** | SELECT, INSERT, UPDATE | Products for their station (`WHERE station_id = $_SESSION['station_id']`). |
| | **Delivery Staff** | SELECT | Active products in their station. |
| | **Super Admin** | SELECT | All products across all stations. |
| **`INVENTORY`** | **Station Admin** | SELECT, UPDATE | Station inventory (`WHERE station_id = $_SESSION['station_id']`). |
| | **Delivery Staff** | SELECT, UPDATE | Return adjustment for their station. |
| | **Customer / Guest**| NONE | Denied. |
| | **Super Admin** | SELECT | All stations inventory. |
| **`STATION`** | **Public / Customer**| SELECT | Active stations only (`WHERE status = 'Active'`). |
| | **Station Admin** | SELECT, UPDATE | Hours, closure, maintenance, and payment profile for their station (`WHERE station_id = $_SESSION['station_id']`). |
| | **Super Admin** | ALL | Station management. |
| **`ADMIN`** | **Station Admin** | SELECT, INSERT, UPDATE | Staff accounts for their station (`WHERE station_id = $_SESSION['station_id'] AND role = 'Delivery Staff'`). Self update. |
| | **Delivery Staff** | SELECT, UPDATE | Self update (`WHERE admin_id = $_SESSION['admin_id']`). |
| | **Super Admin** | ALL | Manage all admin accounts. |
| | **Customer / Guest**| NONE | Denied (HTTP 403). |
| **`CUSTOMER`** | **Customer** | SELECT, UPDATE | Self account only (`WHERE customer_id = $_SESSION['customer_id']`). |
| | **Super Admin** | SELECT, UPDATE, DELETE | Customer management. |
| | **Station Admin** | SELECT | Scoped customer info for station orders. |
| **`CUSTOMER_LOYALTY`** | **Customer** | SELECT | Own balance (`WHERE customer_id = $_SESSION['customer_id']`). |
| | **Station Admin** | SELECT | Loyalty records for their station (`WHERE station_id = $_SESSION['station_id']`). |
| **`DELIVERIES`** | **Delivery Staff** | SELECT, UPDATE | Station deliveries (`WHERE station_id = $_SESSION['station_id']`). |
| | **Station Admin** | SELECT | All station deliveries. |
| **`REVIEWS`** | **Customer** | SELECT, INSERT | Delivered orders owned by customer (`WHERE order_id = ? AND customer_id = ? AND order_status = 'Delivered'`). |
| | **Public** | SELECT | Station ratings. |
| **`PUSH_SUBSCRIPTIONS`** | **Authenticated** | ALL | Own subscriptions only (`WHERE customer_id = ?` or `WHERE user_id = ?`). |
