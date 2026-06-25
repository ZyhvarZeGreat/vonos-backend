# VSP Legacy vs Vonos — Gap Analysis

Compares `vsp.vonosautomarket.com` / `vonomglk_spmarket` to Vonos **VSP** (`tenant_vsp_001`) — the **marketplace** entity (smaller than VISP).

See: [VSP_LEGACY_ARCHITECTURE.md](./VSP_LEGACY_ARCHITECTURE.md), [VSP_MIGRATION_MAP.md](./VSP_MIGRATION_MAP.md), [VSP_AUDIT.md](./VSP_AUDIT.md).

---

## Architecture

Same Ultimate POS → Vonos transaction archetype as VISP, but **separate database and tenant**.

| Metric | VSP (marketplace) | VISP (institute) |
|---|---:|---:|
| Products | 1,204 | 2,543 |
| Final sells | 162 | 3,043 |
| Customers | 86 | 4,814 |

---

## Migrated data (dry-run Jun 23)

| Entity | Count |
|---|---:|
| Items | 1,204 |
| Customers | 86 |
| Sales | 162 |
| Sale lines | 505 |
| Ledger entries | 162 |

Revenue: ₦11,043,950 (`final_total`) — ₦10k payment gap.

---

## Feature gaps (marketplace)

| Legacy | Vonos status | Notes |
|---|---|---|
| Small retail catalog | ETL OK | 162 completed sales — low volume |
| Public invoice/pay links | Web routes exist | Vonos customer portal TBD |
| Gym / Zatca modules | Enabled on VSP code only | No data in export |
| Essentials HR | Enabled, **empty** | No migration needed |
| Returns | No legacy rows | Same stub as VISP |
| Warehouse sync | N/A (own catalog) | Optional future link to VW retail flag |

---

## Frontend / config

- New `vspTenantConfig`: marketplace KPIs (sales count, catalog size, revenue).
- Do not share nav with VISP — separate tenant switcher entries for VAG super-admin.
- `tenant_vsp_001` must receive **only** `vonomglk_spmarket` data.

---

## Recommended next steps

1. Seed `tenant_vsp_001` (new — no legacy import yet in audit phase).
2. Import `vonomglk_spmarket.sql` after sign-off.
3. Validate marketplace-specific flows (if any) against [VISP_VSP_BACKEND_DIFF.md](./VISP_VSP_BACKEND_DIFF.md).
