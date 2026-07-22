"use client";

import { useMemo, useState } from "react";
import type { ReportsDashboard, ReportsTableRow } from "@vonos/types";
import { formatCurrency, formatNumber } from "@/lib/utils/formatCurrency";
import {
  reportColumnTotalKind,
  resolveReportColumnTotals,
} from "@/lib/utils/reportTableTotals";
import { cn } from "@/lib/utils/cn";
import { CursorPaginationBar } from "@/components/molecules/CursorPaginationBar";
import { ReportTableSearchBar } from "@/components/molecules/ReportTableSearchBar";
import { useOffsetPage } from "@/lib/hooks/useOffsetPage";
import { TABLE_REPORT_PAGE_SIZE } from "@/lib/registries/reportTableUi";

function rowMatchesSearch(row: ReportsTableRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return Object.entries(row).some(([key, value]) => {
    if (key === "actions" || value == null || Array.isArray(value)) return false;
    return String(value).toLowerCase().includes(q);
  });
}

function kpiValue(
  report: ReportsDashboard,
  metricKey: string,
): { value: number; currency?: string } | null {
  const kpi = report.kpis.find((row) => row.metricKey === metricKey);
  if (!kpi) return null;
  return { value: kpi.value, currency: kpi.currency };
}

export function ServiceStaffReportPanel({
  report,
  onPrint,
}: {
  report: ReportsDashboard;
  onPrint?: () => void;
}) {
  const revenue = kpiValue(report, "revenue");
  const currency = revenue?.currency ?? "NGN";
  const staffCount = kpiValue(report, "staff");
  const transactions = kpiValue(report, "transactions");
  const topTicket = kpiValue(report, "topTicket");
  const table = report.table;
  const [search, setSearch] = useState("");
  const filteredRows = useMemo(
    () => (table?.rows ?? []).filter((row) => rowMatchesSearch(row, search)),
    [table?.rows, search],
  );
  const pagination = useOffsetPage(filteredRows, {
    resetKey: search,
    defaultPageSize: TABLE_REPORT_PAGE_SIZE,
  });
  const pageRows = pagination.pageRows;

  const totals = table
    ? resolveReportColumnTotals(
        table.columns,
        search.trim() ? filteredRows : table.rows,
        search.trim() ? undefined : table.columnTotals,
      )
    : {};
  const hasTotals = Object.keys(totals).length > 0;
  const totalLabelColIndex = table
    ? table.columns.findIndex((col) => !(col.key in totals))
    : -1;

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
        <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Total Revenue
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {formatCurrency(revenue?.value ?? 0, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Service Staff
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {staffCount?.value ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Transactions
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {transactions?.value ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Top Ticket
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {formatCurrency(topTicket?.value ?? 0, currency)}
          </p>
        </div>
      </div>

      {table?.rows.length ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <CursorPaginationBar
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            itemCount={pageRows.length}
            hasMore={pagination.hasMore}
            canGoPrev={pagination.canGoPrev}
            onPrev={pagination.goPrev}
            onNext={pagination.goNext}
            onPageSizeChange={pagination.setPageSize}
            onPageSelect={pagination.setPageIndex}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            className="border-b border-t-0 border-[var(--color-border-subtle)]"
          />
          <ReportTableSearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search staff…"
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
                          : kind === "number" && typeof raw === "number"
                            ? formatNumber(raw)
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
              {hasTotals ? (
                <tfoot>
                  <tr className="border-t-2 border-border bg-[var(--color-surface-muted)]/70 text-sm font-semibold text-foreground">
                    {table.columns.map((col, index) => {
                      const total = totals[col.key];
                      if (total) {
                        return (
                          <td
                            key={col.key}
                            className="px-4 py-3 text-right tabular-nums"
                          >
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
              ) : null}
            </table>
          </div>
          <CursorPaginationBar
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            itemCount={pageRows.length}
            hasMore={pagination.hasMore}
            canGoPrev={pagination.canGoPrev}
            onPrev={pagination.goPrev}
            onNext={pagination.goNext}
            onPageSizeChange={pagination.setPageSize}
            onPageSelect={pagination.setPageIndex}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
          />
        </div>
      ) : null}
    </div>
  );
}
