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
import { ChartPanelSkeleton } from "@/components/organisms/skeletons";
import { ReportDetailSheet } from "@/components/organisms/ReportDetailSheet";
import { HqReportPageSkeleton } from "@/components/organisms/HqReportPageLayout";
import { useReportRecordModals } from "@/lib/hooks/useReportRecordModals";
import { REPORT_TABS } from "@/lib/registries/reportTabs";
import { useUiStore } from "@/stores/uiStore";
import { Spinner } from "@/components/atoms/Spinner";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { cn } from "@/lib/utils/cn";
import { UposNavTabs } from "@/components/upos/UposNavTabs";
import { Hq6PageHeader } from "@/components/hq6/Hq6Chrome";

export { REPORT_TABS } from "@/lib/registries/reportTabs";

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
  customDateRange,
  onCustomDateRangeChange,
}: {
  title: string;
  subtitle: string;
  onExport: () => void;
  dateRange: ReturnType<typeof useListPageFilters>["dateRange"];
  onDateRangeChange: ReturnType<typeof useListPageFilters>["setDateRange"];
  customDateRange: ReturnType<typeof useListPageFilters>["customDateRange"];
  onCustomDateRangeChange: ReturnType<typeof useListPageFilters>["setCustomDateRange"];
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <DateRangeDropdown
          value={dateRange}
          onChange={onDateRangeChange}
          customValue={customDateRange}
          onCustomChange={onCustomDateRangeChange}
        />
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
  chartsLoading = false,
  error,
  dateRange,
  setDateRange,
  customDateRange,
  setCustomDateRange,
  onEntityReportsClick,
}: {
  tenantCode?: TenantCode;
  dashboard: ReportsDashboard | undefined;
  isLoading: boolean;
  /** True while full payload (charts) is still loading after core KPIs. */
  chartsLoading?: boolean;
  error: Error | null;
  dateRange: ReturnType<typeof useListPageFilters>["dateRange"];
  setDateRange: ReturnType<typeof useListPageFilters>["setDateRange"];
  customDateRange: ReturnType<typeof useListPageFilters>["customDateRange"];
  setCustomDateRange: ReturnType<typeof useListPageFilters>["setCustomDateRange"];
  /** VAG group: navigate to /admin/reports/[code] */
  onEntityReportsClick?: (tenantCode: string) => void;
}) {
  const openExportModal = useUiStore((state) => state.openExportModal);
  const chartSubtitle = ledgerChartSubtitle(dateRange);
  const isHq6 = useIsVaHq6();
  const {
    openReportRecord,
    modals: recordModals,
  } = useReportRecordModals();

  const kpis = dashboard?.kpis ?? [];
  const { deltas, deltaLabels, deltaPercents } = kpiDeltas(kpis);

  if (error) {
    return (
      <div className="hq6-card p-8 text-center text-sm text-muted">
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
        <KpiRow
          cards={loadingCards}
          values={Object.fromEntries(loadingCards.map((c) => [c.metricKey, "0"]))}
          isLoading
          loadingDisplay={isHq6 ? "zero-spinner" : "skeleton"}
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {isHq6 ? (
            <>
              <div className="hq6-card flex min-h-[200px] flex-col items-center justify-center gap-2 p-6">
                <p className="text-2xl font-semibold tabular-nums">0</p>
                <Spinner size="md" className="text-muted" />
                <p className="text-xs text-muted">Loading charts…</p>
              </div>
              <div className="hq6-card flex min-h-[200px] flex-col items-center justify-center gap-2 p-6">
                <p className="text-2xl font-semibold tabular-nums">0</p>
                <Spinner size="md" className="text-muted" />
                <p className="text-xs text-muted">Loading charts…</p>
              </div>
            </>
          ) : (
            <>
              <ChartPanelSkeleton withHeader={false} />
              <ChartPanelSkeleton withHeader={false} />
            </>
          )}
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
        isLoading={false}
        loadingDisplay={isHq6 ? "zero-spinner" : "skeleton"}
      />

      {chartsLoading && !(dashboard?.charts.length) ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {isHq6 ? (
            <>
              <div className="hq6-card flex min-h-[200px] flex-col items-center justify-center gap-2 p-6">
                <p className="text-2xl font-semibold tabular-nums">0</p>
                <Spinner size="md" className="text-muted" />
                <p className="text-xs text-muted">Loading charts…</p>
              </div>
              <div className="hq6-card flex min-h-[200px] flex-col items-center justify-center gap-2 p-6">
                <p className="text-2xl font-semibold tabular-nums">0</p>
                <Spinner size="md" className="text-muted" />
                <p className="text-xs text-muted">Loading charts…</p>
              </div>
            </>
          ) : (
            <>
              <ChartPanelSkeleton withHeader={false} />
              <ChartPanelSkeleton withHeader={false} />
            </>
          )}
        </div>
      ) : dashboard?.charts.length ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {dashboard.charts.map((chart) => (
            <div
              key={chart.id}
              className={
                isHq6
                  ? "hq6-card p-6 sm:p-8"
                  : "rounded-xl border border-border bg-card p-6 shadow-card sm:p-8"
              }
            >
              <ChartHeader
                title={chart.title}
                subtitle={chart.subtitle ?? chartSubtitle}
                onExport={() => openExportModal()}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                customDateRange={customDateRange}
                onCustomDateRangeChange={setCustomDateRange}
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
        <div
          className={
            isHq6
              ? "hq6-card p-6 sm:p-8"
              : "rounded-xl border border-border bg-card p-6 shadow-card sm:p-8"
          }
        >
          <ChartHeader
            title="By entity"
            subtitle="Roll-up for the selected report across all operating entities"
            onExport={() => openExportModal()}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            customDateRange={customDateRange}
            onCustomDateRangeChange={setCustomDateRange}
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
        <div
          className={
            isHq6
              ? "hq6-card p-6 sm:p-8"
              : "rounded-xl border border-border bg-card p-6 shadow-card sm:p-8"
          }
        >
          <ChartHeader
            title={onEntityReportsClick ? "By entity" : "Detail"}
            subtitle={
              onEntityReportsClick
                ? "Click a row to open that entity's reports"
                : "Click a row to view details"
            }
            onExport={() => openExportModal()}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            customDateRange={customDateRange}
            onCustomDateRangeChange={setCustomDateRange}
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
              openReportRecord(row);
            }}
          />
        </div>
      ) : null}

      {recordModals}
    </div>
  );
}

