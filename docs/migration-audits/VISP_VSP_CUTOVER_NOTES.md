# VISP + VSP — Cutover & Remediation Notes

Audit-phase remediation plan. **No production import** until sign-off.

---

## 1. Entity matrix (source of truth)

| Legacy site | MySQL DB | Vonos code | Tenant ID |
|---|---|---|---|
| `visp.vonosautomarket.com` | `vonomglk_vsp` | **VISP** | `tenant_visp_001` |
| `vsp.vonosautomarket.com` | `vonomglk_spmarket` | **VSP** | `tenant_vsp_001` |

**Retired:** `VSS` label and `VSS` → `vonomglk_vsp` mapping in `migration_registry.py`.

---

## 2. `tenant_vss_001` contamination

**Problem:** A full import from `vonomglk_vsp.sql` was run against `tenant_vss_001` under the old `VSS` code. That tenant holds **VISP-scale data** (~3k sales, ~2.5k SKUs), not marketplace data.

**Remediation (before VISP production cutover):**

1. **Do not** use `tenant_vss_001` for operations or marketplace.
2. Archive or soft-clear `tenant_vss_001` rows (or rename tenant code to `VSS_ARCHIVED` in seed only after backup).
3. Migrate institute data to **`tenant_visp_001`** with `--entities VISP`.
4. Migrate marketplace data to **`tenant_vsp_001`** with `--entities VSP` + `vonomglk_spmarket.sql`.

---

## 3. Dedupe ordering bug (fixed)

**Problem:** `dedupe_tenant.py` detected duplicate `AccountTransaction` rows **before** FK remaps collapsed `accountId` groups. After first dedupe on contaminated VSS import, ~3,031 account transactions remained with ~2,999 duplicates still present.

**Fix (implemented):** On `--execute`, re-run duplicate `AccountTransaction` detection **after** `accountId` / `paymentId` remaps, then soft-delete.

**Operator action:** Before any new `--write` import:

```bash
PYTHONPATH=scripts python3 scripts/migration/dedupe_tenant.py --tenant-code VISP --execute --confirm-tenant VISP
# (repeat for VSP after first import if re-running ETL)
```

For legacy `tenant_vss_001` cleanup, run with `--tenant-code VSS` only if that code remains in seed — otherwise dedupe by `tenant_id` after registry update.

---

## 4. Tooling updates (this audit)

| File | Change |
|---|---|
| `scripts/audit_mysql_dump.py` | `vonomglk_vsp`→VISP, `vonomglk_spmarket`→VSP |
| `scripts/migration_registry.py` | `VISP` + `VSP` entities; `VSS` removed |
| `scripts/migration/dedupe_tenant.py` | Post-remap account-tx dedupe pass |
| `scripts/extract_mysql_database.py` | Extract single DB from cPanel dump |
| `scripts/entity_sql_delta.py` | Per-entity delta reports |
| `.gitignore` | SQL dumps + legacy `.env` files |

---

## 5. Seed + frontend (implementation after audit)

Not done in audit phase — documented for follow-up:

- `apps/api/prisma/seed/tenants.ts` — add `tenant_visp_001`, `tenant_vsp_001`; deprecate `tenant_vss_001`
- `apps/web/lib/registries/tenantConfigs.ts` — `vispTenantConfig`, `vspTenantConfig`
- `apps/web/lib/registries/migrationSources.ts` — VISP/VSP source DB names
- `AGENTS.md` — replace single VSS row with VISP + VSP (or note VSS retired)

---

## 6. Cutover commands (reference)

```bash
# VISP — institute
PYTHONPATH=scripts python3 scripts/migrate_all.py \
  --dump vonomglk_vsp.sql --entities VISP --write --confirm-all

# VSP — marketplace
PYTHONPATH=scripts python3 scripts/migrate_all.py \
  --dump vonomglk_spmarket.sql --entities VSP --write --confirm-all
```

Dry-run artifacts: `docs/migration-audits/dryruns/VISP_MIGRATION_DRYRUN.json`, `VSP_MIGRATION_DRYRUN.json`.

---

## 7. Audit deliverables checklist

- [x] `VISP_AUDIT.md` + `VSP_AUDIT.md` (Jun 23)
- [x] `VISP_VSP_SQL_DELTA.md` + `VSP_SQL_DELTA.md`
- [x] `VISP_LEGACY_ARCHITECTURE.md` + `VSP_LEGACY_ARCHITECTURE.md` + `VISP_VSP_BACKEND_DIFF.md`
- [x] `VISP_LEGACY_GAP_ANALYSIS.md` + `VSP_LEGACY_GAP_ANALYSIS.md`
- [x] `VISP_MIGRATION_MAP.md` + `VSP_MIGRATION_MAP.md`
- [x] Dry-run JSON for both entities
- [x] This cutover note
