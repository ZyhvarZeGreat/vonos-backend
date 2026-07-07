import type { ReportsDashboard } from '@vonos/types';
import { AUTOS_GROUP_CODES } from '@vonos/types';
import type { PrismaClient } from '@prisma/client';
import { toNumber } from '../../../common/utils/serializers';
import { resolveDateWindow } from './date-utils';
import {
  groupJobsByTenant,
  groupRevenueByTenant,
  groupRevenueTrendByMonth,
} from './groupReportQueries';

const ENTITY_COLORS: Record<string, string> = {
  VW: '#059669',
  VKW: '#ec4899',
  VISP: '#14b8a6',
  VSP: '#0d9488',
  VC: '#f59e0b',
  VM: '#D97706',
  VMS: '#B45309',
  VS: '#e11d48',
};

export async function buildGroupReports(
  prisma: PrismaClient,
  from?: string,
  to?: string,
): Promise<ReportsDashboard> {
  const window = resolveDateWindow(from, to);

  const tenants = await prisma.tenant.findMany({
    where: { code: { in: [...AUTOS_GROUP_CODES] }, deletedAt: null },
    select: { id: true, code: true, name: true },
  });

  const tenantById = new Map(tenants.map((t) => [t.id, t]));
  const tenantIds = tenants.map((t) => t.id);

  const [
    revenueRows,
    jobRows,
    trendRows,
    purchasesAgg,
    expensesAgg,
    movementCount,
    lowStockCount,
  ] = await Promise.all([
    groupRevenueByTenant(prisma, tenantIds, window.from, window.to),
    groupJobsByTenant(prisma, tenantIds, window.from, window.to),
    groupRevenueTrendByMonth(prisma, tenantIds, window.from, window.to),
    prisma.ledgerEntry.aggregate({
      where: {
        tenantId: { in: tenantIds },
        deletedAt: null,
        type: 'cost',
        date: { gte: window.from, lte: window.to },
      },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: {
        tenantId: { in: tenantIds },
        deletedAt: null,
        type: 'expense',
        date: { gte: window.from, lte: window.to },
      },
      _sum: { amount: true },
    }),
    prisma.stockMovement.count({
      where: {
        tenantId: { in: tenantIds },
        deletedAt: null,
        date: { gte: window.from, lte: window.to },
      },
    }),
    prisma.item.count({
      where: {
        tenantId: { in: tenantIds },
        deletedAt: null,
        status: { in: ['low_stock', 'out_of_stock'] },
      },
    }),
  ]);

  const totalPurchases = toNumber(purchasesAgg._sum.amount);
  const totalExpenses = toNumber(expensesAgg._sum.amount);

  const revenueByTenant = new Map(
    revenueRows.map((row) => [row.tenantId, row.revenue]),
  );
  const jobsByTenant = new Map(jobRows.map((row) => [row.tenantId, row.jobs]));

  const groupRevenue = revenueRows.reduce((sum, row) => sum + row.revenue, 0);
  const totalJobs = jobRows.reduce((sum, row) => sum + row.jobs, 0);

  const monthSeries = new Map<
    string,
    { label: string } & Record<string, number | string>
  >();
  for (const row of trendRows) {
    const tenant = tenantById.get(row.tenantId);
    if (!tenant) continue;
    const existing = monthSeries.get(row.monthKey) ?? { label: row.label };
    existing[tenant.code] =
      Number(existing[tenant.code] ?? 0) + row.revenue;
    monthSeries.set(row.monthKey, existing);
  }

  const trendData = Array.from(monthSeries.values()).sort((a, b) =>
    String(a.label).localeCompare(String(b.label)),
  );

  const entitySeries = tenants.map((t) => ({
    name: t.code,
    dataKey: t.code,
    color: ENTITY_COLORS[t.code] ?? '#64748b',
  }));

  const rankingData = tenants
    .map((t) => ({
      label: t.code,
      value: Math.round((revenueByTenant.get(t.id) ?? 0) / 1000),
      color: ENTITY_COLORS[t.code] ?? '#64748b',
    }))
    .sort((a, b) => b.value - a.value);

  const entityTableRows = tenants
    .map((t) => ({
      id: t.code,
      tenantCode: t.code,
      tenantName: t.name,
      revenue: Math.round(revenueByTenant.get(t.id) ?? 0),
      jobs: jobsByTenant.get(t.id) ?? 0,
      currency: 'NGN',
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    kpis: [
      {
        label: 'Group Revenue',
        icon: 'wallet',
        metricKey: 'revenue',
        color: '#059669',
        value: groupRevenue,
        currency: 'NGN',
      },
      {
        label: 'Total Jobs',
        icon: 'wrench',
        metricKey: 'jobs',
        color: '#2563eb',
        value: totalJobs,
      },
      {
        label: 'Active Entities',
        icon: 'package',
        metricKey: 'entities',
        color: '#9333ea',
        value: tenants.length,
      },
      {
        label: 'Outstanding',
        icon: 'clock',
        metricKey: 'outstanding',
        color: '#e11d48',
        value: 0,
      },
      {
        label: 'Total Purchases',
        icon: 'shopping-cart',
        metricKey: 'purchases',
        color: '#0d9488',
        value: totalPurchases,
        currency: 'NGN',
      },
      {
        label: 'Total Expenses',
        icon: 'receipt',
        metricKey: 'expenses',
        color: '#e11d48',
        value: totalExpenses,
        currency: 'NGN',
      },
      {
        label: 'Stock Movements',
        icon: 'truck',
        metricKey: 'movements',
        color: '#2563eb',
        value: movementCount,
      },
      {
        label: 'Low / Out of Stock',
        icon: 'alert-triangle',
        metricKey: 'lowStock',
        color: '#f59e0b',
        value: lowStockCount,
      },
    ],
    charts: [
      {
        id: 'group-revenue-trend',
        title: 'Group Revenue Trend',
        subtitle:
          'One line per entity — transfer elimination between entities is deferred',
        type: 'line',
        series: entitySeries,
        data: trendData.length > 0 ? trendData : [{ label: '—', VW: 0 }],
      },
      {
        id: 'entity-comparison',
        title: 'Entity Comparison',
        subtitle: 'Revenue ranking for period (₦ thousands)',
        type: 'bar',
        horizontal: true,
        series: [{ name: 'Revenue', dataKey: 'value', color: '#059669' }],
        data: rankingData,
      },
    ],
    table: {
      columns: [
        { key: 'tenantCode', header: 'Entity' },
        { key: 'tenantName', header: 'Department' },
        { key: 'revenue', header: 'Revenue' },
        { key: 'jobs', header: 'Jobs' },
      ],
      rows: entityTableRows,
    },
  };
}
