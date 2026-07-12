# WordPress / SQL Migration Pipeline

One-time migration path for legacy Ultimate POS MySQL databases into Vonos multi-tenant Postgres.

Each department has its **own SQL dump file** and import wrapper — not a single `localhost.sql` only.

## Per-tenant dump files

| Code | Expected dump file(s) | Import wrapper |
|------|----------------------|----------------|
| **VA** | `vonomglk_Quotation.sql` + `vonomglk_OPS.sql` (or `localhost.sql`) | `./scripts/migrate_va.sh` |
| **VISP** | `vonomglk_vsp.sql` | `./scripts/migrate_visp_from_vsp.py` |
| **VSP** | `vonomglk_spmarket.sql` | `./scripts/migrate_vsp_from_spmarket.py` |
| **VW** | `Vonos warehouse.sql` | `./scripts/migrate.sh --entities VW` |
| **VC** | `vonomglk_cafe.sql` (or `localhost.sql`) | `./scripts/migrate_vc.sh` |

Delta reports: `python scripts/entity_sql_delta.py {VA|VISP|VSP|VW|VC}`

**Ongoing delta imports** (legacy still live until cutover): see [DELTA_ETL_RUNBOOK.md](./migration-audits/DELTA_ETL_RUNBOOK.md) and [CUTOVER_CHECKLIST_VISP_VSP.md](./migration-audits/CUTOVER_CHECKLIST_VISP_VSP.md).

## Pipeline stages

1. **Export** — phpMyAdmin/mysqldump from each cPanel site → per-entity `.sql` file
2. **Inspect** — [audit_mysql_dump.py](../scripts/audit_mysql_dump.py) per database
3. **Map** — field-level `*_MIGRATION_MAP.md` per entity (maps-first gate before Postgres write)
4. **Transform** — shared Python package under [scripts/migration/](../scripts/migration/)
5. **Dry-run** — [migrate_all.py](../scripts/migrate_all.py) validates counts per tenant
6. **Import** — `--write --confirm-all` after map sign-off

## Orchestrator

All migration Python commands run in the repo **`.venv`** (created automatically by the shell wrappers).

```bash
# One-time: create venv and install deps (wrappers do this on first run)
python3 -m venv .venv
.venv/bin/pip install -r scripts/migration/requirements.txt

# Dry-run all legacy entities (default)
./scripts/migrate.sh --dump localhost.sql --entities all

# Phased dry-run: VC → VA → VISP → VSP → VW (production tenant codes)
# Shows [1/3] load, [2/3] transform, [3/3] write per entity + overall entity bar
./scripts/migrate_phased.sh --dump localhost.sql

# Vonos Automotive composite (Quotation + OPS → tenant_va_001)
./scripts/migrate_va.sh --dump localhost.sql
./scripts/migrate_va.sh --hrm-only --write --confirm-tenant VA

# Vonos Cafe
./scripts/migrate_vc.sh --dump localhost.sql

# Phased live import (recommended)
./scripts/migrate_phased.sh --dump localhost.sql --write --confirm-all

# Pause before each entity (manual gate between tenants)
./scripts/migrate.sh --phased --pause-between --dump localhost.sql --write --confirm-all

# Single entity (canonical warehouse dump)
./scripts/migrate.sh --dump "Vonos warehouse.sql" --entities VW

# List seeded tenants in Postgres
./scripts/migrate.sh --list-tenants

# Write (after map approval + tenant seed)
# Seed must run first so all 8 tenant rows exist — business tables can be empty.
#   cd apps/api && npx prisma db seed
./scripts/migrate.sh --dump localhost.sql --entities all --write --confirm-all

# VSS-only wrapper
./scripts/migrate_vss.sh --dump localhost.sql
```

Equivalent without wrappers: `.venv/bin/python scripts/migrate_all.py …`

## Entity status

| Code | MySQL DB | Map | Dry-run | Postgres write |
|---|---|---|---|---|
| VW | `vonomglk_audit` (`Vonos warehouse.sql`) | [VW_MIGRATION_MAP.md](./migration-audits/VW_MIGRATION_MAP.md) | Done | After sign-off |
| VISP | `vonomglk_vsp` (`vonomglk_vsp.sql`) | [VISP migration map](./migration-audits/VISP_MIGRATION_MAP.md) | Done | After sign-off |
| VSP | `vonomglk_spmarket` (`vonomglk_spmarket.sql`) | [VSP migration map](./migration-audits/VSP_MIGRATION_MAP.md) | Done | After sign-off |
| VA | `vonomglk_Quotation` + `vonomglk_OPS` | [VA_MIGRATION_MAP.md](./migration-audits/VA_MIGRATION_MAP.md) | Done | Merged (`tenant_va_001`); HRM imported |
| VM | `vonomglk_Quotation` | *(superseded → VA)* | — | Staging only (`tenant_vm_001`) |
| VMS | `vonomglk_OPS` | *(superseded → VA)* | — | Staging only (`tenant_vms_001`) |
| VC | `vonomglk_cafe` (`vonomglk_cafe.sql`) | [VC_MIGRATION_MAP.md](./migration-audits/VC_MIGRATION_MAP.md) | Done | After sign-off |
| VKW, VS | — | N/A (new build) | Seed only | — |
| VAG | — | N/A (admin rollup) | Seed only | — |

Registry: [migration_registry.py](../scripts/migration_registry.py)

Dry-run summaries: [docs/migration-audits/dryruns/](./migration-audits/dryruns/)

## Prerequisites before live import

- [x] Migration maps for VW, VSS, VM, VMS, VC
- [x] Shared ETL (`pos_common`, archetype transforms, `migrate_all.py`)
- [x] Tenant seed for all 8 entities (`apps/api/prisma/seed.ts` — tenants + admins only; no demo business rows)
- [x] Multi-entity dry-run validated
- [ ] User sign-off on all migration maps
- [ ] Phase 1 API modules complete per archetype
- [ ] `Vehicle` Prisma model before VM production write (optional v1 uses `Job.description`)

## Open mapping questions (from AGENTS.md)

- Cross-entity stock / available stock definition
- Mechanics small stock vs Warehouse-only inventory
- Job ↔ Vehicle history for VM
- VSS: VW catalog sync vs standalone Item import
