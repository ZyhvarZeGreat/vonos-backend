import type {
  GroupEntityStat,
  GroupOverviewAlert,
  GroupOverviewDashboard,
} from '@vonos/types';
import { AUTOS_GROUP_CODES } from '@vonos/types';
import { Prisma, type PrismaClient } from '@prisma/client';
import { toNumber } from '../../common/utils/serializers';
import { buildGroupReports } from '../reports/aggregators/groupReports';

type GroupTenant = {
  id: string;
  code: string;
  archetype: string;
};

function compactNgn(amount: number): string {
  if (amount >= 1_000_000) return `₦ ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦ ${Math.round(amount / 1_000)}K`;
  return `₦ ${Math.round(amount)}`;
}

/** Bucket cache keys so relative "now" ranges hit Redis within a few minutes. */
export function groupOverviewCacheWindowKey(
  from?: string,
  to?: string,
): string {
  const bucketMs = 5 * 60 * 1000;
  const floor = (iso: string | undefined, fallback: Date): string => {
    const d = iso ? new Date(iso) : fallback;
    if (Number.isNaN(d.getTime())) return '';
    return new Date(Math.floor(d.getTime() / bucketMs) * bucketMs).toISOString();
  };
  const now = new Date();
  return `${floor(from, now)}:${floor(to, now)}`;
}

async function loadAutosGroupTenants(
  prisma: PrismaClient,
): Promise<GroupTenant[]> {
  return prisma.tenant.findMany({
    where: { code: { in: [...AUTOS_GROUP_CODES] }, deletedAt: null },
    select: { id: true, code: true, archetype: true },
    orderBy: { code: 'asc' },
  });
}

