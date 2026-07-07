"use client";

import { useState } from "react";
import type {
  ProfitLossBreakdownTab,
  ProfitLossReport,
  ReportsTable,
} from "@vonos/types";
import { useQuery } from "@tanstack/react-query";
import { runReport, type ReportRunMode } from "@/lib/api/reports";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { cn } from "@/lib/utils/cn";

const BREAKDOWN_TABS: Array<{ id: ProfitLossBreakdownTab; label: string }> = [
  { id: "product", label: "Profit by products" },
  { id: "category", label: "Profit by categories" },
  { id: "brand", label: "Profit by brands" },
  { id: "location", label: "Profit by locations" },
  { id: "invoice", label: "Profit by invoice" },
  { id: "date", label: "Profit by date" },
  { id: "customer", label: "Profit by customer" },
  { id: "day", label: "Profit by day" },
  { id: "service-staff", label: "Profit by service staff" },
];

function LineList({
  lines,
  currency,
}: {
  lines: Array<{ label: string; amount: number }>;
  currency: string;
}) {
  return (
    <ul className="space-y-2 text-sm">
      {lines.map((line) => (
        <li key={line.label} className="flex items-start justify-between gap-4">
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
}: {
  table: ReportsTable;
  currency: string;
}) {
  return (
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
          {table.rows.length === 0 ? (
            <tr>
              <td
                colSpan={table.columns.length}
                className="px-4 py-8 text-center text-muted"
              >
                No data for this period.
              </td>
            </tr>
          ) : (
            table.rows.map((row, index) => (
              <tr key={String(row.id ?? index)} className="border-b border-border/60 last:border-b-0">
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
                    <td key={col.key} className="px-4 py-2 text-foreground">
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ProfitLossReportPanel({
  report,
  tenantId,
  from,
  to,
  summaryLoading = false,
  onPrint,
}: {
  report: ProfitLossReport;
  tenantId?: string;
  from?: string;
  to?: string;
  summaryLoading?: boolean;
  onPrint?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ProfitLossBreakdownTab | null>(null);
  const { summary, breakdowns } = report;
  const currency = summary.currency;

  const breakdownQuery = useQuery({
    queryKey: ["report-pl-breakdown", tenantId, from ?? "all", to ?? "all", activeTab],
    queryFn: async () => {
      if (!tenantId || !activeTab) return null;
      const data = await runReport({
        reportId: "profit-loss",
        from,
        to,
        tenantId,
        mode: "pl-breakdown" as ReportRunMode,
        breakdownTab: activeTab,
      });
      return data.profitLoss?.breakdowns?.[activeTab] ?? null;
    },
    enabled: Boolean(tenantId && activeTab),
    staleTime: 5 * 60_000,
  });

  const activeTable =
    (activeTab ? breakdowns[activeTab] : undefined) ?? breakdownQuery.data ?? undefined;
  const breakdownLoading = Boolean(activeTab) && breakdownQuery.isLoading && !activeTable;

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
        {summaryLoading ? (
          <>
            <div className="h-48 animate-pulse rounded-xl border border-border bg-card" />
            <div className="h-48 animate-pulse rounded-xl border border-border bg-card" />
          </>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <LineList lines={summary.debits} currency={currency} />
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <LineList lines={summary.credits} currency={currency} />
            </div>
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {summaryLoading ? (
          <>
            <div className="h-20 animate-pulse rounded-xl border border-border bg-card" />
            <div className="h-20 animate-pulse rounded-xl border border-border bg-card" />
            <div className="h-20 animate-pulse rounded-xl border border-border bg-card" />
          </>
        ) : (
          <>
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">COGS</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {formatCurrency(summary.cogs, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Gross Profit</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {formatCurrency(summary.grossProfit, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Net Profit</p>
          <p
            className={cn(
              "mt-1 text-lg font-semibold tabular-nums",
              summary.netProfit < 0 ? "text-red-600" : "text-emerald-700",
            )}
          >
            {formatCurrency(summary.netProfit, currency)}
          </p>
        </div>
          </>
        )}
      </div>

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
        <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
      ) : activeTab && activeTable ? (
        <BreakdownTable table={activeTable} currency={currency} />
      ) : (
        <p className="text-sm text-muted">
          Select a breakdown tab above to load detail.
        </p>
      )}
    </div>
  );
}
