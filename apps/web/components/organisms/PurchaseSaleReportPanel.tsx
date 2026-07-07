"use client";

import type { ReportsDashboard } from "@vonos/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { cn } from "@/lib/utils/cn";

function kpiValue(
  report: ReportsDashboard,
  metricKey: string,
): { value: number; currency?: string } | null {
  const kpi = report.kpis.find((row) => row.metricKey === metricKey);
  if (!kpi) return null;
  return { value: kpi.value, currency: kpi.currency };
}

export function PurchaseSaleReportPanel({
  report,
  onPrint,
}: {
  report: ReportsDashboard;
  onPrint?: () => void;
}) {
  const sales = kpiValue(report, "sales");
  const purchases = kpiValue(report, "purchases");
  const grossProfit = kpiValue(report, "grossProfit");
  const currency = sales?.currency ?? purchases?.currency ?? "NGN";
  const chart = report.charts[0];
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

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Total Sales
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-700">
            {formatCurrency(sales?.value ?? 0, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Total Purchases
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
            {formatCurrency(purchases?.value ?? 0, currency)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Gross Profit
        </p>
        <p
          className={cn(
            "mt-1 text-3xl font-semibold tabular-nums",
            (grossProfit?.value ?? 0) < 0 ? "text-red-600" : "text-emerald-700",
          )}
        >
          {formatCurrency(grossProfit?.value ?? 0, currency)}
        </p>
      </div>

      {chart ? (
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h3 className="text-base font-semibold text-foreground">{chart.title}</h3>
          {chart.subtitle ? (
            <p className="mt-1 text-sm text-muted">{chart.subtitle}</p>
          ) : null}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[20rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-3 py-2 font-medium">Period</th>
                  <th className="px-3 py-2 font-medium">Sales</th>
                  <th className="px-3 py-2 font-medium">Purchases</th>
                </tr>
              </thead>
              <tbody>
                {chart.data.map((row) => (
                  <tr key={String(row.label)} className="border-b border-border/60">
                    <td className="px-3 py-2">{row.label}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatCurrency(Number(row.sales ?? 0), currency)}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatCurrency(Number(row.purchases ?? 0), currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

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
                      (col.key === "sales" ||
                        col.key === "purchases" ||
                        col.key === "margin") &&
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
      ) : null}
    </div>
  );
}
