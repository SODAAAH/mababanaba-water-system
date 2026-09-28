# Mababanaba Waters System

Web application and management system for Mababanaba Waters refilling stations. Includes an ordering portal for customers, delivery and queue management for staff, and an administrative dashboard for inventory and sales reporting.

The frontend is built as an installable Progressive Web App (PWA) with full offline caching support.

## Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+), Tailwind CSS, Font Awesome, Flatpickr
- **Backend:** PHP 8.0+ (PDO MySQL, OpenSSL for native VAPID Web Push, cURL for SMS)
- **Database:** MySQL / MariaDB (composite indexes, foreign key constraints)
- **PWA & Offline:** Service Worker (offline asset caching, background push notifications)

## Project Structure

```text
├── api/                  # Backend REST API, controllers, and helpers
│   ├── controllers/      # AdminController.php & CustomerController.php
│   ├── OrderHelper.php   # Order status and auto-cancellation logic
│   ├── SecurityContext.php # Role-based permission checks & station scoping
│   ├── WebPush.php       # Native VAPID Web Push implementation
│   ├── api.php           # REST routing entry point & dispatcher
│   ├── config.php        # Environment configuration loader
│   ├── cron.php          # Background maintenance worker (order expiry & rate limits)
│   └── migrations.php    # Automated database schema evolution & dev data seeder
├── database/             # Database schema and documentation
│   ├── ROW_SECURITY.md   # Multi-tenant row-level access control matrix
│   └── schema.sql        # Baseline database schema
├── public/               # Frontend web root and static assets
│   ├── css/              # Application styles and compiled Tailwind CSS
│   ├── fonts/            # Local Inter font files
│   ├── js/               # Frontend application logic (app.js, ui.js, api.js)
│   ├── webfonts/         # Font Awesome icon assets
│   ├── 404.html          # Not found fallback page
│   ├── index.html        # Single Page Application root
│   ├── manifest.json     # PWA manifest
│   ├── offline.html      # Offline fallback page
│   └── sw.js             # Service worker with offline caching & push listeners
├── .env.example          # Environment variable template
├── .htaccess             # Production Apache request routing & hardening
├── local_router.php      # Development server routing script for PHP built-in server
├── package.json          # Build scripts and frontend dependencies
└── tailwind.config.js    # Tailwind CSS configuration
```

## Getting Started

### 1. Requirements

- **PHP 8.0+** with the following extensions enabled:
  - `pdo_mysql`
  - `openssl` (required for VAPID Web Push encryption)
  - `curl` (required for Semaphore SMS API integration)
- **MySQL 5.7+ / 8.0+** or **MariaDB 10.3+**
- **Node.js 18+** (for building Tailwind CSS)

### 2. Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SODAAAH/mababanaba-water-system.git
   cd mababanaba-water-system
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your configuration:
   - `DB_*`: MySQL host, database name, user, and password
   - `SEMAPHORE_*`: API key and sender name for SMS OTP & order updates
   - `VAPID_*`: VAPID public/private keys and contact subject for push notifications
   - `CRON_SECRET`: Secret token protecting the background maintenance worker

4. **Import baseline database schema:**
   ```bash
   mysql -u root -p your_database < database/schema.sql
   ```
   > **Note:** The backend automatically runs incremental database migrations (`api/migrations.php`) upon the first API request. This applies supplementary tables (`PUSH_SUBSCRIPTIONS`, `SMS_LOGS`, `rate_limits`), composite performance indexes, and seed products.

### 3. Running Locally

#### Using PHP Built-in Server
Run the local development server using `local_router.php`:

```bash
php -S 127.0.0.1:8000 local_router.php
```

Then open `http://127.0.0.1:8000` in your browser.

#### Using Apache (e.g., XAMPP, WAMP, or LAMP)
Point your web server's `DocumentRoot` (or VirtualHost root) to the project root directory. The root `.htaccess` automatically redirects `/` to `public/` while securing configuration files and routing `/api/` endpoints.

### 4. Styles & Assets

If you edit classes or UI templates, recompile Tailwind CSS:

```bash
# Production minified build
npm run build:css

# Development watch mode
npm run watch:css
```

### 5. Automated Background Worker (Cron)

The system includes `api/cron.php` to automatically cancel expired pending orders and purge stale rate-limit records.

* **Via CLI:**
  ```bash
  php api/cron.php
  ```
* **Via Scheduled Webhook / cURL:**
  ```bash
  curl "http://127.0.0.1:8000/api/cron.php?token=YOUR_CRON_SECRET"
  ```
