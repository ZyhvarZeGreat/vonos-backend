# VW — Field-Level Migration Map

**Target entity:** Vonos Warehouse (`VW`, tenant code `VW`, seed id `tenant_vw_001`)  
**Canonical source:** `vonomglk_audit` in [`Vonos warehouse.sql`](../../Vonos%20warehouse.sql)  
**Legacy app:** `audit.vonosautos.com/` (Ultimate POS — in repo)  
**Audit reference:** [VW_AUDIT.md](./VW_AUDIT.md)  
**Archetype:** stock-centric (movements + inventory; retail `Sale` model not used v1)

> **Cutover decision (Jun 24, 2026):** `Vonos warehouse.sql` + `audit.vonosautos.com` are the **authoritative** VW migration source.  
> Older `vonomglk_hq2` cPanel data is **archive-only** — see [VAW_VW_CUTOVER_NOTES.md](./VAW_VW_CUTOVER_NOTES.md).

---

## 1. Scope

### In scope (VW v1)

| Source table(s) | Vonos target | Canonical volume (Jun 24) |
|---|---|---:|
| `products`, `variations`, `variation_location_details`, `categories` | `Item` | 664 |
| `contacts` (supplier) | `Supplier` | ≤2 |
| `transactions` (`type = opening_stock`) + `purchase_lines` | `Item.quantity` seed | 1,101 |
| `transactions` (`type = sell`, `status = final`) | `StockMovement` (outbound) + `LedgerEntry` (revenue) | 278 |
| `purchase_lines` | Movement line JSON + cost rollup | 1,089 |
| All migrated entities | `MigrationLegacyId` | per row |

### Out of scope (skip for VW v1)

| Source | Reason |
|---|---|
| `transaction_sell_lines_purchase_lines` | FIFO costing (1,180 rows) |
| `product_racks` | Empty — racks disabled on this install |
| `accounts`, `account_transactions` | Empty — no finance subsystem data |
| `transactions` (`type = purchase`) | Zero rows in canonical dump |
| `contacts` (customer) | Warehouse v1 is supplier/stock focused |
| `sell` as `Sale` / `Customer` | Stock-centric archetype uses outbound movements |
| `essentials_*`, `oauth_*`, `users`, `activity_log` | HR/auth noise |

---

## 2. Import order

1. `Tenant` row (`code: VW`, `archetype: stock`).
2. Categories lookup → **Items** (one per `variation_id`; `availableForRetail: false`).
3. Opening stock reconciliation on `Item.quantity` (primary quantity source — 1,101 opening_stock txns).
4. **Suppliers** from `contacts` (supplier + both).
5. **StockMovement** outbound (final sells only — no inbound purchases in source).
6. **LedgerEntry** per sell (revenue).
7. **MigrationLegacyId** rows.

---

## 3. ID strategy

| `entityType` | Legacy key |
|---|---|
| `item` | `variations.id` |
| `supplier` | `contacts.id` |
| `stock_movement` | `transactions.id` |

---

## 4. Item mapping

| Source field | Target `Item` | Transform rule |
|---|---|---|
| `variations.sub_sku` | `sku` | Prefer `sub_sku`; fallback `products.sku` |
| `products.name` | `name` | Variable product name suffix when applicable |
| `categories.name` | `category` | Lookup |
| `variation_location_details.qty_available` | `quantity` | int; opening_stock fallback |
| `variations.default_purchase_price` | `costPrice` | Decimal |
| `products.alert_quantity` | `reorderPoint` | Nullable |
| `product_racks.*` | `binLocation` | **NULL** — racks disabled |
| — | `availableForRetail` | `false` |
| — | `status` | `derive_stock_status()` |

**Expected:** 664 products/variations, 659 VLD rows (493 non-zero stock).

---

## 5. StockMovement mapping

### Inbound

No `purchase` transactions in canonical dump. Quantity comes from **opening_stock** + VLD, not inbound movements.

### Outbound (`transactions.type = sell`, `status = final`)

| Source | Target | Rule |
|---|---|---|
| `invoice_no` | `reference` | |
| — | `type` | `outbound` |
| — | `status` | `Delivered` |
| `transaction_sell_lines` | `lines` | JSON array via variation_id → item map |

**Expected:** ~277 outbound movements (dry-run Jun 24).

---

## 6. Ledger mapping

| Transaction type | `LedgerEntry.type` | Category |
|---|---|---|
| `sell` | `revenue` | Sales |

No purchase, expense, or payroll rows in canonical source.

---

## 7. Validation checklist

| Metric | Expected (`vonomglk_audit`) | Dry-run (Jun 24) |
|---|---:|---:|
| `products` / items | 664 | 664 |
| `variations` | 664 | 664 |
| `variation_location_details` | 659 | 659 |
| `transactions` (opening_stock) | 1,101 | — |
| `transactions` (sell final) | 278 | 277 movements |
| `contacts` | 2 | 2 |
| `ledgerEntries` | ~278 | 277 |

Run:

```bash
PYTHONPATH=scripts python3 scripts/migrate_all.py \
  --dump "Vonos warehouse.sql" --entities VW
```

Production import (after freeze):

```bash
PYTHONPATH=scripts python3 scripts/migrate_all.py \
  --dump "Vonos warehouse.sql" --entities VW --write --confirm-all
```

---

## Related files

- ETL: [`scripts/migration/stock_transforms.py`](../../scripts/migration/stock_transforms.py)
- Registry: [`scripts/migration_registry.py`](../../scripts/migration_registry.py) (`source_db: vonomglk_audit`)
- Legacy HQ archive: [VW_HQ_AUDIT.md](./VW_HQ_AUDIT.md)