function todayWindow(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function buildGroupEntityStats(
  prisma: PrismaClient,
  tenants?: GroupTenant[],
): Promise<{
  entityStats: GroupEntityStat[];
  lowByTenant: Map<string, number>;
  jobByTenant: Map<string, { active: number; pendingQc: number }>;
}> {
  const groupTenants = tenants ?? (await loadAutosGroupTenants(prisma));
  if (groupTenants.length === 0) {
    return {
      entityStats: [],
      lowByTenant: new Map(),
      jobByTenant: new Map(),
    };
  }

  const { start: todayStart, end: todayEnd } = todayWindow();

  const stockIds = groupTenants
    .filter((t) => t.archetype === 'stock')
    .map((t) => t.id);
  const transactionIds = groupTenants
    .filter((t) => t.archetype === 'transaction')
    .map((t) => t.id);
  const jobIds = groupTenants
    .filter((t) => t.archetype === 'job')
    .map((t) => t.id);
  const appointmentIds = groupTenants
    .filter((t) => t.archetype === 'appointment')
    .map((t) => t.id);

  const itemTenantIds = [
    ...new Set([...stockIds, ...transactionIds, ...jobIds]),
  ];

  const [
    itemStats,
    inboundToday,
    salesToday,
    jobCounts,
    jobRevenue,
    appointmentStats,
  ] = await Promise.all([
    itemTenantIds.length > 0
      ? prisma.$queryRaw<
          Array<{
            tenantId: string;
            sku: bigint;
            stock_value: Prisma.Decimal | null;
            low_stock: bigint;
          }>
        >`
          SELECT
            "tenantId",
            COUNT(*)::bigint AS sku,
            COALESCE(SUM(quantity * "costPrice"), 0) AS stock_value,
            COUNT(*) FILTER (
              WHERE status IN ('low_stock', 'out_of_stock')
            )::bigint AS low_stock
          FROM "Item"
          WHERE "deletedAt" IS NULL
            AND "tenantId" IN (${Prisma.join(itemTenantIds)})
          GROUP BY "tenantId"
        `
      : Promise.resolve([]),
    stockIds.length > 0
      ? prisma.$queryRaw<Array<{ tenantId: string; inbound: bigint }>>`
          SELECT "tenantId", COUNT(*)::bigint AS inbound
          FROM "StockMovement"
          WHERE "deletedAt" IS NULL
            AND type = 'inbound'
            AND date >= ${todayStart}
            AND "tenantId" IN (${Prisma.join(stockIds)})
          GROUP BY "tenantId"
        `
      : Promise.resolve([]),
    transactionIds.length > 0
      ? prisma.$queryRaw<
          Array<{
            tenantId: string;
            revenue: Prisma.Decimal | null;
            returns: bigint;
          }>
        >`
          SELECT
            "tenantId",
            COALESCE(SUM(total), 0) AS revenue,
            COUNT(*) FILTER (
              WHERE status IN ('refunded', 'partially_refunded', 'written_off')
            )::bigint AS returns
          FROM "Sale"
          WHERE "deletedAt" IS NULL
            AND status::text <> 'draft'
            AND date >= ${todayStart}
            AND date <= ${todayEnd}
            AND "tenantId" IN (${Prisma.join(transactionIds)})
          GROUP BY "tenantId"
        `
      : Promise.resolve([]),
    jobIds.length > 0
      ? prisma.$queryRaw<
          Array<{ tenantId: string; active: bigint; pending_qc: bigint }>
        >`
          SELECT
            "tenantId",
            COUNT(*) FILTER (
              WHERE status NOT IN ('Delivered', 'Cancelled')
            )::bigint AS active,
            COUNT(*) FILTER (WHERE status = 'QC')::bigint AS pending_qc
          FROM "Job"
          WHERE "deletedAt" IS NULL
            AND "tenantId" IN (${Prisma.join(jobIds)})
          GROUP BY "tenantId"
        `
      : Promise.resolve([]),
    jobIds.length > 0
      ? prisma.$queryRaw<
          Array<{ tenantId: string; revenue: Prisma.Decimal | null }>
        >`
          SELECT "tenantId", COALESCE(SUM(amount), 0) AS revenue
          FROM "LedgerEntry"
          WHERE "deletedAt" IS NULL
            AND type = 'revenue'
            AND date >= ${todayStart}
            AND date <= ${todayEnd}
            AND "tenantId" IN (${Prisma.join(jobIds)})
          GROUP BY "tenantId"
        `
      : Promise.resolve([]),
    appointmentIds.length > 0
      ? prisma.$queryRaw<
          Array<{
            tenantId: string;
            count: bigint;
            revenue: Prisma.Decimal | null;
          }>
        >`
          SELECT
            "tenantId",
            COUNT(*)::bigint AS count,
            COALESCE(SUM("servicePrice"), 0) AS revenue
          FROM "Appointment"
          WHERE "deletedAt" IS NULL
            AND "startTime" >= ${todayStart}
            AND "startTime" <= ${todayEnd}
            AND "tenantId" IN (${Prisma.join(appointmentIds)})
          GROUP BY "tenantId"
        `
      : Promise.resolve([]),
  ]);

  const itemByTenant = new Map(
    itemStats.map((row) => [
      row.tenantId,
      {
        sku: Number(row.sku),
        stockValue: toNumber(row.stock_value ?? 0),
        lowStock: Number(row.low_stock),
      },
    ]),
  );
  const inboundByTenant = new Map(
    inboundToday.map((row) => [row.tenantId, Number(row.inbound)]),
  );
  const salesByTenant = new Map(
    salesToday.map((row) => [
      row.tenantId,
      {
        revenue: toNumber(row.revenue ?? 0),
        returns: Number(row.returns),
      },
    ]),
  );
  const revenueByJobTenant = new Map(
    jobRevenue.map((row) => [row.tenantId, toNumber(row.revenue ?? 0)]),
  );
  const jobByTenant = new Map(
    jobCounts.map((row) => [
      row.tenantId,
      {
        active: Number(row.active),
        pendingQc: Number(row.pending_qc),
        revenue: revenueByJobTenant.get(row.tenantId) ?? 0,
      },
    ]),
  );
  const apptByTenant = new Map(
    appointmentStats.map((row) => [
      row.tenantId,
      {
        count: Number(row.count),
        revenue: toNumber(row.revenue ?? 0),
      },
    ]),
  );

  const lowByTenant = new Map(
    groupTenants.map((t) => [t.id, itemByTenant.get(t.id)?.lowStock ?? 0]),
  );

  const entityStats: GroupEntityStat[] = groupTenants.map((tenant) => {
    switch (tenant.archetype) {
      case 'stock': {
        const items = itemByTenant.get(tenant.id);
        return {
          code: tenant.code,
          stats: [
            `${(items?.sku ?? 0).toLocaleString()} SKU`,
            `${compactNgn(items?.stockValue ?? 0)} stock`,
            `${inboundByTenant.get(tenant.id) ?? 0} inbound today`,
          ] as [string, string, string],
        };
      }
      case 'transaction': {
        const sales = salesByTenant.get(tenant.id);
        const low = itemByTenant.get(tenant.id)?.lowStock ?? 0;
        return {
          code: tenant.code,
          stats: [
            `${compactNgn(sales?.revenue ?? 0)} sales`,
            `${sales?.returns ?? 0} returns`,
            `${low} low stock`,
          ] as [string, string, string],
        };
      }
      case 'job': {
        const jobs = jobByTenant.get(tenant.id);
        return {
          code: tenant.code,
          stats: [
            `${jobs?.active ?? 0} active jobs`,
            `${jobs?.pendingQc ?? 0} pending QC`,
            `${compactNgn(jobs?.revenue ?? 0)} revenue`,
          ] as [string, string, string],
        };
      }
      case 'appointment': {
        const appts = apptByTenant.get(tenant.id);
        return {
          code: tenant.code,
          stats: [
            `${appts?.count ?? 0} appts today`,
            `${Math.max(0, 8 - (appts?.count ?? 0))} slots open`,
            `${compactNgn(appts?.revenue ?? 0)} revenue`,
          ] as [string, string, string],
        };
      }
      default:
        return {
          code: tenant.code,
          stats: ['—', '—', '—'] as [string, string, string],
        };
    }
  });

  return {
    entityStats,
    lowByTenant,
    jobByTenant: new Map(
      [...jobByTenant.entries()].map(([id, row]) => [
        id,
        { active: row.active, pendingQc: row.pendingQc },
      ]),
    ),
  };
}

async function buildGroupAlerts(
  prisma: PrismaClient,
  tenants: GroupTenant[],
  lowByTenant: Map<string, number>,
  jobByTenant: Map<string, { active: number; pendingQc: number }>,
): Promise<GroupOverviewAlert[]> {
  const byCode = new Map(tenants.map((t) => [t.code, t]));
  const vw = byCode.get('VW');
  const visp = byCode.get('VISP');
  const va = byCode.get('VA');
  const alerts: GroupOverviewAlert[] = [];

  const [retailLow, pendingInbound] = await Promise.all([
    vw && visp
      ? prisma.item.count({
          where: {
            tenantId: vw.id,
            deletedAt: null,
            availableForRetail: true,
            status: { in: ['low_stock', 'out_of_stock'] },
          },
        })
      : Promise.resolve(0),
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

  if (retailLow > 0) {
    alerts.push({
      id: 'vw-low-retail-stock',
      severity: 'warning',
      title: 'Warehouse retail stock low',
      message: `${retailLow} SKU(s) available for retail catalog are low or out of stock.`,
      entityCode: 'VW',
      linkedRoute: '/VW/inventory',
    });
  }

  if (va) {
    const jobs = jobByTenant.get(va.id);
    const openJobs = jobs?.active ?? 0;
    const pendingQc = jobs?.pendingQc ?? 0;

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

const GROUP_CACHE_TTL_S = 300;

export async function buildGroupOverview(
  prisma: PrismaClient,
  from?: string,
  to?: string,
  cache?: import('../../common/cache/cache.service').CacheService,
): Promise<GroupOverviewDashboard> {
  const cacheKey = `group-overview:${groupOverviewCacheWindowKey(from, to)}`;

  if (cache) {
    const cached = await cache.get<GroupOverviewDashboard>(cacheKey);
    if (cached) return cached;
  }

  const tenants = await loadAutosGroupTenants(prisma);

  const [dashboard, statsBundle] = await Promise.all([
    buildGroupReports(prisma, from, to),
    buildGroupEntityStats(prisma, tenants),
  ]);

  const alerts = await buildGroupAlerts(
    prisma,
    tenants,
    statsBundle.lowByTenant,
    statsBundle.jobByTenant,
  );

  const result: GroupOverviewDashboard = {
    ...dashboard,
    entityStats: statsBundle.entityStats,
    alerts,
  };

  if (cache) {
    await cache.set(cacheKey, result, GROUP_CACHE_TTL_S);
  }

  return result;
}
