"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ProfitLossBreakdownTab,
  ProfitLossReport,
  ReportsTable,
} from "@vonos/types";
import { useQuery } from "@tanstack/react-query";
import { runReport, type ReportRunMode } from "@/lib/api/reports";
import { useOffsetPage } from "@/lib/hooks/useOffsetPage";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { cn } from "@/lib/utils/cn";
import { Skeleton } from "@/components/atoms/Skeleton";
import { DataTableSkeleton } from "@/components/organisms/skeletons";
import { CursorPaginationBar } from "@/components/molecules/CursorPaginationBar";
import { ReportTableSearchBar } from "@/components/molecules/ReportTableSearchBar";
import { TABLE_REPORT_PAGE_SIZE } from "@/lib/registries/reportTableUi";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { UposDataTablesShell } from "@/components/upos/UposDataTablesShell";
import { UposNavTabs } from "@/components/upos/UposNavTabs";
import { Hq6UposCard } from "@/components/hq6/Hq6UposCard";

const BREAKDOWN_TABS: Array<{
  id: ProfitLossBreakdownTab;
  label: string;
  iconClass: string;
}> = [
  { id: "product", label: "Profit by products", iconClass: "fa fa-cubes" },
  { id: "category", label: "Profit by categories", iconClass: "fa fa-tags" },
  { id: "brand", label: "Profit by brands", iconClass: "fa fa-diamond" },
  { id: "location", label: "Profit by locations", iconClass: "fa fa-map-marker" },
  { id: "invoice", label: "Profit by invoice", iconClass: "fa fa-file-text" },
  { id: "date", label: "Profit by date", iconClass: "fa fa-calendar" },
  { id: "customer", label: "Profit by customer", iconClass: "fa fa-user" },
  { id: "day", label: "Profit by day", iconClass: "fa fa-clock-o" },
  {
    id: "service-staff",
    label: "Profit by service staff",
    iconClass: "fa fa-user-secret",
  },
];

