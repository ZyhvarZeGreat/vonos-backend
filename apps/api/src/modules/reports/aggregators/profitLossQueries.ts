import type {
  ProfitLossBreakdownTab,
  ProfitLossLine,
  ProfitLossReport,
  ProfitLossSummary,
  ReportsTable,
} from '@vonos/types';
import type { Prisma } from '@prisma/client';
import type { TenantScopedPrisma } from '../../../common/prisma/prisma.service';
import { ledgerDateFilter } from '../../../common/utils/ledgerAggregates';
import { computeSalesRevenueTotal } from '../../../common/utils/salesRevenue';
import { toNumber } from '../../../common/utils/serializers';
import { resolveDateWindow } from './date-utils';
import { loadJobReportContext, type NormalizedJobSale } from './jobSalesData';
import { loadSalesReportContext } from './salesData';

type MovementLine = {
  quantity?: number | string;
  unitCost?: number | string;
  lineTotal?: number | string;
  sku?: string;
  name?: string;
  discountAmount?: number | string;
};

function sumMovementValue(
  movements: Array<{ lines: Prisma.JsonValue }>,
): number {
  let total = 0;
  for (const movement of movements) {
    const lines = Array.isArray(movement.lines) ? movement.lines : [];
    for (const raw of lines) {
      if (!raw || typeof raw !== 'object') continue;
      const line = raw as MovementLine;
      if (line.lineTotal != null) {
        total += toNumber(line.lineTotal);
        continue;
      }
      const qty = toNumber(line.quantity);
      const unit = toNumber(line.unitCost);
      total += qty * unit;
    }
  }
  return total;
}

function lineAmount(label: string, key: string, amount: number): ProfitLossLine {
  return { key, label, amount: Math.round(amount * 100) / 100 };
}

async function stockValuation(
  db: TenantScopedPrisma,
): Promise<{ byPurchase: number; bySale: number; currency: string }> {
  const [purchaseRow, saleRow, currencyRow] = await Promise.all([
    db.$queryRaw<[{ val: Prisma.Decimal | null }]>`
      SELECT COALESCE(SUM(quantity * "costPrice"), 0) AS val
      FROM "Item"
      WHERE "deletedAt" IS NULL
    `,
    db.$queryRaw<[{ val: Prisma.Decimal | null }]>`
      SELECT COALESCE(SUM(
        i.quantity * COALESCE(sp.sell_price, i."costPrice")
      ), 0) AS val
      FROM "Item" i
      LEFT JOIN (
        SELECT DISTINCT ON (sl."itemId")
          sl."itemId",
          sl."unitPrice" AS sell_price
        FROM "SaleLine" sl
        INNER JOIN "Sale" s ON s.id = sl."saleId" AND s."deletedAt" IS NULL
        WHERE sl."itemId" IS NOT NULL
        ORDER BY sl."itemId", s.date DESC
      ) sp ON sp."itemId" = i.id
      WHERE i."deletedAt" IS NULL
    `,
    db.item.findFirst({
      where: { deletedAt: null },
      select: { currency: true },
      orderBy: { id: 'asc' },
    }),
  ]);

  return {
    byPurchase: toNumber(purchaseRow[0]?.val ?? 0),
    bySale: toNumber(saleRow[0]?.val ?? 0),
    currency: currencyRow?.currency ?? 'NGN',
  };
}

