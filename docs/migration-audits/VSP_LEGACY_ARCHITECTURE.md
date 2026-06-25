# VSP Legacy System — Architecture Reference

**Site:** `vsp.vonosautomarket.com`  
**Product:** Ultimate POS (Laravel 9)  
**Vonos entity:** `VSP` → `tenant_vsp_001`  
**MySQL database:** `vonomglk_spmarket`  
**Business name in DB:** Vonos Institute Spare Parts (shared label; **separate DB** from VISP)

Field-level migration: [VSP_MIGRATION_MAP.md](./VSP_MIGRATION_MAP.md).  
Database audit: [VSP_AUDIT.md](./VSP_AUDIT.md).  
Institute back-office sibling: [VISP_LEGACY_ARCHITECTURE.md](./VISP_LEGACY_ARCHITECTURE.md).

---

## 1. Executive summary

`vsp.vonosautomarket.com` is the **Vonos SP Marketplace** — a smaller Ultimate POS instance on its own MySQL database (`vonomglk_spmarket`). It is **not** a stale copy of `vonomglk_vsp`; it is a separate production database with ~4× fewer transactions and ~½ the SKU count.

| Metric | VSP (`spmarket`) | VISP (`vonomglk_vsp`) |
|---|---:|---:|
| Transactions | 1,381 | 5,466 |
| Products | 1,204 | 2,543 |
| Final sells | 162 | 3,043 |
| Contacts | 86 | 4,814 |
| Essentials payroll rows | 0 | 588 |

---

## 2. Stack

Identical product family to VISP: Laravel 9 Ultimate POS, session auth, web-route POS, same payment integrations (Pesapal, MyFatoorah).

### Module differences vs VISP

`modules_statuses.json` on VSP additionally enables:

- `Gym`
- `ZatcaIntegrationKsa`

Both sites share the same baseline module set (Essentials, WooCommerce, Accounting, Ecommerce, etc.).

### Code differences

Application PHP under `app/` differs in ~30 files vs VISP (utils, sell/purchase controllers, middleware). VSP adds `app/Providers/ModuleAssetServiceProvider.php` and `app/Rules/`. See [VISP_VSP_BACKEND_DIFF.md](./VISP_VSP_BACKEND_DIFF.md).

---

## 3. Data shape (marketplace)

### Transaction types

| `type` | Count | Notes |
|---|---:|---|
| `opening_stock` | 1,219 | Catalog seed |
| `sell` | 162 | **All** marketplace sales |

No `purchase`, `expense`, `sell_return`, or payroll transaction types in the export.

### Operational interpretation

- **Retail-focused:** far fewer customers (86 vs 4,814) and sales — consistent with a public marketplace vs institute back-office.
- **No Essentials HR data** in DB despite module enabled.
- **No product_racks** rows (VISP has 1,848).

---

## 4. Routing

Same Ultimate POS route surface as VISP (`routes/web.php` differs line-by-line but same controller set). Public invoice/payment token routes exist for customer-facing flows.

---

## 5. Vonos target

| Legacy | Vonos |
|---|---|
| `vonomglk_spmarket` | `tenant_vsp_001` |
| Transaction archetype | Sales, Customers, Finance (same template as VISP, different nav/KPI labels) |

Dry-run (Jun 23): 1,204 items, 162 sales, 86 customers — [dryruns/VSP_MIGRATION_DRYRUN.json](./dryruns/VSP_MIGRATION_DRYRUN.json).

Export path: extract from `localhost (1).sql` via `scripts/extract_mysql_database.py` or use standalone `vonomglk_spmarket.sql`.

---

## 6. Related documents

| Doc | Purpose |
|---|---|
| [VSP_AUDIT.md](./VSP_AUDIT.md) | Schema + row counts |
| [VSP_SQL_DELTA.md](./VSP_SQL_DELTA.md) | Baseline comparison (stable vs Jun 18 embed) |
| [VSP_MIGRATION_MAP.md](./VSP_MIGRATION_MAP.md) | ETL field map |
| [VSP_LEGACY_GAP_ANALYSIS.md](./VSP_LEGACY_GAP_ANALYSIS.md) | Vonos feature gaps |
