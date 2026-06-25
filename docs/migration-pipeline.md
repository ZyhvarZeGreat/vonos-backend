# WordPress / SQL Migration Pipeline

One-time migration path for legacy Ultimate POS MySQL databases into Vonos multi-tenant Postgres.

## Pipeline stages

1. **Export** — phpMyAdmin/mysqldump from each cPanel site → `localhost.sql`
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

# Phased dry-run: one entity at a time (VC → VMS → VM → VSS → VW); VM/VMS → tenant_va_001
# Shows [1/3] load, [2/3] transform, [3/3] write per entity + overall entity bar
./scripts/migrate_phased.sh --dump localhost.sql

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
| VW | `vonomglk_audit` (`Vonos warehouse.sql`) | [VW_MIGRATION_MAP.md](./migration-audits/VW_MIGRATION_MAP.md) | Done (664 items) | After sign-off |
| VSS | `vonomglk_vsp` | [VSS_MIGRATION_MAP.md](./migration-audits/VSS_MIGRATION_MAP.md) | Done | After sign-off |
| VA | `vonomglk_Quotation` + `vonomglk_OPS` | [VA_MIGRATION_MAP.md](./migration-audits/VA_MIGRATION_MAP.md) | Done | Merged (`tenant_va_001`) |
| VM | `vonomglk_Quotation` | *(superseded → VA)* | — | Import code → `tenant_va_001` |
| VMS | `vonomglk_OPS` | *(superseded → VA)* | — | Import code → `tenant_va_001` |
| VC | `vonomglk_cafe` | [VC_MIGRATION_MAP.md](./migration-audits/VC_MIGRATION_MAP.md) | Done | After sign-off |
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