async function totalPayroll(
  db: TenantScopedPrisma,
  from?: string,
  to?: string,
): Promise<number> {
  const dateFilter = ledgerDateFilter(from, to);
  const payrollMonthFilter =
    from || to
      ? {
          payrollMonth: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {};

  const [payrollRows, ledgerPayroll] = await Promise.all([
    db.payroll.aggregate({
      where: { deletedAt: null, ...payrollMonthFilter },
      _sum: { netPay: true },
    }),
    db.ledgerEntry.aggregate({
      where: {
        deletedAt: null,
        type: 'expense',
        category: { contains: 'payroll', mode: 'insensitive' },
        ...dateFilter,
      },
      _sum: { amount: true },
    }),
  ]);

  const fromPayroll = toNumber(payrollRows._sum.netPay ?? 0);
  const fromLedger = toNumber(ledgerPayroll._sum.amount ?? 0);
  return fromPayroll > 0 ? fromPayroll : fromLedger;
}

type ItemMeta = { cost: number; category: string | null; brandName: string | null };

function lineUnitCost(
  itemId: string | null | undefined,
  itemMeta: Map<string, ItemMeta>,
): number {
  if (!itemId) return 0;
  return itemMeta.get(itemId)?.cost ?? 0;
}

function lineCategory(
  itemId: string | null | undefined,
  itemMeta: Map<string, ItemMeta>,
): string {
  if (!itemId) return 'Uncategorized';
  return itemMeta.get(itemId)?.category?.trim() || 'Uncategorized';
}

function lineBrand(
  itemId: string | null | undefined,
  itemMeta: Map<string, ItemMeta>,
): string {
  if (!itemId) return 'Unbranded';
  return itemMeta.get(itemId)?.brandName?.trim() || 'Unbranded';
}

function addBucket(
  map: Map<string, { revenue: number; cost: number }>,
  key: string,
  revenue: number,
  cost: number,
) {
  const bucket = map.get(key) ?? { revenue: 0, cost: 0 };
  bucket.revenue += revenue;
  bucket.cost += cost;
  map.set(key, bucket);
}

function mergeJobIntoBreakdowns(
  job: NormalizedJobSale,
  maps: {
    byDate: Map<string, { revenue: number; cost: number }>;
    byCustomer: Map<string, { revenue: number; cost: number }>;
    byLocation: Map<string, { revenue: number; cost: number }>;
    byStaff: Map<string, { revenue: number; cost: number }>;
    byCategory: Map<string, { revenue: number; cost: number }>;
    byProduct: Map<
      string,
      { label: string; revenue: number; cost: number; units: number }
    >;
    byBrand: Map<string, { revenue: number; cost: number }>;
    byInvoice: Array<{
      reference: string;
      revenue: number;
      cost: number;
      date: Date;
    }>;
  },
  itemMeta: Map<string, ItemMeta>,
) {
  const dateKey = job.date.toISOString().slice(0, 10);
  const customerKey = job.customerName.trim() || 'Walk-in';
  const locationKey = job.locationCode?.trim() || 'Default';
  const staffKey = job.staffName?.trim() || 'Unassigned';

  addBucket(maps.byDate, dateKey, job.revenue, job.directCost);
  addBucket(maps.byCustomer, customerKey, job.revenue, job.directCost);
  addBucket(maps.byLocation, locationKey, job.revenue, job.directCost);
  addBucket(maps.byStaff, staffKey, job.revenue, job.directCost);
  addBucket(maps.byCategory, 'Job Services', job.revenue, job.directCost);

  const materialCost = job.materials.reduce((sum, line) => sum + line.cost, 0);
  const allocBase = materialCost + job.labourCost;

  if (job.labourCost > 0) {
    const labourRevenue =
      allocBase > 0 ? job.revenue * (job.labourCost / allocBase) : 0;
    const labour = maps.byProduct.get('job-labour') ?? {
      label: 'Labour',
      revenue: 0,
      cost: 0,
      units: 0,
    };
    labour.revenue += labourRevenue;
    labour.cost += job.labourCost;
    labour.units += 1;
    maps.byProduct.set('job-labour', labour);
    addBucket(maps.byBrand, 'Services', labourRevenue, job.labourCost);
  }

  for (const line of job.materials) {
    const lineRevenue =
      allocBase > 0 ? job.revenue * (line.cost / allocBase) : 0;
    const productKey = `job-${line.name}`;
    const product = maps.byProduct.get(productKey) ?? {
      label: line.name,
      revenue: 0,
      cost: 0,
      units: 0,
    };
    product.revenue += lineRevenue;
    product.cost += line.cost;
    product.units += line.quantity;
    maps.byProduct.set(productKey, product);
    addBucket(
      maps.byBrand,
      lineBrand(line.itemId, itemMeta),
      lineRevenue,
      line.cost,
    );
  }

  maps.byInvoice.push({
    reference: job.reference,
    revenue: job.revenue,
    cost: job.directCost,
    date: job.date,
  });
}

function buildBreakdowns(
  ctx: Awaited<ReturnType<typeof loadSalesReportContext>>,
  jobCtx: Awaited<ReturnType<typeof loadJobReportContext>>,
  itemMeta: Map<string, ItemMeta>,
): Partial<Record<ProfitLossBreakdownTab, ReportsTable>> {
  const byDate = new Map<string, { revenue: number; cost: number }>();
  const byProduct = new Map<
    string,
    { label: string; revenue: number; cost: number; units: number }
  >();
  const byCustomer = new Map<string, { revenue: number; cost: number }>();
  const byLocation = new Map<string, { revenue: number; cost: number }>();
  const byStaff = new Map<string, { revenue: number; cost: number }>();
  const byCategory = new Map<string, { revenue: number; cost: number }>();
  const byBrand = new Map<string, { revenue: number; cost: number }>();
  const byInvoice: Array<{
    reference: string;
    revenue: number;
    cost: number;
    date: Date;
  }> = [];

  for (const sale of ctx.periodSales) {
    const dateKey = sale.date.toISOString().slice(0, 10);
    const dayBucket = byDate.get(dateKey) ?? { revenue: 0, cost: 0 };
    dayBucket.revenue += sale.total;

    const customerKey = sale.customerName.trim() || 'Walk-in';
    const customerBucket = byCustomer.get(customerKey) ?? {
      revenue: 0,
      cost: 0,
    };
    customerBucket.revenue += sale.total;

    const locationKey = sale.locationCode?.trim() || 'Default';
    const locationBucket = byLocation.get(locationKey) ?? {
      revenue: 0,
      cost: 0,
    };
    locationBucket.revenue += sale.total;

    const staffKey = sale.staffName?.trim() || 'Unassigned';
    const staffBucket = byStaff.get(staffKey) ?? { revenue: 0, cost: 0 };
    staffBucket.revenue += sale.total;

    let invoiceCost = 0;

    for (const line of sale.lines) {
      const qty = toNumber(line.quantity);
      const revenue = toNumber(line.lineTotal);
      const unitCost = lineUnitCost(line.itemId, itemMeta);
      const cost = qty * unitCost;

      dayBucket.cost += cost;
      customerBucket.cost += cost;
      locationBucket.cost += cost;
      staffBucket.cost += cost;
      invoiceCost += cost;

      const categoryKey = lineCategory(line.itemId, itemMeta);
      addBucket(byCategory, categoryKey, revenue, cost);
      addBucket(byBrand, lineBrand(line.itemId, itemMeta), revenue, cost);

      const sku = line.sku?.trim() || line.name;
      const product = byProduct.get(sku) ?? {
        label: line.name,
        revenue: 0,
        cost: 0,
        units: 0,
      };
      product.revenue += revenue;
      product.cost += cost;
      product.units += qty;
      byProduct.set(sku, product);
    }

    byDate.set(dateKey, dayBucket);
    byCustomer.set(customerKey, customerBucket);
    byLocation.set(locationKey, locationBucket);
    byStaff.set(staffKey, staffBucket);
    byInvoice.push({
      reference: sale.reference,
      revenue: sale.total,
      cost: invoiceCost,
      date: sale.date,
    });
  }

  const jobMaps = {
    byDate,
    byCustomer,
    byLocation,
    byStaff,
    byCategory,
    byProduct,
    byBrand,
    byInvoice,
  };
  for (const job of jobCtx.periodJobs) {
    mergeJobIntoBreakdowns(job, jobMaps, itemMeta);
  }

  const grossRow = (revenue: number, cost: number) =>
    Math.round((revenue - cost) * 100) / 100;

  const sortByGrossProfit = <T extends { grossProfit: number }>(rows: T[]) =>
    rows.sort((a, b) => b.grossProfit - a.grossProfit);

  const dateRows = Array.from(byDate.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, row]) => ({
      date,
      grossProfit: grossRow(row.revenue, row.cost),
      revenue: Math.round(row.revenue * 100) / 100,
    }));

  const productRows = sortByGrossProfit(
    Array.from(byProduct.values()).map((row) => ({
      product: row.label,
      unitsSold: row.units,
      grossProfit: grossRow(row.revenue, row.cost),
      revenue: Math.round(row.revenue * 100) / 100,
    })),
  );

  const categoryRows = sortByGrossProfit(
    Array.from(byCategory.entries()).map(([category, row]) => ({
      category,
      grossProfit: grossRow(row.revenue, row.cost),
      revenue: Math.round(row.revenue * 100) / 100,
    })),
  );

  const customerRows = sortByGrossProfit(
    Array.from(byCustomer.entries()).map(([customer, row]) => ({
      customer,
      grossProfit: grossRow(row.revenue, row.cost),
      revenue: Math.round(row.revenue * 100) / 100,
    })),
  );

  const locationRows = sortByGrossProfit(
    Array.from(byLocation.entries()).map(([location, row]) => ({
      location,
      grossProfit: grossRow(row.revenue, row.cost),
      revenue: Math.round(row.revenue * 100) / 100,
    })),
  );

  const staffRows = sortByGrossProfit(
    Array.from(byStaff.entries()).map(([staff, row]) => ({
      staff,
      grossProfit: grossRow(row.revenue, row.cost),
      revenue: Math.round(row.revenue * 100) / 100,
    })),
  );

  const brandRows = sortByGrossProfit(
    Array.from(byBrand.entries()).map(([brand, row]) => ({
      brand,
      grossProfit: grossRow(row.revenue, row.cost),
      revenue: Math.round(row.revenue * 100) / 100,
    })),
  );

  const invoiceRows = sortByGrossProfit(
    byInvoice
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 200)
      .map((row) => ({
        reference: row.reference,
        grossProfit: grossRow(row.revenue, row.cost),
        revenue: Math.round(row.revenue * 100) / 100,
      })),
  );

  return {
    date: {
      columns: [
        { key: 'date', header: 'Date' },
        { key: 'grossProfit', header: 'Gross Profit' },
      ],
      rows: dateRows,
    },
    product: {
      columns: [
        { key: 'product', header: 'Product' },
        { key: 'unitsSold', header: 'Units Sold' },
        { key: 'grossProfit', header: 'Gross Profit' },
        { key: 'revenue', header: 'Revenue' },
      ],
      rows: productRows,
    },
    category: {
      columns: [
        { key: 'category', header: 'Category' },
        { key: 'grossProfit', header: 'Gross Profit' },
        { key: 'revenue', header: 'Revenue' },
      ],
      rows: categoryRows,
    },
    invoice: {
      columns: [
        { key: 'reference', header: 'Invoice' },
        { key: 'grossProfit', header: 'Gross Profit' },
        { key: 'revenue', header: 'Revenue' },
      ],
      rows: invoiceRows,
    },
    customer: {
      columns: [
        { key: 'customer', header: 'Customer' },
        { key: 'grossProfit', header: 'Gross Profit' },
        { key: 'revenue', header: 'Revenue' },
      ],
      rows: customerRows,
    },
    brand: {
      columns: [
        { key: 'brand', header: 'Brand' },
        { key: 'grossProfit', header: 'Gross Profit' },
        { key: 'revenue', header: 'Revenue' },
      ],
      rows: brandRows,
    },
    location: {
      columns: [
        { key: 'location', header: 'Location' },
        { key: 'grossProfit', header: 'Gross Profit' },
        { key: 'revenue', header: 'Revenue' },
      ],
      rows: locationRows,
    },
    day: {
      columns: [
        { key: 'day', header: 'Day' },
        { key: 'grossProfit', header: 'Gross Profit' },
      ],
      rows: dateRows.map((r) => ({
        day: r.date,
        grossProfit: r.grossProfit,
      })),
    },
    'service-staff': {
      columns: [
        { key: 'staff', header: 'Service Staff' },
        { key: 'grossProfit', header: 'Gross Profit' },
        { key: 'revenue', header: 'Revenue' },
      ],
      rows: staffRows,
    },
  };
}