export function ReportsView({ tenantCode }: { tenantCode: TenantCode }) {
  const isHq6 = useIsVaHq6();
  const entry = getTenantByCode(tenantCode);
  const archetype = entry?.archetype ?? "stock";
  const tabs = REPORT_TABS[archetype] ?? REPORT_TABS.stock;
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "valuation");
  const {
    dateRange,
    setDateRange,
    customDateRange,
    setCustomDateRange,
    bounds,
  } = useListPageFilters({
    defaultDateRange: "last_7_days",
    unboundedAllTime: false,
    isolateDateRange: true,
  });

  const query = useQuery({
    queryKey: [
      "reportsDashboard",
      tenantCode,
      entry?.tenantId,
      activeTab,
      bounds?.from,
      bounds?.to,
    ],
    queryFn: () =>
      getReportsDashboard({
        tab: activeTab,
        from: bounds?.from,
        to: bounds?.to,
        tenantId: entry?.tenantId,
      }),
    enabled: Boolean(entry?.tenantId),
    staleTime: ROUTE_PREFETCH_STALE_MS,
    placeholderData: (prev) => prev,
  });

  return (
    <div className={isHq6 ? "hq6-page" : "space-y-6"}>
      {isHq6 ? <Hq6PageHeader title="Reports" /> : null}
      {!isHq6 ? <EntityContextBanner module="Reports" /> : null}
      <div
        className={
          isHq6
            ? "content space-y-4"
            : "flex flex-wrap items-center justify-between gap-3"
        }
      >
        {isHq6 ? (
          <div className="row no-print">
            <div className="col-md-12">
              <UposNavTabs
                tabs={tabs.map((tab) => ({
                  id: tab.id,
                  label: tab.label,
                  active: activeTab === tab.id,
                  onClick: () => setActiveTab(tab.id),
                }))}
                actions={
                  <DateRangeDropdown
                    value={dateRange}
                    onChange={setDateRange}
                    customValue={customDateRange}
                    onCustomChange={setCustomDateRange}
                  />
                }
              >
                <div className="tab-pane active">
                  <ReportsDashboardBody
                    tenantCode={tenantCode}
                    dashboard={query.data}
                    isLoading={query.isLoading || query.isFetching}
                    error={query.error}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                    customDateRange={customDateRange}
                    setCustomDateRange={setCustomDateRange}
                  />
                </div>
              </UposNavTabs>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-1 rounded-lg border border-border bg-[var(--color-surface-muted)] p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <DateRangeDropdown
              value={dateRange}
              onChange={setDateRange}
              customValue={customDateRange}
              onCustomChange={setCustomDateRange}
            />
          </>
        )}
      </div>
      {!isHq6 ? (
        <ReportsDashboardBody
          tenantCode={tenantCode}
          dashboard={query.data}
          isLoading={query.isLoading || query.isFetching}
          error={query.error}
          dateRange={dateRange}
          setDateRange={setDateRange}
          customDateRange={customDateRange}
          setCustomDateRange={setCustomDateRange}
        />
      ) : null}
    </div>
  );
}

