"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import type { ReportsDashboard, TaxReportSummary } from "@vonos/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import {
  reportColumnTotalKind,
  resolveReportColumnTotals,
} from "@/lib/utils/reportTableTotals";
import { cn } from "@/lib/utils/cn";
import { CursorPaginationBar } from "@/components/molecules/CursorPaginationBar";
import { TABLE_REPORT_PAGE_SIZE } from "@/lib/registries/reportTableUi";

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

function MetricRow({
  label,
  value,
  currency,
  muted,
  tip,
}: {
  label: string;
  value: number;
  currency: string;
  muted?: boolean;
  tip?: string;
}) {
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

function SummaryCard({
  title,
  titleTip,
  children,
}: {
  title: string;
  titleTip?: string;
  children: ReactNode;
}) {
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

export function TaxReportPanel({
  report,
  onPrint,
}: {
  report: ReportsDashboard;
  onPrint?: () => void;
}) {
  const tax: TaxReportSummary = report.taxReport ?? {
    currency: "NGN",
    purchases: { total: 0, includingTax: 0, returnIncludingTax: 0, due: 0 },
    sales: { total: 0, includingTax: 0, returnIncludingTax: 0, due: 0 },
    overall: { saleMinusPurchase: 0, dueAmount: 0 },
  };
  const { currency } = tax;
  const table = report.table;

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(TABLE_REPORT_PAGE_SIZE);

  useEffect(() => {
    setPageIndex(0);
  }, [table?.rows, pageSize]);

  const pageRows =
    table?.rows.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize) ??
    [];

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
        <SummaryCard title="Purchases">
          <MetricRow
            label="Total Purchase:"
            value={tax.purchases.total}
            currency={currency}
            muted
          />
          <MetricRow
            label="Purchase Including tax:"
            value={tax.purchases.includingTax}
            currency={currency}
          />
          <MetricRow
            label="Total Purchase Return Including Tax:"
            value={tax.purchases.returnIncludingTax}
            currency={currency}
            muted
          />
          <MetricRow
            label="Purchase Due:"
            value={tax.purchases.due}
            currency={currency}
            tip="Unpaid purchase balances in the selected period"
          />
        </SummaryCard>

        <SummaryCard title="Sales">
          <MetricRow
            label="Total Sale:"
            value={tax.sales.total}
            currency={currency}
            muted
          />
          <MetricRow
            label="Sale Including tax:"
            value={tax.sales.includingTax}
            currency={currency}
          />
          <MetricRow
            label="Total Sell Return Including Tax:"
            value={tax.sales.returnIncludingTax}
            currency={currency}
            muted
          />
          <MetricRow
            label="Sale Due:"
            value={tax.sales.due}
            currency={currency}
            tip="Uncollected sale balances in the selected period"
          />
        </SummaryCard>
      </div>

      <SummaryCard
        title="Overall ((Sale - Sell Return) - (Purchase - Purchase Return))"
        titleTip="Net of returns: (sales − sell returns) − (purchases − purchase returns)"
      >
        <div className="space-y-3 px-4 py-5">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base">
            <span className="font-medium text-muted">Sale - Purchase:</span>
            <span className="text-xl font-semibold tabular-nums text-teal-700">
              {formatTaxAmount(tax.overall.saleMinusPurchase, currency)}
            </span>
          </p>
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base">
            <span className="font-medium text-muted">Due amount:</span>
            <span className="text-xl font-semibold tabular-nums text-teal-700">
              {formatTaxAmount(tax.overall.dueAmount, currency)}
            </span>
          </p>
        </div>
      </SummaryCard>

      {table?.rows.length ? (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
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
            onPageSelect={setPageIndex}
            totalPages={Math.max(1, Math.ceil(table.rows.length / pageSize))}
            totalItems={table.rows.length}
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
                  <tr
                    key={String(row.id ?? index)}
                    className="border-b border-border/60"
                  >
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
            onPageSelect={setPageIndex}
            totalPages={Math.max(1, Math.ceil(table.rows.length / pageSize))}
            totalItems={table.rows.length}
          />
        </section>
      ) : null}
    </div>
  );
}
