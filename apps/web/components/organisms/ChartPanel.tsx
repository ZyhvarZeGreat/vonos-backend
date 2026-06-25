"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { EmptyState } from "@/components/atoms/EmptyState";
import { ChartLegendItem } from "@/components/molecules/ChartLegendItem";
import { ChartPanelSkeleton } from "@/components/organisms/skeletons";
import { formatNumberCompact } from "@/lib/utils/formatCurrency";
import { cn } from "@/lib/utils/cn";

export type ChartType = "bar" | "line" | "pie" | "area";

const PIE_SLICE_COLORS = [
  "#9333ea",
  "#059669",
  "#2563eb",
  "#e11d48",
  "#f59e0b",
  "#06b6d4",
  "#84cc16",
  "#ec4899",
];

export interface ChartSeries {
  name: string;
  dataKey: string;
  color: string;
}

export interface ChartPanelProps {
  title: string;
  subtitle?: string;
  type: ChartType;
  data: Record<string, string | number>[];
  series: ChartSeries[];
  periodLabel?: string;
  hidePeriodControl?: boolean;
  formatTooltipValue?: (value: number) => string;
  formatLegendValue?: (value: number) => string;
  /** Show series / slice labels outside the chart (not only in tooltips). */
  showExternalLegend?: boolean;
  hideHeader?: boolean;
  horizontal?: boolean;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export function ChartPanel({
  title,
  subtitle,
  type,
  data,
  series,
  periodLabel = "Last 30 days",
  hidePeriodControl = false,
  formatTooltipValue,
  formatLegendValue,
  showExternalLegend = true,
  hideHeader = false,
  horizontal = false,
  isLoading = false,
  error = null,
  className,
}: ChartPanelProps) {
  const renderTooltipValue = (value: number | string) =>
    formatTooltipValue ? formatTooltipValue(Number(value)) : formatNumberCompact(Number(value));
  const renderLegendValue = (value: number) =>
    formatLegendValue
      ? formatLegendValue(value)
      : formatTooltipValue
        ? formatTooltipValue(value)
        : formatNumberCompact(value);

  const axisTickFormatter = (value: number | string) =>
    renderLegendValue(Number(value));

  const seriesTotals = series.map((item) => ({
    ...item,
    total: data.reduce((sum, row) => sum + Number(row[item.dataKey] ?? 0), 0),
  }));

  const pieTotal =
    type === "pie" && series[0]
      ? data.reduce((sum, row) => sum + Number(row[series[0]!.dataKey] ?? 0), 0)
      : 0;

  return (
    <section
      className={cn(
        hideHeader
          ? "flex min-h-[240px] flex-col"
          : "flex h-[var(--space-chart-height)] flex-col rounded-xl border border-border bg-card p-6 shadow-sm",
        className,
      )}
    >
      {!hideHeader ? (
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
          </div>
          {!hidePeriodControl ? (
            <Button variant="secondary" size="sm" className="gap-2">
              {periodLabel}
              <ChevronDown className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ) : null}

      {showExternalLegend && !isLoading && !error && data.length > 0 && type !== "pie" ? (
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2">
          {seriesTotals.map((item) => (
            <ChartLegendItem
              key={item.dataKey}
              label={item.name}
              color={item.color}
              value={renderLegendValue(item.total)}
            />
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <ChartPanelSkeleton withHeader={false} className="h-full min-h-[240px] border-0 p-0 shadow-none" />
      ) : error ? (
        <EmptyState title="Something went wrong" message={error} />
      ) : data.length === 0 ? (
        <EmptyState title="No chart data" message="There is nothing to display for this period yet." />
      ) : type === "pie" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-center">
          <div className="min-h-[200px] flex-1">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <PieChart>
                <Tooltip
                  formatter={(value) => renderTooltipValue(value as number | string)}
                />
                <Pie
                  data={data}
                  dataKey={series[0]?.dataKey ?? "value"}
                  nameKey="label"
                  innerRadius={50}
                  outerRadius={90}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_SLICE_COLORS[index % PIE_SLICE_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          {showExternalLegend ? (
            <div className="flex w-full shrink-0 flex-col gap-2 lg:w-52">
              {data.map((entry, index) => {
                const raw = Number(entry[series[0]?.dataKey ?? "value"] ?? 0);
                const pct = pieTotal > 0 ? Math.round((raw / pieTotal) * 100) : 0;
                return (
                  <ChartLegendItem
                    key={String(entry.label)}
                    label={String(entry.label)}
                    color={PIE_SLICE_COLORS[index % PIE_SLICE_COLORS.length]!}
                    value={`${renderLegendValue(raw)} (${pct}%)`}
                    className="w-full justify-between"
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            {type === "bar" ? (
              <BarChart
                data={data}
                layout={horizontal ? "vertical" : "horizontal"}
              >
                <CartesianGrid stroke="#f3f4f6" horizontal={!horizontal} vertical={horizontal} />
                {horizontal ? (
                  <>
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={axisTickFormatter}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      width={100}
                    />
                  </>
                ) : (
                  <>
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={axisTickFormatter}
                    />
                  </>
                )}
                <Tooltip
                  formatter={(value) => renderTooltipValue(value as number | string)}
                />
                {series.map((item) => (
                  <Bar
                    key={item.dataKey}
                    dataKey={item.dataKey}
                    fill={item.color}
                    radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                  >
                    {data.map((entry, index) => (
                      <Cell
                        key={`bar-cell-${index}`}
                        fill={
                          typeof entry.color === "string"
                            ? entry.color
                            : series[index]?.color ?? item.color
                        }
                      />
                    ))}
                  </Bar>
                ))}
              </BarChart>
            ) : type === "line" ? (
              <LineChart data={data}>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={axisTickFormatter}
                />
                <Tooltip
                  formatter={(value) => renderTooltipValue(value as number | string)}
                />
                {series.map((item) => (
                  <Line
                    key={item.dataKey}
                    type="monotone"
                    dataKey={item.dataKey}
                    stroke={item.color}
                    strokeWidth={3}
                    dot={false}
                  />
                ))}
              </LineChart>
            ) : type === "area" ? (
              <AreaChart data={data}>
                <CartesianGrid stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={axisTickFormatter}
                />
                <Tooltip
                  formatter={(value) => renderTooltipValue(value as number | string)}
                />
                {series.map((item) => (
                  <Area
                    key={item.dataKey}
                    type="monotone"
                    dataKey={item.dataKey}
                    stroke={item.color}
                    fill={item.color}
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            ) : null}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
