# Delta ETL Runbook — HQ6 / Legacy → Vonos

**Model:** One-time migration + periodic delta imports until legacy is frozen. There is **no live sync**.

Use this runbook whenever staff may still be entering data on legacy Ultimate POS sites.

---

## Prerequisites

- Fresh MySQL dump per entity (document freeze timestamp **T₀**)
- Repo `.venv` with migration deps: `python3 -m venv .venv && .venv/bin/pip install -r scripts/migration/requirements.txt`
- Postgres reachable (`apps/api/.env` `DATABASE_URL`)
- Tenants seeded: `cd apps/api && npx prisma db seed`

---

## Per-entity import commands

| Entity | Dump file | Dry-run | Write |
|--------|-----------|---------|-------|
| **VISP** | `vonomglk_vsp.sql` | `.venv/bin/python scripts/migrate_visp_from_vsp.py --dump <path>` | add `--write --confirm-tenant VISP` |
| **VSP** | `vonomglk_spmarket.sql` | `.venv/bin/python scripts/migrate_vsp_from_spmarket.py --dump <path>` | add `--write --confirm-tenant VSP` |
| **VA** | hq3temp section | `./scripts/migrate_hq3_delta.sh --since YYYY-MM-DD` | add `--write --confirm-tenant VA` |
| **VC** | `vonomglk_cafe.sql` | `./scripts/migrate_vc.sh --dump <path>` | add `--write --confirm-tenant VC` |
| **VW** | `Vonos warehouse.sql` | `./scripts/migrate.sh --entities VW --dump <path>` | add `--write --confirm-all` |

Phased all-entities: `./scripts/migrate_phased.sh --dump <path>`

---

## Verification (run after every dry-run or write)

```bash
# SQL dump vs baseline delta report
python scripts/entity_sql_delta.py VISP
python scripts/entity_sql_delta.py VSP
python scripts/entity_sql_delta.py VA
python scripts/entity_sql_delta.py VC

# MySQL-side financial counts (requires dump paths in script config)
python scripts/financial_coverage_mysql.py

# Postgres-side financial counts
cd apps/api && npx ts-node prisma/scripts/sql-financial-audit.ts

# VA job/HRM spot check
cd apps/api && npx ts-node prisma/scripts/sql-va-audit.ts

# VISP payroll junction spike (classify linked transaction types)
.venv/bin/python scripts/migration/spike_visp_payroll.py --dump <visp.sql>
```

---

## Exit criteria (cutover-ready)

| Check | Target |
|-------|--------|
| Sales count | Postgres ≥ legacy `sell` final count |
| Ledger revenue tie-out | `revenueTieOutPass: true` in financial audit |
| Inbound movements | VISP/VSP opening_stock lines ≈ inbound count |
| Payments | No unexplained ₦1M+ delta vs sales (investigate orphans) |
| Payroll (VISP) | Payroll rows ≈ junction link count when legacy has payroll txns |
| Dry-run JSON | Update `docs/migration-audits/dryruns/*_MIGRATION_DRYRUN.json` |

---

## Write gate

1. Dry-run completes with zero fatal errors
2. Counts within tolerance (see [FINANCIAL_DATA_COVERAGE.md](./FINANCIAL_DATA_COVERAGE.md))
3. Map doc sign-off for entity if schema changed
4. Run write with `--confirm-tenant` or `--confirm-all`
5. Re-run Postgres financial audit
6. Smoke test on Vonos UI (login, sales list, finance ledger)

---

## Staff / auth

- **Do not** import legacy `users.password_hash`
- Re-invite staff via Vonos invite flow per tenant
- Verify roles: admin, manager, staff, viewer

---

## Related docs

- [migration-pipeline.md](../migration-pipeline.md)
- [HQ6_INFRASTRUCTURE_SYNC_PLAN.md](./HQ6_INFRASTRUCTURE_SYNC_PLAN.md)
- [VISP_VSP_CUTOVER_PLAN.md](./VISP_VSP_CUTOVER_PLAN.md)
- [CUTOVER_CHECKLIST_VISP_VSP.md](./CUTOVER_CHECKLIST_VISP_VSP.md)
