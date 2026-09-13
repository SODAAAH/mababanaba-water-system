# Mababanaba Waters System

Web application and management system for Mababanaba Waters refilling stations. Includes an ordering portal for customers, delivery and queue management for staff, and an administrative dashboard for inventory and sales reporting.

The frontend is built as an installable PWA with full offline caching support.

## Tech Stack

- **Frontend:** Vanilla JavaScript, Tailwind CSS, Font Awesome, Flatpickr
- **Backend:** PHP 8.x (PDO MySQL)
- **Database:** MySQL / MariaDB
- **PWA:** Service Worker (offline caching)

## Project Layout

- `public/` - Web root and static assets (HTML, CSS, JS, fonts, service worker)
- `api/` - Backend endpoints, controllers, and security helpers
- `database/` - Database schema (`schema.sql`)
- `deploy/` - Deployment scripts

## Getting Started

### 1. Requirements

- PHP 8.0+ with `pdo_mysql`
- MySQL or MariaDB
- Node.js 18+ (for building Tailwind CSS)

### 2. Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/SODAAAH/mababanaba-water-system.git
   cd mababanaba-water-system
   ```

2. Install build dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` configuration:
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your database credentials, SMS provider keys, and VAPID details.

4. Import the database schema:
   ```bash
   mysql -u root -p your_database < database/schema.sql
   ```

### 3. Running Locally

Start the local PHP server using the router:

```bash
php -S 127.0.0.1:8000 local_router.php
```

Open `http://127.0.0.1:8000` in your browser.

### 4. Styles

If you edit classes or UI templates, recompile the stylesheet:

```bash
npm run build:css
```

For continuous rebuilds during frontend work:

```bash
npm run watch:css
```

## Deployment

Deployments to production can be run via:

```bash
node deploy/deploy.js
```
