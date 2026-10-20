# Mababanaba Waters - Vulnerability & Security Findings Register

**Document ID:** SEC-AUDIT-01  
**Project:** Mababanaba Waters Multi-Station Refilling System  
**Classification:** Technical Defense & Security Audit Trail  

---

### Severity Classification Matrix

- **Critical:** Direct unauthorized access to core infrastructure, remote code execution, arbitrary file exposure, or complete compromise of secret keys.
- **High:** Privilege escalation, cross-tenant/cross-user data corruption, or account takeover without credentials.
- **Medium:** Business logic inconsistencies, broken security headers, data leakage in secondary logs, or inventory integrity risks.
- **Low:** Minor authorization gaps, non-critical parameter handling, or front-end state synchronization defects.
- **Informational:** Code quality observations, deployment defaults, and environmental hardening recommendations.

---

## Detailed Findings Register

---

### SEC-01: Local Path Traversal & Arbitrary Secret Disclosure
- **Severity:** Critical
- **Confidence:** Confirmed
- **Affected Component:** `local_router.php` (lines 4–35)
- **Observed Behavior:** The built-in PHP development router resolved requested URIs directly against `__DIR__` without sanitizing directory traversal sequences (`..`), null bytes (`%00`), or checking file extensions.
- **Abuse Scenario:** An unauthenticated attacker sending `GET /api/../.env` or `GET /api/../api/.secret_key` could dump database passwords, the application HMAC secret key, Semaphore SMS tokens, and active session files (`api/sessions/sess_*`).
- **Remediation Implemented:**
  1. Normalized and URL-decoded requested paths.
  2. Blocked any URI containing directory traversal (`..`) or null bytes (`\0`) with HTTP 403 Forbidden.
  3. Explicitly denied access to hidden files (`.*`), `.env`, `.secret_key`, `.sql`, `.log`, `.bak`, `.ini`, `.sh`, `.git`, and `.md` files.
  4. Blocked direct HTTP access to internal backend directories (`/api/sessions/`, `/api/controllers/`, `/api/services/`).
  5. Restricted allowed executable endpoints to `/api/api.php`, `/api/cron.php`, and static assets under `/public/`.
- **Regression Test:** `tests/run_tests.php` Group 1 (Asserted 403 on `/api/../.env`, `/../.env`, `/api/.secret_key`, `/api/sessions/sess_abc123`, `/database/schema.sql`).
- **Status:** **FIXED**

---

### SEC-02: Cross-Station Loyalty Points Exploitation
- **Severity:** High
- **Confidence:** Confirmed
- **Affected Component:** `api/controllers/CustomerController.php` (`placeOrder()`, lines 694–716)
- **Observed Behavior:** When a customer attempted to redeem 10 loyalty points for a free refill at Station A, if their balance at Station A was `< 10`, the code executed a fallback query: `SELECT IFNULL(SUM(points), 0) FROM CUSTOMER_LOYALTY WHERE customer_id = ?`. If total points across all stations was $\ge 10$, it accepted the redemption. However, the subsequent deduction executed: `INSERT INTO CUSTOMER_LOYALTY (customer_id, station_id, ...) VALUES (?, $sid, ...) ON DUPLICATE KEY UPDATE points = GREATEST(0, points - 10)`.
- **Abuse Scenario:** A customer with 20 points at Station B could place orders at Station A, C, D using points. Station A's balance (which was 0) remained 0, while Station B's points were never deducted. The customer could exploit this loop indefinitely to obtain unlimited free water refills.
- **Remediation Implemented:**
  1. Removed the cross-station `SUM(points)` fallback in `CustomerController.php`.
  2. Enforced that points can only be redeemed if the customer has accumulated at least 10 points directly at the specific station being ordered from (`station_id`).
  3. Returns a clean user-facing exception: `"Not enough loyalty points at this station."`
- **Regression Test:** `tests/run_tests.php` Group 5 (Customer with 20 points at Station 2 and 0 at Station 1 attempted point order at Station 1; verified rejection).
- **Status:** **FIXED**

---

### SEC-03: Incomplete Token & Storage Purge on Client Logout
- **Severity:** High
- **Confidence:** Confirmed
- **Affected Component:** `public/js/ui.js` (`logout()`, lines 606–658) & `public/js/app.js` (line 3590)
- **Observed Behavior:**
  1. The client-side `UI.logout()` method cleared `State.user` and session cookies, but failed to reset `State.authToken` to `null` and did not remove `auth_token` from `sessionStorage` or `localStorage`.
  2. On any subsequent page refresh or route change, `public/js/api.js` automatically read the lingering token from storage (`State.authToken = sessionStorage.getItem('auth_token') || ...`) and re-authenticated the previous session.
  3. `App.Auth.logout` in `app.js` attempted to call `App.logout()`, which did not exist, triggering an unhandled `TypeError`.
