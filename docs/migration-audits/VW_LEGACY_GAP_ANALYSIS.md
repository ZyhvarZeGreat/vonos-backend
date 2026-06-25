# VW Legacy vs Vonos — Gap Analysis

Compares **canonical** warehouse `audit.vonosautos.com` / `vonomglk_audit` to the Vonos **stock-centric** template for **VW** (`tenant_vw_001`).

See: [VW_LEGACY_ARCHITECTURE.md](./VW_LEGACY_ARCHITECTURE.md), [VW_MIGRATION_MAP.md](./VW_MIGRATION_MAP.md), [VW_AUDIT.md](./VW_AUDIT.md), [VAW_VW_CUTOVER_NOTES.md](./VAW_VW_CUTOVER_NOTES.md).

---

## Architecture

| Dimension | Legacy VW (canonical) | Vonos VW (target) |
|---|---|---|
| App | Laravel 9 — `audit.vonosautos.com/` | NestJS + Next.js |
| Data | `vonomglk_audit` MySQL | Postgres `tenant_vw_001` |
| Stock atom | `variation_location_details` + opening_stock | `Item.quantity` |
| Inbound | No purchase txns | `StockMovement` inbound (empty at launch) |
| Outbound | 278 `sell` txns | `StockMovement` outbound |
| Finance | No `account_transactions` | `LedgerEntry` from sells only |

---

## Migrated data (dry-run Jun 24, `Vonos warehouse.sql`)

| Entity | Count | Source |
|---|---:|---|
| Items | 664 | variations + VLD |
| Stock movements | 277 | sell/final outbound |
| Ledger entries | 277 | sell revenue |
| Customers | 2 | contacts — **out of scope** UI |
| Suppliers | ≤2 | contacts |

---

## Feature gaps (legacy vs Vonos UI)

| Legacy | Vonos VW status | Gap |
|---|---|---|
| 664 SKU catalog | ETL → Items | OK |
| Opening stock (1,101 txns) | Quantity seed | OK — not shown as Inbound rows |
| **No purchases** | Inbound page | **Empty** until live ops add purchases |
| 278 sells | Outbound movements | OK |
| No product racks | `binLocation` | **NULL** — racks disabled in legacy |
| No finance accounts | Finance tab | Revenue-only from sells |
| FIFO link table (1,180) | Skipped | Same as prior VW map policy |
| Essentials / payroll | Not in data | N/A |
| Self-registration route | Broken `register.blade.php` | Legacy site only |

---

## Vonos UI (`entityPages.tsx` VW block)

| Page | Readiness |
|---|---|
| Overview / KPIs | After import + tenant config |
| Inventory | **Ready** (664 items) |
| Inbound | **Empty at launch** (no purchase history) |
| Outbound | **Ready** (~277 movements) |
| Transfers | UI exists; no legacy transfer data |
| Suppliers | Minimal (≤2) |
| Finance | Partial — sell revenue only |
| Cross-entity requisition | **Deferred** (AGENTS §15) |
| Spare Shop retail sync | Policy TBD (`available_for_retail`) |

---

## Legacy hq2 archive (not imported)

[vonomglk_hq2](./VW_HQ_AUDIT.md) had racks, payroll, 5k+ purchases — documented for reference only. Do not import unless ops approves backfill.

---

## Recommended next steps

1. Freeze `audit.vonosautos.com` → export `Vonos warehouse.sql`.
2. `--write` import into `tenant_vw_001`.
3. Validate Inventory + Outbound + Finance in Vonos UI.
4. Plan inbound workflow for **new** purchases post-cutover (no legacy purchase rows).
