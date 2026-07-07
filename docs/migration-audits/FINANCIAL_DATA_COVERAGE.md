# Financial Data Coverage — MySQL vs Postgres

**Generated from:** [dryruns/FINANCIAL_MYSQL_COUNTS.json](./dryruns/FINANCIAL_MYSQL_COUNTS.json) and [dryruns/FINANCIAL_POSTGRES_COUNTS.json](./dryruns/FINANCIAL_POSTGRES_COUNTS.json).

**Method:** Stream-scan legacy MySQL dumps + query Vonos Postgres per tenant. See [FINANCIAL_ENDPOINTS_AUDIT.md](./FINANCIAL_ENDPOINTS_AUDIT.md) for route/API mapping.

**Status legend:** 🟢 aligned | 🟡 partial / investigate | 🔴 gap / not imported | ⚪ N/A by design

---

## Entity → database assignment

| Vonos tenant | Legacy MySQL source(s) | HQ6 / legacy site | Import script |
|---|---|---|---|
| **VA** | `vonomglk_Quotation` + `vonomglk_OPS` + `hq2` (2025) + `hq3temp` (2026) | hq6 → `vonomglk_hq3temp` (live) | `migrate_va.sh`, `migrate_hq2_delta.sh`, `migrate_hq3_delta.sh` |
| **VA delta** | `vonomglk_hq3temp` (2026 ops) | same HQ6 install | `migrate_hq3_delta.sh` |
| **VISP** | `vonomglk_vsp` | visp.vonosautomarket.com | `migrate_visp_from_vsp.py` |
| **VSP** | `vonomglk_spmarket` | vsp.vonosautomarket.com | `migrate_vsp_from_spmarket.py` |
| **VW** | `vonomglk_audit` | audit.vonosautos.com | `migrate.sh --entities VW` |
| **VC** | `vonomglk_cafe` | cafe.vonosautos.com | `migrate_vc.sh` |
| VKW, VS | — | new build | seed only |

**Excluded from operating tenants** (do not ETL into VA/VISP/etc.): `vonomglk_hq2`, `vonomglk_OLD_hq2`, `vonomglk_gp`, `vonomglk_vonos_institute`, `vonomglk_wp847`.

**Mislabel warning:** `vonomglk_spmarket` business table reads "Vonos Institute Spare Parts" but maps to **VSP** marketplace tenant — verify by site URL, not business name alone.

---

## VA — Vonos Automotive (`tenant_va_001`)

**MySQL imported:** Quotation + OPS + hq2 (2025) + hq3temp (2026 delta).

| Domain | MySQL (combined) | Postgres | Status | Report impact |
|---|---:|---:|---|---|
| Payroll txns | 1,910 (787+425+698) | 1,910 | 🟢 | HRM payroll, expense ledger |
| Payroll groups | 196 | 196 | 🟢 | Payroll groups tab |
| Expense txns | ~12,374 | 12,623 `Expense` | 🟢 | Expense report, P&L |
| Expense categories | 312 | 312 | 🟢 | Category filters |
| Revenue (jobs) | ~16,523 jobs | 33,046 ledger revenue | 🟢 job archetype | P&L, job costing |
| Purchases / inbound | ~10,543+ | 7,982 inbound movements | 🟢 | Purchase & sale report |
| Payments | — | 69,664 | 🟡 merged sources | Sell/purchase payment reports |
| Account txns | — | 56,201 | 🟡 merged sources | Balance sheet |
| Payment accounts | — | 104 | 🟢 merged | Account reports |

**Scripts:** `migrate_hq3_delta.sh --since 2026-01-01`, `migrate_hq2_delta.sh --since 2025-01-01 --until 2025-12-31`.

**Revenue tie-out:** VA uses jobs not `Sale` table — `tieOut.revenueTieOutPass` is N/A for sales; validate job ledger totals separately.

---

## VISP — Vonos Institute Spare Parts (`tenant_visp_001`)

| Domain | MySQL | Postgres | Status | Report impact |
|---|---:|---:|---|---|
| Sales (sell final) | 3,092 | 3,092 `Sale` | 🟢 | All sales reports |
| Ledger revenue | 3,092 | 3,092 entries | 🟢 deduped | P&L revenue side |
| Payments | 3,142 | 3,134 | 🟢 | Sell payment report |
| Payment tie-out | ₦373M sales | ₦373M ledger revenue | 🟢 `revenueTieOutPass` | P&L, tax |
| Purchases | 34 txns / 2,484 lines | 2,476 inbound | 🟢 movements exist | Product purchase, cost ledger |
| Ledger cost | purchase lines | 2,476 cost entries | 🟢 | Purchase & sale margin |
| Expense txns | 4 | 2 `Expense`, 8 ledger expense | 🟡 thin | Expense report |
| Expense categories | 36 | 36 | 🟢 | Expenses UI |
| Payroll txns | 0 (`type=payroll`) | 0 | ⚪ groups only | HRM payroll empty |
| Payroll groups | 31 / 588 links | 31 groups | 🟡 no employee rows | Payroll tab metadata only |
| Account txns | 3,135 | 3,090 | 🟢 deduped | Balance sheet |

---

## VSP — Vonos SP Marketplace (`tenant_vsp_001`)