- **Abuse Scenario:** On shared devices (e.g. internet cafes, shared tablets, or multi-user workstations), a user who clicked "Log Out" believed their session was terminated. A subsequent user opening the app was immediately re-authenticated into the previous user's account.
- **Remediation Implemented:**
  1. In `public/js/ui.js`: explicitly set `State.authToken = null;`, invoked `sessionStorage.removeItem('auth_token')`, `localStorage.removeItem('auth_token')`, and `sessionStorage.clear()`.
  2. In `public/js/app.js`: updated `App.Auth.logout` to delegate to `UI.logout`.
- **Regression Test:** Verified via manual and static review of logout flow and storage cleanup.
- **Status:** **FIXED**

---

### SEC-04: Session Status Bypass for Revoked/Suspended Staff
- **Severity:** High
- **Confidence:** Confirmed
- **Affected Component:** `api/api.php` (`check_session`, lines 330–358) & `api/SecurityContext.php` (`getAuthAdmin`, lines 140–160)
- **Observed Behavior:** When validating an active session, `check_session` in `api.php` only checked `if (isset($_SESSION['admin_id']))` and queried admin details without validating whether `status === 'Revoked'` or if the associated station had `station_status === 'Suspended'`.
- **Abuse Scenario:** If a rogue station admin or delivery staff was terminated or marked 'Revoked' by Super Admin, or if their station was suspended, an existing session cookie or bearer token remained fully active and functional until server restart.
- **Remediation Implemented:**
  1. Updated `check_session` in `api.php` to verify `a.status !== 'Revoked'` and `s.status !== 'Suspended'`.
  2. If revoked or suspended, the server immediately destroys the session (`session_destroy()`), unsets session cookies, and returns `{ logged_in: false, error: 'Account has been revoked or station suspended' }`.
- **Regression Test:** `tests/run_tests.php` Group 2 (Asserted rejection of admin with status 'Revoked' and admin associated with 'Suspended' station).
- **Status:** **FIXED**

---

### SEC-05: Session Fixation via Non-Strict Session Mode
- **Severity:** Medium
- **Confidence:** Confirmed
- **Affected Component:** `api/api.php` (line 12)
- **Observed Behavior:** Session configuration explicitly set `ini_set('session.use_strict_mode', '0');`. Non-strict mode allows PHP to accept uninitialized session IDs supplied by an external client.
- **Abuse Scenario:** An attacker could craft a specific session ID, inject it into a victim's browser via URL or network interception, wait for the victim to authenticate, and hijack the authenticated session.
- **Remediation Implemented:**
  1. Updated `api/api.php` to enforce `ini_set('session.use_strict_mode', '1');`.
  2. Re-verified that `session_regenerate_id(true)` is executed upon every successful login in `CustomerController.php` and `StationAdminController.php`.
- **Regression Test:** `tests/run_tests.php` Group 2.
- **Status:** **FIXED**

---

### SEC-06: Permissions-Policy Blocking Geolocation Feature
- **Severity:** Medium
- **Confidence:** Confirmed
- **Affected Component:** `public/.htaccess` (line 49)
- **Observed Behavior:** HTTP response header was configured as: `Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"`. The `geolocation=()` directive completely disallows browser access to geolocation APIs for all origins including `self`.
- **Abuse Scenario / Operational Impact:** The core station discovery and customer delivery distance calculations in `app.js` (`navigator.geolocation.getCurrentPosition`) were blocked at the browser level by policy, causing location lookups to fail silently or produce errors.
- **Remediation Implemented:**
  Updated `public/.htaccess` header to `Permissions-Policy "geolocation=(self), microphone=(), camera=()"`, permitting the app shell to query coordinates while restricting cross-origin iframes.
- **Regression Test:** Verified via file inspection and syntax validation.
- **Status:** **FIXED**

---

### SEC-07: Cleartext Phone Number Exposure in Database Logs
- **Severity:** Medium
- **Confidence:** Confirmed
- **Affected Component:** `api/services/SmsService.php` (line 42)
- **Observed Behavior:** The `SMS_LOGS` table recorded full, unmasked recipient mobile phone numbers alongside API gateway responses.
- **Abuse Scenario:** If a database backup or secondary log table was exposed, full customer telephone numbers (PII under Republic Act No. 10173 - Philippine Data Privacy Act of 2012) could be harvested.
- **Remediation Implemented:**
  1. Masked phone numbers prior to logging in `SMS_LOGS`: retaining the initial 4 digits and last 3 digits, masking the middle digits with asterisks (e.g. `0912****789`).
  2. Retained OTP code masking in message bodies (`preg_replace('/\b\d{6}\b/', '******', $message)`).
