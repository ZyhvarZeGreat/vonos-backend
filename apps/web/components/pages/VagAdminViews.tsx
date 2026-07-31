"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChartPanel } from "@/components/organisms/ChartPanel";
import {
  DateRangeDropdown,
  getDateRangeLabel,
} from "@/components/molecules/DateRangeDropdown";
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
import { iconForTenantCode } from "@/lib/registries/tenantIcons";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { ledgerChartSubtitle } from "@/lib/utils/ledgerCharts";
import {
  formatCurrencyCompact,
  formatNumberCompact,
} from "@/lib/utils/formatCurrency";
import { useAuthStore } from "@/stores/authStore";
import { welcomeFirstName } from "@/lib/utils/welcomeFirstName";
import type { GroupOverviewAlert, ReportsKpi } from "@vonos/types";
import {
  Hq6IconShoppingCart,
  hq6KpiIcon,
  hq6KpiIconWrapClass,
} from "@/components/hq6/hq6HomeIcons";

const GROUP_KPI_DEFS = [
  { label: "Group Revenue", metricKey: "revenue" },
  { label: "Total Jobs", metricKey: "jobs" },
  { label: "Active Entities", metricKey: "entities" },
  { label: "Outstanding", metricKey: "outstanding" },
] as const;

function formatGroupKpi(kpi: ReportsKpi): string {
  if (kpi.currency) return formatCurrencyCompact(kpi.value, kpi.currency);
  return formatNumberCompact(kpi.value);
}

