"use client";

import { useEffect, useState } from "react";
import type { ReportsDashboard } from "@vonos/types";
import { formatCurrency, formatNumber } from "@/lib/utils/formatCurrency";
import {
  reportColumnTotalKind,
  resolveReportColumnTotals,
} from "@/lib/utils/reportTableTotals";
import { cn } from "@/lib/utils/cn";
import { CursorPaginationBar } from "@/components/molecules/CursorPaginationBar";
import { TABLE_REPORT_PAGE_SIZE } from "@/lib/registries/reportTableUi";

function kpiValue(
  report: ReportsDashboard,
  metricKey: string,
): { value: number; currency?: string } | null {
  const kpi = report.kpis.find((row) => row.metricKey === metricKey);
  if (!kpi) return null;
  return { value: kpi.value, currency: kpi.currency };
}

function ReportTableFooter({
  table,
  currency,
}: {
  table: NonNullable<ReportsDashboard["table"]>;
  currency: string;
}) {
  const totals = resolveReportColumnTotals(
    table.columns,
    table.rows,
    table.columnTotals,
  );
  if (Object.keys(totals).length === 0 || table.rows.length === 0) return null;
  const totalLabelColIndex = table.columns.findIndex((col) => !(col.key in totals));

  return (
    <tfoot>
      <tr className="border-t-2 border-border bg-[var(--color-surface-muted)]/70 text-sm font-semibold text-foreground">
        {table.columns.map((col, index) => {
          const total = totals[col.key];
          if (total) {
            return (
              <td key={col.key} className="px-4 py-3 text-right tabular-nums">
                {total.kind === "currency"
                  ? formatCurrency(total.value, currency)
                  : formatNumber(total.value)}
              </td>
            );
          }
          const showLabel =
            index === (totalLabelColIndex >= 0 ? totalLabelColIndex : 0);
          return (
            <td key={col.key} className="px-4 py-3">
              {showLabel ? "Total:" : null}
            </td>
          );
        })}
      </tr>
    </tfoot>
  );
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

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(TABLE_REPORT_PAGE_SIZE);

  useEffect(() => {
    setPageIndex(0);
  }, [table?.rows, pageSize]);

  const pageRows = table?.rows.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize,
  ) ?? [];

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

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Sales</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {formatCurrency(sales?.value ?? 0, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Purchases</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {formatCurrency(purchases?.value ?? 0, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Gross Profit</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {formatCurrency(grossProfit?.value ?? 0, currency)}
          </p>
        </div>
      </div>

      {chart ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 text-sm font-medium text-foreground">
            {chart.title}
          </div>
          <div className="p-4">
            <table className="w-full text-sm">
              <tbody>
                {chart.data.map((row) => (
                  <tr key={String(row.label)} className="border-b border-border/60">
                    <td className="px-2 py-2 text-foreground">{String(row.label)}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-foreground">
                      {formatCurrency(Number(row.sales ?? 0), currency)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-foreground">
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
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <CursorPaginationBar
            pageIndex={pageIndex}
            pageSize={pageSize}
            itemCount={pageRows.length}
            hasMore={(pageIndex + 1) * pageSize < table.rows.length}
            canGoPrev={pageIndex > 0}
            onPrev={() => setPageIndex((page) => Math.max(0, page - 1))}
            onNext={() => setPageIndex((page) => page + 1)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPageIndex(0);
            }}
            className="border-b border-t-0 border-[var(--color-border-subtle)]"
          />
          <div className="overflow-x-auto">
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
                {pageRows.map((row, index) => (
                  <tr key={String(row.id ?? index)} className="border-b border-border/60">
                    {table.columns.map((col) => {
                      const raw = row[col.key];
                      const kind = reportColumnTotalKind(col);
                      const display =
                        kind === "currency" && typeof raw === "number"
                          ? formatCurrency(raw, currency)
                          : String(raw ?? "—");
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            "px-4 py-2 text-foreground",
                            kind ? "text-right tabular-nums" : undefined,
                          )}
                        >
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <ReportTableFooter table={table} currency={currency} />
            </table>
          </div>
          <CursorPaginationBar
            pageIndex={pageIndex}
            pageSize={pageSize}
            itemCount={pageRows.length}
            hasMore={(pageIndex + 1) * pageSize < table.rows.length}
            canGoPrev={pageIndex > 0}
            onPrev={() => setPageIndex((page) => Math.max(0, page - 1))}
            onNext={() => setPageIndex((page) => page + 1)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPageIndex(0);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
