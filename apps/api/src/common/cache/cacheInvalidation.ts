import { CacheService } from './cache.service';

/** Match overview groupOverviewCacheWindowKey default (no from/to). */
function currentGroupOverviewWindowKey(): string {
  const bucketMs = 5 * 60 * 1000;
  const floor = new Date(
    Math.floor(Date.now() / bucketMs) * bucketMs,
  ).toISOString();
  return `${floor}:${floor}`;
}

/**
 * Bust tenant-scoped dashboard, finance, and report caches after writes.
 *
 * Tenant-scoped keys use `v{version}:…` — bumping the version is enough.
 * Group overview keys are not versioned; delete the current time-bucket keys
 * + clear L1. Avoid Upstash SCAN (`invalidatePrefix`) — REST SCAN on every
 * write was multi-second and contended with other traffic.
 */
export async function invalidateTenantDashboardCache(
  cache: CacheService,
  tenantId: string,
): Promise<void> {
  await cache.bumpTenantVersion(tenantId);
  const window = currentGroupOverviewWindowKey();
  cache.clearL1Matching([
    'group-overview:',
    'report-group:',
    'ledger-group-',
  ]);
  await cache.del(
    `group-overview:${window}`,
    `group-overview:summary:${window}`,
    `group-overview:details:${window}`,
  );
}
