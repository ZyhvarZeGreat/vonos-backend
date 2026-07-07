import { Prisma } from '@prisma/client';
import type { StockStatus } from '@vonos/types';
import type { TenantScopedPrisma } from '../../../common/prisma/prisma.service';
import { toNumber } from '../../../common/utils/serializers';
import { bucketLabel, type DateWindow } from './date-utils';

const lowStockStatuses: StockStatus[] = ['low_stock', 'out_of_stock'];

export interface StockItemRow {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  quantity: number;
  reorderPoint: number | null;
  costPrice: number;
  status: string;
  currency: string;
}

export interface StockMetrics {
  stockValue: number;
  totalSku: number;
  totalUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  todayInbound: number;
  todayOutbound: number;
  movementCount: number;
  priorMovementCount: number;
  velocity: number;
  priorVelocity: number;
  currency: string;
}

export interface CategoryValueRow {
  label: string;
  value: number;
}

export interface MovementTrendRow {
  label: string;
  inbound: number;
  outbound: number;
}

export async function stockMetrics(
  db: TenantScopedPrisma,
  tenantId: string,
  window: DateWindow,
  prior: DateWindow,
  todayStart: Date,
  todayEnd: Date,
): Promise<StockMetrics> {
  const itemWhere = { tenantId, deletedAt: null };

  const [
    stockValueRow,
    totalSku,
    quantitySum,
    lowStockCount,
    outOfStockCount,
    currencyRow,
    todayInbound,
    todayOutbound,
    movementCount,
    priorMovementCount,
  ] = await Promise.all([
    db.$queryRaw<[{ stock_value: Prisma.Decimal | null }]>`
      SELECT COALESCE(SUM(quantity * "costPrice"), 0) AS stock_value
      FROM "Item"
      WHERE "tenantId" = ${tenantId} AND "deletedAt" IS NULL
    `,
    db.item.count({ where: itemWhere }),
    db.item.aggregate({ where: itemWhere, _sum: { quantity: true } }),
    db.item.count({
      where: { ...itemWhere, status: { in: lowStockStatuses } },
    }),
    db.item.count({ where: { ...itemWhere, status: 'out_of_stock' } }),
    db.item.findFirst({
      where: itemWhere,
      select: { currency: true },
      orderBy: { id: 'asc' },
    }),
    db.stockMovement.count({
      where: {
        tenantId,
        deletedAt: null,
        type: 'inbound',
        date: { gte: todayStart, lte: todayEnd },
      },
    }),
    db.stockMovement.count({
      where: {
        tenantId,
        deletedAt: null,
        type: 'outbound',
        date: { gte: todayStart, lte: todayEnd },
      },
    }),
    db.stockMovement.count({
      where: {
        tenantId,
        deletedAt: null,
        date: { gte: window.from, lte: window.to },
      },
    }),
    db.stockMovement.count({
      where: {
        tenantId,
        deletedAt: null,
        date: { gte: prior.from, lte: prior.to },
      },
    }),
  ]);

  const totalUnits = quantitySum._sum.quantity ?? 0;
  const velocity =
    totalSku > 0 ? Number((movementCount / totalSku).toFixed(2)) : 0;
  const priorVelocity =
    totalSku > 0 ? Number((priorMovementCount / totalSku).toFixed(2)) : 0;

  return {
    stockValue: toNumber(stockValueRow[0]?.stock_value ?? 0),
    totalSku,
    totalUnits,
    lowStockCount,
    outOfStockCount,
    todayInbound,
    todayOutbound,
    movementCount,
    priorMovementCount,
    velocity,
    priorVelocity,
    currency: currencyRow?.currency ?? 'NGN',
  };
}