export async function buildHqProfitLossReport(
  db: TenantScopedPrisma,
  from?: string,
  to?: string,
): Promise<ProfitLossReport> {
  const window = resolveDateWindow(from, to);
  const dateFilter = ledgerDateFilter(from, to);
  const movementDate = { date: { gte: window.from, lte: window.to } };

  // Keep query fan-out low to avoid exhausting Prisma pool on report pages.
  const stock = await stockValuation(db);
  const ledgerGroups = await db.ledgerEntry.groupBy({
    by: ['type', 'category'],
    where: { deletedAt: null, ...dateFilter },
    _sum: { amount: true },
  });
  const salesRevenue = await computeSalesRevenueTotal(db, from, to);
  const payrollTotal = await totalPayroll(db, from, to);
  const inboundMovements = await db.stockMovement.findMany({
    where: { deletedAt: null, type: 'inbound', ...movementDate },
    select: { lines: true },
  });
  const transferMovements = await db.stockMovement.findMany({
    where: { deletedAt: null, type: 'transfer', ...movementDate },
    select: { lines: true },
  });
  const outboundMovements = await db.stockMovement.findMany({
    where: { deletedAt: null, type: 'outbound', ...movementDate },
    select: { lines: true },
  });
  const saleDiscountAgg = await db.saleLine.aggregate({
    where: {
      sale: { deletedAt: null, date: { gte: window.from, lte: window.to } },
    },
    _sum: { discountAmount: true },
  });
  const returnSales = await db.sale.aggregate({
    where: {
      deletedAt: null,
      status: { in: ['refunded', 'partially_refunded'] },
      date: { gte: window.from, lte: window.to },
    },
    _sum: { total: true },
  });
  const ctx = await loadSalesReportContext(db, from, to);
  const jobCtx = await loadJobReportContext(db, from, to);
  const jobTotals = jobCtx.periodJobs.reduce(
    (acc, job) => ({
      revenue: acc.revenue + job.revenue,
      directCost: acc.directCost + job.directCost,
    }),
    { revenue: 0, directCost: 0 },
  );
  const items = await db.item.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      costPrice: true,
      category: true,
      brand: { select: { name: true } },
    },
  });

  const currency = stock.currency || salesRevenue.currency || 'NGN';
  const itemMeta = new Map<string, ItemMeta>(
    items.map((item) => [
      item.id,
      {
        cost: toNumber(item.costPrice),
        category: item.category,
        brandName: item.brand?.name ?? null,
      },
    ]),
  );

  let totalExpense = 0;
  for (const group of ledgerGroups) {
    if (group.type !== 'expense') continue;
    const cat = (group.category ?? '').toLowerCase();
    if (cat.includes('payroll')) continue;
    totalExpense += toNumber(group._sum.amount ?? 0);
  }

  const totalPurchase = sumMovementValue(inboundMovements);
  const totalStockAdjustment = 0;
  const totalTransferShipping = sumMovementValue(transferMovements);
  const totalSellDiscount = toNumber(saleDiscountAgg._sum.discountAmount ?? 0);
  const totalSellReturn = toNumber(returnSales._sum.total ?? 0);
  const totalSales = salesRevenue.revenue + jobTotals.revenue;

  const closingStockPurchase = stock.byPurchase;
  const closingStockSale = stock.bySale;

  const outboundCost = sumMovementValue(outboundMovements);
  const openingStockPurchase = Math.max(
    0,
    closingStockPurchase - totalPurchase + outboundCost,
  );
  const openingStockSale = Math.max(
    0,
    closingStockSale - totalPurchase * 1.1 + totalSales * 0.1,
  );

  const debits: ProfitLossLine[] = [
    lineAmount(
      'Opening Stock (By purchase price)',
      'openingStockPurchase',
      openingStockPurchase,
    ),
    lineAmount(
      'Opening Stock (By sale price)',
      'openingStockSale',
      openingStockSale,
    ),
    lineAmount('Total purchase', 'totalPurchase', totalPurchase),
    lineAmount('Total Stock Adjustment', 'totalStockAdjustment', totalStockAdjustment),
    lineAmount('Total Expense', 'totalExpense', totalExpense),
    lineAmount('Total purchase shipping charge', 'purchaseShipping', 0),
    lineAmount('Purchase additional expenses', 'purchaseAdditional', 0),
    lineAmount('Total transfer shipping charge', 'transferShipping', totalTransferShipping),
    lineAmount('Total Sell discount', 'sellDiscount', totalSellDiscount),
    lineAmount('Total customer reward', 'customerReward', 0),
    lineAmount('Total Sell Return', 'sellReturn', totalSellReturn),
    lineAmount('Total Payroll', 'totalPayroll', payrollTotal),
  ];

  const credits: ProfitLossLine[] = [
    lineAmount(
      'Closing stock (By purchase price)',
      'closingStockPurchase',
      closingStockPurchase,
    ),
    lineAmount(
      'Closing stock (By sale price)',
      'closingStockSale',
      closingStockSale,
    ),
    lineAmount('Total Sales', 'totalSales', totalSales),
    lineAmount('Total sell shipping charge', 'sellShipping', 0),
    lineAmount('Sell additional expenses', 'sellAdditional', 0),
    lineAmount('Total Stock Recovered', 'stockRecovered', 0),
    lineAmount('Total Purchase Return', 'purchaseReturn', 0),
    lineAmount('Total Purchase discount', 'purchaseDiscount', 0),
    lineAmount('Total sell reward', 'sellReward', 0),
  ];

  const cogs =
    openingStockPurchase +
    totalPurchase +
    totalStockAdjustment +
    totalTransferShipping -
    closingStockPurchase +
    jobTotals.directCost;

  const grossProfit = totalSales - cogs;
  const netProfit =
    grossProfit -
    totalExpense -
    payrollTotal -
    totalSellDiscount -
    totalSellReturn;

  const summary: ProfitLossSummary = {
    currency,
    debits,
    credits,
    cogs: Math.round(cogs * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
  };

  return {
    summary,
    breakdowns: buildBreakdowns(ctx, jobCtx, itemMeta),
  };
}
