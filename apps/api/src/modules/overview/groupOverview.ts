import type {
  GroupEntityStat,
  GroupOverviewAlert,
  GroupOverviewDashboard,
} from '@vonos/types';
import { AUTOS_GROUP_CODES } from '@vonos/types';
import type { PrismaClient } from '@prisma/client';
import { toNumber } from '../../common/utils/serializers';
import { buildGroupReports } from '../reports/aggregators/groupReports';
import {
  tenantStockValue,
  tenantTodayAppointmentStats,
  tenantTodaySalesRevenue,
} from '../reports/aggregators/groupReportQueries';

function compactNgn(amount: number): string {
  if (amount >= 1_000_000) return `₦ ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦ ${Math.round(amount / 1_000)}K`;
  return `₦ ${Math.round(amount)}`;
}

export async function buildGroupEntityStats(
  prisma: PrismaClient,
): Promise<GroupEntityStat[]> {
  const tenants = await prisma.tenant.findMany({
    where: { code: { in: [...AUTOS_GROUP_CODES] }, deletedAt: null },
    select: { id: true, code: true, archetype: true },
    orderBy: { code: 'asc' },
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const results: GroupEntityStat[] = await Promise.all(
    tenants.map(async (tenant) => {
      switch (tenant.archetype) {
        case 'stock': {
          const [sku, inbound, stockValue] = await Promise.all([
            prisma.item.count({
              where: { tenantId: tenant.id, deletedAt: null },
            }),
            prisma.stockMovement.count({
              where: {
                tenantId: tenant.id,
                deletedAt: null,
                type: 'inbound',
                date: { gte: todayStart },
              },
            }),
            tenantStockValue(prisma, tenant.id),
          ]);
          return {
            code: tenant.code,
            stats: [
              `${sku.toLocaleString()} SKU`,
              `${compactNgn(stockValue)} stock`,
              `${inbound} inbound today`,
            ],
          };
        }
        case 'transaction': {
          const [sales, lowStock] = await Promise.all([
            tenantTodaySalesRevenue(
              prisma,
              tenant.id,
              todayStart,
              todayEnd,
            ),
            prisma.item.count({
              where: {
                tenantId: tenant.id,
                deletedAt: null,
                status: { in: ['low_stock', 'out_of_stock'] },
              },
            }),
          ]);
          return {
            code: tenant.code,
            stats: [
              `${compactNgn(sales.revenue)} sales`,
              `${sales.returns} returns`,
              `${lowStock} low stock`,
            ],
          };
        }
        case 'job': {
          const [active, pendingQc, revenueAgg] = await Promise.all([
            prisma.job.count({
              where: {
                tenantId: tenant.id,
                deletedAt: null,
                status: { notIn: ['Delivered', 'Cancelled'] },
              },
            }),
            prisma.job.count({
              where: { tenantId: tenant.id, deletedAt: null, status: 'QC' },
            }),
            prisma.ledgerEntry.aggregate({
              where: {
                tenantId: tenant.id,
                deletedAt: null,
                type: 'revenue',
              },
              _sum: { amount: true },
            }),
          ]);
          return {
            code: tenant.code,
            stats: [
              `${active} active jobs`,
              `${pendingQc} pending QC`,
              `${compactNgn(toNumber(revenueAgg._sum.amount))} revenue`,
            ],
          };
        }
        case 'appointment': {
          const appts = await tenantTodayAppointmentStats(
            prisma,
            tenant.id,
            todayStart,
            todayEnd,
          );
          return {
            code: tenant.code,
            stats: [
              `${appts.count} appts today`,
              `${Math.max(0, 8 - appts.count)} slots open`,
              `${compactNgn(appts.revenue)} revenue`,
            ],
          };
        }
        default:
          return {
            code: tenant.code,
            stats: ['—', '—', '—'],
          };
      }
    }),
  );
  return results;
}

export async function buildGroupAlerts(
  prisma: PrismaClient,
): Promise<GroupOverviewAlert[]> {
  const alerts: GroupOverviewAlert[] = [];

  const [vw, visp, va] = await Promise.all([
    prisma.tenant.findFirst({ where: { code: 'VW', deletedAt: null } }),
    prisma.tenant.findFirst({ where: { code: 'VISP', deletedAt: null } }),
    prisma.tenant.findFirst({ where: { code: 'VA', deletedAt: null } }),
  ]);

  if (vw && visp) {
    const lowRetail = await prisma.item.count({
      where: {
        tenantId: vw.id,
        deletedAt: null,
        availableForRetail: true,
        status: { in: ['low_stock', 'out_of_stock'] },
      },
    });
    if (lowRetail > 0) {
      alerts.push({
        id: 'vw-low-retail-stock',
        severity: 'warning',
        title: 'Warehouse retail stock low',
        message: `${lowRetail} SKU(s) available for retail catalog are low or out of stock.`,
        entityCode: 'VW',
        linkedRoute: '/VW/inventory',
      });
    }
  }

  if (va) {
    const [openJobs, pendingQc, pendingInbound] = await Promise.all([
      prisma.job.count({
        where: {
          tenantId: va.id,
          deletedAt: null,
          status: { notIn: ['Delivered', 'Cancelled'] },
        },
      }),
      prisma.job.count({
        where: { tenantId: va.id, deletedAt: null, status: 'QC' },
      }),
      vw
        ? prisma.stockMovement.count({
            where: {
              tenantId: vw.id,
              deletedAt: null,
              type: 'inbound',
              status: 'Pending',
            },
          })
        : Promise.resolve(0),
    ]);

    if (openJobs >= 3) {
      alerts.push({
        id: 'va-open-jobs',
        severity: 'info',
        title: 'Automotive workload',
        message: `${openJobs} open jobs — review parts requisitions against Warehouse stock.`,
        entityCode: 'VA',
        linkedRoute: '/VA/jobs',
      });
    }

    if (pendingQc > 0) {
      alerts.push({
        id: 'va-pending-qc',
        severity: 'info',
        title: 'Automotive QC queue',
        message: `${pendingQc} job(s) awaiting quality check.`,
        entityCode: 'VA',
        linkedRoute: '/VA/jobs',
      });
    }

    if (pendingInbound > 0) {
      alerts.push({
        id: 'vw-pending-inbound',
        severity: 'warning',
        title: 'Pending warehouse purchases',
        message: `${pendingInbound} inbound movement(s) awaiting receipt at Warehouse.`,
        entityCode: 'VW',
        linkedRoute: '/VW/inbound',
      });
    }
  }

  return alerts;
}

/** Low-stock alert per auto-group entity that has items below reorder point. */
async function buildLowStockAlerts(
  prisma: PrismaClient,
): Promise<GroupOverviewAlert[]> {
  const tenants = await prisma.tenant.findMany({
    where: { code: { in: [...AUTOS_GROUP_CODES] }, deletedAt: null },
    select: { id: true, code: true },
  });
  if (tenants.length === 0) return [];

  // Single grouped query instead of one count per tenant — avoids N sequential
  // round trips to the (remote) database.
  const grouped = await prisma.item.groupBy({
    by: ['tenantId'],
    where: {
      tenantId: { in: tenants.map((t) => t.id) },
      deletedAt: null,
      status: { in: ['low_stock', 'out_of_stock'] },
    },
    _count: { _all: true },
  });
  const lowByTenant = new Map(
    grouped.map((row) => [row.tenantId, row._count._all]),
  );

  const alerts: GroupOverviewAlert[] = [];
  for (const tenant of tenants) {
    const lowStock = lowByTenant.get(tenant.id) ?? 0;
    if (lowStock > 0) {
      alerts.push({
        id: `low-stock-${tenant.code}`,
        severity: 'warning',
        title: `${tenant.code} low stock`,
        message: `${lowStock} SKU(s) at or below reorder point.`,
        entityCode: tenant.code,
        linkedRoute: `/${tenant.code}/inventory`,
      });
    }
  }
  return alerts;
}

const GROUP_CACHE_TTL_S = 45;

export async function buildGroupOverview(
  prisma: PrismaClient,
  from?: string,
  to?: string,
  cache?: import('../../common/cache/cache.service').CacheService,
): Promise<GroupOverviewDashboard> {
  const cacheKey = `group-overview:${from ?? ''}:${to ?? ''}`;

  if (cache) {
    const cached = await cache.get<GroupOverviewDashboard>(cacheKey);
    if (cached) return cached;
  }

  // Run sequentially to avoid connection pool stampede on Neon.
  // Each function still uses internal Promise.all but the peak concurrent
  // connection count stays within the pool limit (~17).
  const dashboard = await buildGroupReports(prisma, from, to);
  const entityStats = await buildGroupEntityStats(prisma);
  const alerts = await buildGroupAlerts(prisma);
  const lowStockAlerts = await buildLowStockAlerts(prisma);

  const result: GroupOverviewDashboard = {
    ...dashboard,
    entityStats,
    alerts: [...alerts, ...lowStockAlerts],
  };

  if (cache) {
    await cache.set(cacheKey, result, GROUP_CACHE_TTL_S);
  }

  return result;
}