| Domain | MySQL | Postgres | Status | Report impact |
|---|---:|---:|---|---|
| Sales | 264 | 264 | 🟢 | Sales reports |
| Ledger revenue | 264 | 264 | 🟢 deduped | P&L |
| Payments | 265 | 265 | 🟢 | Sell payment |
| Revenue tie-out | ₦18.7M sales | ₦18.7M ledger | 🟢 `revenueTieOutPass` | P&L |
| Purchases | 9 / 1,302 lines | 1,296 inbound | 🟢 | Cost ledger |
| Expenses | 0 | 0 | ⚪ | Expense report empty |
| Expense categories | 36 | 36 | 🟢 | UI ready |
| Payroll | 0 | 0 | ⚪ | — |
| Account txns | 262 | 255 | 🟢 deduped | Account reports |

---

## VW — Vonos Warehouse (`tenant_vw_001`)

| Domain | MySQL | Postgres | Status | Report impact |
|---|---:|---:|---|---|
| Outbound sells | 284 | 284 movements | 🟢 | Movement reports |
| Ledger revenue | 284 | 568 | 🟡 stock archetype (outbound + ledger) | P&L |
| Payments | 269 | 269 | 🟢 deduped | Payment report |
| Purchases | 0 | 0 | ⚪ by design | Purchase report N/A |
| Expenses | 0 | 0 | ⚪ | — |
| Payment accounts | 0 | 0 | ⚪ | Account reports empty |
| Payroll | 0 | 1 (seed?) | ⚪ investigate | — |

---

## VC — Vonos Cafe (`tenant_vc_001`)

| Domain | MySQL | Postgres | Status | Report impact |
|---|---:|---:|---|---|
| Sales | 4,715 | 4,715 | 🟢 | Sales / closeout |
| Ledger revenue | 4,715 | 4,715 | 🟢 | P&L |
| Payments | 5,428 | 5,394 | 🟢 | Sell payment |
| Payment vs sales | ₦4.72M | ₦6.46M payments | 🟡 ₦1.74M delta | Register, payment report |
| Expense txns | 195 | 195 `Expense`, 388 ledger | 🟢 | Expense report |
| Expense categories | 0 in dump | 0 in PG | 🟡 | Category UI empty |
| Purchases | 6 / 414 lines | 410 inbound | 🟢 | Cost ledger |
| Account txns | 3,954 | 3,898 | 🟢 | Balance sheet |
| Payroll | 0 | 0 | ⚪ | — |

---

## VKW / VS — new builds

No legacy MySQL. Postgres financial tables empty (seed-only). Reports run on live data only.

---

## Cross-cutting findings

### 1. Orphan ledger revenue (VISP, VSP — **resolved**)

Repeated migration runs left **orphan** `LedgerEntry` rows (no linked `Sale`). Fixed via `dedupe_tenant.py` + deterministic `mig_ledger_{saleId}` ids in `pos_common.py` for future imports.

### 2. VA hq3temp + hq2 deltas (**imported**)

- `migrate_hq3_delta.sh` — hq3temp Jan–Jul 2026 (`HQ3-` prefix, legacy offset +20M)
- `migrate_hq2_delta.sh` — hq2 calendar 2025 (`HQ2-` prefix, legacy offset +30M)
- VA purchases → inbound `StockMovement` + cost `LedgerEntry` via `include_purchases` in job delta path

### 3. VA idempotency for offset imports

Delta imports scope `MigrationLegacyId` checks to offset namespace only (`existing_legacy_for_delta_import`) so raw Quotation/OPS ids do not block hq3/hq2 rows with the same transaction id.

### 4. Expense dual model

- **CRUD:** `Expense` table ← `transactions.type=expense`
- **Reports:** `LedgerEntry.type=expense` ← may include payroll, manual entries, migration duplicates

Always reconcile both when auditing expenses.

### 5. Payment import

Historical `transaction_payments` partially imported (VA has payments; tie-out gaps on VC). Sell/purchase **payment reports** need payment rows aligned to sales.

---

## Verification commands

```bash
# Refresh MySQL counts
python3 scripts/financial_coverage_mysql.py

# Refresh Postgres counts
cd apps/api && npx ts-node prisma/scripts/sql-financial-audit.ts

# VA-specific job/HRM check
cd apps/api && npx ts-node prisma/scripts/sql-va-audit.ts
```

---

## Remediation status (2026-07-07)

| Item | Status |
|---|---|
| hq3temp delta ETL + write | ✅ `migrate_hq3_delta.sh` — 1,212+ payrolls before hq2; full chain 1,910 |
| hq2 2025 backfill | ✅ `migrate_hq2_delta.sh` |
| VA purchases → inbound + cost ledger | ✅ via `transform_stock_movements` in delta path |
| Ledger dedupe VISP/VSP | ✅ `dedupe_tenant.py --execute` — `revenueTieOutPass: true` |
| Ledger idempotency | ✅ `mig_ledger_{saleId}` in `pos_common.py` |
| VC expense categories | 🟡 still empty in dump |
| VISP payment vs sales delta | 🟡 ₦1.1M — document or align payments |
| VAG group roll-up VC | defer |

After each fix: re-run both financial audit scripts and update this matrix.

---

## Related docs

- [FINANCIAL_ENDPOINTS_AUDIT.md](./FINANCIAL_ENDPOINTS_AUDIT.md) — sidebar → API map
- [FINANCIAL_REPORTS_DATA.md](./FINANCIAL_REPORTS_DATA.md) — report → Postgres dependencies
- [HQ6_INFRASTRUCTURE_SYNC_PLAN.md](./HQ6_INFRASTRUCTURE_SYNC_PLAN.md) — full sidebar matrix
- [INDEX.md](./INDEX.md) — dump index
