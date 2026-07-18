"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ReportsDashboard, ReportsKpi, ReportsTable, ReportRowAction, ReportsTableRow } from "@vonos/types";
import { ReportTableActions } from "@/components/molecules/ReportTableActions";
import { CursorPaginationBar } from "@/components/molecules/CursorPaginationBar";
import { KpiRow } from "@/components/organisms/KpiRow";
import { ChartPanel } from "@/components/organisms/ChartPanel";
import type { KpiCardConfig } from "@vonos/types";
import { useOffsetPage } from "@/lib/hooks/useOffsetPage";
import { formatCurrency, formatCurrencyCompact, formatNumber, formatNumberCompact } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import {
  isReportCurrencyDisplayKey,
  reportColumnTotalKind,
  resolveReportColumnTotals,
} from "@/lib/utils/reportTableTotals";
import { TABLE_REPORT_PAGE_SIZE } from "@/lib/registries/reportTableUi";
import { cn } from "@/lib/utils/cn";

export interface ReportTablePagination {
  pageIndex: number;
  pageSize: number;
  hasMore: boolean;
  canGoPrev: boolean;
  isBusy?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPageSizeChange: (size: number) => void;
  onPageSelect?: (pageIndex: number) => void;
  canSelectPage?: (pageIndex: number) => boolean;
  totalPages?: number;
  totalItems?: number;
}

export interface ReportDetailSheetProps {
  title: string;
  subtitle: string;
  entityLabel?: string;
  data: ReportsDashboard;
  generatedAt?: Date;
  showCharts?: boolean;
  onRowClick?: (row: ReportsTableRow & { id: string }) => void;
  onRowAction?: (action: ReportRowAction) => void;
  chartGridClassName?: string;
  kpiClassName?: string;
  /** When true, render table above charts (activity-log style). */
  tableFirst?: boolean;
  tablePagination?: ReportTablePagination;
}

function formatKpiValue(kpi: ReportsKpi): string {
  if (kpi.currency) return formatCurrencyCompact(kpi.value, kpi.currency);
  return formatNumberCompact(kpi.value);
}

function kpiToCards(kpis: ReportsKpi[]): KpiCardConfig[] {
  return kpis.map((kpi) => ({
    label: kpi.label,
    icon: kpi.icon,
    metricKey: kpi.metricKey,
    color: kpi.color,
  }));
}

function formatReportCell(
  colKey: string,
  raw: string | number | ReportRowAction[] | undefined,
  currency?: string,
): string {
  if (raw === null || raw === undefined || Array.isArray(raw)) return "—";
  if (typeof raw === "number" && isReportCurrencyDisplayKey(colKey)) {
    return formatCurrency(raw, currency ?? "NGN");
  }
  return String(raw);
}

const QTY_ALERT_KEYS = [
  "quantity",
  "qty",
  "sellQuantity",
  "locationQty",
  "itemTotal",
  "units",
  "totalUnits",
] as const;

function rowNeedsStockAlert(row: ReportsTableRow & { id: string }): boolean {
  const status = String(row.status ?? "").toLowerCase().replace(/_/g, " ");
  if (
    status.includes("out of stock") ||
    status.includes("low stock") ||
    status === "out of stock" ||
    status === "low stock"
  ) {
    return true;
  }
  for (const key of QTY_ALERT_KEYS) {
    const value = row[key];
    if (typeof value === "number" && value <= 0) return true;
  }
  return false;
}

function rowMatchesSearch(
  row: ReportsTableRow & { id: string },
  columns: ReportsTable["columns"],
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return columns.some((col) => {
    const raw = row[col.key];
    if (raw == null || Array.isArray(raw)) return false;
    return String(raw).toLowerCase().includes(q);
  });
}

