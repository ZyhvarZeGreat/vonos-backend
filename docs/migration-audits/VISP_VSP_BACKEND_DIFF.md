# VISP vs VSP — Laravel Backend Diff

Structured comparison of the two Ultimate POS code trees in this repo.

| | VISP | VSP |
|---|---|---|
| Path | `visp.vonosautomarket.com/` | `vsp.vonosautomarket.com/` |
| `.env` DB | `vonomglk_vsp` | `vonomglk_spmarket` |
| Public URL | `visp.vonosautomarket.com` | `vsp.vonosautomarket.com` |

---

## 1. Modules config (`modules_statuses.json`)

**Identical enabled modules** except VSP-only:

| Module | VISP | VSP |
|---|---|---|
| Gym | — | ✓ |
| ZatcaIntegrationKsa | — | ✓ |

All other flags (Essentials, Accounting, Woocommerce, Ecommerce, Manufacturing, Repair, Superadmin, …) match.

**On-disk `Modules/` folders:** both trees ship the same module directory set in repo (Essentials present; many enabled modules lack local folders — runtime installs on server).

---

## 2. Routes

- `routes/web.php` — **differs** (line-level edits; same controller resources: `pos`, `sells`, `products`, `purchases`, `expenses`, etc.)
- `routes/api.php` — Passport user stub only (both)

No evidence of marketplace-only route files; differences are likely config/patches, not a separate app skeleton.

---

## 3. Application code (`diff -rq app/`)

**~30 differing files**, concentrated in:

| Area | Files | Likely impact |
|---|---|---|
| Utils | `TransactionUtil.php`, `ProductUtil.php`, `BusinessUtil.php`, `ModuleUtil.php`, `Util.php` | Sale/stock/accounting behavior |
| Controllers | `SellPosController`, `SellController`, `ProductController`, `PurchaseController`, `ReportController`, `ContactController`, `ExpenseController`, … | POS + catalog flows |
| Middleware | `AdminSidebarMenu.php` | Nav visibility |
| Models | `Contact.php`, `AccountTransaction.php` | Minor schema hooks |
| Listeners | `AddAccountTransaction.php` | Payment posting |

**VSP-only:**

- `app/Providers/ModuleAssetServiceProvider.php`
- `app/Rules/` (validation rules directory)

**VISP-only:** none at top level (VSP is a superset of small additions).

---

## 4. Payments & integrations

Both `composer.json` files include Pesapal and MyFatoorah. No diff in payment package list at audit time.

---

## 5. Data-backed behavior (more important than code diff)

| Capability | VISP DB | VSP DB |
|---|---|---|
| Final sells | 3,043 | 162 |
| Sell return routes | 0 rows | 0 rows |
| Payroll/Essentials data | 588 payroll txns | 0 |
| Product racks | 1,848 | 0 |
| FIFO costing links | 23,624 | 593 |

**Conclusion:** Codebases are sibling Ultimate POS installs with incremental patches. **Operational divergence is driven by database content and deployment config**, not a forked framework. Vonos migration can share one ETL pipeline (`transaction_transforms.py`) with per-entity dumps.

---

## 6. Vonos implications

1. **One transform archetype** (transaction-centric) for both `VISP` and `VSP`.
2. **Separate tenants** — never merge `vonomglk_vsp` into `tenant_vsp_001` or vice versa.
3. **Nav/KPI config** may differ (institute vs marketplace) via `tenantConfigs.ts` — not separate Laravel ports.
4. Re-audit after any server-side module install; zip backups may not include all `Modules/*` folders.
