import type { PrismaClient } from '@prisma/client';
import type { OverviewDashboard } from '@vonos/types';
import type { CacheService } from '../cache/cache.service';
import { defaultVagOverviewApiBounds } from '../../modules/reports/aggregators/date-utils';
import {
  groupOverviewCacheWindowKey,
  warmGroupOverviewCache,
} from '../../modules/overview/groupOverview';
import {
  buildAppointmentOverview,
  buildJobOverview,
  buildStockOverview,
  buildTransactionOverview,
} from '../../modules/overview/overviewAggregators';
import {
  buildGroupLedgerByEntity,
  buildGroupLedgerSummary,
} from '../../modules/ledger/groupLedger';
import { buildGroupLedgerCharts } from '../../modules/ledger/ledgerCharts';
import { buildGroupReports } from '../../modules/reports/aggregators/groupReports';
import { AUTOS_GROUP_CODES } from '@vonos/types';
import type { TenantScopedPrisma } from '../prisma/prisma.service';

const WARM_CACHE_TTL_S = 900;

function warmBounds(from?: string, to?: string): { from: string; to: string } {
  const defaults = defaultVagOverviewApiBounds();
  return { from: from ?? defaults.from, to: to ?? defaults.to };
}

export async function warmGroupFinanceCache(
  prisma: PrismaClient,
  cache: CacheService,
  from?: string,
  to?: string,
): Promise<void> {
  const { from: warmFrom, to: warmTo } = warmBounds(from, to);
  const tenants = await prisma.tenant.findMany({
    where: { code: { in: [...AUTOS_GROUP_CODES] }, deletedAt: null },
    select: { id: true },
  });
  const tenantIds = tenants.map((t) => t.id);

  const summaryKey = `ledger-group-summary:${warmFrom}:${warmTo}`;
  const chartsKey = `ledger-group-charts:${warmFrom}:${warmTo}`;
  const byEntityKey = `ledger-group-by-entity:${warmFrom}:${warmTo}`;

  const [summary, charts, byEntity] = await Promise.all([
    buildGroupLedgerSummary(prisma, warmFrom, warmTo),
    buildGroupLedgerCharts(prisma, tenantIds, warmFrom, warmTo),
    buildGroupLedgerByEntity(prisma, warmFrom, warmTo),
  ]);

  await Promise.all([
    cache.set(summaryKey, summary, WARM_CACHE_TTL_S),
    cache.set(chartsKey, charts, WARM_CACHE_TTL_S),
    cache.set(byEntityKey, byEntity, WARM_CACHE_TTL_S),
  ]);
}

export async function warmGroupReportsCache(
  prisma: PrismaClient,
  cache: CacheService,
  from?: string,
  to?: string,
): Promise<void> {
  const { from: warmFrom, to: warmTo } = warmBounds(from, to);
  const cacheKey = `report-group:${warmFrom}:${warmTo}`;
  const result = await buildGroupReports(prisma, warmFrom, warmTo);
  await cache.set(cacheKey, result, WARM_CACHE_TTL_S);
}

export async function warmEntityOverviewCache(
  prisma: PrismaClient,
  cache: CacheService,
  tenantId: string,
  from?: string,
  to?: string,
): Promise<void> {
  const { from: warmFrom, to: warmTo } = warmBounds(from, to);
  const cacheKey = await cache.tenantScopedKey(
    tenantId,
    `entity-overview:${tenantId}:${groupOverviewCacheWindowKey(warmFrom, warmTo)}`,
  );
  const cached = await cache.get<OverviewDashboard>(cacheKey);
  if (cached) return;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { archetype: true, code: true },
  });
  if (!tenant) return;

  const db = prisma as unknown as TenantScopedPrisma;
  let result: OverviewDashboard;
  switch (tenant.archetype) {
    case 'stock':
      result = await buildStockOverview(
        db,
        tenantId,
        tenant.code,
        warmFrom,
        warmTo,
      );
      break;
    case 'transaction':
      result = await buildTransactionOverview(
        db,
        tenantId,
        tenant.code,
        warmFrom,
        warmTo,
      );
      break;
    case 'job':
      result = await buildJobOverview(
        db,
        tenantId,
        tenant.code,
        warmFrom,
        warmTo,
      );
      break;
    case 'appointment':
      result = await buildAppointmentOverview(db, tenantId, warmFrom, warmTo);
      break;
    default: {
      const _exhaustive: never = tenant.archetype as never;
      return _exhaustive;
    }
  }

  await cache.set(cacheKey, result, WARM_CACHE_TTL_S);
}

/** Boot/cron warm for VAG admin + VA primary surfaces. */
export async function warmHotPathsCache(
  prisma: PrismaClient,
  cache: CacheService,
  from?: string,
  to?: string,
): Promise<void> {
  await warmGroupOverviewCache(prisma, cache, from, to);
  await warmGroupFinanceCache(prisma, cache, from, to);
  await warmGroupReportsCache(prisma, cache, from, to);
  await warmEntityOverviewCache(prisma, cache, 'tenant_va_001', from, to);
}

export { warmGroupOverviewCache };
