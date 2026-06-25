# VC — Legacy Site Audit (`cafe.vonosautos.com`)

**Audited:** 2026-06-23  
**Production URL:** https://cafe.vonosautos.com  
**Workspace backup:** `cafe_backup.zip` (cPanel deploy, archive dated 2026-05-18; `.env` inside zip dated 2025-11-28)  
**MySQL audit baseline:** [VC_AUDIT.md](./VC_AUDIT.md) (`cafe.sql`, Jun 23 2026)  
**Cutover delta:** [VC_CAFE_SQL_DELTA.md](./VC_CAFE_SQL_DELTA.md)
**Related:** [VC_MIGRATION_MAP.md](./VC_MIGRATION_MAP.md), [VC_LEGACY_GAP_ANALYSIS.md](./VC_LEGACY_GAP_ANALYSIS.md), [VC_CUTOVER_PLAN.md](./VC_CUTOVER_PLAN.md)

---

## Executive summary

`cafe.vonosautos.com` is a **live Ultimate POS (Laravel 9) deployment** — not the Vonos multi-tenant Next.js platform. It is a small, single-location cafe POS with **59 menu products**, **~4,800 transactions** (Jan 2025 → Jun 2026), and **2 staff users**. Restaurant-specific features (tables, modifiers, kitchen board) exist in code but were **never configured in data** (`res_tables` and `res_product_modifier_sets` are empty).

**Health:** Operational and serving login/POS. **Risks:** wrong timezone, Repair-module login branding, `.env` with credentials inside the backup archive, Laravel 9 EOL, and a large enabled-module surface from the Ultimate POS bundle.

**Migration status:** Historical data imported to Postgres `tenant_vc_001` on 2026-06-15; delta import Jun 16. Fresh **`cafe.sql`** (Jun 23) adds **+158 sales** since cutoff — see [VC_CAFE_SQL_DELTA.md](./VC_CAFE_SQL_DELTA.md). Full re-import recommended at T−0.

---

## 1. Stack and deployment

| Item | Finding |
|---|---|
| Application | Ultimate POS on **Laravel 9.52.4** (`composer.lock` in backup) |
| PHP (live) | **8.3.31** (`X-Powered-By` header, 2026-06-23) |
| PHP (composer constraint) | `^8.0` |
| Web server | **LiteSpeed** behind **Cloudflare** |
| Session driver | `file` (`.env`) |
| Database | MySQL `vonomglk_cafe` on `localhost` (cPanel) |
| Auth | Laravel session + CSRF (`XSRF-TOKEN` cookie) |
| API | Laravel Passport present in `composer.json` (OAuth tables empty in audit) |

**Backup archive layout:** `cafe_backup.zip` → `cafe.vonosautos.com/` (full vendor tree, `public/`, `app/Restaurant/`, Blade restaurant views).

**Version drift:** Backup vendor/composer tree is from **2025-08-20**; `.env` was updated **2025-11-28**; archive repackaged **2026-05-18**. Live PHP is newer than the backup constraint — production has likely been patched without a fresh zip in workspace.

---

## 2. Configuration audit (non-secret)

Values from `cafe_backup.zip` → `cafe.vonosautos.com/.env` (secrets redacted; **do not commit** raw `.env`).

| Setting | Value | Severity | Notes |
|---|---|---|---|
| `APP_NAME` / `APP_TITLE` | Vonos Cafe | OK | Matches business |
| `APP_ENV` | live | OK | |
| `APP_DEBUG` | false | OK | |
| `APP_URL` | https://cafe.vonosautos.com/ | OK | |
| `APP_TIMEZONE` | **Asia/Kolkata** | **High** | Business table also defaults `Asia/Kolkata`; operations likely Lagos — reports and “today” KPIs misaligned |
| `ALLOW_REGISTRATION` | false | OK | Invite/admin-only |
| `SHOW_REPAIR_STATUS_LOGIN_SCREEN` | **true** | **Medium** | Repair module branding on cafe login; `modules_statuses.json` has `"Repair": true` |
| `ADMINISTRATOR_USERNAMES` | admin | Info | Single super-user name |
| `DB_DATABASE` | vonomglk_cafe | OK | Matches audit |
| `LOG_CHANNEL` | daily | OK | |
| `MAIL_FROM` | admin@vonosautos.com | OK | |
| `ENVATO_PURCHASE_CODE` | placeholder-like value | **Low** | Verify license compliance separately |

