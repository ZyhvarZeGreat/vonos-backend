"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import type { KpiCardConfig, ReportsDashboard, ReportsKpi } from "@vonos/types";
import { ChartPanel } from "@/components/organisms/ChartPanel";
import { DataTable } from "@/components/organisms/DataTable";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { KpiRow } from "@/components/organisms/KpiRow";
import { getGroupReports, getReportsDashboard } from "@/lib/api/reports";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import type { TenantCode } from "@/lib/registries/tenants";
import { getTenantByCode } from "@/lib/registries/tenants";
import { ledgerChartSubtitle } from "@/lib/utils/ledgerCharts";
import { formatCurrency, formatCurrencyCompact, formatNumberCompact } from "@/lib/utils/formatCurrency";
import { recordDetailPath } from "@/lib/utils/recordDetailPath";
import { ChartPanelSkeleton, DashboardBodySkeleton } from "@/components/organisms/skeletons";
import { useUiStore } from "@/stores/uiStore";

export const REPORT_TABS: Record<string, { id: string; label: string }[]> = {
  stock: [
    { id: "valuation", label: "Stock Valuation" },
    { id: "movement", label: "Movement Summary" },
    { id: "lowstock", label: "Low Stock" },
  ],
  transaction: [
    { id: "sales", label: "Sales Summary" },
    { id: "closeout", label: "Daily Closeout History" },
  ],
  job: [
    { id: "costing", label: "Job Costing Summary" },
    { id: "turnaround", label: "Turnaround Time" },
  ],
  appointment: [
    { id: "stylist", label: "Revenue per Stylist" },
    { id: "noshow", label: "No-show Rate" },
  ],
};