- **Regression Test:** `tests/run_tests.php` Group 4 (`09123456789` -> `0912****789`).
- **Status:** **FIXED**

---

### SEC-08: Round & Slim Jug Inventory Underflow / Overselling
- **Severity:** Medium
- **Confidence:** Confirmed
- **Affected Component:** `api/controllers/CustomerController.php` (`placeOrder()`, lines 689–727)
- **Observed Behavior:** Prior to deducting inventory, the system executed `SELECT stock_level FROM INVENTORY WHERE station_id = ? FOR UPDATE` and checked `stock_level < $totalQty`. It failed to check specific `round_jugs` and `slim_jugs` stock levels before executing `UPDATE INVENTORY SET stock_level = stock_level - ?, round_jugs = round_jugs - ?, slim_jugs = slim_jugs - ?`.
- **Abuse Scenario:** If a station had 100 general units of water in bulk tanks, but only 2 Round jugs physically available, a customer could order 50 Round jugs. The database accepted the transaction, driving `round_jugs` to `-48`. This led to unfulfillable orders, delivery failures, and inventory accounting corruption.
- **Remediation Implemented:**
  1. Updated the locking query to: `SELECT stock_level, round_jugs, slim_jugs FROM INVENTORY WHERE station_id = ? FOR UPDATE`.
  2. Added validation checks:
     - `if ($totRound > 0 && ((int)$inv['round_jugs'] < $totRound)) throw new Exception("Insufficient round jug stock.");`
     - `if ($totSlim > 0 && ((int)$inv['slim_jugs'] < $totSlim)) throw new Exception("Insufficient slim jug stock.");`
- **Regression Test:** `tests/run_tests.php` Group 6 (Attempted order exceeding round jug inventory; verified exception thrown and inventory preserved).
- **Status:** **FIXED**

---

### SEC-09: Unrestricted Script Execution in Public Uploads
- **Severity:** Medium
- **Confidence:** Confirmed
- **Affected Component:** `public/uploads/qr/`
- **Observed Behavior:** Station QR payment codes are stored in `public/uploads/qr/`. The directory lacked an `.htaccess` policy to disable PHP script execution or directory browsing.
- **Abuse Scenario:** If an attacker managed to bypass image upload MIME checks via a future code flaw, they could upload a file with an executable extension (`.php`, `.phtml`) and trigger remote code execution.
- **Remediation Implemented:**
  Created `public/uploads/qr/.htaccess` enforcing:
  1. `Options -Indexes -ExecCGI`
  2. `php_flag engine off` (PHP 5/7/8)
  3. `<FilesMatch "(?i)\.(php|phtml|phar|cgi|pl|py|sh|exe|bat)$"> Require all denied </FilesMatch>`
- **Regression Test:** Verified file presence and syntax rules.
- **Status:** **FIXED**

---

### SEC-10: Query String CSRF Parameter Acceptance on POST
- **Severity:** Medium
- **Confidence:** Confirmed
- **Affected Component:** `api/api.php` (line 175)
- **Observed Behavior:** CSRF validation accepted tokens from `$_POST['csrf_token'] ?? $_GET['csrf_token']`.
- **Abuse Scenario:** Accepting CSRF tokens in the GET query string of state-changing POST requests allows token leakage through proxy logs, browser history, and `Referer` headers.
- **Remediation Implemented:**
  Restricted token extraction strictly to request headers (`X-CSRF-TOKEN`) and POST request bodies (`$_POST['csrf_token']` or JSON body). Removed `$_GET['csrf_token']` from POST verification.
- **Regression Test:** Tested via CSRF header verification suite.
- **Status:** **FIXED**

---

### SEC-11: Super Admin Account Lockout & Self-Demotion
- **Severity:** Medium
- **Confidence:** Confirmed
- **Affected Component:** `api/controllers/SuperAdminController.php` (`saveAdmin()`, lines 174–205; `deleteStation()`, lines 66–76)
- **Observed Behavior:**
  1. In `saveAdmin()`, a logged-in Super Admin could inadvertently edit their own account record and alter their role to 'Admin' or 'Delivery Staff', or change their status to 'Suspended', irreversibly locking themselves out.
  2. In `deleteStation()`, a station could be deleted without verifying whether historical orders existed in `ORDERS`, causing database foreign key errors or orphaning audit records.
