# Mababanaba Waters - PWA, Service Worker & Offline Architecture Review

**Document ID:** SEC-AUDIT-03  
**Project:** Mababanaba Waters Multi-Station Refilling System  
**Audit Area:** Progressive Web Application (PWA), Service Worker, Cache Storage, Offline State Handling, Native Web Push  

---

## 1. Web App Manifest Verification (`public/manifest.json`)

The Web App Manifest was inspected for compliance with the W3C Web App Manifest specification and mobile installability criteria:

```json
{
  "name": "Mababanaba Waters - Water Refilling Station",
  "short_name": "Mababanaba Waters",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0284c7",
  "theme_color": "#0284c7",
  "categories": ["shopping", "utilities", "food"],
  "icons": [
    {
      "src": "/img/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/img/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/img/icon-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### Manifest Compliance Check
- **Identity & Name:** Both `name` and `short_name` are configured and reflect brand identity.
- **Start URL & Scope:** `start_url` (`/?source=pwa`) ensures accurate analytics attribution and stays within `scope: "/"`.
- **Display Mode:** `standalone` ensures removal of the browser URL bar, providing a native application experience.
- **Icon Integrity:** All referenced icon assets (`/img/icon-192.png`, `/img/icon-512.png`, `/img/icon-maskable.png`) exist in the filesystem, adhere to required pixel dimensions, and include a dedicated `maskable` icon for Android adaptive icon rendering.

---

## 2. Service Worker Lifecycle & Versioning (`public/sw.js`)

The Service Worker is versioned under `CACHE_NAME = 'mbbnb-v23'`.

### Lifecycle Stages
1. **Install Event (`self.addEventListener('install')`):**
   - Pre-caches critical app shell assets:
     - Root documents: `/`, `/index.html`, `/offline.html`, `/404.html`, `/manifest.json`
     - Styles & fonts: FontAwesome stylesheets, Webfonts (`fa-solid-900.woff2`), Tailwind runtime
     - Core JavaScript scripts: `/js/state.js`, `/js/api.js`, `/js/ui.js`, `/js/app.js`
     - External CDN resources: Mapbox GL JS & CSS v3.9.4
   - Executes `self.skipWaiting()` to immediately activate upon installation.
2. **Activate Event (`self.addEventListener('activate')`):**
   - Automatically iterates over all existing cache buckets using `caches.keys()`.
   - Purges any cache bucket whose name does not match `mbbnb-v23`. This guarantees that outdated scripts or stale HTML templates are evicted upon application update.
   - Executes `self.clients.claim()` so that the new service worker takes immediate control of all open client tabs.

---

## 3. Privacy, Sensitive Data & Cache Storage Isolation

> [!CRITICAL]
> **Zero Private Data in Cache Storage Policy:**  
> Under no circumstances should private customer profile data, order histories, admin financial metrics, or bearer tokens be stored in the browser's Cache Storage bucket.

### Technical Proof of Isolation
1. **Fetch Handler Architecture:**  
   In `public/sw.js`:
   ```javascript
   // API requests to /api/api.php or cron jobs are strictly excluded from Cache Storage:
   if (url.pathname.startsWith('/api/')) {
       return; // Default to standard network fetch; no service-worker cache interception
   }
   ```
2. **Server-Side Cache-Control Directives:**  
   In `public/.htaccess` and `api/api.php`:
   ```http
   Cache-Control: no-cache, no-store, must-revalidate
   Pragma: no-cache
   Expires: 0
   ```
3. **Client-Side Cache Invalidation on Logout (`public/js/ui.js`):**  
   When a user logs out, the application explicitly sweeps and purges any potential API caches:
   ```javascript
   if ('caches' in window) {
       caches.keys().then(names => {
           names.forEach(name => {
               if (name.includes('api')) caches.delete(name);
           });
       });
   }
   ```

---

## 4. Offline State Handling & Mutation Restrictions

A critical risk in e-commerce and logistics PWAs is **unreconciled offline order placement**: if a user creates an order while disconnected, inventory cannot be reserved on the server, prices may have changed, and container debt cannot be verified.

### Strategic Design Decisions Implemented
1. **Mutations Blocked Offline:**  
   In `public/js/api.js`:
   ```javascript
   if (this.isOffline() && method !== 'GET') {
       CustomToast.show('You are currently offline. Please reconnect to submit this transaction.', 'warning');
       throw new Error("Offline: Network connection required to complete this action.");
   }
   ```
   Orders, GCash payment uploads, status updates, and loyalty redemptions **cannot be queued in an unverified offline state**. This prevents phantom orders, double payments, and inventory race conditions.
2. **Read-Only Offline Experience:**  
   Static station information and the app shell remain accessible offline. If the network is lost while navigating, `offline.html` is served with network reconnect status indicators.

---

## 5. Web Push Notifications & VAPID Cryptography (`api/WebPush.php`)

Mababanaba Waters features native Web Push notifications implemented directly in PHP without external Composer bloat.

### Verified Cryptographic Mechanics
1. **Key Generation & Storage:**
   - Elliptic Curve NIST P-256 (`prime256v1`) key pairs.
   - VAPID keys loaded securely via environment variables (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) or generated locally using `openssl_pkey_new`.
2. **Subscription Validation:**
   - Validates that push subscription endpoints belong exclusively to authorized push services (`fcm.googleapis.com`, `updates.push.services.mozilla.com`, `push.apple.com`, `notify.windows.com`).
   - Prevents SSRF attacks against arbitrary internal URLs via push subscription payloads.
3. **Payload Encryption (AES-128-GCM):**
   - Implements RFC 8291 / RFC 8292 Web Push encryption using HKDF key derivation and AES-GCM cipher mode.
   - Locks screen notifications contain minimal, privacy-conscious alerts (e.g. *"Your order #12 is out for delivery"*), withholding customer addresses or payment details.

---

## 6. Browser & Operating System Limitations

1. **iOS Safari (WebKit):**
   - Push notifications require the user to explicitly "Add to Home Screen" (iOS 16.4+).
   - Background sync is restricted by Apple; silent background fetches are throttled.
2. **Android Chrome:**
   - Full support for Web Push, background service workers, and standalone home-screen badges.
3. **Desktop Browsers (Chrome, Edge, Firefox):**
   - Full PWA support with desktop install prompts and native OS notification banners.
