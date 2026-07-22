"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import type { GroupReportEntityRollup, KpiCardConfig, ReportsDashboard, ReportsKpi, ReportsTableRow } from "@vonos/types";
import { REPORT_REGISTRY } from "@/lib/registries/reportRegistry";
import { EntityContextBanner } from "@/components/molecules/EntityContextBanner";
import { ChartPanel } from "@/components/organisms/ChartPanel";
import { DataTable } from "@/components/organisms/DataTable";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { KpiRow } from "@/components/organisms/KpiRow";
import { getGroupReports, getReportsDashboard, runGroupReport } from "@/lib/api/reports";
import { ROUTE_PREFETCH_STALE_MS } from "@/lib/prefetch/routePrefetchRegistry";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import type { TenantCode } from "@/lib/registries/tenants";
import { getTenantByCode } from "@/lib/registries/tenants";
import { ledgerChartSubtitle } from "@/lib/utils/ledgerCharts";
import { formatCurrency, formatCurrencyCompact, formatNumberCompact } from "@/lib/utils/formatCurrency";
import { reportRowDetailPath } from "@/lib/utils/recordDetailPath";
import { ChartPanelSkeleton } from "@/components/organisms/skeletons";
import { ReportDetailSheet } from "@/components/organisms/ReportDetailSheet";
import { HqReportPageSkeleton } from "@/components/organisms/HqReportPageLayout";
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

function entityRollupRows(
  byEntity: GroupReportEntityRollup[],
): Array<ReportsTableRow & { id: string }> {
  return byEntity.flatMap((entity) =>
    entity.rows.map((row, index) => ({
      id: `${entity.code}-${index}`,
      tenantCode: entity.code,
      entity: entity.code,
      ...row,
    })),
  );
}

