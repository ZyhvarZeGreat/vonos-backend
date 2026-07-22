import type { ReportsChart, ReportsKpi } from '@vonos/types';
import type { TenantScopedPrisma } from '../../common/prisma/prisma.service';
import {
  dailyFinanceTrend,
  hasDailyFinanceRollup,
  sumDailyFinanceRollup,
} from '../../common/utils/dailyFinanceRollup';
import {
  computeDelta,
  priorWindow,
  resolveDateWindow,
  asChartData,
} from '../reports/aggregators/date-utils';
import {
  ledgerCurrency,
  ledgerExpenseBreakdown,
  ledgerPlTrend,
  ledgerSummaryInWindow,
} from '../reports/aggregators/ledgerReportQueries';
import { taxReportSummaryAggregates, purchaseRevenueByBucket, salesRevenueByBucket } from '../reports/aggregators/salesReportQueries';

export interface LedgerFinanceSlice {
  currency: string;
  financeCharts: ReportsChart[];
  financeKpis: ReportsKpi[];
}

export async function buildLedgerFinanceSlice(
  db: TenantScopedPrisma,
  tenantId: string,
  from?: string,
  to?: string,
): Promise<LedgerFinanceSlice> {
  const window = resolveDateWindow(from, to);
  const prior = priorWindow(window);

  const useRollup = await hasDailyFinanceRollup(
    db,
    tenantId,
    window.from,
    window.to,
  );

  if (useRollup) {
    // Rollup-only path: no LedgerEntry scans (expense category pie uses cost vs expense totals).
    const [summary, priorSummary, plTrend] = await Promise.all([
      sumDailyFinanceRollup(db, tenantId, window.from, window.to),
      sumDailyFinanceRollup(db, tenantId, prior.from, prior.to),
      dailyFinanceTrend(db, tenantId, window.from, window.to),
    ]);

    const costs = summary.costs + summary.expenses;
    const priorCosts = priorSummary.costs + priorSummary.expenses;
    const currency = 'NGN';
    const expenseBreakdown = [
      { label: 'Costs', value: summary.costs },
      { label: 'Expenses', value: summary.expenses },
    ].filter((row) => row.value > 0);

    return {
      currency,
      financeCharts: financeCharts(
        bucketTrend(plTrend, window),
        expenseBreakdown.length > 0
          ? expenseBreakdown
          : [{ label: '—', value: 0 }],
      ),
      financeKpis: financeKpis(
        {
          revenue: summary.revenue,
          costs,
          net: summary.net,
        },
        {
          revenue: priorSummary.revenue,
          costs: priorCosts,
          net: priorSummary.net,
        },
        currency,
      ),
    };
  }

  const [summary, priorSummary, currency, plTrend, expenseBreakdown] =
    await Promise.all([
      ledgerSummaryInWindow(db, tenantId, window.from, window.to),
      ledgerSummaryInWindow(db, tenantId, prior.from, prior.to),
      ledgerCurrency(db, tenantId),
      ledgerPlTrend(db, tenantId, window),
      ledgerExpenseBreakdown(db, tenantId, window.from, window.to),
    ]);

  return {
    currency,
    financeCharts: financeCharts(plTrend, expenseBreakdown),
    financeKpis: financeKpis(summary, priorSummary, currency),
  };
}

/** Collapse daily rollup points to months when the window is long (keeps payload small). */
function bucketTrend(
  rows: Array<{ label: string; revenue: number; costs: number }>,
  window: { from: Date; to: Date },
): Array<{ label: string; revenue: number; costs: number }> {
  const spanDays =
    (window.to.getTime() - window.from.getTime()) / (24 * 60 * 60 * 1000);
  if (spanDays <= 60 || rows.length <= 60) return rows;

  const byMonth = new Map<string, { label: string; revenue: number; costs: number }>();
  for (const row of rows) {
    const month = row.label.slice(0, 7); // YYYY-MM
    const existing = byMonth.get(month) ?? {
      label: month,
      revenue: 0,
      costs: 0,
    };
    existing.revenue += row.revenue;
    existing.costs += row.costs;
    byMonth.set(month, existing);
  }
  return Array.from(byMonth.values());
}

function financeCharts(
  plTrend: Array<{ label: string; revenue: number; costs: number }>,
  expenseBreakdown: Array<{ label: string; value: number }>,
): ReportsChart[] {
  return [
    {
      id: 'finance-pl-trend',
      title: 'Revenue vs Costs',
      subtitle: 'Ledger totals for selected period',
      type: 'line',
      series: [
        { name: 'Revenue', dataKey: 'revenue', color: '#059669' },
        { name: 'Costs', dataKey: 'costs', color: '#e11d48' },
      ],
      data: asChartData(plTrend),
    },
    {
      id: 'finance-expense-breakdown',
      title: 'Costs & Expenses by Category',
      subtitle: 'Non-revenue ledger entries',
      type: 'pie',
      series: [{ name: 'Amount', dataKey: 'value', color: '#9333ea' }],
      data: asChartData(expenseBreakdown),
    },
  ];
}

