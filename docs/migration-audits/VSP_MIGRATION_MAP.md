# VSP — Field-Level Migration Map

**Target entity:** Vonos SP Marketplace (`VSP`, tenant code `VSP`, seed id `tenant_vsp_001`)  
**Canonical source:** `vonomglk_spmarket` — `vonomglk_spmarket.sql` (extracted from `localhost (1).sql`)  
**Architecture reference:** [VSP_LEGACY_ARCHITECTURE.md](./VSP_LEGACY_ARCHITECTURE.md)  
**Audit reference:** [VSP_AUDIT.md](./VSP_AUDIT.md)  
**Institute sibling:** [VISP_MIGRATION_MAP.md](./VISP_MIGRATION_MAP.md) (`vonomglk_vsp` — **different tenant**)

---

## 1. Scope

### In scope (VSP v1)

Same Vonos targets as VISP — see [VISP_MIGRATION_MAP.md](./VISP_MIGRATION_MAP.md) §1 for table mapping (`Item`, `Customer`, `Sale`, `LedgerEntry`, etc.).

**VSP-specific scale (Jun 23 dry-run):**

| Entity | Count |
|---|---:|
| Items | 1,204 |
| Customers | 86 |
| Suppliers | 0 (no supplier contacts in transform) |
| Sales (final) | 162 |
| Sale lines | 505 |
| Ledger entries | 162 |

### Out of scope (VSP v1)

Same exclusions as VISP (FIFO costing table, imported users, Essentials HR, OAuth).  
Additionally low priority for marketplace: payroll, product racks (empty in `spmarket`).

---

## 2. Import order

Identical dependency graph to VISP — see [VISP_MIGRATION_MAP.md](./VISP_MIGRATION_MAP.md) §2. Replace tenant seed with `tenant_vsp_001`.

---

## 3. ID strategy

Same `MigrationLegacyId` pattern; `tenantId` = VSP tenant cuid.  
**Do not** share legacy ID namespace with VISP — separate databases use overlapping integer IDs.

---

## 4.–8. Field mappings

Use [VISP_MIGRATION_MAP.md](./VISP_MIGRATION_MAP.md) §4–§8 verbatim. Join paths and transforms are identical Ultimate POS → Vonos transaction archetype.

---

## 9. CLI

```bash
# Dry-run (audit)
PYTHONPATH=scripts python3 scripts/migrate_all.py --dump vonomglk_spmarket.sql --entities VSP --dry-run

# Production (after sign-off + seed tenant_vsp_001)
PYTHONPATH=scripts python3 scripts/migrate_all.py --dump vonomglk_spmarket.sql --entities VSP --write --confirm-all
```

Output: [dryruns/VSP_MIGRATION_DRYRUN.json](./dryruns/VSP_MIGRATION_DRYRUN.json)

---

## 10. Notes

1. **`vonomglk_spmarket` is not a subset of `vonomglk_vsp`** — separate product catalogs and customer bases.
2. **Revenue tie-out:** ₦11,043,950 sell total vs ₦11,033,950 payments (₦10k gap — due/partial sells); migration uses `final_total`.
3. **VSS retirement:** do not import spmarket into `tenant_vss_001`.
