"use client";

import { useRouter } from "next/navigation";
import type { OverviewDashboard, ReportsChart, ReportsKpi } from "@vonos/types";
import { ChartPanel } from "@/components/organisms/ChartPanel";
import {
  CompactDataPanel,
  renderStatusCell,
} from "@/components/organisms/CompactDataPanel";
import { KpiRow } from "@/components/organisms/KpiRow";
import { RankedListPanel } from "@/components/organisms/RankedListPanel";
import { RevenueHeroPanel } from "@/components/organisms/RevenueHeroPanel";
import { ScheduleTimelinePanel } from "@/components/organisms/ScheduleTimelinePanel";
import type {
  TimelineBlock,
  TimelineStylist,
} from "@/components/organisms/ScheduleTimelinePanel";
import { TableStatusSummary } from "@/components/organisms/TableStatusSummary";
import { formatCurrencyCompact, formatNumberCompact } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import { ledgerChartSubtitle } from "@/lib/utils/ledgerCharts";
import type { DateRangePreset } from "@/stores/uiStore";
import type { TenantCode } from "@/lib/registries/tenants";
import { TENANT_ACCENT } from "@/lib/registries/tenantAccents";
import { recordDetailPath } from "@/lib/utils/recordDetailPath";
import { DashboardBodySkeleton } from "@/components/organisms/skeletons";
import { EntityOverviewPanels } from "@/components/organisms/EntityOverviewPanels";

type OverviewTableRow = Record<string, string | number> & { id: string };

function parseTimelineHour(label: string): number {
  const match = label.match(/(\d+)/);
  if (!match) return 9;
  let hour = Number.parseInt(match[1], 10);
  if (label.toLowerCase().includes("pm") && hour < 12) hour += 12;
  if (label.toLowerCase().includes("am") && hour === 12) hour = 0;
  return hour;
}

function mapTimeline(
  timeline: NonNullable<OverviewDashboard["timeline"]>,
): {
  hours: readonly number[];
  stylists: TimelineStylist[];
  blocks: TimelineBlock[];
} {
  const stylists: TimelineStylist[] = timeline.stylists.map((name, index) => ({
    id: `stylist-${index}`,
    name,
  }));
  const stylistIdByName = new Map(stylists.map((stylist) => [stylist.name, stylist.id]));
  const hours = [...new Set(timeline.hours.map(parseTimelineHour))].sort((a, b) => a - b);

  return {
    hours,
    stylists,
    blocks: timeline.blocks.map((block) => ({
      id: block.id,
      stylistId: stylistIdByName.get(block.stylist) ?? stylists[0]?.id ?? "stylist-0",
      startHour: parseTimelineHour(block.hour),
      spanHours: 1,
      customerName: block.client,
      serviceName: block.service,
      status: block.status,
    })),
  };
}

function formatKpiValue(kpi: ReportsKpi): string {
  if (kpi.metricKey === "transactionCount" || kpi.metricKey === "todayOrders") {
    return formatNumberCompact(kpi.value);
  }
  if (kpi.metricKey === "costs" || kpi.metricKey === "net" || kpi.metricKey === "revenue") {
    return formatCurrencyCompact(kpi.value, kpi.currency ?? "NGN");
  }
  if (kpi.metricKey === "activeTables") {
    return String(kpi.value);
  }
  if (kpi.metricKey === "available") {
    return `${kpi.value} slots`;
  }
  if (kpi.metricKey === "lowStock") {
    return `${kpi.value} items`;
  }
  if (kpi.currency) {
    return formatCurrencyCompact(kpi.value, kpi.currency);
  }
  return formatNumberCompact(kpi.value);
}