function entityRollupColumns(
  byEntity: GroupReportEntityRollup[],
): Array<{ key: string; header: string }> {
  const sample = byEntity[0]?.rows[0];
  if (!sample) {
    return [
      { key: "entity", header: "Entity" },
      { key: "revenue", header: "Revenue" },
    ];
  }
  return [
    { key: "entity", header: "Entity" },
    ...Object.keys(sample).map((key) => ({
      key,
      header: key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (char) => char.toUpperCase()),
    })),
  ];
}

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

  const loadingCards =
    kpis.length > 0
      ? kpiToCards(kpis)
      : [
          { label: "Revenue", icon: "wallet", metricKey: "revenue", color: "#059669" },
          { label: "Orders", icon: "package", metricKey: "orders", color: "#2563eb" },
          { label: "Customers", icon: "package", metricKey: "customers", color: "#9333ea" },
          { label: "Net", icon: "calculator", metricKey: "net", color: "#e11d48" },
        ];

  if (isLoading && !dashboard) {
    return (
      <div className="space-y-6">
        <KpiRow cards={loadingCards} values={{}} isLoading />
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartPanelSkeleton withHeader={false} />
          <ChartPanelSkeleton withHeader={false} />
        </div>
      </div>
    );
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
          <ChartPanelSkeleton withHeader={false} />
          <ChartPanelSkeleton withHeader={false} />
        </div>
      ) : dashboard?.charts.length ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {dashboard.charts.map((chart) => (
            <div
              key={chart.id}
              className="rounded-xl border border-border bg-card p-6 shadow-card sm:p-8"
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

      {dashboard?.byEntity && dashboard.byEntity.length > 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
          <ChartHeader
            title="By entity"
            subtitle="Roll-up for the selected report across all operating entities"
            onExport={() => openExportModal()}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <DataTable<ReportsTableRow & { id: string }>
            data={entityRollupRows(dashboard.byEntity)}
            columns={entityRollupColumns(dashboard.byEntity).map((col) => {
              const base = {
                key: col.key as keyof ReportsTableRow & string,
                header: col.header,
              };
              if (
                col.key === "revenue" ||
                col.key === "costs" ||
                col.key === "net" ||
                col.key === "salesRevenue" ||
                col.key === "jobRevenue" ||
                col.key === "stockValue" ||
                col.key === "amount"
              ) {
                return {
                  ...base,
                  render: (row: ReportsTableRow) =>
                    typeof row[col.key] === "number"
                      ? formatCurrency(Number(row[col.key]), "NGN")
                      : String(row[col.key] ?? "—"),
                };
              }
              return base;
            })}
            displayMode="table"
            embedded
            disablePagination={(dashboard.byEntity?.length ?? 0) <= 12}
            onRowClick={(row) => {
              if (!onEntityReportsClick) return;
              const code = String(row.entity ?? row.tenantCode ?? "");
              if (code) onEntityReportsClick(code);
            }}
          />
        </div>
      ) : null}

      {dashboard?.table && dashboard.table.rows.length > 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
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
          <DataTable<ReportsTableRow & { id: string }>
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
              const path = reportRowDetailPath(tenantCode, row);
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
    staleTime: ROUTE_PREFETCH_STALE_MS,
    placeholderData: (prev) => prev,
  });

  return (
    <div className="space-y-6">
      <EntityContextBanner module="Reports" />
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
        isLoading={query.isLoading || query.isFetching}
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
  const groupReports = useMemo(
    () => REPORT_REGISTRY.filter((entry) => entry.groupRollup),
    [],
  );
  const [activeReportId, setActiveReportId] = useState<string>("overview");

  const overviewQuery = useQuery({
    queryKey: ["groupReports", bounds?.from, bounds?.to],
    queryFn: () =>
      getGroupReports({
        from: bounds?.from,
        to: bounds?.to,
      }),
    enabled: activeReportId === "overview",
    staleTime: 5 * 60_000,
  });

  const drillQuery = useQuery({
    queryKey: [
      "groupReportRun",
      activeReportId,
      bounds?.from ?? "all",
      bounds?.to ?? "all",
    ],
    queryFn: () =>
      runGroupReport({
        reportId: activeReportId,
        from: bounds?.from,
        to: bounds?.to,
      }),
    enabled: activeReportId !== "overview",
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });

  const activeEntry =
    activeReportId === "overview"
      ? null
      : groupReports.find((entry) => entry.id === activeReportId) ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-medium">Group roll-up</p>
        <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
          Switch report types with the tabs below — no page navigation. Charts
          and tables stay on this screen.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-border bg-[var(--color-surface-muted)] p-1">
          <button
            type="button"
            onClick={() => setActiveReportId("overview")}
            className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeReportId === "overview"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            Overview
          </button>
          {groupReports.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setActiveReportId(entry.id)}
              className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeReportId === entry.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <DateRangeDropdown value={dateRange} onChange={setDateRange} />
      </div>

      {activeReportId === "overview" ? (
        <ReportsDashboardBody
          dashboard={overviewQuery.data}
          isLoading={overviewQuery.isLoading}
          error={overviewQuery.error}
          dateRange={dateRange}
          setDateRange={setDateRange}
          onEntityReportsClick={(code) => router.push(`/admin/reports/${code}`)}
        />
      ) : activeEntry ? (
        drillQuery.error ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted">
            Failed to load {activeEntry.label}. Try again or change the date range.
          </div>
        ) : drillQuery.isLoading && !drillQuery.data ? (
          <HqReportPageSkeleton reportId={activeEntry.id} />
        ) : drillQuery.data ? (
          <ReportDetailSheet
            title={activeEntry.label}
            subtitle={ledgerChartSubtitle(dateRange)}
            data={drillQuery.data}
            showCharts
            tableFirst={Boolean(
              drillQuery.data.table && drillQuery.data.charts.length === 0,
            )}
          />
        ) : null
      ) : (
        <p className="text-sm text-muted">Unknown report.</p>
      )}
    </div>
  );
}
