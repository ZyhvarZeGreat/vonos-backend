# cPanel Dump — Master Index

Source: `localhost (1).sql` (551.8 MB)

> **Note:** This phpMyAdmin export is a **full cPanel account dump** containing **12 databases**,
> not a single-entity export. Each database below has its own `{ENTITY}_AUDIT.md` report.
> **VW (Vonos Warehouse)** canonical source: [`Vonos warehouse.sql`](../../Vonos%20warehouse.sql) / `vonomglk_audit` / `audit.vonosautos.com` — not `vonomglk_hq2`.
> Other migration targets: **VISP** (`vonomglk_vsp`), **VSP** (`vonomglk_spmarket`), **VM** (`vonomglk_Quotation`), **VMS** (`vonomglk_OPS`). Cafe (`vonomglk_cafe`) is also present.
> Legacy `VSS` code retired — see [VISP_VSP_CUTOVER_NOTES.md](./VISP_VSP_CUTOVER_NOTES.md).
> Legacy HQ warehouse DB: `vonomglk_hq2` → [VW_HQ_AUDIT.md](./VW_HQ_AUDIT.md) (archive only).
>
> **VW warehouse audit:** [VW_LEGACY_ARCHITECTURE.md](./VW_LEGACY_ARCHITECTURE.md), [VW_LEGACY_GAP_ANALYSIS.md](./VW_LEGACY_GAP_ANALYSIS.md), [VAW_VW_CUTOVER_NOTES.md](./VAW_VW_CUTOVER_NOTES.md), [VW_SQL_DELTA.md](./VW_SQL_DELTA.md), [VW_MIGRATION_MAP.md](./VW_MIGRATION_MAP.md).
> **VISP/VSP audit:** [VISP_LEGACY_GAP_ANALYSIS.md](./VISP_LEGACY_GAP_ANALYSIS.md), [VSP_LEGACY_GAP_ANALYSIS.md](./VSP_LEGACY_GAP_ANALYSIS.md), [VISP_VSP_CUTOVER_NOTES.md](./VISP_VSP_CUTOVER_NOTES.md).
> **VC cafe export:** [`cafe.sql`](../../cafe.sql) (9.5 MB, Jun 23 2026) — standalone `vonomglk_cafe` audit: [VC_AUDIT.md](./VC_AUDIT.md), delta: [VC_CAFE_SQL_DELTA.md](./VC_CAFE_SQL_DELTA.md).
> **VC cafe audit & cutover:** [VC_CAFE_SITE_AUDIT.md](./VC_CAFE_SITE_AUDIT.md), [VC_LEGACY_GAP_ANALYSIS.md](./VC_LEGACY_GAP_ANALYSIS.md), [VC_CUTOVER_PLAN.md](./VC_CUTOVER_PLAN.md), [VC_PROD_DEPLOY.md](./VC_PROD_DEPLOY.md), [VC_CUTOVER_T0.log](./VC_CUTOVER_T0.log).

| Standalone export | Entity | Source | Transactions | Products | Audit |
|---|---|---|---:|---:|---|
| `Vonos warehouse.sql` | **VW** | `vonomglk_audit` | 1,379 | 664 | [VW_AUDIT.md](./VW_AUDIT.md) |
| `cafe.sql` | VC | `vonomglk_cafe` | 4,985 | 59 | [VC_AUDIT.md](./VC_AUDIT.md) |

| Database | Entity Code | Business Name | Tables | Populated | Transactions | Products |
|---|---|---|---:|---:|---:|---:|
| `vonomglk_audit` | **VW** | Vonos Audit Warehouse | 70 | 32 | 1,379 | 664 |
| `vonomglk_cafe` | VC | Vonos Cafe | 70 | 37 | 4,812 | 59 |
| `vonomglk_gp` | VAG | VONOS GWARIMPA BRANCH | 90 | 36 | 386 | 883 |
| `vonomglk_hq2` | VW_HQ | Vonos Autos HQ | 97 | 51 | 14,817 | 2,337 |
| `vonomglk_hq3temp` | VW_HQ_TEMP | Vonos Autos HQ | 97 | 50 | 5,680 | 2,979 |
| `vonomglk_OLD_hq2` | VW_HQ_OLD | Vonos Autos HQ | 97 | 51 | 9,829 | 2,261 |
| `vonomglk_OPS` | VMS | Vonos Automotive ltd | 95 | 59 | 9,423 | 1,669 |
| `vonomglk_Quotation` | VM | Vonos Automotive LTD | 95 | 61 | 20,616 | 2,328 |
| `vonomglk_spmarket` | VSP | Vonos Institute Spare Parts | 94 | 38 | 1,381 | 1,204 |
| `vonomglk_vonos_institute` | INSTITUTE | Vonos Automotive Institute | 96 | 48 | 1,367 | 2,697 |
| `vonomglk_vsp` | VISP | Vonos Institute Spare Parts | 94 | 49 | 5,434 | 2,543 |
| `vonomglk_wp847` | WP | — | 129 | 71 | 0 | 0 |
