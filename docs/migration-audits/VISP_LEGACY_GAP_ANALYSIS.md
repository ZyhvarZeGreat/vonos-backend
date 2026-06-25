# VISP Legacy vs Vonos — Gap Analysis

Compares `visp.vonosautomarket.com` / `vonomglk_vsp` to the Vonos transaction-centric template for **VISP** (`tenant_visp_001`).

See: [VISP_LEGACY_ARCHITECTURE.md](./VISP_LEGACY_ARCHITECTURE.md), [VISP_MIGRATION_MAP.md](./VISP_MIGRATION_MAP.md), [VISP_AUDIT.md](./VISP_AUDIT.md).

---

## Architecture

| Dimension | Legacy VISP | Vonos VISP (target) |
|---|---|---|
| App | Laravel 9 monolith | NestJS + Next.js |
| Data | `vonomglk_vsp` MySQL | Postgres `tenant_visp_001` |
| Stock atom | `variation_location_details` | `Item.quantity` |
| Sales | `transactions` polymorphic | `Sale` + `SaleLine` |
| Finance | `account_transactions` | `LedgerEntry` |

---

## Migrated data (dry-run Jun 23)

| Entity | Count | Source |
|---|---:|---|
| Items | 2,543 | variations + VLD |
| Customers | 4,682 | contacts |
| Suppliers | 130 | contacts |
| Sales | 3,043 | sell/final |
| Sale lines | 18,575 | transaction_sell_lines |
| Ledger entries | 3,043 | derived revenue |

Revenue tie-out: ₦367,095,670 `final_total` vs ₦366,957,670 payments (₦138k gap — due/partial).

---

## Feature gaps (institute scale)

| Legacy | Vonos status | Gap |
|---|---|---|
| 2,543 SKU catalog | ETL → Items | Flattened variable products |
| 3,043 sales history | ETL → Sales | OK for read |
| 4,814 contacts | ETL → Customers | OK |
| POS register + cash drawer | `pos-terminal` stub | No full register UX |
| Payment accounts (31) | Partial import | Historical `account_transactions` not fully mirrored |
| Essentials / payroll (588 txns) | **Not migrated** | HR out of scope v1 |
| Product racks (1,848) | **Not migrated** | Warehouse layout feature |
| FIFO costing (23k rows) | **Skipped** | Vonos uses simple COGS |
| Sell returns (routes only) | UI filter on sales | No return workflow |
| WooCommerce sync | Enabled in legacy | Not in Vonos |
| Multi-location | 1 location | `locationCode` preset only |

---

## Frontend / config

- Fork `spareShopTenantConfig` → `vispTenantConfig` (KPIs: sales volume, SKU count, institute labels).
- Retire `VSS` code paths in `entityPages.tsx` / `migrationSources.ts` when seeding `tenant_visp_001`.
- Catalog cross-read from Warehouse (`availableForRetail`) applies if VISP retail module enabled — same pattern as former VSS design.

---

## Recommended next steps

1. Seed `tenant_visp_001`; do **not** reuse `tenant_vss_001` (contaminated — see [VISP_VSP_CUTOVER_NOTES.md](./VISP_VSP_CUTOVER_NOTES.md)).
2. Production import from `vonomglk_vsp.sql` after freeze.
3. Dedupe with fixed two-pass `dedupe_tenant.py` if re-importing.