function kpiToCards(kpis: ReportsKpi[]) {
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

function kpiDeltas(kpis: ReportsKpi[]) {
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

function renderChart(
  chart: ReportsChart,
  periodLabel: string,
  accent?: string,
  formatTooltipValue?: (value: number) => string,
) {
  return (
    <ChartPanel
      key={chart.id}
      title={chart.title}
      subtitle={chart.subtitle}
      type={chart.type}
      horizontal={chart.horizontal}
      data={chart.data}
      series={chart.series.map((series, index) => ({
        ...series,
        color: series.color ?? accent ?? (index === 0 ? "#3b82f6" : "#93c5fd"),
      }))}
      periodLabel={periodLabel}
      formatTooltipValue={formatTooltipValue}
      formatLegendValue={formatTooltipValue}
    />
  );
}

export interface OverviewLiveBodyProps {
  tenantCode: TenantCode;
  archetype: string;
  dashboard: OverviewDashboard | undefined;
  isLoading: boolean;
  error: Error | null;
  dateRange: DateRangePreset;
}

export function OverviewLiveBody({
  tenantCode,
  archetype,
  dashboard,
  isLoading,
  error,
  dateRange,
}: OverviewLiveBodyProps) {
  const router = useRouter();
  const accent = TENANT_ACCENT[tenantCode];
  const periodLabel = ledgerChartSubtitle(dateRange);
  const isCafe = tenantCode === "VC";
  const isRetailCatalog = tenantCode === "VISP" || tenantCode === "VSP";
  const isMechanics = tenantCode === "VA";

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted">
        Something went wrong loading overview data. Try again or change the date range.
      </div>
    );
  }

  if (isLoading && !dashboard) {
    return <DashboardBodySkeleton kpiCount={6} chartCount={2} financeChartCount={2} />;
  }

  const kpis = dashboard?.kpis ?? [];
  const { deltas, deltaLabels, deltaPercents } = kpiDeltas(kpis);
  const charts = dashboard?.charts ?? [];
  const financeCharts = dashboard?.financeCharts ?? [];
  const financeKpis = dashboard?.financeKpis ?? [];
  const panels = dashboard?.panels ?? [];
  const ledgerCurrency =
    kpis.find((k) => k.metricKey === "revenue" || k.metricKey === "net")?.currency ?? "NGN";

  const formatFinanceTooltip = (value: number) =>
    formatCurrencyCompact(value, ledgerCurrency);

  const formatOrdersTooltip = (value: number) => formatNumberCompact(value);

  const secondaryCharts = [
    ...(isRetailCatalog && charts[1] ? [charts[1]] : []),
    ...financeCharts,
  ];

  const revenueKpi = kpis.find((k) => k.metricKey === "revenue" || k.metricKey === "todaySales");

  return (
    <div className="space-y-6">
      <KpiRow
        cards={kpiToCards(kpis)}
        values={kpiValues(kpis)}
        deltas={deltas}
        deltaLabels={deltaLabels}
        deltaPercents={deltaPercents}
      />

      {archetype === "appointment" && dashboard?.timeline ? (
        <ScheduleTimelinePanel
          {...mapTimeline(dashboard.timeline)}
        />
      ) : archetype === "transaction" && isRetailCatalog ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RevenueHeroPanel
            data={
              charts[0]?.data.map((row) => ({
                label: String(row.label),
                revenue: Number(row.value ?? row.revenue ?? 0),
              })) ?? []
            }
            revenueToday={
              revenueKpi ? formatKpiValue(revenueKpi) : formatCurrencyCompact(0, "NGN")
            }
            accentColor={accent}
          />
          {dashboard?.rankedList ? (
            <RankedListPanel
              items={dashboard.rankedList.map((item) => ({
                label: item.label,
                units: item.units,
                revenue: item.revenue,
                currency: item.currency,
              }))}
              accentColor={accent}
              periodLabel={periodLabel}
              onItemClick={(item) => {
                const match = dashboard.rankedList?.find((row) => row.label === item.label);
                const path = recordDetailPath(tenantCode, "item", match?.itemId ?? null);
                if (path) router.push(path);
              }}
            />
          ) : null}
        </div>
      ) : archetype === "transaction" && isCafe ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {charts[0] ? renderChart(charts[0], periodLabel, accent) : null}
          {dashboard?.tableStatus ? (
            <TableStatusSummary
              available={dashboard.tableStatus.available}
              occupied={dashboard.tableStatus.occupied}
              reserved={dashboard.tableStatus.reserved}
              viewTablesHref="/VC/table-management"
            />
          ) : null}
        </div>
      ) : archetype === "job" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {charts[0] ? renderChart(charts[0], periodLabel, accent) : null}
          {dashboard?.table ? (
            <CompactDataPanel
              className="h-[var(--space-chart-height)]"
              title={isMechanics ? "Vehicles In Shop" : "Jobs Due Soon"}
              subtitle={
                isMechanics ? "Currently being serviced" : "Approaching or past due date"
              }
              rows={dashboard.table.rows as OverviewTableRow[]}
              columns={
                isMechanics
                  ? [
                      { key: "plate", header: "Plate" },
                      { key: "vehicle", header: "Vehicle" },
                      {
                        key: "status",
                        header: "Status",
                        render: (row) => renderStatusCell(String(row.status), "jobStatus"),
                      },
                      { key: "technician", header: "Technician" },
                    ]
                  : [
                      { key: "reference", header: "Reference" },
                      { key: "customer", header: "Customer" },
                      {
                        key: "dueDate",
                        header: "Due",
                        render: (row) => (
                          <span
                            className={
                              row.overdue === "yes" ? "font-medium text-error" : undefined
                            }
                          >
                            {formatDate(String(row.dueDate))}
                          </span>
                        ),
                      },
                      {
                        key: "status",
                        header: "Status",
                        render: (row) => renderStatusCell(String(row.status), "jobStatus"),
                      },
                    ]
              }
            />
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {charts.map((chart) => renderChart(chart, periodLabel, accent))}
        </div>
      )}

      {archetype === "appointment" && dashboard?.table ? (
        <CompactDataPanel
          title="Upcoming Appointments"
          subtitle="Rest of today's bookings"
          rows={dashboard.table.rows as OverviewTableRow[]}
          columns={[
            { key: "time", header: "Time" },
            { key: "client", header: "Client" },
            { key: "service", header: "Service" },
            { key: "stylist", header: "Stylist" },
            {
              key: "status",
              header: "Status",
              render: (row) => renderStatusCell(String(row.status), "appointmentStatus"),
            },
          ]}
        />
      ) : null}

      {financeKpis.length > 0 ? (
        <KpiRow
          cards={kpiToCards(financeKpis)}
          values={kpiValues(financeKpis)}
          {...kpiDeltas(financeKpis)}
        />
      ) : null}

      {secondaryCharts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {secondaryCharts.map((chart) =>
            renderChart(
              chart,
              periodLabel,
              accent,
              chart.id === "orders-trend" ? formatOrdersTooltip : formatFinanceTooltip,
            ),
          )}
        </div>
      ) : null}

      {panels.length > 0 ? (
        <EntityOverviewPanels panels={panels} tenantCode={tenantCode} />
      ) : null}
    </div>
  );
}