**Enabled Ultimate POS modules** (`modules_statuses.json` in backup): Essentials, Accounting, AssetManagement, Cms, Connector, Crm, Ecommerce, Manufacturing, Repair, Woocommerce, Superadmin, and others — **far wider than cafe needs**. Increases attack surface and explains repair login flag.

**Restaurant code present (unused in DB):**

- `app/Restaurant/ResTable.php`, `Booking.php`
- Views: `resources/views/restaurant/kitchen/`, `table/`, `orders/`, `modifier_sets/`

---

## 3. Live site reconnaissance (read-only, 2026-06-23)

| Check | Result |
|---|---|
| HTTPS | **HTTP/2 200** on `/login`; TLS terminated at Cloudflare |
| Root `/` | Returns login/marketing shell (200) |
| `/home` (authenticated entry) | **302 → /login** when unauthenticated |
| Login page | “Welcome Back — Login to your Vonos Cafe”; 16-language selector |
| Session cookie `vonos_cafe_session` | `HttpOnly`, `Secure`, `SameSite=Lax`, 2h max-age |
| CSRF cookie `XSRF-TOKEN` | `Secure`, `SameSite=Lax` (not HttpOnly — Laravel default) |
| Cache | `no-cache, private` on login |

**Not performed:** automated probing of sensitive paths (`.env`, `.git`, `storage/logs`, phpMyAdmin). Recommend a manual or authorized security scan before decommissioning.

**Operational signal:** Site responds normally; session cookies indicate an active Laravel app still taking traffic.

---

## 4. Data inventory (legacy MySQL)

Source: [VC_AUDIT.md](./VC_AUDIT.md) unless noted.

| Metric | Count | Notes |
|---|---:|---|
| Tables (populated) | 37 / 70 | Standard Ultimate POS schema |
| Products | 59 | Small cafe menu |
| `transactions` (all types) | 4,812 | |
| `transactions.type = sell` | 4,226 | |
| Migrated as `Sale` (Postgres) | 4,224 | **2 sell rows not imported** — likely non-`final` or filtered per map |
| `opening_stock` | 366 | Seeded item quantities |
| `expense` | 176 | Ledger expenses |
| `transaction_payments` | 4,847 | |
| `contacts` (customer / supplier) | 47 / 4 | |
| `accounts` (payment accounts) | 3 | |
| `users` | 2 | Staff accounts |
| `res_tables` | **0** | Table management never used |
| `res_product_modifier_sets` | **0** | Modifiers never used |
| `bookings` | 0 | |
| Transaction date range | 2025-01-01 → **2026-06-18** | Real operational history |
| Business locations | 1 | Single-location |

**Transaction status mix (all types):** `final` 4,407 · `received` 372 · `draft` 2.

**Payment status:** `paid` 4,440 · `due` 301 · `partial` 32.

**Kitchen columns** (`is_kitchen_order`, `res_order_status`) exist on `transactions` but with empty table/modifier setup, operations appear **standard POS checkout**, not full restaurant workflow.

---

## 5. Security and compliance

| Finding | Severity | Recommendation |
|---|---|---|
| **`.env` inside `cafe_backup.zip`** contains DB password, `APP_KEY`, payment API keys | **Critical** | Rotate all secrets if archive was shared; never commit zip to git; store backups encrypted |
| Laravel 9 **end of security support** | **High** | Plan retirement via Vonos cutover; no long-term patches on legacy |
| Broad enabled modules (Repair, WooCommerce, Superadmin, …) | **Medium** | Disable unused modules on legacy until decommission |
| `APP_TIMEZONE` / business `time_zone` = Asia/Kolkata | **Medium** | Set `Africa/Lagos` on Vonos tenant; fix legacy only if it stays up during parallel run |
| Session-based auth only | **Medium** | Vonos cutover enables JWT + invite flow; map 2 legacy users |
| `SHOW_REPAIR_STATUS_LOGIN_SCREEN=true` | **Low** | Set `false` on legacy or ignore after cutover |
| Placeholder / sandbox payment keys in `.env` | **Info** | Confirm live payment methods in use (likely cash/card via POS accounts, not Stripe sandbox) |

