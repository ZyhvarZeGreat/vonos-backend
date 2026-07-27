"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import type {
  ReportsDashboard,
  ReportsTable,
  ReportsTableRow,
  TaxReportSummary,
  TaxReportTableSide,
} from "@vonos/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import {
  reportColumnTotalKind,
  resolveReportColumnTotals,
} from "@/lib/utils/reportTableTotals";
import { cn } from "@/lib/utils/cn";
import { CursorPaginationBar } from "@/components/molecules/CursorPaginationBar";
import { ReportTableSearchBar } from "@/components/molecules/ReportTableSearchBar";
import { useCursorPage } from "@/lib/hooks/useCursorPage";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { TABLE_REPORT_PAGE_SIZE } from "@/lib/registries/reportTableUi";
import { runReport } from "@/lib/api/reports";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { Hq6ReportDataTable } from "@/components/hq6/Hq6ReportDataTable";

function rowMatchesSearch(row: ReportsTableRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return Object.entries(row).some(([key, value]) => {
    if (key === "actions" || value == null || Array.isArray(value)) return false;
    return String(value).toLowerCase().includes(q);
  });
}

function formatTaxAmount(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function InfoTip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex shrink-0 text-[var(--color-info)]"
      title={label}
      aria-label={label}
    >
      <Info className="size-3.5" strokeWidth={2.25} />
    </span>
  );
}

function SummaryCard({
  title,
  titleTip,
  children,
  hq6 = false,
}: {
  title: string;
  titleTip?: string;
  children: ReactNode;
  hq6?: boolean;
}) {
  if (hq6) {
    return (
      <div className="tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
        <div className="tw-p-2 sm:tw-p-3">
          <div className="box-header">
            <h3 className="box-title">
              {title}
              {titleTip ? <InfoTip label={titleTip} /> : null}
            </h3>
          </div>
          <div className="tw-flow-root tw-border-gray-200">
            <div className="tw-py-2 tw-align-middle sm:tw-px-5">
              <table className="table table-striped">
                <tbody>{children}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <header className="flex items-center gap-1.5 border-b border-border px-4 py-3">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {titleTip ? <InfoTip label={titleTip} /> : null}
      </header>
      <div className="divide-y divide-border/60">{children}</div>
    </section>
  );
}

function MetricRow({
  label,
  value,
  currency,
  muted,
  tip,
  hq6 = false,
}: {
  label: string;
  value: number;
  currency: string;
  muted?: boolean;
  tip?: string;
  hq6?: boolean;
}) {
  if (hq6) {
    return (
      <tr className={muted ? "bg-gray" : undefined}>
        <th>
          {label}
          {tip ? (
            <>
              {" "}
              <InfoTip label={tip} />
            </>
          ) : null}
        </th>
        <td>
          <span className="display_currency">
            {formatTaxAmount(value, currency)}
          </span>
        </td>
      </tr>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-2.5 text-sm",
        muted ? "bg-[var(--color-surface-muted)]/70" : "bg-card",
      )}
    >
      <span className="flex items-center gap-1.5 font-semibold text-foreground">
        {label}
        {tip ? <InfoTip label={tip} /> : null}
      </span>
      <span className="tabular-nums text-foreground">
        {formatTaxAmount(value, currency)}
      </span>
    </div>
  );
}

