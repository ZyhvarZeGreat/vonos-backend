import type { LedgerEntry } from "@vonos/types";
import type { DateRangeBounds } from "@/lib/utils/dateRange";
import type { DateRangePreset } from "@/stores/uiStore";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type LedgerBucketGranularity = "hour" | "day" | "week" | "month";

/** ChartPanel expects `label` on each row for axes and pie slices. */
export type LedgerChartRow = Record<string, string | number>;

export interface LedgerPlTrendOptions {
  preset: DateRangePreset;
  bounds: DateRangeBounds | null;
}

export function granularityForPreset(preset: DateRangePreset): LedgerBucketGranularity {
  switch (preset) {
    case "last_hour":
      return "hour";
    case "last_1_day":
    case "last_7_days":
    case "last_30_days":
    case "this_month":
      return "day";
    case "last_90_days":
      return "week";
    case "all_time":
      return "month";
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

export function ledgerChartSubtitle(preset: DateRangePreset): string {
  const granularity = granularityForPreset(preset);
  if (granularity === "hour") return "Hourly totals from this entity's ledger";
  if (granularity === "day") return "Daily totals from this entity's ledger";
  if (granularity === "week") return "Weekly totals from this entity's ledger";
  return "Monthly totals from this entity's ledger";
}

function startOfHour(date: Date): Date {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Monday 00:00 of the week containing `date`. */
function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function alignBucketStart(date: Date, granularity: LedgerBucketGranularity): Date {
  if (granularity === "hour") return startOfHour(date);
  if (granularity === "day") return startOfDay(date);
  if (granularity === "week") return startOfWeek(date);
  return startOfMonth(date);
}

function advanceBucket(date: Date, granularity: LedgerBucketGranularity): Date {
  const d = new Date(date);
  if (granularity === "hour") {
    d.setHours(d.getHours() + 1);
    return d;
  }
  if (granularity === "day") {
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (granularity === "week") {
    d.setDate(d.getDate() + 7);
    return d;
  }
  d.setMonth(d.getMonth() + 1);
  return d;
}

function bucketKeyFromDate(date: Date, granularity: LedgerBucketGranularity): string {
  if (granularity === "hour") {
    return date.toISOString().slice(0, 13);
  }
  if (granularity === "day") {
    return date.toISOString().slice(0, 10);
  }
  if (granularity === "week") {
    return startOfWeek(date).toISOString().slice(0, 10);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function bucketKeyFromEntry(date: string, granularity: LedgerBucketGranularity): string {
  return bucketKeyFromDate(new Date(date), granularity);
}

function formatHourLabel(key: string): string {
  const hour = Number(key.slice(11, 13));
  const suffix = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}${suffix}`;
}

function formatDayLabel(key: string): string {
  const d = new Date(`${key}T12:00:00`);
  return `${DAY_LABELS[d.getDay()]} ${d.getDate()}`;
}

function formatWeekLabel(key: string): string {
  const d = new Date(`${key}T12:00:00`);
  const month = MONTH_LABELS[d.getMonth()] ?? key;
  return `Wk of ${month} ${d.getDate()}`;
}

function formatMonthLabel(key: string): string {
  const month = Number(key.slice(5, 7));
  const year = key.slice(0, 4);
  const monthName = MONTH_LABELS[month - 1] ?? key;
  return `${monthName} '${year.slice(2)}`;
}

function formatBucketLabel(key: string, granularity: LedgerBucketGranularity): string {
  if (granularity === "hour") return formatHourLabel(key);
  if (granularity === "day") return formatDayLabel(key);
  if (granularity === "week") return formatWeekLabel(key);
  return formatMonthLabel(key);
}

function enumerateBucketKeys(
  bounds: DateRangeBounds | null,
  granularity: LedgerBucketGranularity,
  entryKeys: string[],
): string[] {
  if (!bounds) {
    return [...new Set(entryKeys)].sort();
  }

  const keys: string[] = [];
  let cursor = alignBucketStart(new Date(bounds.from), granularity);
  const end = new Date(bounds.to);

  while (cursor.getTime() <= end.getTime()) {
    keys.push(bucketKeyFromDate(cursor, granularity));
    cursor = advanceBucket(cursor, granularity);
  }

  return keys;
}

function emptyTotals(): { revenue: number; costs: number } {
  return { revenue: 0, costs: 0 };
}

/** Revenue vs costs (cost + expense), bucketed to match the selected date range. */
export function ledgerPlTrend(
  entries: LedgerEntry[],
  options: LedgerPlTrendOptions,
): LedgerChartRow[] {
  const granularity = granularityForPreset(options.preset);
  const aggregated = new Map<string, { revenue: number; costs: number }>();

  for (const entry of entries) {
    const key = bucketKeyFromEntry(entry.date, granularity);
    const row = aggregated.get(key) ?? emptyTotals();
    if (entry.type === "revenue") {
      row.revenue += entry.amount;
    } else {
      row.costs += entry.amount;
    }
    aggregated.set(key, row);
  }

  const bucketKeys = enumerateBucketKeys(
    options.bounds,
    granularity,
    [...aggregated.keys()],
  );

  return bucketKeys.map((key) => {
    const values = aggregated.get(key) ?? emptyTotals();
    return {
      label: formatBucketLabel(key, granularity),
      revenue: values.revenue,
      costs: values.costs,
    };
  });
}

/** Revenue share by category for pie charts (raw amounts — Recharts computes slice size). */
export function ledgerCategoryBreakdown(entries: LedgerEntry[]): LedgerChartRow[] {
  const revenue = entries.filter((entry) => entry.type === "revenue");
  const total = revenue.reduce((sum, entry) => sum + entry.amount, 0);
  if (total <= 0) return [];

  const byCategory = new Map<string, number>();
  for (const entry of revenue) {
    byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + entry.amount);
  }

  return [...byCategory.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([category, amount]) => ({
      label: category,
      value: amount,
    }));
}