/** HQ6 Home stat cards — ui-audit/00_home/screenshot.png (VA only). */
export async function buildVaHq6HomeFinanceKpis(
  db: TenantScopedPrisma,
  tenantId: string,
  from?: string,
  to?: string,
): Promise<ReportsKpi[]> {
  const window = resolveDateWindow(from, to);
  const [summary, taxAgg] = await Promise.all([
    ledgerSummaryInWindow(db, tenantId, window.from, window.to),
    taxReportSummaryAggregates(db, tenantId, window),
  ]);
  const currency = taxAgg.currency;
  const expenseTotal = summary.costs;

  return [
    {
      label: 'Total Sales',
      icon: 'wallet',
      metricKey: 'totalSale',
      color: '#3b82f6',
      value: taxAgg.totalSale,
      currency,
    },
    {
      label: 'Net',
      icon: 'wallet',
      metricKey: 'net',
      color: '#9333ea',
      value: summary.net,
      currency,
    },
    {
      label: 'Invoice due',
      icon: 'alert',
      metricKey: 'invoiceDue',
      color: '#f39c12',
      value: taxAgg.saleDue,
      currency,
    },
    {
      label: 'Total Sell Return',
      icon: 'rotate',
      metricKey: 'sellReturn',
      color: '#dd4b39',
      value: taxAgg.sellReturnIncludingTax,
      currency,
    },
    {
      label: 'Total purchase',
      icon: 'cart',
      metricKey: 'purchase',
      color: '#00a65a',
      value: taxAgg.totalPurchase,
      currency,
    },
    {
      label: 'Purchase due',
      icon: 'alert',
      metricKey: 'purchaseDue',
      color: '#f39c12',
      value: taxAgg.purchaseDue,
      currency,
    },
    {
      label: 'Total Purchase Return',
      icon: 'package',
      metricKey: 'purchaseReturn',
      color: '#605ca8',
      value: taxAgg.purchaseReturnIncludingTax,
      currency,
    },
    {
      label: 'Expense',
      icon: 'receipt',
      metricKey: 'expense',
      color: '#2563eb',
      value: expenseTotal,
      currency,
    },
  ];
}

function last30DayWindow(): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

/** HQ6 home chart row — ui-audit/00_home (Sales / Purchase last 30 days). */
export async function buildVaHq6HomeCharts(
  db: TenantScopedPrisma,
  tenantId: string,
): Promise<ReportsChart[]> {
  const window = last30DayWindow();
  const [sales, purchases] = await Promise.all([
    salesRevenueByBucket(db, tenantId, window),
    purchaseRevenueByBucket(db, tenantId, window),
  ]);

  return [
    {
      id: 'hq6-sales-last-30',
      title: 'Sales Last 30 Days',
      subtitle: 'Total sales value',
      type: 'line',
      series: [{ name: 'Total Sales', dataKey: 'sales', color: '#3b82f6' }],
      data: asChartData(
        sales.map((row) => ({ label: row.label, sales: row.sales })),
      ),
    },
    {
      id: 'hq6-purchase-last-30',
      title: 'Purchase Last 30 Days',
      subtitle: 'Total purchase value',
      type: 'line',
      series: [{ name: 'Total Purchase', dataKey: 'purchase', color: '#00a65a' }],
      data: asChartData(
        purchases.map((row) => ({ label: row.label, purchase: row.purchase })),
      ),
    },
  ];
}

function financeKpis(
  summary: { revenue: number; costs: number; net: number },
  priorSummary: { revenue: number; costs: number; net: number },
  currency: string,
): ReportsKpi[] {
  return [
    {
      label: 'Revenue',
      icon: 'wallet',
      metricKey: 'revenue',
      color: '#059669',
      value: summary.revenue,
      currency,
      ...computeDelta(summary.revenue, priorSummary.revenue),
    },
    {
      label: 'Costs & Expenses',
      icon: 'calculator',
      metricKey: 'costs',
      color: '#2563eb',
      value: summary.costs,
      currency,
      ...computeDelta(summary.costs, priorSummary.costs),
    },
    {
      label: 'Net',
      icon: 'wallet',
      metricKey: 'net',
      color: '#9333ea',
      value: summary.net,
      currency,
      ...computeDelta(summary.net, priorSummary.net),
    },
  ];
}