function GroupKpiCard({
  label,
  metricKey,
  value,
  isLoading,
}: {
  label: string;
  metricKey: string;
  value: string;
  isLoading: boolean;
}) {
  const Icon = hq6KpiIcon(metricKey);
  return (
    <div className="tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm hover:tw-shadow-md tw-rounded-xl hover:tw--translate-y-0.5 tw-ring-1 tw-ring-gray-200">
      <div className="tw-p-4 sm:tw-p-5">
        <div className="tw-flex tw-items-center tw-gap-4">
          <div
            className={`tw-inline-flex tw-items-center tw-justify-center tw-w-10 tw-h-10 tw-rounded-full sm:tw-w-12 sm:tw-h-12 tw-shrink-0 ${hq6KpiIconWrapClass(metricKey)}`}
          >
            <Icon className="tw-w-6 tw-h-6" />
          </div>
          <div className="tw-flex-1 tw-min-w-0">
            <p className="tw-text-sm tw-font-medium tw-text-gray-500 tw-truncate tw-whitespace-nowrap">
              {label}
            </p>
            {isLoading ? (
              <div className="tw-mt-0.5 tw-flex tw-items-center tw-gap-2">
                <p className="tw-text-gray-900 tw-text-xl tw-truncate tw-font-semibold tw-tracking-tight tw-font-mono">
                  0
                </p>
                <Spinner size="sm" className="text-muted" />
              </div>
            ) : (
              <p className="tw-mt-0.5 tw-text-gray-900 tw-text-xl tw-truncate tw-font-semibold tw-tracking-tight tw-font-mono">
                {value}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupChartCard({
  title,
  loading,
  children,
}: {
  title: string;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md hover:tw--translate-y-0.5 tw-ring-gray-200">
      <div className="tw-p-4 sm:tw-p-5">
        <div className="tw-flex tw-items-center tw-gap-2.5">
          <div className="tw-border-2 tw-flex tw-items-center tw-justify-center tw-rounded-full tw-w-10 tw-h-10 tw-border-gray-200">
            <Hq6IconShoppingCart className="tw-size-5 tw-text-sky-500 tw-shrink-0" />
          </div>
          <h3 className="tw-font-bold tw-text-base lg:tw-text-xl tw-text-gray-900">
            {title}
          </h3>
        </div>
        <div className="tw-mt-5">
          <div className="tw-grid tw-w-full tw-min-h-[240px] tw-border tw-border-gray-200 tw-border-dashed tw-rounded-xl tw-bg-gray-50">
            {loading ? (
              <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-2 tw-min-h-[240px]">
                <p className="tw-text-2xl tw-font-semibold tw-tabular-nums">0</p>
                <Spinner size="md" className="text-muted" />
                <p className="tw-text-sm tw-italic tw-font-normal tw-text-gray-400">
                  Loading…
                </p>
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupEntityCard({
  badge,
  name,
  enterCode,
  stats,
  isLoading,
}: {
  badge: string;
  name: string;
  enterCode: string;
  stats: [string, string, string];
  isLoading: boolean;
}) {
  const accent = accentForTenantCode(enterCode);
  const Icon = iconForTenantCode(enterCode);
  const display = isLoading ? (["0", "0", "0"] as const) : stats;

  return (
    <Link
      href={tenantOverviewPath(enterCode as "VA" | "VW" | "VSP")}
      className="tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm hover:tw-shadow-md tw-rounded-xl hover:tw--translate-y-0.5 tw-ring-1 tw-ring-gray-200 tw-block tw-no-underline"
      aria-busy={isLoading || undefined}
    >
      <div className="tw-p-4 sm:tw-p-5">
        <div className="tw-flex tw-items-center tw-gap-3">
          <span
            className="tw-inline-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-text-white"
            style={{ backgroundColor: accent }}
          >
            <Icon className="tw-h-5 tw-w-5" />
          </span>
          <div className="tw-min-w-0 tw-flex-1">
            <p className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-gray-500">
              {badge}
            </p>
            <h3 className="tw-truncate tw-text-base tw-font-bold tw-text-gray-900">
              {name.replace(/^Vonos\s+/i, "")}
            </h3>
          </div>
          {isLoading ? <Spinner size="sm" className="text-muted" /> : null}
        </div>
        <ul className="tw-mt-4 tw-space-y-1.5 tw-text-sm tw-text-gray-600">
          {display.map((stat, index) => (
            <li key={`${badge}-${index}`} className="tw-truncate">
              {stat}
            </li>
          ))}
        </ul>
        <p className="tw-mt-4 tw-text-sm tw-font-semibold tw-text-gray-900">
          Enter →
        </p>
      </div>
    </Link>
  );
}

/**
 * VAG Group Overview — Ultimate POS home layout (welcome + KPIs + cards + charts).
 */
export function VagGroupOverview() {
  const userName = useAuthStore((s) => s.name) ?? "Admin";
  const firstName = welcomeFirstName(userName, "Admin");
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
  const rangeLabel = getDateRangeLabel(dateRange, customDateRange);
  const entityStats = new Map(
    (summary?.entityStats ?? []).map((row) => [row.code, row.stats]),
  );

  const unitCards = VAG_VIEW_UNITS.map((unit) => {
    if (unit.tenantCodes.length === 1) {
      const code = unit.tenantCodes[0]!;
      return {
        unit,
        stats: (entityStats.get(code) ?? ["—", "—", "—"]) as [
          string,
          string,
          string,
        ],
      };
    }
    const merged: [string, string, string] = ["—", "—", "—"];
    for (let i = 0; i < 3; i++) {
      const parts = unit.tenantCodes
        .map((code) => entityStats.get(code)?.[i])
        .filter((s): s is string => Boolean(s) && s !== "—");
      merged[i] = parts.length > 0 ? parts.join(" · ") : "—";
    }
    return { unit, stats: merged };
  });

  const kpiByKey = new Map(
    (summary?.kpis ?? []).map((kpi) => [kpi.metricKey, kpi] as const),
  );

  const summaryLoading = summaryQuery.isLoading || summaryQuery.isFetching;
  const detailsLoading =
    !detailsDeferred || (detailsQuery.isLoading && !details);

  const entityComparisonChart = details?.charts.find(
    (c) => c.id === "entity-comparison",
  );
  const revenueTrendChart = details?.charts.find(
    (c) => c.id === "group-revenue-trend",
  );

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
    <div className="hq6-page hq6-home">
      <div className="tw-pb-6 theme-header-bg xl:tw-pb-0">
        <div className="tw-px-5 tw-pt-3">
          <div className="tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-items-center sm:tw-justify-start sm:tw-gap-4">
            <div className="tw-min-w-0">
              <h1 className="tw-text-2xl lg:tw-text-4xl tw-tracking-tight tw-font-semibold text-white">
                Welcome {firstName}, 👋
              </h1>
              <p className="tw-mt-1 tw-text-sm tw-text-white/80">
                Vonos Autos Group · {rangeLabel}
              </p>
            </div>

            <div className="hq6-home-filters tw-flex tw-w-auto tw-shrink-0 tw-items-center tw-justify-start tw-gap-2">
              <div className="hq6-home-filter">
                <DateRangeDropdown
                  id="vag_group_date_filter"
                  value={dateRange}
                  onChange={setDateRange}
                  customValue={customDateRange}
                  onCustomChange={setCustomDateRange}
                  align="start"
                  className="tw-w-full"
                />
              </div>
            </div>
          </div>

          <div
            className="tw-grid tw-grid-cols-1 tw-gap-4 tw-mt-6 sm:tw-grid-cols-2 xl:tw-grid-cols-4 sm:tw-gap-5"
            aria-busy={summaryLoading || undefined}
          >
            {GROUP_KPI_DEFS.map((def) => {
              const kpi = kpiByKey.get(def.metricKey);
              return (
                <GroupKpiCard
                  key={def.metricKey}
                  label={def.label}
                  metricKey={def.metricKey}
                  value={kpi ? formatGroupKpi(kpi) : "0"}
                  isLoading={summaryLoading && !summary}
                />
              );
            })}
          </div>
        </div>

        <div className="tw-relative">
          <div className="tw-absolute tw-inset-0 tw-grid" aria-hidden="true">
            <div className="theme-header-bg" />
            <div className="theme-header-bg hq6-home-header-fade xl:tw-bg-gray-100" />
          </div>
          <div className="tw-px-5 tw-isolate">
            <div className="tw-grid tw-grid-cols-1 tw-gap-4 tw-mt-4 sm:tw-mt-6 sm:tw-grid-cols-2 xl:tw-grid-cols-3 sm:tw-gap-5">
              {unitCards.map(({ unit, stats }) => (
                <GroupEntityCard
                  key={unit.id}
                  badge={unit.badge}
                  name={unit.name}
                  enterCode={unit.enterCode}
                  stats={stats}
                  isLoading={summaryLoading && !summary}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="tw-px-5 tw-py-6">
        {(details?.alerts?.length ?? 0) > 0 ? (
          <div className="tw-mb-5 tw-space-y-3">
            {details!.alerts.map((alert: GroupOverviewAlert) => (
              <div
                key={alert.id}
                className="tw-rounded-xl tw-bg-white tw-px-4 tw-py-3 tw-text-sm tw-shadow-sm tw-ring-1 tw-ring-gray-200"
              >
                <p className="tw-font-semibold tw-text-gray-900">
                  {alert.entityCode ? `${alert.entityCode}: ` : ""}
                  {alert.title}
                </p>
                <p className="tw-mt-1 tw-text-gray-600">{alert.message}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-gap-5 lg:tw-grid-cols-2">
          {detailsLoading ? (
            <>
              <GroupChartCard title={`Group revenue · ${periodLabel}`} loading />
              <GroupChartCard title={`By entity · ${periodLabel}`} loading />
            </>
          ) : (
            <>
              <GroupChartCard
                title={
                  revenueTrendChart?.title ?? `Group revenue · ${periodLabel}`
                }
              >
                {revenueTrendChart ? (
                  <ChartPanel
                    title={revenueTrendChart.title}
                    subtitle={revenueTrendChart.subtitle}
                    type={revenueTrendChart.type}
                    data={revenueTrendChart.data}
                    series={revenueTrendChart.series}
                    periodLabel={periodLabel}
                    hidePeriodControl
                    hideHeader
                    className="hq6-home-chart-panel"
                    formatTooltipValue={(value) =>
                      formatCurrencyCompact(Number(value), "NGN")
                    }
                  />
                ) : null}
              </GroupChartCard>
              <GroupChartCard
                title={
                  entityComparisonChart?.title ?? `By entity · ${periodLabel}`
                }
              >
                {entityComparisonChart ? (
                  <ChartPanel
                    title={entityComparisonChart.title}
                    subtitle={entityComparisonChart.subtitle}
                    type={entityComparisonChart.type}
                    horizontal={entityComparisonChart.horizontal}
                    data={entityComparisonData}
                    series={entityComparisonChart.series}
                    periodLabel={periodLabel}
                    hidePeriodControl
                    hideHeader
                    className="hq6-home-chart-panel"
                    formatTooltipValue={(value) =>
                      formatCurrencyCompact(Number(value), "NGN")
                    }
                  />
                ) : null}
              </GroupChartCard>
            </>
          )}
        </div>
      </div>

      <p className="hq6-footer">
        Vonos Autos Head Office - V8.1 | Copyright © {new Date().getFullYear()}{" "}
        All rights reserved.
      </p>
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
