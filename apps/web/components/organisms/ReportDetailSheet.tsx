"use client";

import { useMemo } from "react";
import type { ReportsDashboard, ReportsKpi, ReportsTable, ReportRowAction, ReportsTableRow } from "@vonos/types";
import { ReportTableActions } from "@/components/molecules/ReportTableActions";
import { KpiRow } from "@/components/organisms/KpiRow";
import { ChartPanel } from "@/components/organisms/ChartPanel";
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
  onRowClick?: (row: ReportsTableRow & { id: string }) => void;
  onRowAction?: (action: ReportRowAction) => void;
  chartGridClassName?: string;
  kpiClassName?: string;
  /** When true, render table above charts (activity-log style). */
  tableFirst?: boolean;
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
  onRowAction,
}: {
  table: ReportsTable;
  currency?: string;
  onRowClick?: (row: ReportsTableRow & { id: string }) => void;
  onRowAction?: (action: ReportRowAction) => void;
}) {
  const rows = table.rows.map((row, index) => ({
    id: String(row.id ?? `row-${index}`),
    ...row,
  }));
  const showActions =
    Boolean(onRowAction) && rows.some((row) => row.actions && row.actions.length > 0);

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
  onRowAction,
  chartGridClassName = "grid gap-6 lg:grid-cols-2",
  kpiClassName,
  tableFirst = false,
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
      <div className={cn("px-6 print:px-0", kpiClassName)}>
        <KpiRow cards={kpiToCards(data.kpis)} values={kpiValues} />
      </div>
    ) : null;

  const tableBlock = data.table ? (
    <div className="px-2 pb-4 sm:px-4">
      <ReportTable
        table={data.table}
        currency={currency}
        onRowClick={onRowClick}
        onRowAction={onRowAction}
      />
    </div>
  ) : (
    <p className="px-6 pb-6 text-sm text-muted">No detail table for this report.</p>
  );

  const chartsBlock =
    showCharts && data.charts.length > 0 ? (
      <div className={cn("px-6 pb-4 print:px-0", chartGridClassName)}>
        {data.charts.map((chart) => (
          <div
            key={chart.id}
            className="rounded-xl border border-border bg-[var(--color-surface-muted)]/30 p-4"
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
      <div className="border-b border-border px-6 py-5 print:px-0">
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