export function WarehouseReportsView() {
  return <ReportsView tenantCode="VW" />;
}

export function VagGroupReportsView() {
  const router = useRouter();
  const {
    dateRange,
    setDateRange,
    customDateRange,
    setCustomDateRange,
    bounds,
  } = useListPageFilters({
    defaultDateRange: "last_7_days",
    unboundedAllTime: false,
    isolateDateRange: true,
  });
  const groupReports = useMemo(
    () => REPORT_REGISTRY.filter((entry) => entry.groupRollup),
    [],
  );
  const [activeReportId, setActiveReportId] = useState<string>("overview");
  const from = bounds?.from;
  const to = bounds?.to;

  const coreQuery = useQuery({
    queryKey: ["groupReports", "core", from, to],
    queryFn: () =>
      getGroupReports({
        from,
        to,
        mode: "core",
      }),
    enabled: activeReportId === "overview",
    staleTime: ROUTE_PREFETCH_STALE_MS,
    placeholderData: (prev) => prev,
  });

  const overviewQuery = useQuery({
    queryKey: ["groupReports", from, to],
    queryFn: () =>
      getGroupReports({
        from,
        to,
      }),
    enabled: activeReportId === "overview",
    staleTime: ROUTE_PREFETCH_STALE_MS,
    placeholderData: (prev) => prev,
  });

  const drillQuery = useQuery({
    queryKey: [
      "groupReportRun",
      activeReportId,
      from ?? "all",
      to ?? "all",
    ],
    queryFn: () =>
      runGroupReport({
        reportId: activeReportId,
        from,
        to,
      }),
    enabled: activeReportId !== "overview",
    staleTime: ROUTE_PREFETCH_STALE_MS,
    placeholderData: (prev) => prev,
  });

  const overviewDashboard = overviewQuery.data ?? coreQuery.data;
  const overviewLoading =
    !overviewDashboard &&
    (coreQuery.isLoading || overviewQuery.isLoading);
  /** Core KPIs painted; full charts still in flight. */
  const chartsLoading =
    Boolean(overviewDashboard) &&
    !overviewQuery.data &&
    (overviewQuery.isFetching || overviewQuery.isLoading);

  const activeEntry =
    activeReportId === "overview"
      ? null
      : groupReports.find((entry) => entry.id === activeReportId) ?? null;

  return (
    <div className="space-y-4">
      <div className="hq6-card px-4 py-3 text-sm">
        <p className="font-semibold text-[#111827]">Group roll-up</p>
        <p className="mt-1 text-[#6b7280]">
          KPIs load first; charts fill in after. Pick an entity in the top-bar
          switcher to open that location&apos;s reports (same as VA).
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="hq6-tab-row max-w-full overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveReportId("overview")}
            className={`hq6-tab shrink-0 ${
              activeReportId === "overview" ? "hq6-tab-active" : ""
            }`}
          >
            Overview
          </button>
          {groupReports.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setActiveReportId(entry.id)}
              className={`hq6-tab shrink-0 ${
                activeReportId === entry.id ? "hq6-tab-active" : ""
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <DateRangeDropdown
          value={dateRange}
          onChange={setDateRange}
          customValue={customDateRange}
          onCustomChange={setCustomDateRange}
        />
      </div>

      {activeReportId === "overview" ? (
        <ReportsDashboardBody
          dashboard={overviewDashboard}
          isLoading={overviewLoading}
          chartsLoading={chartsLoading}
          error={overviewQuery.error ?? coreQuery.error}
          dateRange={dateRange}
          setDateRange={setDateRange}
          customDateRange={customDateRange}
          setCustomDateRange={setCustomDateRange}
          onEntityReportsClick={(code) => router.push(`/admin/reports/${code}`)}
        />
      ) : activeEntry ? (
        drillQuery.error ? (
          <div className="hq6-card p-8 text-center text-sm text-muted">
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
