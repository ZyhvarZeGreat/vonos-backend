import { Prisma } from '@prisma/client';
import type { TenantScopedPrisma } from '../../../common/prisma/prisma.service';
import { toNumber } from '../../../common/utils/serializers';
import { bucketLabel, type DateWindow } from './date-utils';
import type { AggregatedProductSale } from './productSales';

export interface SalesKpiSnapshot {
  transactionCount: number;
  revenue: number;
  refundedCount: number;
  currency: string;
}

export interface SalesTrendRow {
  label: string;
  revenue: number;
}

export interface PaymentStatusRow {
  label: string;
  value: number;
}

export interface HourlyOrderRow {
  label: string;
  orders: number;
}

const saleBaseWhere = (tenantId: string, from: Date, to: Date) => ({
  tenantId,
  deletedAt: null,
  status: { not: 'draft' as const },
  date: { gte: from, lte: to },
});

export async function salesCurrency(
  db: TenantScopedPrisma,
  tenantId: string,
): Promise<string> {
  const row = await db.sale.findFirst({
    where: { tenantId, deletedAt: null },
    select: { currency: true },
    orderBy: { id: 'asc' },
  });
  return row?.currency ?? 'NGN';
}

export async function salesKpiSnapshot(
  db: TenantScopedPrisma,
  tenantId: string,
  from: Date,
  to: Date,
): Promise<SalesKpiSnapshot> {
  const [agg, refundedCount, currency] = await Promise.all([
    db.sale.aggregate({
      where: saleBaseWhere(tenantId, from, to),
      _count: { _all: true },
      _sum: { total: true },
    }),
    db.sale.count({
      where: {
        ...saleBaseWhere(tenantId, from, to),
        status: { in: ['refunded', 'partially_refunded'] },
      },
    }),
    salesCurrency(db, tenantId),
  ]);

  return {
    transactionCount: agg._count._all,
    revenue: toNumber(agg._sum.total ?? 0),
    refundedCount,
    currency,
  };
}

function dateTruncUnit(spanDays: number): 'hour' | 'day' | 'month' {
  if (spanDays <= 2) return 'hour';
  if (spanDays <= 60) return 'day';
  return 'month';
}

export async function salesRevenueTrend(
  db: TenantScopedPrisma,
  tenantId: string,
  window: DateWindow,
): Promise<SalesTrendRow[]> {
  const spanDays =
    (window.to.getTime() - window.from.getTime()) / (24 * 60 * 60 * 1000);
  const unit = dateTruncUnit(spanDays);

  const rows = await db.$queryRaw<
    Array<{ bucket: Date; revenue: Prisma.Decimal | null }>
  >`
    SELECT date_trunc(${unit}, date) AS bucket, COALESCE(SUM(total), 0) AS revenue
    FROM "Sale"
    WHERE "tenantId" = ${tenantId}
      AND "deletedAt" IS NULL
      AND status::text <> 'draft'
      AND date >= ${window.from}
      AND date <= ${window.to}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  return rows.map((row) => ({
    label: bucketLabel(row.bucket, spanDays),
    revenue: Math.round(toNumber(row.revenue ?? 0)),
  }));
}

export async function topProductsInWindow(
  db: TenantScopedPrisma,
  tenantId: string,
  from: Date,
  to: Date,
  limit = 12,
): Promise<AggregatedProductSale[]> {
  const rows = await db.$queryRaw<
    Array<{
      sku: string;
      label: string;
      itemId: string | null;
      units: Prisma.Decimal | null;
      revenue: Prisma.Decimal | null;
    }>
  >`
    SELECT
      MAX(COALESCE(NULLIF(TRIM(sl.sku), ''), sl.name)) AS sku,
      MAX(sl.name) AS label,
      MAX(sl."itemId") AS "itemId",
      COALESCE(SUM(sl.quantity), 0) AS units,
      COALESCE(SUM(sl."lineTotal"), 0) AS revenue
    FROM "SaleLine" sl
    INNER JOIN "Sale" s ON s.id = sl."saleId"
    WHERE s."tenantId" = ${tenantId}
      AND s."deletedAt" IS NULL
      AND s.status::text <> 'draft'
      AND s.date >= ${from}
      AND s.date <= ${to}
    GROUP BY LOWER(COALESCE(NULLIF(TRIM(sl.sku), ''), sl.name))
    ORDER BY units DESC, revenue DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    label: row.label,
    sku: row.sku,
    units: toNumber(row.units ?? 0),
    revenue: toNumber(row.revenue ?? 0),
    itemId: row.itemId,
  }));
}

export async function paymentStatusBreakdown(
  db: TenantScopedPrisma,
  tenantId: string,
  from: Date,
  to: Date,
): Promise<PaymentStatusRow[]> {
  const rows = await db.$queryRaw<
    Array<{ label: string; value: bigint }>
  >`
    SELECT COALESCE("paymentStatus"::text, 'unknown') AS label, COUNT(*)::bigint AS value
    FROM "Sale"
    WHERE "tenantId" = ${tenantId}
      AND "deletedAt" IS NULL
      AND status::text <> 'draft'
      AND date >= ${from}
      AND date <= ${to}
    GROUP BY label
    ORDER BY value DESC
  `;

  return rows.map((row) => ({
    label: row.label,
    value: Number(row.value),
  }));
}

export async function salesOrderTrend(
  db: TenantScopedPrisma,
  tenantId: string,
  window: DateWindow,
): Promise<Array<{ label: string; orders: number }>> {
  const spanDays =
    (window.to.getTime() - window.from.getTime()) / (24 * 60 * 60 * 1000);
  const unit = dateTruncUnit(spanDays);

  const rows = await db.$queryRaw<Array<{ bucket: Date; orders: bigint }>>`
    SELECT date_trunc(${unit}, date) AS bucket, COUNT(*)::bigint AS orders
    FROM "Sale"
    WHERE "tenantId" = ${tenantId}
      AND "deletedAt" IS NULL
      AND status::text <> 'draft'
      AND date >= ${window.from}
      AND date <= ${window.to}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  return rows.map((row) => ({
    label: bucketLabel(row.bucket, spanDays),
    orders: Number(row.orders),
  }));
}

export async function hourlyOrderCounts(
  db: TenantScopedPrisma,
  tenantId: string,
  from: Date,
  to: Date,
): Promise<HourlyOrderRow[]> {
  const rows = await db.$queryRaw<Array<{ hour: number; orders: bigint }>>`
    SELECT EXTRACT(HOUR FROM date)::int AS hour, COUNT(*)::bigint AS orders
    FROM "Sale"
    WHERE "tenantId" = ${tenantId}
      AND "deletedAt" IS NULL
      AND status::text <> 'draft'
      AND date >= ${from}
      AND date <= ${to}
    GROUP BY hour
    ORDER BY hour ASC
  `;

  return rows.map((row) => ({
    label: `${row.hour}:00`,
    orders: Number(row.orders),
  }));
}
