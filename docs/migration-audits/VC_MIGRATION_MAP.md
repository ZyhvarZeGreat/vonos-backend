# VC — Field-Level Migration Map

**Target entity:** Vonos Cafe (`VC`, tenant code `VC`, seed id `tenant_vc_001`)  
**Canonical source:** `vonomglk_cafe` in [`cafe.sql`](../../cafe.sql) (standalone export, Jun 23 2026)  
**Prior baseline:** embedded `vonomglk_cafe` in `localhost.sql` (Jun 15 2026)
**Audit reference:** [VC_AUDIT.md](./VC_AUDIT.md), [VC_CAFE_SQL_DELTA.md](./VC_CAFE_SQL_DELTA.md)  
**Archetype:** transaction-centric (orders = sales)

---

## 1. Scope

### In scope (VC v1)

| Source table(s) | Vonos target |
|---|---|
| `products`, `variations`, `variation_location_details`, `categories` | `Item` (menu / stock) |
| `contacts` (customer) | `Customer` |
| `contacts` (supplier) | `Supplier` |
| `transactions` (`type = sell`, `status = final`) | `Sale`, `SaleLine`, `LedgerEntry` |
| `transaction_sell_lines` | `SaleLine` |
| `transactions` (`type = opening_stock`) | `Item.quantity` seed |
| `transactions` (`type = expense`) | `LedgerEntry` (expense) |
| `transactions` (`is_kitchen_order = 1`) | `Sale.status` / metadata in line notes |
| `res_tables` / `res_table_id` on transaction | `Sale.reference` suffix or description |
| All migrated entities | `MigrationLegacyId` |

### Out of scope

| Source | Reason |
|---|---|
| `transaction_sell_lines_purchase_lines` | FIFO — skip |
| `res_product_modifier_sets` | Empty in cafe DB — modifiers deferred |
| `users`, `oauth_*`, `essentials_*` | Auth/HR |
| `purchase` (6 rows) | Optional v1 — map to inbound if needed |

---

## 2. Import order

Same as VSS ([VSS_MIGRATION_MAP.md](./VSS_MIGRATION_MAP.md) §2): tenant → items → contacts → sales → lines → ledger → legacy ids.

---

## 3. Sale / order mapping

Cafe POS uses Ultimate POS **restaurant** fields:

| Source field | Target | Rule |
|---|---|---|
| `invoice_no` | `Sale.reference` | |
| `is_kitchen_order` | — | Tag in `description` if needed |
| `res_order_status` | UI label only | Map `cooked`/`served` → orderStatus vocabulary later |
| `res_table_id` | Append to reference | `"{ref}-T{table_id}"` when set |
| `contact_id` | `customerId` | Nullable (walk-in) |

**Order status vocabulary (kitchen):** `New / Preparing / Ready / Served` — derive from `res_order_status` when present:

| `res_order_status` | Kitchen label |
|---|---|
| `received` | New |
| `cooked` | Ready |
| `served` | Served |
| null | Served (completed sale) |

---

## 4. Item mapping

Same as VSS item join; `availableForRetail: true` for menu items.

**Expected:** ~58 products (small menu).

---

## 5. Validation checklist

| Metric | Expected (cafe) |
|---|---:|
| `products` | 59 |
| `transactions` (sell) | 4,384 |
| `transactions` (sell + final) | 4,382 |
| `transactions` (opening_stock) | 362 |
| `transactions` (expense) | 174 |

Run: `python3 scripts/migrate_all.py --entities VC --dry-run`
