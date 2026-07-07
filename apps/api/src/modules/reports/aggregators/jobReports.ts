import type { ReportsDashboard } from '@vonos/types';
import type { TenantScopedPrisma } from '../../../common/prisma/prisma.service';
import { computeDelta, priorWindow, resolveDateWindow } from './date-utils';
import {
  avgDeliveredTurnaroundDays,
  deliveredTurnaroundDays,
  jobCostByMonth,
  jobCostSummaryInWindow,
  jobTableRowsInWindow,
  sumDeliveredQuoteRevenue,
} from './jobReportQueries';

type JobTab = 'costing' | 'turnaround';

function avgCost(summary: { jobCount: number; totalCost: number }): number {
  return summary.jobCount > 0 ? summary.totalCost / summary.jobCount : 0;
}

export async function buildJobReports(
  db: TenantScopedPrisma,
  tenantId: string,
  tab: JobTab,
  from?: string,
  to?: string,
): Promise<ReportsDashboard> {
  const window = resolveDateWindow(from, to);
  const prior = priorWindow(window);
  const pipelineFrom = prior.from;
  const pipelineTo = window.to;

  const jobCountWhere = (range: { from: Date; to: Date }, status?: string) => ({
    tenantId,
    deletedAt: null,
    createdAt: { gte: range.from, lte: range.to },
    ...(status ? { status } : {}),
  });

  const [
    activeJobs,
    completedJobs,
    priorCompleted,
    totalRevenue,
    priorRevenue,
    periodCostSummary,
    priorCostSummary,
    statusGroups,
    periodTableRows,
    costByMonth,
    turnaroundDays,
    periodAvgTurnaround,
    priorAvgTurnaround,
    periodDelivered,
    priorDelivered,
  ] = await Promise.all([
    db.job.count({
      where: {
        tenantId,
        deletedAt: null,
        status: { notIn: ['Delivered', 'Cancelled'] },
      },
    }),
    db.job.count({
      where: jobCountWhere(window, 'Delivered'),
    }),
    db.job.count({
      where: jobCountWhere(prior, 'Delivered'),
    }),
    sumDeliveredQuoteRevenue(db, tenantId, window.from, window.to),
    sumDeliveredQuoteRevenue(db, tenantId, prior.from, prior.to),
    jobCostSummaryInWindow(db, tenantId, window.from, window.to),
    jobCostSummaryInWindow(db, tenantId, prior.from, prior.to),
    db.job.groupBy({
      by: ['status'],
      where: {
        tenantId,
        deletedAt: null,
        createdAt: { gte: pipelineFrom, lte: pipelineTo },
      },
      _count: { _all: true },
    }),
    tab === 'costing'
      ? jobTableRowsInWindow(db, tenantId, window.from, window.to)
      : Promise.resolve([]),
    tab === 'costing'
      ? jobCostByMonth(db, tenantId, window.from, window.to)
      : Promise.resolve([]),
    tab === 'turnaround'
      ? deliveredTurnaroundDays(db, tenantId, pipelineFrom, pipelineTo)
      : Promise.resolve([]),
    tab === 'turnaround'
      ? avgDeliveredTurnaroundDays(db, tenantId, window.from, window.to)
      : Promise.resolve(0),
    tab === 'turnaround'
      ? avgDeliveredTurnaroundDays(db, tenantId, prior.from, prior.to)
      : Promise.resolve(0),
    tab === 'turnaround'
      ? db.job.count({ where: jobCountWhere(window, 'Delivered') })
      : Promise.resolve(0),
    tab === 'turnaround'
      ? db.job.count({ where: jobCountWhere(prior, 'Delivered') })
      : Promise.resolve(0),
  ]);

  const avgJobCost = avgCost(periodCostSummary);
  const priorAvgCost = avgCost(priorCostSummary);

  if (tab === 'costing') {
    const pipelineData = statusGroups.map((group) => ({
      label: group.status,
      value: group._count._all,
    }));

    return {
      kpis: [
        {
          label: 'Active Jobs',
          icon: 'wrench',
          metricKey: 'activeJobs',
          color: '#059669',
          value: activeJobs,
        },
        {
          label: 'Completed',
          icon: 'check-circle',
          metricKey: 'completedJobs',
          color: '#2563eb',
          value: completedJobs,
          ...computeDelta(completedJobs, priorCompleted),
        },
        {
          label: 'Revenue',
          icon: 'wallet',
          metricKey: 'totalRevenue',
          color: '#e11d48',
          value: totalRevenue,
          currency: 'NGN',
          ...computeDelta(totalRevenue, priorRevenue),
        },
        {
          label: 'Avg Job Cost',
          icon: 'calculator',
          metricKey: 'avgJobCost',
          color: '#9333ea',
          value: Math.round(avgJobCost),
          currency: 'NGN',
          ...computeDelta(avgJobCost, priorAvgCost),
        },
      ],
      charts: [
        {
          id: 'cost-stack',
          title: 'Materials vs Labour',
          subtitle: 'Cost breakdown by month',
          type: 'bar',
          series: [
            { name: 'Materials', dataKey: 'materials', color: '#3b82f6' },
            { name: 'Labour', dataKey: 'labour', color: '#93c5fd' },
          ],
          data:
            costByMonth.length > 0
              ? costByMonth.map((row) => ({
                  label: row.label,
                  materials: Math.round(row.materials),
                  labour: Math.round(row.labour),
                }))
              : [{ label: '—', materials: 0, labour: 0 }],
        },
        {
          id: 'status-pipeline',
          title: 'Status Pipeline',
          subtitle: 'All open and closed jobs',
          type: 'bar',
          horizontal: true,
          series: [{ name: 'Jobs', dataKey: 'value', color: '#10b981' }],
          data: pipelineData,
        },
      ],
      table:
        periodTableRows.length > 0
          ? {
              columns: [
                { key: 'reference', header: 'Reference' },
                { key: 'customer', header: 'Customer' },
                { key: 'status', header: 'Status' },
                { key: 'revenue', header: 'Quote' },
                { key: 'cost', header: 'Cost' },
              ],
              rows: periodTableRows.map((job) => ({
                id: job.id,
                recordType: 'job',
                reference: job.reference,
                customer: job.customerName ?? '—',
                status: job.status,
                revenue:
                  job.quoteAmount != null ? Math.round(job.quoteAmount) : '—',
                cost: Math.round(job.cost),
              })),
            }
          : null,
    };
  }

  const avgTurnaround =
    turnaroundDays.length > 0
      ? turnaroundDays.reduce((sum, days) => sum + days, 0) /
        turnaroundDays.length
      : 0;

  const histogram = new Map<number, number>();
  for (const days of turnaroundDays) {
    const bucket = days <= 7 ? days : Math.min(30, Math.ceil(days / 7) * 7);
    histogram.set(bucket, (histogram.get(bucket) ?? 0) + 1);
  }
  const histData = Array.from(histogram.entries())
    .sort(([a], [b]) => a - b)
    .map(([label, value]) => ({ label: `${label}d`, value }));

  return {
    kpis: [
      {
        label: 'Avg Turnaround',
        icon: 'clock',
        metricKey: 'avgTurnaroundDays',
        color: '#9333ea',
        value: Number(avgTurnaround.toFixed(1)),
        ...computeDelta(periodAvgTurnaround, priorAvgTurnaround),
      },
      {
        label: 'Jobs Delivered',
        icon: 'check-circle',
        metricKey: 'jobsDelivered',
        color: '#059669',
        value: periodDelivered,
        ...computeDelta(periodDelivered, priorDelivered),
      },
      {
        label: 'Active Jobs',
        icon: 'wrench',
        metricKey: 'activeJobs',
        color: '#2563eb',
        value: activeJobs,
      },
      {
        label: 'Revenue',
        icon: 'wallet',
        metricKey: 'totalRevenue',
        color: '#e11d48',
        value: totalRevenue,
        currency: 'NGN',
      },
    ],
    charts: [
      {
        id: 'turnaround-hist',
        title: 'Turnaround Distribution',
        subtitle: 'Days from received to delivered',
        type: 'bar',
        series: [{ name: 'Jobs', dataKey: 'value', color: '#3b82f6' }],
        data: histData.length > 0 ? histData : [{ label: '0d', value: 0 }],
      },
    ],
    table: null,
  };
}