- **Abuse Scenario:** Accidental administrative lockout or deletion of stations with active financial transaction history.
- **Remediation Implemented:**
  1. Added self-demotion protection in `saveAdmin()`: if `$adminId === (int)$_SESSION['admin_id']`, the role must remain 'Super Admin' and status must remain 'Active'.
  2. Added check in `deleteStation()`: queries `SELECT COUNT(*) FROM ORDERS WHERE station_id = ?`. If orders exist, deletion is aborted with: `"Cannot delete station with existing order history. Please keep it Suspended instead to preserve historical records."`
- **Regression Test:** `tests/run_tests.php` Group 10.
- **Status:** **FIXED**

---

### SEC-12: Missing Bearer Auth Resolution in Payment Proof Endpoint
- **Severity:** Low
- **Confidence:** Confirmed
- **Affected Component:** `api/api.php` (`get_payment_proof`, lines 365–418)
- **Observed Behavior:** The endpoint relied on `$_SESSION['station_id']` and `$_SESSION['role']`. If a mobile PWA request authenticated exclusively via Bearer token, these session variables were null, causing Station Admin requests to fail authorization.
- **Abuse Scenario:** Legitimate branch managers and delivery riders using standalone PWA tokens could not preview GCash payment proofs.
- **Remediation Implemented:**
  Integrated `SecurityContext::getAuthAdmin($pdo)` to reliably hydrate `aid`, `sid`, and `role` from Bearer tokens when session cookies are absent.
- **Regression Test:** Verified via token authentication integration test.
- **Status:** **FIXED**

---

### SEC-13: Broken Logout Handler Delegation (`App.logout` TypeError)
- **Severity:** Low
- **Confidence:** Confirmed
- **Affected Component:** `public/js/app.js` (line 3590)
- **Observed Behavior:** `App.Auth.logout` called `App.logout(...)`, which was undefined. The actual logout routine was defined under `UI.logout`.
- **Abuse Scenario:** Any code path triggering `App.Auth.logout()` threw a JavaScript error and halted execution without logging out.
- **Remediation Implemented:**
  Corrected line 3590 in `public/js/app.js` to: `logout: (...args) => UI.logout(...args)`.
- **Regression Test:** Verified via JS syntax and call delegation review.
- **Status:** **FIXED**

---

### SEC-14: Unassigned Delivery Staff Status Modification
- **Severity:** Low
- **Confidence:** Confirmed
- **Affected Component:** `api/controllers/DeliveryStaffController.php` (`updateOrderStatus()`, lines 61–105)
- **Observed Behavior:** Any delivery staff member assigned to a station could mark any order for that station as 'Delivered', even if the order was assigned to a different delivery rider in `DELIVERIES`.
- **Abuse Scenario:** Delivery staff members could interfere with one another's deliveries, leading to accountability disputes regarding cash collection or jug swaps.
- **Remediation Implemented:**
  Added assignment verification: if `$admin['role'] === 'Delivery Staff'` and the order status is currently `'To Deliver'`, the controller checks `DELIVERIES` for the assigned `admin_id`. If assigned to another rider, it returns HTTP 403 Forbidden: `"Forbidden: This order is assigned to another delivery staff member."`
- **Regression Test:** `tests/run_tests.php` Group 9.
- **Status:** **FIXED**

---

### SEC-15: International Phone Normalization Mismatch (`+639`)
- **Severity:** Low
- **Confidence:** Confirmed
- **Affected Component:** `api/SecurityContext.php` (`normalizePhone()`, line 188)
- **Observed Behavior:** `SmsService::normalizeNumber` properly stripped `+639` to `09`, but `SecurityContext::normalizePhone` did not handle 12-digit numbers starting with `639`, leaving them as 12 digits.
- **Abuse Scenario:** Users entering international-format phone numbers (`+639XXXXXXXXX`) during registration could experience OTP delivery failures or duplicate account mismatches.
- **Remediation Implemented:**
  Updated `SecurityContext::normalizePhone` to strip country code `639` to `09`, ensuring parity with `SmsService`.
- **Regression Test:** `tests/run_tests.php` Group 4.
- **Status:** **FIXED**

---

### SEC-16: Unconditional Test Credential Resets in Migration v11
- **Severity:** Informational / Hardening
- **Confidence:** Confirmed
- **Affected Component:** `api/migrations.php` (migration v11, lines 320–375)
- **Observed Behavior:** Migration v11 contained seed logic resetting passwords for `superadmin`, `station1_admin`, and test customer accounts to static test passwords without checking `$isDev`.
- **Abuse Scenario:** If migration v11 ran on a production instance, real user passwords would be replaced with default test credentials.
- **Remediation Implemented:**
  Wrapped all account creation and password updates in migration v11 inside `if ($isDev) { ... }`.
- **Regression Test:** Verified via static code review of migration script.
- **Status:** **FIXED**
