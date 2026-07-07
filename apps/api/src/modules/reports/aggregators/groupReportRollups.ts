import type { ReportRegistryEntry } from '@vonos/types';
import type { PrismaClient } from '@prisma/client';
import { ledgerDateFilter } from '../../../common/utils/ledgerAggregates';
import { toNumber } from '../../../common/utils/serializers';
import { resolveDateWindow } from './date-utils';
import { tenantStockValue } from './groupReportQueries';

export interface GroupEntityRollupRow {
  code: string;
  rows: Record<string, string | number>[];
}

export async function buildEntityRollupForReport(
  prisma: PrismaClient,
  entry: ReportRegistryEntry,
  tenants: Array<{ id: string; code: string; archetype: string }>,
  from?: string,
  to?: string,
): Promise<GroupEntityRollupRow[]> {
  const window = resolveDateWindow(from, to);
  const dateFilter = ledgerDateFilter(from, to);
  const source = entry.source;

  switch (source.kind) {
    case 'ledger': {
      const rows: GroupEntityRollupRow[] = [];
      for (const tenant of tenants) {
        const groups = await prisma.ledgerEntry.groupBy({
          by: ['type'],
          where: { tenantId: tenant.id, deletedAt: null, ...dateFilter },
          _sum: { amount: true },
        });
        const revenue = groups
          .filter((g) => g.type === 'revenue')
          .reduce((s, g) => s + toNumber(g._sum.amount ?? 0), 0);
        const costs = groups
          .filter((g) => g.type !== 'revenue')
          .reduce((s, g) => s + toNumber(g._sum.amount ?? 0), 0);
        rows.push({
          code: tenant.code,
          rows: [{ revenue, costs, net: revenue - costs }],
        });
      }
      return rows;
    }
    case 'stock': {
      const rows: GroupEntityRollupRow[] = [];
      for (const tenant of tenants) {
        const [stockValue, lowStock, skuCount] = await Promise.all([
          tenantStockValue(prisma, tenant.id),
          prisma.item.count({
            where: {
              tenantId: tenant.id,
              deletedAt: null,
              status: { in: ['low_stock', 'out_of_stock'] },
            },
          }),
          prisma.item.count({
            where: { tenantId: tenant.id, deletedAt: null },
          }),
        ]);
        rows.push({
          code: tenant.code,
          rows: [
            {
              stockValue: Math.round(stockValue),
              lowStock,
              skuCount,
            },
          ],
        });
      }
      return rows;
    }
    case 'product':
    case 'sales': {
      const rows: GroupEntityRollupRow[] = [];
      for (const tenant of tenants) {
        const [salesAgg, jobAgg] = await Promise.all([
          prisma.sale.aggregate({
            where: {
              tenantId: tenant.id,
              deletedAt: null,
              status: { not: 'draft' },
              date: { gte: window.from, lte: window.to },
            },
            _sum: { total: true },
            _count: { _all: true },
          }),
          prisma.job.aggregate({
            where: {
              tenantId: tenant.id,
              deletedAt: null,
              status: 'Delivered',
              updatedAt: { gte: window.from, lte: window.to },
            },
            _sum: { invoiceAmount: true, quoteAmount: true },
            _count: { _all: true },
          }),
        ]);
        const salesRevenue = toNumber(salesAgg._sum.total ?? 0);
        const jobRevenue = Math.max(
          toNumber(jobAgg._sum.invoiceAmount ?? 0),
          toNumber(jobAgg._sum.quoteAmount ?? 0),
        );
        rows.push({
          code: tenant.code,
          rows: [
            {
              salesRevenue: Math.round(salesRevenue),
              jobRevenue: Math.round(jobRevenue),
              transactions: salesAgg._count._all,
              jobs: jobAgg._count._all,
            },
          ],
        });
      }
      return rows;
    }
    case 'payments': {
      const rows: GroupEntityRollupRow[] = [];
      for (const tenant of tenants) {
        const agg = await prisma.payment.aggregate({
          where: {
            tenantId: tenant.id,
            deletedAt: null,
            paidOn: { gte: window.from, lte: window.to },
          },
          _sum: { amount: true },
          _count: { _all: true },
        });
        rows.push({
          code: tenant.code,
          rows: [
            {
              payments: agg._count._all,
              amount: Math.round(toNumber(agg._sum.amount ?? 0)),
            },
          ],
        });
      }
      return rows;
    }
    case 'contacts': {
      const rows: GroupEntityRollupRow[] = [];
      for (const tenant of tenants) {
        const [customers, suppliers] = await Promise.all([
          prisma.customer.count({
            where: { tenantId: tenant.id, deletedAt: null },
          }),
          prisma.supplier.count({
            where: { tenantId: tenant.id, deletedAt: null },
          }),
        ]);
        rows.push({
          code: tenant.code,
          rows: [{ customers, suppliers }],
        });
      }
      return rows;
    }
  }

  return [];
}
