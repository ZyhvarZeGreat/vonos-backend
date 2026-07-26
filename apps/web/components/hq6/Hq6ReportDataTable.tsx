"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { ReportsTable, ReportsTableRow, ReportRowAction } from "@vonos/types";
import { UposDataTablesShell } from "@/components/upos/UposDataTablesShell";
import { Hq6UposCard } from "@/components/hq6/Hq6UposCard";
import { useOffsetPage } from "@/lib/hooks/useOffsetPage";
import { TABLE_REPORT_PAGE_SIZE } from "@/lib/registries/reportTableUi";
import {
  isReportCurrencyDisplayKey,
  reportColumnTotalKind,
  resolveReportColumnTotals,
} from "@/lib/utils/reportTableTotals";
import { formatCurrency, formatNumber } from "@/lib/utils/formatCurrency";
import { cn } from "@/lib/utils/cn";

function formatCell(
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

function rowMatchesSearch(
  row: ReportsTableRow,
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

export interface Hq6ReportDataTableProps {
  table: ReportsTable;
  currency?: string;
  tableId?: string;
  title?: ReactNode;
  /** Controlled search (server-side). When set with pagination, skips client filter. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Server pagination — when omitted, client offset paging is used. */
  pageIndex?: number;
  pageSize?: number;
  hasMore?: boolean;
  canGoPrev?: boolean;
  isBusy?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onPageSizeChange?: (size: number) => void;
  onPageSelect?: (index: number) => void;
  canSelectPage?: (index: number) => boolean;
  totalItems?: number;
  renderCell?: (
    colKey: string,
    raw: unknown,
    row: ReportsTableRow,
  ) => ReactNode | undefined;
  emptyMessage?: string;
  className?: string;
}

/**
 * Global UPOS report table — same DataTables chrome as list pages
 * (Show entries | export buttons | search | striped table | info | paginate).
 */
export function Hq6ReportDataTable({
  table,
  currency,
  tableId = "hq6_report_table",
  title,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search ...",
  pageIndex: controlledPageIndex,
  pageSize: controlledPageSize,
  hasMore: controlledHasMore,
  canGoPrev: controlledCanGoPrev,
  isBusy,
  onPrev,
  onNext,
  onPageSizeChange,
  onPageSelect,
  canSelectPage,
  totalItems,
  renderCell,
  emptyMessage = "No data available in table",
  className,
}: Hq6ReportDataTableProps) {
  const [localSearch, setLocalSearch] = useState("");
  const controlled = onSearchChange != null;
  const tableSearch = controlled ? (searchValue ?? "") : localSearch;
  const setTableSearch = controlled ? onSearchChange : setLocalSearch;

  const serverPaged = controlledPageIndex != null && onNext != null;
  const filteredRows = useMemo(() => {
    if (serverPaged && controlled) return table.rows;
    return table.rows.filter((row) =>
      rowMatchesSearch(row, table.columns, tableSearch),
    );
  }, [table.rows, table.columns, tableSearch, serverPaged, controlled]);

  const offset = useOffsetPage(filteredRows, {
    resetKey: tableSearch,
    defaultPageSize: TABLE_REPORT_PAGE_SIZE,
  });

  const pageIndex = serverPaged ? controlledPageIndex! : offset.pageIndex;
  const pageSize = serverPaged
    ? (controlledPageSize ?? TABLE_REPORT_PAGE_SIZE)
    : offset.pageSize;
  const rows = serverPaged ? filteredRows : offset.pageRows;
  const hasMore = serverPaged ? Boolean(controlledHasMore) : offset.hasMore;
  const canGoPrev = serverPaged
    ? Boolean(controlledCanGoPrev)
    : offset.canGoPrev;
  const resolvedTotal = serverPaged ? totalItems : offset.totalItems;

  const totals = useMemo(
    () =>
      resolveReportColumnTotals(
        table.columns,
        !serverPaged && tableSearch.trim() ? filteredRows : table.rows,
        !serverPaged && tableSearch.trim() ? undefined : table.columnTotals,
      ),
    [
      table.columns,
      table.rows,
      table.columnTotals,
      filteredRows,
      tableSearch,
      serverPaged,
    ],
  );
  const hasTotals = Object.keys(totals).length > 0;
  const totalLabelColIndex = table.columns.findIndex(
    (col) => !(col.key in totals),
  );

  const tableEl = (
    <table className="table table-bordered table-striped ajax_view dataTable w-full">
      <thead>
        <tr>
          {table.columns.map((col) => (
            <th key={col.key}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr className="odd">
            <td
              colSpan={table.columns.length}
              className="dataTables_empty"
              style={{ textAlign: "center" }}
            >
              {tableSearch.trim()
                ? "No rows match your search."
                : emptyMessage}
            </td>
          </tr>
        ) : (
          rows.map((row, index) => (
            <tr
              key={String(row.id ?? index)}
              className={index % 2 === 0 ? "odd" : "even"}
            >
              {table.columns.map((col) => {
                const raw = row[col.key];
                const custom = renderCell?.(col.key, raw, row);
                if (custom !== undefined) {
                  return <td key={col.key}>{custom}</td>;
                }
                const kind = reportColumnTotalKind(col);
                return (
                  <td
                    key={col.key}
                    className={cn(kind && "text-right")}
                  >
                    {formatCell(
                      col.key,
                      raw as string | number | ReportRowAction[] | undefined,
                      currency,
                    )}
                  </td>
                );
              })}
            </tr>
          ))
        )}
      </tbody>
      {hasTotals && filteredRows.length > 0 ? (
        <tfoot>
          <tr>
            {table.columns.map((col, index) => {
              const total = totals[col.key];
              if (total) {
                const display =
                  total.kind === "currency"
                    ? formatCurrency(total.value, currency ?? "NGN")
                    : formatNumber(total.value);
                return (
                  <td key={col.key} className="text-right">
                    {display}
                  </td>
                );
              }
              const showLabel =
                index === (totalLabelColIndex >= 0 ? totalLabelColIndex : 0);
              return <td key={col.key}>{showLabel ? "Total:" : null}</td>;
            })}
          </tr>
        </tfoot>
      ) : null}
    </table>
  );

  return (
    <div className={cn("row", className)}>
      <div className="col-md-12">
        <Hq6UposCard title={title}>
          <UposDataTablesShell
            tableId={tableId}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange ?? offset.setPageSize}
            searchValue={tableSearch}
            onSearchChange={setTableSearch}
            searchPlaceholder={searchPlaceholder}
            pageIndex={pageIndex}
            itemCount={rows.length}
            totalItems={resolvedTotal}
            hasMore={hasMore}
            canGoPrev={canGoPrev}
            onPrev={onPrev ?? offset.goPrev}
            onNext={onNext ?? offset.goNext}
            onPageSelect={onPageSelect ?? offset.setPageIndex}
            canSelectPage={canSelectPage}
            isBusy={isBusy}
            onPrint={() => window.print()}
          >
            {tableEl}
          </UposDataTablesShell>
        </Hq6UposCard>
      </div>
    </div>
  );
}
