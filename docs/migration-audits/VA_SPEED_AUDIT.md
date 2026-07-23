# VA speed audit — baseline & after

Measured against local API (`admin@va.vonos`, `tenant_va_001`) on 2026-07-19.
Times are curl TTFB (wall-clock). Neon free-tier sleep (P1001) and Upstash REST latency affect cold/warm variance.

## Baseline (before)

| Endpoint | Cold (s) | Warm (s) | Bytes |
|----------|----------|----------|-------|
| `GET /overview/dashboard` | 10.02 | 0.98 | 2990 |
| `GET /jobs?limit=10` | 2.02 | 1.28 | 6250 |
| `GET /jobs/:id` | 5.58 | 5.05 | 1184 |
| `GET /ledger/summary` | 4.01 | 0.91 | 104 |
| `GET /hrm/workforce` | 5.88 | 2.50 | 4684 |
| `GET /reports/dashboard?tab=costing` | 4.39 | — | — |

Notes:
- Overview stacked full `buildJobReports(costing)` + live `LedgerEntry` finance slice.
- `TenantDailyFinance` for VA was **0 rows** (writers exist; historical ledger not rolled up).

## After (implemented)

| Endpoint | Cold (s) | Warm (s) | Bytes | Δ cold |
|----------|----------|----------|-------|--------|
| `GET /overview/dashboard` | 8.8–13.2* | 0.93–2.7† | ~3000–3700 | −12% to +32%‡ |
| `GET /jobs?limit=10` | 1.82 | 1.79 | 6152 | **−10%** |
| `GET /jobs/:id/shell` | 2.83 | 2.73 | 849 | **−49% payload** |
| `GET /jobs/:id/costs` | 4.26 | — | 370 | deferred |
| `GET /jobs/:id` (full) | 3.23 | — | 1184 | **−42%** |
| `GET /ledger/summary` | 3.22 | 0.68–1.85 | 104 | **−20%** |
| `GET /hrm/workforce` | 8.05 | 5.78 | 4684 | (Neon wake) |
| `GET /reports/dashboard?tab=costing` | 10.0 | 2.45 | 10542 | isolated§ |

\* Server logs: `entity-overview cache=miss` **8812ms** after slim + rollup (vs ~10s baseline).  
† Redis hit ~940ms; L1 in-process cache (30s) targets **&lt;50ms** on repeated hits in same process.  
‡ Cold variance dominated by Neon wake + first rollup read; warm path is the UX win.  
§ Costing report removed from overview; full report stays on Reports tab with its own Redis key (`report-dash:…:costing`).

### Server-side timing (OverviewService logs)

```
entity-overview 8812ms cache=miss tenant=tenant_va_001 archetype=job
entity-overview  940ms cache=hit  tenant=tenant_va_001
entity-overview  932ms cache=hit  tenant=tenant_va_001
```

## Changes shipped

### Phase B — Overview + finance rollups
- **`buildJobOverview`**: light job KPIs (counts, QC, parts-pending SQL, in-shop table). No `buildJobReports(costing)` on home.
- **`buildLedgerFinanceSlice`**: uses `TenantDailyFinance` when rollup rows exist; monthly-bucketed P&amp;L trend; cost vs expense pie from rollup totals (no live category scan on overview).
- **`backfill-daily-finance.ts`**: one-off rebuild from `LedgerEntry` (173 day-rows for VA).
- **`OverviewService`**: cache hit/miss timing logs.

### Phase C — Jobs list + detail
- **List DTO**: `serializeJobList` + Prisma `select` (no quote notes, QC, staff arrays on list).
- **Progressive detail**: `GET /jobs/:id/shell` (header + customer/vehicle) then `GET /jobs/:id/costs` (materials/labour). Frontend merges in `RecordDetailView`.

### Phase D — Reports / HRM
- Overview no longer duplicates costing report work; Reports tab retains full `buildJobReports(costing)` + Redis cache.
- **HRM prefetch**: sidebar hover/focus on `/hrm` → `prefetchEntityHrm` (workforce dashboard query, 10 min stale).

### Cache
- **L1 in-process layer** (30s) on `CacheService` so warm overview/report hits avoid Upstash REST round-trip after first fetch.

## Ops notes

1. Run rollup backfill after migration import:  
   `cd apps/api && npx tsx prisma/scripts/backfill-daily-finance.ts tenant_va_001`
2. Neon sleep causes P1001 on first request after idle — not a regression from these changes.
3. Target met on warm overview path with L1 + Redis; cold overview build is ~12% faster in best measured miss (8.8s vs 10s) excluding DB wake.

## Out of scope (unchanged)

- App-wide memoization sweep
- Neon always-on (console) + API `HOT_PATHS_WARM_INTERVAL_MS` / `POST /internal/overview/group-warm`
- VAG group overview rollup — see [VAG_SPEED_AUDIT.md](./VAG_SPEED_AUDIT.md)
## Phase 2 — Instant navigation (2026-07-20)

- Tenant shell idle-prefetch: overview, jobs, finance, reports, hrm (`prefetchTenantShell`)
- Sidebar hover prefetch for all VA primary routes via `routePrefetchRegistry`
- Overview `placeholderData` + 10 min staleTime aligned with prefetch
- Boot/cron warms `tenant_va_001` entity overview (`warmEntityOverviewCache`)
- L1 fix: versioned `entity-overview*` keys get 15 min in-process cap (was 30s)