export async function stockValueByCategory(
  db: TenantScopedPrisma,
  tenantId: string,
  limit = 12,
): Promise<CategoryValueRow[]> {
  const rows = await db.$queryRaw<
    Array<{ label: string; value: Prisma.Decimal | null }>
  >`
    SELECT COALESCE(category, 'Uncategorized') AS label,
      COALESCE(SUM(quantity * "costPrice"), 0) AS value
    FROM "Item"
    WHERE "tenantId" = ${tenantId} AND "deletedAt" IS NULL
    GROUP BY COALESCE(category, 'Uncategorized')
    ORDER BY value DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    label: row.label,
    value: Math.round(toNumber(row.value ?? 0)),
  }));
}

export async function stockMovementTrend(
  db: TenantScopedPrisma,
  tenantId: string,
  window: DateWindow,
): Promise<MovementTrendRow[]> {
  const spanDays =
    (window.to.getTime() - window.from.getTime()) / (24 * 60 * 60 * 1000);
  const unit = spanDays <= 2 ? 'hour' : spanDays <= 60 ? 'day' : 'month';

  const rows = await db.$queryRaw<
    Array<{ bucket: Date; type: string; count: bigint }>
  >`
    SELECT date_trunc(${unit}, date) AS bucket, type, COUNT(*)::bigint AS count
    FROM "StockMovement"
    WHERE "tenantId" = ${tenantId}
      AND "deletedAt" IS NULL
      AND date >= ${window.from}
      AND date <= ${window.to}
      AND type IN ('inbound', 'outbound')
    GROUP BY bucket, type
    ORDER BY bucket ASC
  `;

  const inboundMap = new Map<string, number>();
  const outboundMap = new Map<string, number>();
  const labels = new Set<string>();

  for (const row of rows) {
    const label = bucketLabel(row.bucket, spanDays);
    labels.add(label);
    const count = Number(row.count);
    if (row.type === 'inbound') {
      inboundMap.set(label, (inboundMap.get(label) ?? 0) + count);
    } else {
      outboundMap.set(label, (outboundMap.get(label) ?? 0) + count);
    }
  }

  return Array.from(labels)
    .sort()
    .map((label) => ({
      label,
      inbound: inboundMap.get(label) ?? 0,
      outbound: outboundMap.get(label) ?? 0,
    }));
}

export async function lowStockByCategory(
  db: TenantScopedPrisma,
  tenantId: string,
): Promise<CategoryValueRow[]> {
  const rows = await db.$queryRaw<Array<{ label: string; value: bigint }>>`
    SELECT COALESCE(category, 'Uncategorized') AS label, COUNT(*)::bigint AS value
    FROM "Item"
    WHERE "tenantId" = ${tenantId}
      AND "deletedAt" IS NULL
      AND (
        status IN ('low_stock', 'out_of_stock')
        OR ("reorderPoint" IS NOT NULL AND quantity <= "reorderPoint")
      )
    GROUP BY COALESCE(category, 'Uncategorized')
    ORDER BY value DESC
  `;

  return rows.map((row) => ({
    label: row.label,
    value: Number(row.value),
  }));
}

export async function lowStockItems(
  db: TenantScopedPrisma,
  tenantId: string,
  limit = 50,
): Promise<StockItemRow[]> {
  const sqlRows = await db.$queryRaw<
    Array<{
      id: string;
      sku: string;
      name: string;
      category: string | null;
      quantity: number;
      reorderPoint: number | null;
      costPrice: Prisma.Decimal;
      status: string;
      currency: string;
    }>
  >`
    SELECT id, sku, name, category, quantity, "reorderPoint", "costPrice", status::text, currency
    FROM "Item"
    WHERE "tenantId" = ${tenantId}
      AND "deletedAt" IS NULL
      AND (
        status IN ('low_stock', 'out_of_stock')
        OR ("reorderPoint" IS NOT NULL AND quantity <= "reorderPoint")
      )
    ORDER BY quantity ASC
    LIMIT ${limit}
  `;

  return sqlRows.map((item) => ({
    id: item.id,
    sku: item.sku,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    reorderPoint: item.reorderPoint,
    costPrice: toNumber(item.costPrice),
    status: item.status,
    currency: item.currency,
  }));
}