---

## 6. Postgres migration snapshot (cross-check)

Verified against Neon Postgres `tenant_vc_001` on **2026-06-23**:

| Entity | Postgres count | Import baseline (Jun 15) | Match |
|---|---:|---:|---|
| Item | 59 | 59 | Yes |
| Customer | 47 | 47 | Yes |
| Supplier | 4 | 4 | Yes |
| Sale | 4,224 | 4,224 | Yes |
| SaleLine | 7,255 | 7,255 | Yes |
| LedgerEntry | 4,400 | 4,400 | Yes |
| Payment | 4,847 | 4,847 | Yes |
| PaymentAccount | 3 | 3 | Yes |
| AccountTransaction | 3,537 | 3,537 | Yes |
| CafeTable | **0** | n/a | Expected (legacy empty) |

**Finance tie-out:**

| Metric | Amount (NGN) |
|---|---:|
| Sum `LedgerEntry` (revenue) | 4,241,976.56 |
| Sum `Sale.total` (completed) | 4,241,976.56 |
| **Delta** | **0.00** |
| Sum `LedgerEntry` (expense) | 719,300.00 |
| Sum `Payment.amount` (all) | 5,789,953.92 |

Payment total exceeds sale revenue because payments include expenses, opening stock, and non-sale movements — expected for Ultimate POS accounting.

**Dedupe dry-run** (`scripts/migration/dedupe_tenant.py --entity VC`): no VSS-style tripling. Minor cleanup available: **3 duplicate customers**, **13 duplicate account transactions** (optional `--execute` before cutover).

---

## 7. Findings summary

| ID | Finding | Severity |
|---|---|---|
| VC-S1 | Legacy is Ultimate POS, not Vonos platform | Info |
| VC-S2 | Credentials in workspace backup zip | Critical |
| VC-S3 | Timezone Asia/Kolkata vs Lagos operations | High |
| VC-S4 | Repair login screen enabled on cafe | Medium |
| VC-S5 | Laravel 9 / aging dependency stack | High |
| VC-S6 | Restaurant tables/modifiers never used | Info |
| VC-S7 | Data imported once; legacy active through Jun 18+ | High (delta sync) |
| VC-S8 | 2 sell transactions not in Postgres | Low |
| VC-S9 | Migrated ledger revenue ties to sales exactly | OK |
| VC-S10 | Vonos `CafeTable` count 0 — configure post-cutover | Medium |

---

## 8. Recommended actions (site-level)

1. **Before cutover:** Fresh MySQL export → incremental VC import (see [VC_CUTOVER_PLAN.md](./VC_CUTOVER_PLAN.md)).
2. **Rotate secrets** exposed via `cafe_backup.zip`.
3. **Optional:** Run `dedupe_tenant.py --entity VC --execute` for 3 customers + 13 account transactions.
4. **Do not** extend legacy hosting long-term — EOL stack and single-tenant risk.
5. **Train staff** on Vonos VC POS nav (`orders`, `menu-items`, Finance, Reports closeout tab).

---

## Key files

| Topic | Path |
|---|---|
| MySQL dump audit | [VC_AUDIT.md](./VC_AUDIT.md) |
| Field mapping | [VC_MIGRATION_MAP.md](./VC_MIGRATION_MAP.md) |
| Import log | [dryruns/LIVE_IMPORT.log](./dryruns/LIVE_IMPORT.log) |
| Gap analysis | [VC_LEGACY_GAP_ANALYSIS.md](./VC_LEGACY_GAP_ANALYSIS.md) |
| Cutover plan | [VC_CUTOVER_PLAN.md](./VC_CUTOVER_PLAN.md) |
