"use client";

import { useQuery } from "@tanstack/react-query";
import { ChartPanel } from "@/components/organisms/ChartPanel";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { EntityOverviewCard } from "@/components/organisms/EntityOverviewCard";
import { KpiRow } from "@/components/organisms/KpiRow";
import { Spinner } from "@/components/atoms/Spinner";
import {
  getGroupOverviewDetails,
  getGroupOverviewSummary,
} from "@/lib/api/overview";
import {
  accentTenantCodeForVagUnit,
  VAG_VIEW_UNITS,
  vagViewUnitIdForTenantCode,
} from "@/lib/registries/vagViewUnits";
import { tenantOverviewPath } from "@/lib/utils/authRedirect";
import { accentForTenantCode } from "@/lib/registries/tenantAccents";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { ledgerChartSubtitle } from "@/lib/utils/ledgerCharts";
import { formatCurrencyCompact, formatNumberCompact } from "@/lib/utils/formatCurrency";
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
  const { dateRange, setDateRange, customDateRange, setCustomDateRange, bounds } =
    useListPageFilters({
      defaultDateRange: "last_7_days",
      unboundedAllTime: false,
      isolateDateRange: true,
    });
  const rangeKey = [bounds?.from, bounds?.to] as const;

  const summaryQuery = useQuery({
    queryKey: ["groupOverview", "summary", ...rangeKey],
    queryFn: () =>
      getGroupOverviewSummary({
        from: bounds?.from,
        to: bounds?.to,
      }),
    staleTime: 10 * 60_000,
    placeholderData: (previousData) => previousData,
  });

  // Text/KPI labels first — defer charts + alerts until summary settles (same
  // staged pattern as VA HQ6 home panelsDeferred).
  const detailsDeferred = summaryQuery.isFetched;

  const detailsQuery = useQuery({
    queryKey: ["groupOverview", "details", ...rangeKey],
    queryFn: () =>
      getGroupOverviewDetails({
        from: bounds?.from,
        to: bounds?.to,
      }),
    enabled: detailsDeferred,
    staleTime: 10 * 60_000,
    placeholderData: (previousData) => previousData,
  });

  const summary = summaryQuery.data;
  const details = detailsQuery.data;
  const periodLabel = ledgerChartSubtitle(dateRange);
  const entityStats = new Map(
    (summary?.entityStats ?? []).map((row) => [row.code, row.stats]),
  );

  const unitCards = VAG_VIEW_UNITS.map((unit) => {
    if (unit.tenantCodes.length === 1) {
      const code = unit.tenantCodes[0]!;
      return {
        unit,
        stats: (entityStats.get(code) ?? ["—", "—", "—"]) as [string, string, string],
      };
    }
    // Combine VISP + VSP stat lines (prefer first non-placeholder from each slot).
    const merged: [string, string, string] = ["—", "—", "—"];
    for (let i = 0; i < 3; i++) {
      const parts = unit.tenantCodes
        .map((code) => entityStats.get(code)?.[i])
        .filter((s): s is string => Boolean(s) && s !== "—");
      merged[i] = parts.length > 0 ? parts.join(" · ") : "—";
    }
    return { unit, stats: merged };
  });

  const kpiValues = Object.fromEntries(
    (summary?.kpis ?? []).map((kpi) => [kpi.metricKey, formatGroupKpi(kpi)]),
  );

  // Labels stay visible; 0 + spinner while summary loads (legacy POS feel).
  const summaryLoading = summaryQuery.isLoading || summaryQuery.isFetching;
  const detailsLoading = !detailsDeferred || (detailsQuery.isLoading && !details);
  const kpiValuesOrZero = summaryLoading
    ? Object.fromEntries(GROUP_KPIS.map((card) => [card.metricKey, "0"]))
    : kpiValues;

  const entityComparisonChart = details?.charts.find((c) => c.id === "entity-comparison");
  const revenueTrendChart = details?.charts.find((c) => c.id === "group-revenue-trend");

  const entityComparisonData = (() => {
    if (!entityComparisonChart) return [];
    const byUnit = new Map<string, number>();
    for (const row of entityComparisonChart.data) {
      const label = String(row.label);
      const unitId = vagViewUnitIdForTenantCode(label) ?? label;
      byUnit.set(unitId, (byUnit.get(unitId) ?? 0) + Number(row.value ?? 0));
    }
    return VAG_VIEW_UNITS.map((unit) => ({
      label: unit.badge,
      value: byUnit.get(unit.id) ?? 0,
      color: accentForTenantCode(accentTenantCodeForVagUnit(unit.id)),
    }));
  })();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Showing <span className="font-medium text-foreground">{periodLabel}</span>
        </p>
        <DateRangeDropdown
          value={dateRange}
          onChange={setDateRange}
          customValue={customDateRange}
          onCustomChange={setCustomDateRange}
        />
      </div>

      <div className="hq6-card px-4 py-3 text-sm text-[#6b7280]">
        <p className="font-semibold text-[#111827]">Group overview</p>
        <p className="mt-1">
          Each card is a separate Vonos business. Select <strong>Enter</strong> or use the entity
          switcher to work in that location.
        </p>
      </div>

      <KpiRow
        cards={GROUP_KPIS}
        values={kpiValuesOrZero}
        isLoading={summaryLoading && !summary}
        loadingDisplay="zero-spinner"
      />

      {(details?.alerts?.length ?? 0) > 0 ? (
        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">Group alerts</h3>
          <div className="grid gap-3">
            {details!.alerts.map((alert: GroupOverviewAlert) => (
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {unitCards.map(({ unit, stats }) => (
            <EntityOverviewCard
              key={unit.id}
              code={unit.badge}
              name={unit.name}
              description={unit.description}
              stats={stats}
              href={tenantOverviewPath(unit.enterCode)}
              isLoading={summaryLoading && !summary}
            />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {detailsLoading ? (
          <>
            <div className="hq6-card flex min-h-[240px] flex-col items-center justify-center gap-2 p-6">
              <p className="text-sm font-semibold text-[#111827]">Group revenue trend</p>
              <p className="text-2xl font-semibold tabular-nums">0</p>
              <Spinner size="md" className="text-muted" />
              <p className="text-xs text-muted">Loading…</p>
            </div>
            <div className="hq6-card flex min-h-[240px] flex-col items-center justify-center gap-2 p-6">
              <p className="text-sm font-semibold text-[#111827]">Entity comparison</p>
              <p className="text-2xl font-semibold tabular-nums">0</p>
              <Spinner size="md" className="text-muted" />
              <p className="text-xs text-muted">Loading…</p>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

export function VagCrossEntityFinance() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Consolidated finance view — same 4-tab structure, unscoped and grouped by
        entity. Group P&L excludes ledger rows tagged as internal transfers;
        stock requisitions remain stock-only.
      </p>
    </div>
  );
}
