# VW — SQL Delta & Cutover Readiness

**Entity:** VW → `tenant_vw_001`  
**Legacy site:** `audit.vonosautos.com`  
**Canonical dump:** `Vonos warehouse.sql` (Jun 24, 2026)  
**Baseline:** `localhost (1).sql` embedded `vonomglk_audit` (Jun 18, 2026)  
**Audit:** [VW_AUDIT.md](./VW_AUDIT.md)

---

## 1. Row-count delta

| Metric | Baseline | Current dump | Delta |
|---|---:|---:|---:|
| transactions | 1,324 | 1,379 | +55 |
| products | 645 | 664 | +19 |
| opening_stock txns | ~1,051 | 1,101 | +50 |
| sell txns | ~273 | 278 | +5 |
| account_transactions | 0 | 0 | — |
| product_racks | 0 | 0 | — |

Modest growth since Jun 18 — consistent with ongoing stock work on the Kubwa warehouse install.

---

## 2. Dry-run (Jun 24)

```json
{
  "items": 664,
  "stockMovements": 277,
  "ledgerEntries": 277,
  "legacyIdRows": 1882
}
```

Full output: [dryruns/VW_MIGRATION_DRYRUN.json](./dryruns/VW_MIGRATION_DRYRUN.json)

---

## 3. Cutover verdict

### **GO** (canonical source)

- `vonomglk_audit` is the signed-off VW migration database.
- Registry: `migration_registry.py` → `source_db: vonomglk_audit`.
- Import: `migrate_all.py --dump "Vonos warehouse.sql" --entities VW --write --confirm-all` after site freeze.

**Not in scope:** `vonomglk_hq2` — see [VW_HQ_AUDIT.md](./VW_HQ_AUDIT.md) for archive comparison only.