function ReportTable({
  table,
  currency,
  onRowClick,
  onRowAction,
  pagination,
}: {
  table: ReportsTable;
  currency?: string;
  onRowClick?: (row: ReportsTableRow & { id: string }) => void;
  onRowAction?: (action: ReportRowAction) => void;
  pagination?: ReportTablePagination;
}) {
  const allRows = useMemo(
    () =>
      table.rows.map((row, index) => ({
        id: String(row.id ?? `row-${index}`),
        ...row,
      })),
    [table.rows],
  );

  const [tableSearch, setTableSearch] = useState("");

  const filteredRows = useMemo(
    () => allRows.filter((row) => rowMatchesSearch(row, table.columns, tableSearch)),
    [allRows, table.columns, tableSearch],
  );

  const offsetPagination = useOffsetPage(filteredRows, { resetKey: tableSearch });

  const clientPagination: ReportTablePagination = {
    pageIndex: offsetPagination.pageIndex,
    pageSize: offsetPagination.pageSize,
    hasMore: offsetPagination.hasMore,
    canGoPrev: offsetPagination.canGoPrev,
    onPrev: offsetPagination.goPrev,
    onNext: offsetPagination.goNext,
    onPageSizeChange: offsetPagination.setPageSize,
    onPageSelect: offsetPagination.setPageIndex,
    totalPages: offsetPagination.totalPages,
    totalItems: offsetPagination.totalItems,
  };

  const activePagination = pagination ?? clientPagination;
  const serverPaginated = Boolean(pagination);
  const rows = pagination
    ? allRows
    : offsetPagination.pageRows;

  const showActions =
    Boolean(onRowAction) &&
    allRows.some((row) => row.actions && row.actions.length > 0);

  const totals = useMemo(
    () =>
      resolveReportColumnTotals(
        table.columns,
        tableSearch.trim() ? filteredRows : table.rows,
        tableSearch.trim() ? undefined : table.columnTotals,
      ),
    [table.columns, table.rows, table.columnTotals, filteredRows, tableSearch],
  );
  const hasTotals = Object.keys(totals).length > 0;
  const totalLabelColIndex = table.columns.findIndex((col) => !(col.key in totals));

  const paginationBar = (placement: "top" | "bottom") => (
    <CursorPaginationBar
      pageIndex={activePagination.pageIndex}
      pageSize={activePagination.pageSize}
      itemCount={rows.length}
      hasMore={activePagination.hasMore}
      canGoPrev={activePagination.canGoPrev}
      onPrev={activePagination.onPrev}
      onNext={activePagination.onNext}
      onPageSizeChange={activePagination.onPageSizeChange}
      onPageSelect={activePagination.onPageSelect}
      canSelectPage={activePagination.canSelectPage}
      totalPages={activePagination.totalPages}
      totalItems={activePagination.totalItems}
      isBusy={activePagination.isBusy}
      className={
        placement === "top"
          ? "border-b border-t-0 border-[var(--color-border-subtle)]"
          : undefined
      }
    />
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {paginationBar("top")}
      {!serverPaginated ? (
        <div className="border-b border-border bg-card px-3 py-2 print:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search table…"
              className="h-9 w-full rounded-md border border-border bg-[var(--color-surface-muted)]/40 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              aria-label="Search table rows"
            />
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-b border-border bg-[var(--color-surface-muted)]/50 text-left text-xs text-muted">
              {table.columns.map((col) => (
                <th key={col.key} className="px-4 py-2.5 font-medium">
                  {col.header}
                </th>
              ))}
              {showActions ? (
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.columns.length + (showActions ? 1 : 0)}
                  className="px-4 py-8 text-center text-muted"
                >
                  {tableSearch.trim()
                    ? "No rows match your search."
                    : "No rows for this period."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-border/60 last:border-b-0",
                    rowNeedsStockAlert(row) && "bg-red-50 dark:bg-red-950/30",
                    onRowClick && "cursor-pointer hover:bg-[var(--color-surface-muted)]",
                    onRowClick &&
                      rowNeedsStockAlert(row) &&
                      "hover:bg-red-100/80 dark:hover:bg-red-950/50",
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {table.columns.map((col) => {
                    const raw = row[col.key as keyof typeof row];
                    const kind = reportColumnTotalKind(col);
                    const display = formatReportCell(
                      col.key,
                      raw as string | number | ReportRowAction[] | undefined,
                      currency,
                    );
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
                  {showActions ? (
                    <td
                      className="px-4 py-2 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ReportTableActions
                        actions={row.actions}
                        onAction={(action) => onRowAction?.(action)}
                      />
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
          {hasTotals && filteredRows.length > 0 ? (
            <tfoot>
              <tr className="border-t-2 border-border bg-[var(--color-surface-muted)]/70 text-sm font-semibold text-foreground">
                {table.columns.map((col, index) => {
                  const total = totals[col.key];
                  if (total) {
                    const display =
                      total.kind === "currency"
                        ? formatCurrency(total.value, currency ?? "NGN")
                        : formatNumber(total.value);
                    return (
                      <td
                        key={col.key}
                        className="px-4 py-3 text-right tabular-nums"
                      >
                        {display}
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
                {showActions ? <td className="px-4 py-3" /> : null}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      {paginationBar("bottom")}
    </div>
  );
}

export function ReportDetailSheet({
  title,
  subtitle,
  entityLabel,
  data,
  generatedAt = new Date(),
  showCharts = false,
  onRowClick,
  onRowAction,
  chartGridClassName = "grid gap-6 lg:grid-cols-2",
  kpiClassName,
  tableFirst = false,
  tablePagination,
}: ReportDetailSheetProps) {
  const kpiValues = useMemo(
    () =>
      Object.fromEntries(
        (data.kpis ?? []).map((kpi) => [kpi.metricKey, formatKpiValue(kpi)]),
      ),
    [data.kpis],
  );

  const currency = data.kpis.find((k) => k.currency)?.currency;

  const kpiBlock =
    data.kpis.length > 0 ? (
      <div className={cn("px-6 py-2 sm:px-8 print:px-0", kpiClassName)}>
        <KpiRow cards={kpiToCards(data.kpis)} values={kpiValues} />
      </div>
    ) : null;

  const tableBlock = data.table ? (
    <div className="px-6 pb-6 sm:px-8 sm:pb-8">
      <ReportTable
        table={data.table}
        currency={currency}
        onRowClick={onRowClick}
        onRowAction={onRowAction}
        pagination={tablePagination}
      />
    </div>
  ) : (
    <p className="px-6 pb-6 text-sm text-muted sm:px-8 sm:pb-8">
      No detail table for this report.
    </p>
  );

  const chartsBlock =
    showCharts && data.charts.length > 0 ? (
      <div className={cn("px-6 pb-4 sm:px-8 print:px-0", chartGridClassName)}>
        {data.charts.map((chart) => (
          <div
            key={chart.id}
            className="rounded-xl border border-border bg-[var(--color-surface-muted)]/30 p-5 sm:p-6"
          >
            <ChartPanel
              title={chart.title}
              subtitle={chart.subtitle}
              type={chart.type}
              data={chart.data}
              series={chart.series}
              horizontal={chart.horizontal}
              hidePeriodControl
            />
          </div>
        ))}
      </div>
    ) : null;

  return (
    <div
      data-print-root
      className="space-y-6 overflow-hidden rounded-xl border border-border bg-card shadow-card print:border-0 print:shadow-none"
    >
      <div className="border-b border-border px-6 py-5 sm:px-8 sm:py-6 print:px-0">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {entityLabel ? (
          <p className="mt-0.5 text-sm font-medium text-foreground">{entityLabel}</p>
        ) : null}
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <p className="mt-1 text-xs text-muted">Generated {formatDate(generatedAt)}</p>
      </div>

      {kpiBlock}

      {tableFirst ? (
        <>
          {tableBlock}
          {chartsBlock}
        </>
      ) : (
        <>
          {chartsBlock}
          {tableBlock}
        </>
      )}
    </div>
  );
}
