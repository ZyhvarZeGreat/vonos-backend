# VW — Cutover Notes (`vonomglk_audit` vs legacy `vonomglk_hq2`)

**Decision (Jun 24, 2026):** Vonos Warehouse (`VW` → `tenant_vw_001`) migrates from:

| Role | URL / artifact | MySQL | Vonos |
|---|---|---|---|
| **Canonical (cutover)** | `audit.vonosautos.com`, [`Vonos warehouse.sql`](../../Vonos%20warehouse.sql) | `vonomglk_audit` | `tenant_vw_001` |
| **Legacy archive** | Old HQ cPanel site (URL TBD) | `vonomglk_hq2` | Not imported |

Audits: [VW_AUDIT.md](./VW_AUDIT.md) (canonical), [VW_HQ_AUDIT.md](./VW_HQ_AUDIT.md) (archive).  
Architecture: [VW_LEGACY_ARCHITECTURE.md](./VW_LEGACY_ARCHITECTURE.md).  
Migration map: [VW_MIGRATION_MAP.md](./VW_MIGRATION_MAP.md).

---

## 1. Why the switch

Ops chose the **audit warehouse install** as the live Vonos Warehouse source:

- App code is in-repo (`audit.vonosautos.com/`).
- Standalone SQL export (`Vonos warehouse.sql`) is easy to freeze at cutover.
- Kubwa/Abuja location (`BL0001`) matches the warehouse being built on the platform.

`vonomglk_hq2` was an older HQ-scale Ultimate POS database (14k+ txns, payroll, full finance). It is **not** the migration target unless a future backfill is explicitly approved.

---

## 2. Scale comparison

| Metric | Canonical (`vonomglk_audit`) | Legacy archive (`vonomglk_hq2`) |
|---|---:|---:|
| Products | 664 | 2,337 |
| Transactions | 1,379 | 14,817 |
| Users | 3 | 167 |
| Contacts | 2 | 4,999 |
| `product_racks` | 0 | 1,934 |
| `account_transactions` | 0 | 15,513 |
| Purchases | 0 | 5,391 |

Canonical data is **opening-stock-heavy** (1,101 rows) with 278 sells and no purchase history.

---

## 3. SKU overlap (informational)

~42.9% of canonical SKUs (285/664) also appear in hq2; hq2 has 2,145 SKUs not in the canonical dump. **No automatic merge from hq2** — canonical import stands alone.

---

## 4. Dry-run (Jun 24, `Vonos warehouse.sql`)

| Entity | Count |
|---|---:|
| Items | 664 |
| Stock movements (outbound) | 277 |
| Ledger entries | 277 |
| Legacy ID rows | 1,882 |

See [dryruns/VW_MIGRATION_DRYRUN.json](./dryruns/VW_MIGRATION_DRYRUN.json).

---

## 5. Cutover commands

```bash
# Freeze audit.vonosautos.com → fresh mysqldump as Vonos warehouse.sql

PYTHONPATH=scripts python3 scripts/migrate_all.py \
  --dump "Vonos warehouse.sql" --entities VW --write --confirm-all
```

Post-import: `PYTHONPATH=scripts python3 -m migration.dedupe_tenant tenant_vw_001` if re-importing.

---

## 6. Vonos UI implications

| Page | Canonical data expectation |
|---|---|
| Inventory | 664 SKUs — **primary surface** |
| Inbound | Empty (no purchases) — quantities from opening stock |
| Outbound | ~277 sell movements |
| Finance | Revenue from sells only — no expense/payroll |
| Suppliers | ≤2 contacts |

---

## 7. Deprecated artifacts

| Old file | Status |
|---|---|
| `VAW_AUDIT.md` | Superseded by `VW_AUDIT.md` |
| `VAW_MIGRATION_MAP.md` | Superseded by `VW_MIGRATION_MAP.md` |
| `VAW_LEGACY_*` | Renamed/superseded — see `VW_LEGACY_*` |

Code alias **VAW** removed from `audit_mysql_dump.py` — `vonomglk_audit` maps to **VW**.

---

## 8. Optional future work

- Backfill additional SKUs from hq2 (2,145 HQ-only) — requires explicit dedupe policy.
- Fresh `vonomglk_hq2` export if archive comparison needed at cutover.
