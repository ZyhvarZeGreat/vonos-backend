"use client";

import { useMemo } from "react";
import type { ReportsDashboard, ReportsKpi, ReportsTable } from "@vonos/types";
import { KpiRow } from "@/components/organisms/KpiRow";
import type { KpiCardConfig } from "@vonos/types";
import { formatCurrency, formatCurrencyCompact, formatNumberCompact } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import { cn } from "@/lib/utils/cn";

export interface ReportDetailSheetProps {
  title: string;
  subtitle: string;
  entityLabel?: string;
  data: ReportsDashboard;
  generatedAt?: Date;
  showCharts?: boolean;
  onRowClick?: (row: Record<string, string | number> & { id: string }) => void;
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

function ReportTable({
  table,
  currency,
  onRowClick,
}: {
  table: ReportsTable;
  currency?: string;
  onRowClick?: (row: Record<string, string | number> & { id: string }) => void;
}) {
  const rows = table.rows.map((row, index) => ({
    id: String(row.id ?? `row-${index}`),
    ...row,
  }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-sm">
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
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={table.columns.length}
                className="px-4 py-8 text-center text-muted"
              >
                No rows for this period.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-border/60 last:border-b-0",
                  onRowClick && "cursor-pointer hover:bg-[var(--color-surface-muted)]",
                )}
                onClick={() => onRowClick?.(row)}
              >
                {table.columns.map((col) => {
                  const raw = row[col.key as keyof typeof row];
                  let display: string;
                  if (raw === null || raw === undefined) {
                    display = "—";
                  } else if (
                    (col.key === "amount" || col.key === "revenue") &&
                    typeof raw === "number"
                  ) {
                    display = formatCurrency(raw, currency ?? "NGN");
                  } else {
                    display = String(raw);
                  }
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

export function ReportDetailSheet({
  title,
  subtitle,
  entityLabel,
  data,
  generatedAt = new Date(),
  showCharts = false,
  onRowClick,
}: ReportDetailSheetProps) {
  const kpiValues = useMemo(
    () =>
      Object.fromEntries(
        (data.kpis ?? []).map((kpi) => [kpi.metricKey, formatKpiValue(kpi)]),
      ),
    [data.kpis],
  );

  const currency = data.kpis.find((k) => k.currency)?.currency;

  return (
    <div
      data-print-root
      className="space-y-6 overflow-hidden rounded-xl border border-border bg-card shadow-card print:border-0 print:shadow-none"
    >
      <div className="border-b border-border px-6 py-5 print:px-0">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {entityLabel ? (
          <p className="mt-0.5 text-sm font-medium text-foreground">{entityLabel}</p>
        ) : null}
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <p className="mt-1 text-xs text-muted">Generated {formatDate(generatedAt)}</p>
      </div>

      {data.kpis.length > 0 ? (
        <div className="px-6 print:px-0">
          <KpiRow cards={kpiToCards(data.kpis)} values={kpiValues} />
        </div>
      ) : null}

      {data.table ? (
        <div className="px-2 pb-4 sm:px-4">
          <ReportTable table={data.table} currency={currency} onRowClick={onRowClick} />
        </div>
      ) : (
        <p className="px-6 pb-6 text-sm text-muted">No detail table for this report.</p>
      )}

      {showCharts && data.charts.length > 0 ? (
        <p className="px-6 pb-4 text-xs text-muted">
          {data.charts.length} chart panel(s) available on the reports hub.
        </p>
      ) : null}
    </div>
  );
}
