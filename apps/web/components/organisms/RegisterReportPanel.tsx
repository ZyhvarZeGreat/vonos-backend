"use client";

import type { ReportsDashboard } from "@vonos/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";

function kpiValue(
  report: ReportsDashboard,
  metricKey: string,
): { value: number; currency?: string } | null {
  const kpi = report.kpis.find((row) => row.metricKey === metricKey);
  if (!kpi) return null;
  return { value: kpi.value, currency: kpi.currency };
}

export function RegisterReportPanel({
  report,
  onPrint,
}: {
  report: ReportsDashboard;
  onPrint?: () => void;
}) {
  const revenue = kpiValue(report, "revenue");
  const currency = revenue?.currency ?? "NGN";
  const tradingDays = kpiValue(report, "days");
  const transactions = kpiValue(report, "transactionCount");
  const avgDaily = kpiValue(report, "avgDaily");
  const table = report.table;

  return (
    <div className="space-y-6" data-print-root>
      {onPrint ? (
        <div className="flex justify-end print:hidden">
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-[var(--color-surface-muted)]"
          >
            Print
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Register Revenue
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {formatCurrency(revenue?.value ?? 0, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Trading Days
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {tradingDays?.value ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Transactions
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {transactions?.value ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Avg Daily Revenue
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {formatCurrency(avgDaily?.value ?? 0, currency)}
          </p>
        </div>
      </div>

      {table?.rows.length ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[24rem] text-sm">
            <thead>
              <tr className="border-b border-border bg-[var(--color-surface-muted)]/50 text-left text-xs text-muted">
                {table.columns.map((col) => (
                  <th key={col.key} className="px-4 py-2.5 font-medium">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, index) => (
                <tr key={String(row.id ?? index)} className="border-b border-border/60">
                  {table.columns.map((col) => {
                    const raw = row[col.key];
                    const display =
                      (col.key === "revenue" || col.key === "avgTicket") &&
                      typeof raw === "number"
                        ? formatCurrency(raw, currency)
                        : String(raw ?? "—");
                    return (
                      <td key={col.key} className="px-4 py-2 text-foreground">
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted">No register activity for this period.</p>
      )}
    </div>
  );
}
