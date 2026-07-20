# VAG group speed audit — baseline & after

Measured against local API (`admin@vag.vonos`, super_admin — no tenant header) on 2026-07-20.
Times are curl TTFB (wall-clock). Neon free-tier sleep (P1001) and Upstash REST latency affect cold/warm variance.

## Baseline (before — inferred from code)

| Endpoint | Issue |
|----------|--------|
| `GET /overview/group/summary` | `groupRevenueByTenant` scanned all `LedgerEntry` rows per operating tenant |
| `GET /overview/group/details` | `groupRevenueTrendByMonth` + duplicate revenue scan for entity ranking chart |
| `GET /overview/group` | Summary + details in parallel → **two** full revenue passes + entity card SQL |
| `GET /reports/group` | Live `ledgerEntry.aggregate` for purchases/expenses across all tenants |

`TenantDailyFinance` had **0 rows** for most tenants before backfill (VA only had 173 rows from prior audit).

## After rollup pass (first optimization)

| Endpoint | Cold (s) | Warm (s) | Server log (miss) |
|----------|----------|----------|-------------------|
| `GET /overview/group/summary` | 6.75 | 0.37–0.54 | 6239ms |
| `GET /overview/group/details` | 5.97 | 0.27–0.54 | 5493ms |
| `GET /overview/group` | 7.25 | 0.30–0.54 | 6994ms |
| `GET /reports/group` | 5.56 | 0.18–0.30 | rollup purchases/expenses |

## After cold-path pass (snapshots + prefetch + dedupe)

| Endpoint | Cold (s) | Warm (s) | Server log (miss) |
|----------|----------|----------|-------------------|
| `GET /overview/group/summary` | 7.53 | ~0.67 | 6731ms |
| `GET /overview/group/details` | 13.0* | ~0.53 | 12762ms* |
| `GET /overview/group` | **3.25** | ~0.20 | **3088ms** |
| `GET /reports/group` | 5.56 | 0.18–0.30 | unchanged |

\* Details-only cold variance dominated by Neon / sequential KPI→chart path when summary cache empty; UI uses split requests + login prefetch so perceived load is warm.

**Combined route cold miss dropped ~56%** (7.0s → 3.1s server-side) once entity cards read `TenantEntitySnapshot` and alerts reuse the same bundle (no duplicate item/job scans).

Warm hits: **0–1ms** L1 when keys are in-process (group overview L1 now matches 15 min Redis TTL); Redis-only ~200–670ms curl.

### Millisecond path (2026-07-20 follow-up)

True **single-digit ms** server time requires an **L1 hit** — no DB, no Upstash RTT:

| Layer | Typical latency |
|-------|-----------------|
| React Query (prefetch on login) | **0ms** network — instant paint |
| API L1 hit (`group-overview:*`) | **0–5ms** |
| API Redis hit (L1 expired) | **200–500ms** |
| Cold DB rebuild | **3–13s** |

Changes for consistent L1 hits:

- **L1 TTL** for `group-overview:*` keys extended to **15 min** (was capped at 30s → forced Redis on every request after half a minute).
- **Warm bounds** aligned with UI `last_7_days` (cron/startup were warming a different cache key before).
- **Startup bootstrap** — snapshots refresh + cache warm ~3s after API boot.
- **Cron script** — `refresh-entity-snapshots.ts` now refreshes snapshots **and** warms all three group overview cache keys.

## Changes shipped

### Rollup-first group finance
- **`groupRevenueByTenant`** / **`groupRevenueTrendByMonth`**: read `TenantDailyFinance` when rollup rows exist; fall back to live `LedgerEntry` SQL.
- **`resolveGroupFinanceSource`**: single rollup probe per request, passed via `GroupFinanceQueryOptions`.
- **`buildGroupReports`**: purchases/expenses from rollup sums; charts reuse `core.revenueByTenant`.

### TenantEntitySnapshot (entity cards + alerts)
- **`TenantEntitySnapshot`** table + migration `20260720100000_tenant_entity_snapshot`.
- **`refreshTenantEntitySnapshots`** / script `prisma/scripts/refresh-entity-snapshots.ts` — refresh every 5 min via Railway cron.
- **`buildGroupEntityStatsBundle`**: reads snapshot when all tenants fresh (&lt;15 min); else live SQL fallback.
- **`buildGroupAlertsFromBundle`**: VW retail/inbound + per-tenant low stock from snapshot (no extra counts on combined path).

### Combined endpoint dedupe
- **`buildGroupOverview`**: single finance probe, snapshot entity bundle shared with alerts, charts fed precomputed revenue.

### Cache & observability
- **`GROUP_CACHE_TTL_S`**: 300 → **900** (15 min).
- **`OverviewService`**: hit/miss timing logs for all group routes.
- **`POST /internal/overview/group-warm`**: cron cache warm via `X-Group-Warm-Secret` (env `GROUP_WARM_SECRET`).

### Frontend
- **`prefetchGroupOverview`**: on `AdminShell` mount + sidebar hover for `/admin/overview`.
- **`VagGroupOverview`**: `placeholderData`; `staleTime` 10 min.

### Data
- Finance backfill: `npx tsx prisma/scripts/backfill-daily-finance.ts` → **1112 day-rows**.
- Entity snapshots: `npx tsx prisma/scripts/refresh-entity-snapshots.ts` → **4 tenant rows** (VW, VA, VISP, VSP).

## Ops notes

1. After migration import:
   ```bash
   cd apps/api && npx tsx prisma/scripts/backfill-daily-finance.ts
   cd apps/api && npx tsx prisma/scripts/refresh-entity-snapshots.ts
   ```
2. **Railway cron (every 5 min)** — snapshot refresh:
   ```bash
   cd apps/api && npx tsx prisma/scripts/refresh-entity-snapshots.ts
   ```
3. **Optional cache warm** (same schedule or after deploy):
   ```bash
   curl -X POST "$API/internal/overview/group-warm" \
     -H "X-Group-Warm-Secret: $GROUP_WARM_SECRET"
   ```
4. Rollup totals include all non-deleted ledger rows; live group SQL excludes internal transfers — parity gap deferred.
5. Set `GROUP_WARM_SECRET` in Railway for the internal warm route.

## Out of scope (unchanged)

- Period **job count** rollup for KPI strip (`groupJobsByTenant` still live)
- Neon always-on / keep-alive
- Cross-entity transfer elimination in rollup numbers
## Phase 2 — Instant navigation + hot-path warm (2026-07-20)

### Frontend
- `routePrefetchRegistry.ts` — prefetch all VAG admin + tenant nav routes (hover + idle shell warm)
- `AdminShell` / `TenantShell` — idle prefetch of sibling routes after login
- `Sidebar` — every nav item calls `prefetchRoute` on hover/focus
- `placeholderData` on overview, finance, tenant reports — no full skeleton when cache exists
- `PageTransition` — removed pathname remount; 80ms fade; `prefers-reduced-motion` respected
- `NavItem` — explicit Next.js `prefetch`

### Backend
- L1 long-TTL matches versioned keys (`entity-overview`, `ledger:`, `report-dash:`, etc.)
- Redis TTL 900s for entity overview, ledger, reports
- `warmHotPathsCache` — group overview + finance + reports + VA overview on boot/cron
- Group ledger rollup-first (`TenantDailyFinance`) for summary/by-entity/charts
- Stock availability Redis cache (900s) on default admin stock query
- HRM workforce tenant-scoped cache (900s)

### Target UX
- Sidebar click → cached content in **<100ms** after idle prefetch
- Warm API **<300ms**; L1 hits **~ms** after boot/cron warm
