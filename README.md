# Mababanaba Waters System

A multi-tenant Progressive Web App (PWA) for water refilling station management, featuring offline-first ordering, real-time logistics dispatch, SMS OTP verification, inventory tracking, and customer loyalty tiers.

---

## Features

- 💧 **Multi-Tenant Station Architecture:** Supports multiple independent water refilling stations with distinct pricing, inventories, opening hours, and staff assignments.
- 📱 **Progressive Web App (PWA):** Offline-first caching via Service Workers, installable on mobile and desktop, responsive touch UI with seamless hidden scrollbars.
- 🚚 **Logistics & Delivery Dispatch:** Real-time queue prioritization, driver delivery route management, bottle return tracking (Round & Slim 5-gallon jugs), and instant order status updates.
- 🔐 **Role-Based Access Control:** Strict authorization layers for Super Admins, Station Admins, Delivery Staff, and Customers with session security and CSRF protection.
- 💬 **SMS Notifications & OTP:** Automated verification codes and customer delivery notifications via Semaphore SMS API.
- 🔔 **Web Push Notifications:** Real-time browser push alerts using VAPID standards.
- 🎁 **Loyalty Program:** Tiered loyalty system (Normal, Bronze, Silver, Gold, Platinum, Diamond) rewarding frequent refills with dispatch queue priority.

---

## Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, Tailwind CSS, Font Awesome, Flatpickr
- **Backend:** PHP 8.x (PDO, Prepared Statements, Session Management)
- **Database:** MySQL / MariaDB (Optimized composite indexes, foreign key constraints)
- **Service Worker:** Native PWA Service Worker (Cache-first offline strategy)
- **Deployment:** Automated FTP deployment script (`deploy/deploy.js`)

---

## Project Structure

```text
water-system/
├── api/                  # PHP backend API endpoints, routers, and controllers
│   ├── controllers/      # AdminController.php, CustomerController.php
│   ├── OrderHelper.php   # Order status and auto-cancellation logic
│   ├── SecurityContext.php# Role-based permission checks
│   ├── WebPush.php       # VAPID Web Push implementation
│   └── api.php           # Primary JSON REST router
├── database/             # Database schema and security documentation
│   ├── schema.sql        # Database schema definitions
│   └── ROW_SECURITY.md   # Row-level security access policy
├── public/               # Static frontend client assets
│   ├── css/              # Application styles (style.css)
│   ├── js/               # Frontend logic (app.js, ui.js, api.js, state.js)
│   ├── manifest.json     # PWA manifest
│   ├── sw.js             # Service Worker
│   └── index.html        # Single Page Application root
└── .env.example          # Environment configuration template
```

---

## Getting Started

### 1. Prerequisites
- PHP 8.0 or higher (with `pdo_mysql` extension)
- MySQL / MariaDB 5.7+ or 8.0+
- Apache / Nginx web server or PHP development server

### 2. Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/SODAAAH/mababanaba-water-system.git
   cd mababanaba-water-system
   ```

2. Copy the environment template and configure your credentials:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and configure your database, SMS, and VAPID credentials.

3. Import the database schema:
   ```bash
   mysql -u root -p your_database_name < database/schema.sql
   ```

4. Deploy to your web server (Apache/Nginx) or start a local PHP server pointing to `public/`:
   ```bash
   php -S 127.0.0.1:8000 -t public
   ```

5. Open your browser and navigate to:
   ```text
   http://127.0.0.1:8000
   ```

---

## Security & Secrets Management

- **No Secrets in Source Control:** Real credentials, database passwords, FTP keys, and API tokens are kept strictly in `.env`, which is ignored by `.gitignore`.
- **Session Security:** Cookie security flags (`HttpOnly`, `SameSite=Lax`, strict session modes) are enforced by default.
- **Data Protection:** All customer phone numbers and sensitive transactions are protected with parameterized prepared statements and masked in SMS logging.

---

## License

This project is proprietary and maintained for Mababanaba Waters. All rights reserved.
