import type { ReportsChart, ReportsKpi } from '@vonos/types';
import type { TenantScopedPrisma } from '../../common/prisma/prisma.service';
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

  const [summary, priorSummary, currency, plTrend, expenseBreakdown] =
    await Promise.all([
      ledgerSummaryInWindow(db, tenantId, window.from, window.to),
      ledgerSummaryInWindow(db, tenantId, prior.from, prior.to),
      ledgerCurrency(db, tenantId),
      ledgerPlTrend(db, tenantId, window),
      ledgerExpenseBreakdown(db, tenantId, window.from, window.to),
    ]);

  const financeCharts: ReportsChart[] = [
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

  const financeKpis: ReportsKpi[] = [
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

  return { currency, financeCharts, financeKpis };
}