function ReportTableFooter({
  table,
  currency,
}: {
  table: ReportsTable;
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
                {total.kind === "currency" ||
                reportColumnTotalKind(col) === "currency"
                  ? formatCurrency(total.value, currency)
                  : total.value}
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

function InvoiceTableSection({
  title,
  subtitle,
  side,
  seed,
  reportId,
  tenantId,
  from,
  to,
  currency,
  detailed,
}: {
  title: string;
  subtitle: string;
  side: TaxReportTableSide;
  seed?: ReportsTable | null;
  reportId: "tax" | "purchase-sale";
  tenantId?: string;
  from?: string;
  to?: string;
  currency: string;
  detailed: boolean;
}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [pageSize, setPageSize] = useState(
    seed?.pageSize ?? TABLE_REPORT_PAGE_SIZE,
  );
  const {
    cursor,
    pageIndex,
    canGoPrev,
    goNext,
    goPrev,
    goToPage,
    maxReachablePageIndex,
    reset,
  } = useCursorPage();

  useEffect(() => {
    reset();
  }, [debouncedSearch, pageSize, from, to, tenantId, reset]);

  const needsServerPage =
    Boolean(tenantId) &&
    (Boolean(cursor) || Boolean(debouncedSearch.trim()) || pageSize !== (seed?.pageSize ?? TABLE_REPORT_PAGE_SIZE));

  const pageQuery = useQuery({
    queryKey: [
      "tax-table-page",
      reportId,
      tenantId,
      side,
      from ?? "all",
      to ?? "all",
      cursor ?? "first",
      pageSize,
      debouncedSearch.trim(),
    ],
    queryFn: async () => {
      if (!tenantId) return null;
      const data = await runReport({
        reportId,
        tenantId,
        from,
        to,
        taxTable: side,
        cursor,
        limit: pageSize,
        search: debouncedSearch.trim() || undefined,
      });
      return data.taxTables?.[side] ?? null;
    },
    enabled: needsServerPage,
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });

  const table: ReportsTable | null =
    (needsServerPage ? pageQuery.data : null) ?? seed ?? null;

  const filteredRows = useMemo(() => {
    if (!table) return [];
    // Server already filtered when searching via API.
    if (needsServerPage && debouncedSearch.trim()) return table.rows;
    return table.rows.filter((row) => rowMatchesSearch(row, search));
  }, [table, search, needsServerPage, debouncedSearch]);

  const isHq6 = useIsVaHq6();

  if (!table) return null;

  const displayTable: ReportsTable = {
    ...table,
    rows: filteredRows,
  };
  const isBusy = pageQuery.isFetching && !pageQuery.isLoading;

  if (isHq6) {
    return (
      <Hq6ReportDataTable
        table={displayTable}
        currency={currency}
        tableId={`tax_${side}_table`}
        title={
          <>
            {title}
            <small className="text-muted tw-ml-2 tw-text-xs tw-font-normal">
              {subtitle}
            </small>
          </>
        }
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={
          detailed
            ? "Search invoices, tax number, parties…"
            : "Search invoices, parties, payment…"
        }
        pageIndex={pageIndex}
        pageSize={pageSize}
        hasMore={Boolean(table.hasMore)}
        canGoPrev={canGoPrev}
        isBusy={isBusy}
        onPrev={goPrev}
        onNext={() => {
          if (table.nextCursor) goNext(table.nextCursor);
        }}
        onPageSizeChange={(size) => {
          setPageSize(size);
          reset();
        }}
        onPageSelect={goToPage}
        canSelectPage={(index) => index <= maxReachablePageIndex}
        renderCell={(colKey, raw) => {
          if (colKey === "reference") {
            return (
              <span className="label bg-info">
                {String(raw ?? "—")}
              </span>
            );
          }
          if (colKey === "type") {
            const label = String(raw ?? "—");
            const isSale =
              label.toLowerCase().includes("sale") ||
              label.toLowerCase().includes("job");
            return (
              <span
                className={cn(
                  "label",
                  isSale ? "bg-green" : "bg-aqua",
                )}
              >
                {label}
              </span>
            );
          }
          return undefined;
        }}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
      </div>
      <CursorPaginationBar
        pageIndex={pageIndex}
        pageSize={pageSize}
        itemCount={filteredRows.length}
        hasMore={Boolean(table.hasMore)}
        canGoPrev={canGoPrev}
        onPrev={goPrev}
        onNext={() => {
          if (table.nextCursor) goNext(table.nextCursor);
        }}
        onPageSizeChange={(size) => {
          setPageSize(size);
          reset();
        }}
        onPageSelect={goToPage}
        canSelectPage={(index) => index <= maxReachablePageIndex}
        isBusy={isBusy}
        className="border-b border-t-0 border-[var(--color-border-subtle)]"
      />
      <ReportTableSearchBar
        value={search}
        onChange={setSearch}
        placeholder={
          detailed
            ? "Search invoices, tax number, parties…"
            : "Search invoices, parties, payment…"
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-sm">
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
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.columns.length}
                  className="px-4 py-8 text-center text-muted"
                >
                  {search.trim()
                    ? "No rows match your search."
                    : "No rows for this period."}
                </td>
              </tr>
            ) : (
              filteredRows.map((row, index) => (
                <tr
                  key={`${side}-${String(row.id ?? index)}`}
                  className="border-b border-border/60 align-top"
                >
                  {table.columns.map((col) => {
                    const raw = row[col.key];
                    const kind = reportColumnTotalKind(col);
                    if (col.key === "reference") {
                      return (
                        <td key={col.key} className="px-4 py-2">
                          <span className="inline-flex rounded border border-sky-300 px-2 py-0.5 text-xs font-semibold text-sky-700">
                            {String(raw ?? "—")}
                          </span>
                        </td>
                      );
                    }
                    if (col.key === "type") {
                      const label = String(raw ?? "—");
                      const isSale =
                        label.toLowerCase().includes("sale") ||
                        label.toLowerCase().includes("job");
                      return (
                        <td key={col.key} className="px-4 py-2">
                          <span
                            className={cn(
                              "inline-flex rounded px-2 py-0.5 text-xs font-semibold",
                              isSale
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-sky-50 text-sky-700",
                            )}
                          >
                            {label}
                          </span>
                        </td>
                      );
                    }
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
              ))
            )}
          </tbody>
          <ReportTableFooter table={displayTable} currency={currency} />
        </table>
      </div>
      <CursorPaginationBar
        pageIndex={pageIndex}
        pageSize={pageSize}
        itemCount={filteredRows.length}
        hasMore={Boolean(table.hasMore)}
        canGoPrev={canGoPrev}
        onPrev={goPrev}
        onNext={() => {
          if (table.nextCursor) goNext(table.nextCursor);
        }}
        onPageSizeChange={(size) => {
          setPageSize(size);
          reset();
        }}
        onPageSelect={goToPage}
        canSelectPage={(index) => index <= maxReachablePageIndex}
        isBusy={isBusy}
      />
    </section>
  );
}

export function TaxReportPanel({
  report,
  reportId = "tax",
  tenantId,
  from,
  to,
  onPrint,
}: {
  report: ReportsDashboard;
  reportId?: "tax" | "purchase-sale";
  tenantId?: string;
  from?: string;
  to?: string;
  onPrint?: () => void;
}) {
  const isHq6 = useIsVaHq6();
  const tax: TaxReportSummary = report.taxReport ?? {
    currency: "NGN",
    purchases: { total: 0, includingTax: 0, returnIncludingTax: 0, due: 0 },
    sales: { total: 0, includingTax: 0, returnIncludingTax: 0, due: 0 },
    overall: { saleMinusPurchase: 0, dueAmount: 0 },
  };
  const { currency } = tax;
  const detailed = reportId === "tax";
  const purchasesTable = report.taxTables?.purchases;
  const salesTable = report.taxTables?.sales;
  const hasSplit = Boolean(purchasesTable || salesTable);
  const legacyTable = !hasSplit ? report.table : null;
  const showTables = !(isHq6 && reportId === "purchase-sale");

  return (
    <div className="space-y-6" data-print-root>
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
        <div className={isHq6 ? "col-xs-6" : undefined}>
          <SummaryCard title="Purchases" hq6={isHq6}>
            <MetricRow
              label="Total Purchase:"
              value={tax.purchases.total}
              currency={currency}
              muted
              hq6={isHq6}
            />
            <MetricRow
              label="Purchase Including tax:"
              value={tax.purchases.includingTax}
              currency={currency}
              hq6={isHq6}
            />
            <MetricRow
              label="Total Purchase Return Including Tax:"
              value={tax.purchases.returnIncludingTax}
              currency={currency}
              muted
              hq6={isHq6}
            />
            <MetricRow
              label="Purchase Due:"
              value={tax.purchases.due}
              currency={currency}
              tip="Total unpaid amount for purchases."
              hq6={isHq6}
            />
          </SummaryCard>
        </div>

        <div className={isHq6 ? "col-xs-6" : undefined}>
          <SummaryCard title="Sales" hq6={isHq6}>
            <MetricRow
              label="Total Sale:"
              value={tax.sales.total}
              currency={currency}
              muted
              hq6={isHq6}
            />
            <MetricRow
              label="Sale Including tax:"
              value={tax.sales.includingTax}
              currency={currency}
              hq6={isHq6}
            />
            <MetricRow
              label="Total Sell Return Including Tax:"
              value={tax.sales.returnIncludingTax}
              currency={currency}
              muted
              hq6={isHq6}
            />
            <MetricRow
              label="Sale Due:"
              value={tax.sales.due}
              currency={currency}
              tip="Total unpaid amount for sales."
              hq6={isHq6}
            />
          </SummaryCard>
        </div>
      </div>

      <SummaryCard
        title="Overall ((Sale - Sell Return) - (Purchase - Purchase Return) )"
        titleTip="Net of returns: (sales − sell returns) − (purchases − purchase returns)"
        hq6={isHq6}
      >
        {isHq6 ? (
          <>
            <MetricRow
              label="Sale - Purchase:"
              value={tax.overall.saleMinusPurchase}
              currency={currency}
              hq6
            />
            <MetricRow
              label="Due amount:"
              value={tax.overall.dueAmount}
              currency={currency}
              tip="Sale due - Purchase due"
              hq6
            />
          </>
        ) : (
          <div className="space-y-3 px-4 py-5">
            <MetricRow
              label="Sale - Purchase:"
              value={tax.overall.saleMinusPurchase}
              currency={currency}
            />
            <MetricRow
              label="Due amount:"
              value={tax.overall.dueAmount}
              currency={currency}
              tip="Sale due - Purchase due"
            />
          </div>
        )}
      </SummaryCard>

      {showTables && hasSplit ? (
        <div className="space-y-6">
          <InvoiceTableSection
            title="Input tax — purchases"
            subtitle="Purchase invoices and inbound documents for the selected period"
            side="purchases"
            seed={purchasesTable}
            reportId={reportId}
            tenantId={tenantId}
            from={from}
            to={to}
            currency={currency}
            detailed={detailed}
          />
          <InvoiceTableSection
            title="Output tax — sales"
            subtitle="Sale and job invoices for the selected period"
            side="sales"
            seed={salesTable}
            reportId={reportId}
            tenantId={tenantId}
            from={from}
            to={to}
            currency={currency}
            detailed={detailed}
          />
        </div>
      ) : showTables && legacyTable?.rows.length ? (
        <InvoiceTableSection
          title="Period invoices — purchases & sales"
          subtitle="Invoice / reference numbers, parties, tax, and payment for the selected period"
          side="sales"
          seed={legacyTable}
          reportId={reportId}
          tenantId={tenantId}
          from={from}
          to={to}
          currency={currency}
          detailed={detailed}
        />
      ) : showTables ? (
        <section className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted shadow-card">
          No sale or purchase documents in this period yet.
        </section>
      ) : null}
    </div>
  );
}