function LineList({
  lines,
  currency,
  hq6 = false,
}: {
  lines: Array<{ key?: string; label: string; amount: number }>;
  currency: string;
  hq6?: boolean;
}) {
  if (hq6) {
    return (
      <table className="table table-striped">
        <tbody>
          {lines.map((line) => {
            const noteMatch = line.label.match(/^(.+?)\s*\((.+)\)$/);
            const title = noteMatch?.[1] ?? line.label;
            const note = noteMatch?.[2];
            return (
              <tr key={line.key ?? line.label}>
                <th>
                  {title}
                  {note ? (
                    <>
                      <br />
                      <small className="text-muted">({note})</small>
                    </>
                  ) : null}
                  :
                </th>
                <td>
                  <span className="display_currency">
                    {formatCurrency(line.amount, currency)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }
  return (
    <ul className="space-y-2 text-sm">
      {lines.map((line) => (
        <li
          key={line.key ?? line.label}
          className="flex items-start justify-between gap-4"
        >
          <span className="text-muted">{line.label}</span>
          <span className="shrink-0 font-medium tabular-nums text-foreground">
            {formatCurrency(line.amount, currency)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function BreakdownTable({
  table,
  currency,
  hq6 = false,
}: {
  table: ReportsTable;
  currency: string;
  hq6?: boolean;
}) {
  const [search, setSearch] = useState("");
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return table.rows;
    return table.rows.filter((row) =>
      table.columns.some((col) => {
        const raw = row[col.key];
        if (raw == null || Array.isArray(raw)) return false;
        return String(raw).toLowerCase().includes(q);
      }),
    );
  }, [search, table.columns, table.rows]);
  const pagination = useOffsetPage(filteredRows, {
    resetKey: `${table.rows.length}:${search}`,
    defaultPageSize: TABLE_REPORT_PAGE_SIZE,
  });
  const pageRows = pagination.pageRows;

  const tableEl = (
    <table
      className={
        hq6
          ? "table table-bordered table-striped ajax_view dataTable w-full"
          : "w-full min-w-[24rem] text-sm"
      }
    >
      <thead>
        <tr
          className={
            hq6
              ? undefined
              : "border-b border-border bg-[var(--color-surface-muted)]/50 text-left text-xs text-muted"
          }
        >
          {table.columns.map((col) => (
            <th
              key={col.key}
              className={hq6 ? undefined : "px-4 py-2.5 font-medium"}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {pageRows.length === 0 ? (
          <tr className={hq6 ? "odd" : undefined}>
            <td
              colSpan={table.columns.length}
              className={
                hq6 ? "dataTables_empty" : "px-4 py-8 text-center text-muted"
              }
              style={hq6 ? { textAlign: "center" } : undefined}
            >
              {search.trim()
                ? "No rows match your search."
                : hq6
                  ? "No data available in table"
                  : "No data for this period."}
            </td>
          </tr>
        ) : (
          pageRows.map((row, index) => (
            <tr
              key={String(row.id ?? index)}
              className={
                hq6
                  ? index % 2 === 0
                    ? "odd"
                    : "even"
                  : "border-b border-border/60 last:border-b-0"
              }
            >
              {table.columns.map((col) => {
                const raw = row[col.key];
                const display =
                  (col.key === "grossProfit" ||
                    col.key === "revenue" ||
                    col.key === "amount") &&
                  typeof raw === "number"
                    ? formatCurrency(raw, currency)
                    : String(raw ?? "—");
                return (
                  <td
                    key={col.key}
                    className={hq6 ? undefined : "px-4 py-2 text-foreground"}
                  >
                    {display}
                  </td>
                );
              })}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  if (hq6) {
    return (
      <Hq6UposCard>
        <UposDataTablesShell
          tableId="pl_breakdown_table"
          pageSize={pagination.pageSize}
          onPageSizeChange={pagination.setPageSize}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search ..."
          pageIndex={pagination.pageIndex}
          itemCount={pageRows.length}
          totalItems={pagination.totalItems}
          hasMore={pagination.hasMore}
          canGoPrev={pagination.canGoPrev}
          onPrev={pagination.goPrev}
          onNext={pagination.goNext}
          onPageSelect={pagination.setPageIndex}
          onPrint={() => window.print()}
        >
          {tableEl}
        </UposDataTablesShell>
      </Hq6UposCard>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
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
        placeholder="Search breakdown…"
      />
      <div className="overflow-x-auto">{tableEl}</div>
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
  );
}

export function ProfitLossReportPanel({
  report,
  tenantId,
  from,
  to,
  locationCode,
  summaryLoading = false,
  onPrint,
}: {
  report: ProfitLossReport;
  tenantId?: string;
  from?: string;
  to?: string;
  locationCode?: string;
  summaryLoading?: boolean;
  onPrint?: () => void;
}) {
  const isHq6 = useIsVaHq6();
  const [activeTab, setActiveTab] = useState<ProfitLossBreakdownTab | null>(
    isHq6 ? "product" : null,
  );
  const { summary, breakdowns } = report;
  const currency = summary.currency;

  const breakdownQuery = useQuery({
    queryKey: [
      "report-pl-breakdown",
      tenantId,
      from ?? "all",
      to ?? "all",
      locationCode ?? "",
      activeTab,
    ],
    queryFn: async () => {
      if (!tenantId || !activeTab) return null;
      const data = await runReport({
        reportId: "profit-loss",
        from,
        to,
        tenantId,
        mode: "pl-breakdown" as ReportRunMode,
        breakdownTab: activeTab,
        ...(locationCode ? { locationCode } : {}),
      });
      return data.profitLoss?.breakdowns?.[activeTab] ?? null;
    },
    enabled: Boolean(tenantId && activeTab),
    staleTime: 5 * 60_000,
  });

  const activeTable =
    (activeTab ? breakdowns[activeTab] : undefined) ??
    breakdownQuery.data ??
    undefined;
  const breakdownLoading =
    Boolean(activeTab) && breakdownQuery.isLoading && !activeTable;

  useEffect(() => {
    if (isHq6 && activeTab == null) setActiveTab("product");
  }, [isHq6, activeTab]);

  return (
    <div className="space-y-4" data-print-root id="pl_data_div">
      {onPrint && !isHq6 ? (
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

      <div className={isHq6 ? "row" : "grid gap-4 lg:grid-cols-2"}>
        {summaryLoading ? (
          <>
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </>
        ) : isHq6 ? (
          <>
            <div className="col-md-6">
              <Hq6UposCard>
                <LineList lines={summary.debits} currency={currency} hq6 />
              </Hq6UposCard>
            </div>
            <div className="col-md-6">
              <Hq6UposCard>
                <LineList lines={summary.credits} currency={currency} hq6 />
              </Hq6UposCard>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
              <LineList lines={summary.debits} currency={currency} />
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
              <LineList lines={summary.credits} currency={currency} />
            </div>
          </>
        )}
      </div>

      {summaryLoading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : isHq6 ? (
        <div className="row">
          <div className="col-md-12">
            <Hq6UposCard>
              <h3 className="text-muted mb-0">
                COGS:{" "}
                <span className="display_currency">
                  {formatCurrency(summary.cogs, currency)}
                </span>
              </h3>
              <small className="help-block">
                Cost of Goods Sold = Starting inventory(opening stock) +
                purchases − ending inventory(closing stock)
              </small>
              <h3 className="text-muted mb-0">
                Gross Profit:{" "}
                <span className="display_currency">
                  {formatCurrency(summary.grossProfit, currency)}
                </span>
              </h3>
              <small className="help-block">
                (Total sell price - Total purchase price)
              </small>
              <h3 className="text-muted mb-0">
                Net Profit:{" "}
                <span
                  className={cn(
                    "display_currency",
                    summary.netProfit < 0 && "text-red",
                  )}
                >
                  {formatCurrency(summary.netProfit, currency)}
                </span>
              </h3>
              <small className="help-block">
                Gross Profit + other income − expenses / adjustments
              </small>
            </Hq6UposCard>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-card sm:px-6 sm:py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              COGS
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              {formatCurrency(summary.cogs, currency)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-card sm:px-6 sm:py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Gross Profit
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              {formatCurrency(summary.grossProfit, currency)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-card sm:px-6 sm:py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Net Profit
            </p>
            <p
              className={cn(
                "mt-1 text-lg font-semibold tabular-nums",
                summary.netProfit < 0 ? "text-red-600" : "text-emerald-700",
              )}
            >
              {formatCurrency(summary.netProfit, currency)}
            </p>
          </div>
        </div>
      )}

      {isHq6 ? (
        <div className="row no-print">
          <div className="col-md-12">
            <UposNavTabs
              tabs={BREAKDOWN_TABS.map((tab) => ({
                id: tab.id,
                label: tab.label,
                iconClass: tab.iconClass,
                active: activeTab === tab.id,
                onClick: () => setActiveTab(tab.id),
              }))}
              actions={
                onPrint ? (
                  <button
                    type="button"
                    onClick={onPrint}
                    className="tw-dw-btn tw-dw-btn-xs tw-bg-gradient-to-r tw-from-indigo-500 tw-to-blue-500 tw-text-white tw-mr-2"
                  >
                    <i className="fa fa-print" aria-hidden /> Print
                  </button>
                ) : null
              }
            >
              <div className="tab-pane active">
                {breakdownLoading ? (
                  <DataTableSkeleton
                    rows={8}
                    columns={4}
                    withPagination={false}
                  />
                ) : activeTab && activeTable ? (
                  <BreakdownTable
                    table={activeTable}
                    currency={currency}
                    hq6
                  />
                ) : (
                  <p className="text-sm text-muted tw-p-3">
                    Select a breakdown tab above to load detail.
                  </p>
                )}
              </div>
            </UposNavTabs>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-1 border-b border-border pb-1">
              {BREAKDOWN_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "whitespace-nowrap rounded-t-md px-3 py-2 text-xs font-medium transition-colors",
                    activeTab === tab.id
                      ? "border border-b-0 border-border bg-card text-foreground"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {breakdownLoading ? (
            <DataTableSkeleton rows={8} columns={4} withPagination={false} />
          ) : activeTab && activeTable ? (
            <BreakdownTable
              table={activeTable}
              currency={currency}
              hq6={false}
            />
          ) : (
            <p className="text-sm text-muted">
              Select a breakdown tab above to load detail.
            </p>
          )}
        </>
      )}
    </div>
  );
}