function formatKpiValue(kpi: ReportsKpi): string {
  if (kpi.deltaPercent && kpi.metricKey === "noShowRate") {
    return `${kpi.value}%`;
  }
  if (kpi.currency) {
    return formatCurrencyCompact(kpi.value, kpi.currency);
  }
  if (kpi.metricKey === "velocity" || kpi.metricKey === "avgTurnover") {
    return `${kpi.value}x`;
  }
  if (kpi.metricKey === "avgTurnaroundDays") {
    return `${kpi.value}d`;
  }
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

function kpiValues(kpis: ReportsKpi[]): Record<string, string> {
  return Object.fromEntries(kpis.map((kpi) => [kpi.metricKey, formatKpiValue(kpi)]));
}

function kpiDeltas(kpis: ReportsKpi[]): {
  deltas: Record<string, number>;
  deltaLabels: Record<string, string>;
  deltaPercents: Record<string, string>;
} {
  const deltas: Record<string, number> = {};
  const deltaLabels: Record<string, string> = {};
  const deltaPercents: Record<string, string> = {};
  for (const kpi of kpis) {
    if (kpi.delta !== undefined) deltas[kpi.metricKey] = kpi.delta;
    if (kpi.deltaLabel) deltaLabels[kpi.metricKey] = kpi.deltaLabel;
    if (kpi.deltaPercent) deltaPercents[kpi.metricKey] = kpi.deltaPercent;
  }
  return { deltas, deltaLabels, deltaPercents };
}

function ChartHeader({
  title,
  subtitle,
  onExport,
  dateRange,
  onDateRangeChange,
}: {
  title: string;
  subtitle: string;
  onExport: () => void;
  dateRange: ReturnType<typeof useListPageFilters>["dateRange"];
  onDateRangeChange: ReturnType<typeof useListPageFilters>["setDateRange"];
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <DateRangeDropdown value={dateRange} onChange={onDateRangeChange} />
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-[var(--color-surface-muted)]"
        >
          <Upload className="h-4 w-4 text-muted" />
          Export
        </button>
      </div>
    </div>
  );
}

type ReportsTableRow = {
  id: string;
  recordType?: string;
} & Record<string, string | number>;

export function ReportsDashboardBody({
  tenantCode,
  dashboard,
  isLoading,
  error,
  dateRange,
  setDateRange,
  onEntityReportsClick,
}: {
  tenantCode?: TenantCode;
  dashboard: ReportsDashboard | undefined;
  isLoading: boolean;
  error: Error | null;
  dateRange: ReturnType<typeof useListPageFilters>["dateRange"];
  setDateRange: ReturnType<typeof useListPageFilters>["setDateRange"];
  /** VAG group: navigate to /admin/reports/[code] */
  onEntityReportsClick?: (tenantCode: string) => void;
}) {
  const router = useRouter();
  const openExportModal = useUiStore((state) => state.openExportModal);
  const chartSubtitle = ledgerChartSubtitle(dateRange);

  const kpis = dashboard?.kpis ?? [];
  const { deltas, deltaLabels, deltaPercents } = kpiDeltas(kpis);

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted">
        Something went wrong loading reports. Try again or change the date range.
      </div>
    );
  }

  if (isLoading && !dashboard) {
    return <DashboardBodySkeleton kpiCount={4} chartCount={2} />;
  }

  return (
    <div className="space-y-6">
      <KpiRow
        cards={kpiToCards(kpis)}
        values={kpiValues(kpis)}
        deltas={deltas}
        deltaLabels={deltaLabels}
        deltaPercents={deltaPercents}
        isLoading={isLoading && Boolean(dashboard)}
      />

      {isLoading && dashboard ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartPanelSkeleton />
          <ChartPanelSkeleton />
        </div>
      ) : dashboard?.charts.length ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {dashboard.charts.map((chart) => (
            <div
              key={chart.id}
              className="rounded-xl border border-border bg-card p-6 shadow-card"
            >
              <ChartHeader
                title={chart.title}
                subtitle={chart.subtitle ?? chartSubtitle}
                onExport={() => openExportModal()}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
              <ChartPanel
                title=""
                subtitle=""
                type={chart.type}
                data={chart.data}
                series={chart.series}
                horizontal={chart.horizontal}
                hideHeader
                hidePeriodControl
              />
            </div>
          ))}
        </div>
      ) : null}

      {dashboard?.table && dashboard.table.rows.length > 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <ChartHeader
            title={onEntityReportsClick ? "By entity" : "Detail"}
            subtitle={
              onEntityReportsClick
                ? "Click a row to open that entity's reports"
                : "Click a row to open the full record"
            }
            onExport={() => openExportModal()}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <DataTable<ReportsTableRow>
            data={dashboard.table.rows.map((row, index) => ({
              id: String(row.id ?? `row-${index}`),
              ...row,
            }))}
            columns={[
              ...dashboard.table.columns.map((col) => {
                const base = {
                  key: col.key as keyof ReportsTableRow & string,
                  header: col.header,
                };
                if (col.key === "revenue") {
                  return {
                    ...base,
                    render: (row: ReportsTableRow) =>
                      typeof row.revenue === "number"
                        ? formatCurrency(row.revenue, String(row.currency ?? "NGN"))
                        : String(row.revenue),
                  };
                }
                return base;
              }),
              ...(onEntityReportsClick
                ? [
                    {
                      key: "actions" as const,
                      header: "",
                      render: () => (
                        <span className="text-sm font-medium text-info">View reports →</span>
                      ),
                    },
                  ]
                : []),
            ]}
            displayMode="table"
            embedded
            disablePagination={dashboard.table.rows.length <= 25}
            onRowClick={(row) => {
              if (onEntityReportsClick) {
                const code = String(row.tenantCode ?? row.id ?? "");
                if (code) onEntityReportsClick(code);
                return;
              }
              if (!tenantCode) return;
              const path = recordDetailPath(
                tenantCode,
                String(row.recordType ?? ""),
                String(row.id ?? ""),
              );
              if (path) router.push(path);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function ReportsView({ tenantCode }: { tenantCode: TenantCode }) {
  const entry = getTenantByCode(tenantCode);
  const archetype = entry?.archetype ?? "stock";
  const tabs = REPORT_TABS[archetype] ?? REPORT_TABS.stock;
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "valuation");
  const { dateRange, setDateRange, bounds } = useListPageFilters();

  const query = useQuery({
    queryKey: ["reportsDashboard", tenantCode, activeTab, bounds?.from, bounds?.to],
    queryFn: () =>
      getReportsDashboard({
        tab: activeTab,
        from: bounds?.from,
        to: bounds?.to,
      }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-[var(--color-surface-muted)] p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <DateRangeDropdown value={dateRange} onChange={setDateRange} />
      </div>
      <ReportsDashboardBody
        tenantCode={tenantCode}
        dashboard={query.data}
        isLoading={query.isLoading}
        error={query.error}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />
    </div>
  );
}

export function WarehouseReportsView() {
  return <ReportsView tenantCode="VW" />;
}

export function VagGroupReportsView() {
  const router = useRouter();
  const { dateRange, setDateRange, bounds } = useListPageFilters();

  const query = useQuery({
    queryKey: ["groupReports", bounds?.from, bounds?.to],
    queryFn: () =>
      getGroupReports({
        from: bounds?.from,
        to: bounds?.to,
      }),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-medium">Group roll-up</p>
        <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
          Revenue is summed across all entities from ledger entries. Internal transfer elimination
          between entities is not yet applied.
        </p>
      </div>
      <div className="flex justify-end">
        <DateRangeDropdown value={dateRange} onChange={setDateRange} />
      </div>
      <ReportsDashboardBody
        dashboard={query.data}
        isLoading={query.isLoading}
        error={query.error}
        dateRange={dateRange}
        setDateRange={setDateRange}
        onEntityReportsClick={(code) => router.push(`/admin/reports/${code}`)}
      />
    </div>
  );
}
