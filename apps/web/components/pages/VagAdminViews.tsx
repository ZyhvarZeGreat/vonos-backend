"use client";

import { useQuery } from "@tanstack/react-query";
import { ChartPanel } from "@/components/organisms/ChartPanel";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { EntityOverviewCard } from "@/components/organisms/EntityOverviewCard";
import { KpiRow } from "@/components/organisms/KpiRow";
import { getGroupOverview } from "@/lib/api/overview";
import { ENTITY_LIST } from "@/lib/registries/tenants";
import { getMigrationSource } from "@/lib/registries/migrationSources";
import { tenantOverviewPath } from "@/lib/utils/authRedirect";
import { TENANT_ACCENT } from "@/lib/registries/tenantAccents";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { ledgerChartSubtitle } from "@/lib/utils/ledgerCharts";
import { formatCurrencyCompact, formatNumberCompact } from "@/lib/utils/formatCurrency";
import { DashboardBodySkeleton } from "@/components/organisms/skeletons";
import type { ReportsKpi, GroupOverviewAlert } from "@vonos/types";

const GROUP_KPIS = [
  { label: "Group Revenue", icon: "wallet", metricKey: "revenue", color: "#059669" },
  { label: "Total Jobs", icon: "wrench", metricKey: "jobs", color: "#2563eb" },
  { label: "Active Entities", icon: "package", metricKey: "entities", color: "#9333ea" },
  { label: "Outstanding", icon: "clock", metricKey: "outstanding", color: "#e11d48" },
];

function formatGroupKpi(kpi: ReportsKpi): string {
  if (kpi.currency) return formatCurrencyCompact(kpi.value, kpi.currency);
  return formatNumberCompact(kpi.value);
}

export function VagGroupOverview() {
  const { dateRange, setDateRange, bounds } = useListPageFilters();

  const query = useQuery({
    queryKey: ["groupOverview", bounds?.from, bounds?.to],
    queryFn: () =>
      getGroupOverview({
        from: bounds?.from,
        to: bounds?.to,
      }),
  });

  const dashboard = query.data;
  const periodLabel = ledgerChartSubtitle(dateRange);
  const entityStats = new Map(
    (dashboard?.entityStats ?? []).map((row) => [row.code, row.stats]),
  );

  const kpiValues = Object.fromEntries(
    (dashboard?.kpis ?? []).map((kpi) => [kpi.metricKey, formatGroupKpi(kpi)]),
  );

  const entityComparisonChart = dashboard?.charts.find((c) => c.id === "entity-comparison");
  const revenueTrendChart = dashboard?.charts.find((c) => c.id === "group-revenue-trend");

  const entityComparisonData =
    entityComparisonChart?.data.map((row) => ({
      label: String(row.label),
      value: Number(row.value ?? 0),
      color: TENANT_ACCENT[String(row.label) as keyof typeof TENANT_ACCENT],
    })) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <DateRangeDropdown value={dateRange} onChange={setDateRange} />
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-medium">How group data is organized</p>
        <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
          Each card below is a separate business with its own database partition (
          <code className="text-xs">tenant_*_001</code>). Use <strong>Enter</strong> or the entity
          switcher to view one at a time.
        </p>
      </div>

      {query.isLoading && !dashboard ? (
        <DashboardBodySkeleton kpiCount={4} chartCount={2} />
      ) : (
        <>
          <KpiRow cards={GROUP_KPIS} values={kpiValues} />

          {(dashboard?.alerts?.length ?? 0) > 0 ? (
            <section className="space-y-2">
              <h3 className="text-base font-semibold text-foreground">Group alerts</h3>
              <div className="grid gap-3">
                {dashboard!.alerts!.map((alert: GroupOverviewAlert) => (
                  <div
                    key={alert.id}
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      alert.severity === "error"
                        ? "border-red-200 bg-red-50 text-red-950 dark:border-red-900/50 dark:bg-red-950/30"
                        : alert.severity === "warning"
                          ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30"
                          : "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30"
                    }`}
                  >
                    <p className="font-medium">
                      {alert.entityCode ? `${alert.entityCode}: ` : ""}
                      {alert.title}
                    </p>
                    <p className="mt-1 opacity-90">{alert.message}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="mb-4 text-base font-semibold text-foreground">Entities</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {ENTITY_LIST.map((entity) => {
                const source = getMigrationSource(entity.code);
                return (
                  <EntityOverviewCard
                    key={entity.code}
                    code={entity.code}
                    name={entity.name}
                    archetype={entity.archetype}
                    stats={entityStats.get(entity.code) ?? ["—", "—", "—"]}
                    href={tenantOverviewPath(entity.code)}
                    legacyDatabase={source.legacyDatabase}
                  />
                );
              })}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {revenueTrendChart ? (
              <ChartPanel
                title={revenueTrendChart.title}
                subtitle={revenueTrendChart.subtitle}
                type={revenueTrendChart.type}
                data={revenueTrendChart.data}
                series={revenueTrendChart.series}
                periodLabel={periodLabel}
              />
            ) : null}
            {entityComparisonChart ? (
              <ChartPanel
                title={entityComparisonChart.title}
                subtitle={entityComparisonChart.subtitle}
                type={entityComparisonChart.type}
                horizontal={entityComparisonChart.horizontal}
                data={entityComparisonData}
                series={entityComparisonChart.series}
                periodLabel={periodLabel}
              />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

export function VagCrossEntityFinance() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Consolidated finance view — same 4-tab structure, unscoped and grouped by entity.
        Internal transfer elimination logic is deferred.
      </p>
    </div>
  );
}
