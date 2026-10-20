# Mababanaba Waters - Known Limitations, Architectural Trade-offs & Operational Roadmap

**Document ID:** SEC-AUDIT-06  
**Project:** Mababanaba Waters Multi-Station Refilling System  
**Audience:** Academic Defense Panel, Software Engineers & System Administrators  

---

## 1. Executive Disclosure of Limitations

In engineering software systems, every architectural choice involves practical trade-offs. The following items represent deliberate design trade-offs, operational boundaries, and external dependencies that the developer should openly communicate during the technical defense.

---

## 2. Architectural Trade-offs

### A. Dual Authentication: Session Cookies vs. Bearer Tokens in Browser Storage
- **Observed Architecture:** The application supports both native PHP session cookies (for web browsers) and HMAC-SHA256 bearer tokens stored in browser `localStorage` / `sessionStorage` (for standalone installed PWA mode).
- **The Trade-off:**
  - *Advantage:* Enables a seamless Progressive Web App experience when installed on mobile devices where third-party cookie handling can be unreliable or isolated by OS webviews.
  - *Risk:* If an attacker manages to achieve Cross-Site Scripting (XSS), tokens in `localStorage` can be read via JavaScript.
- **Implemented Mitigations:**
  - Server-enforced output escaping (`UI.escapeHTML()`).
  - Native `textContent` assignments across dynamic UI nodes.
  - Strict Content-Security-Policy headers.
  - Constant-time HMAC signature verification (`hash_equals`) and token expiration timestamps.

### B. Multi-Tenant Scoping: Application-Level vs. Database-Level (RLS)
- **Observed Architecture:** Tenant scoping (`station_id`) is enforced within PHP controller queries (`WHERE station_id = ?`), rather than via MySQL Row-Level Security (RLS) or partitioned database schemas.
- **The Trade-off:**
  - *Advantage:* High architectural simplicity, low deployment overhead, and ease of running cross-station Super Admin analytical reports.
  - *Risk:* Relies on developers consistently including `station_id` filters in all station-scoped queries.
- **Verification Evidence:**
  - The audit systematically verified all controller endpoints, secondary joins, search routines, and aggregations. Every Station Admin and Delivery Staff query is locked to the authenticated session context. Automated negative tests in `tests/run_tests.php` confirm that cross-station manipulation is blocked.

### C. Rate Limiting Backend: Relational Table vs. In-Memory Store (Redis)
- **Observed Architecture:** Request rate limiting is recorded in a MySQL table (`rate_limits`).
- **The Trade-off:**
  - *Advantage:* Zero extra infrastructure dependencies; runs out of the box on shared cPanel / LAMP hosting without requiring a dedicated Redis or Memcached daemon.
  - *Limitation:* Under massive distributed denial-of-service (DDoS) attack volumes, database table locks on `rate_limits` could become an I/O bottleneck.
- **Recommendation:** In enterprise production scaling, delegate IP-level rate limiting to Cloudflare or an Nginx reverse proxy layer (`limit_req_zone`).

---

## 3. External Service Dependencies & Safeguards

### A. Mapbox Public Access Token
- **Status:** The Mapbox token (`MAPBOX_ACCESS_TOKEN`) is transmitted to the client frontend via `api.php?action=get_mapbox_token` to render interactive maps.
- **Security Distinction:** A client-side Mapbox access token is designed by Mapbox to be browser-visible. It is **not** a server secret.
- **Operational Requirement:** The project owner must log into the Mapbox account dashboard and restrict the token's allowed URL origins to `https://mbbnbwater.com` and `https://*.mbbnbwater.com`. This prevents unauthorized third parties from using the token on external websites.

### B. Semaphore SMS Gateway Reliability & Spending Controls
- **Dependency:** SMS OTP verification depends on Semaphore API availability and cellular network routing in the Philippines (Smart, Globe, Dito).
- **Implemented Safeguards:**
  - SMS messages are masked prior to database logging (`0912****789`).
  - OTP attempts are capped at 5 before automatic invalidation.
  - OTP resend cooldowns prevent rapid balance depletion.
- **Operational Requirement:** Station administrators must monitor prepaid account balances on the Semaphore dashboard.

### C. Web Push Notification Delivery
- **Mechanism:** Implemented via standard Web Push protocols (RFC 8291 / RFC 8292) using custom PHP VAPID cryptography.
- **Platform Limitations:**
  - iOS devices require iOS 16.4+ and require the user to "Add to Home Screen" to receive push notifications.
  - If a device is in aggressive battery saver or offline mode, push delivery may be delayed until reconnect.

---

## 4. Operational Hardening Checklist for Deployment

Before deploying changes to live production hosting, the administrator should complete this checklist:

1. [ ] **Environment Verification:** Confirm `.env` has `APP_ENV=production` and `DISPLAY_ERRORS=0`.
2. [ ] **Key Generation:** Ensure `APP_SECRET_KEY` is a distinct, randomly generated 32-character string.
3. [ ] **Domain Origin Lockdown:** In the Mapbox dashboard, configure URL origin restrictions for the public token.
4. [ ] **Automated Database Backups:** Configure a nightly cron job executing `mysqldump` with encrypted offsite archiving.
5. [ ] **Data Retention Policy:** Establish an archiving schedule for old `SMS_LOGS` and completed order history in compliance with the Philippine Data Privacy Act of 2012 (RA 10173).
6. [ ] **Reverse Proxy SSL/TLS:** Ensure production traffic is terminated via TLS 1.3 with automated Let's Encrypt certificate renewal.
