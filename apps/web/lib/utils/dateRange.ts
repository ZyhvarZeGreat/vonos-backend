import type { CustomDateRange, DateRangePreset } from "@/stores/uiStore";

export interface DateRangeBounds {
  from: string;
  to: string;
}

/** Max span sent to report/finance APIs — matches backend MAX_QUERY_WINDOW_MS. */
export const MAX_API_RANGE_DAYS = 365;

function cappedAllTimeBounds(now: Date): DateRangeBounds {
  const start = new Date(now);
  start.setDate(start.getDate() - MAX_API_RANGE_DAYS);
  return { from: start.toISOString(), to: now.toISOString() };
}

function capBounds(bounds: DateRangeBounds, now = new Date()): DateRangeBounds {
  const fromMs = new Date(bounds.from).getTime();
  const toMs = new Date(bounds.to).getTime();
  const maxSpanMs = MAX_API_RANGE_DAYS * 24 * 60 * 60 * 1000;
  if (toMs - fromMs <= maxSpanMs) return bounds;
  const cappedFrom = new Date(toMs - maxSpanMs);
  return { from: cappedFrom.toISOString(), to: bounds.to };
}

/** Convert a UI date preset to ISO bounds (inclusive end = now, or custom to). */
export function dateRangePresetToBounds(
  preset: DateRangePreset,
  now = new Date(),
  custom?: CustomDateRange | null,
): DateRangeBounds | null {
  if (preset === "all_time") {
    return cappedAllTimeBounds(now);
  }

  if (preset === "custom") {
    if (!custom?.from || !custom?.to) return null;
    const from = new Date(custom.from);
    from.setHours(0, 0, 0, 0);
    const to = new Date(custom.to);
    to.setHours(23, 59, 59, 999);
    return capBounds({ from: from.toISOString(), to: to.toISOString() }, now);
  }

  const to = now.toISOString();
  const start = new Date(now);

  switch (preset) {
    case "last_hour":
      start.setHours(start.getHours() - 1);
      break;
    case "last_1_day":
      start.setDate(start.getDate() - 1);
      break;
    case "last_7_days":
      start.setDate(start.getDate() - 7);
      break;
    case "last_30_days":
      start.setDate(start.getDate() - 30);
      break;
    case "last_90_days":
      start.setDate(start.getDate() - 90);
      break;
    case "this_month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }

  return { from: start.toISOString(), to };
}

/** Floor ISO bounds to 5-minute buckets for stable React Query / API cache keys. */
export function stabilizeApiBounds(bounds: DateRangeBounds): DateRangeBounds {
  const bucketMs = 5 * 60 * 1000;
  const floorIso = (iso: string): string => {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return iso;
    return new Date(Math.floor(t / bucketMs) * bucketMs).toISOString();
  };
  return { from: floorIso(bounds.from), to: floorIso(bounds.to) };
}

/** Bounds for API calls — never returns null; caps wide custom/all-time ranges. */
export function dateRangePresetToApiBounds(
  preset: DateRangePreset,
  now = new Date(),
  custom?: CustomDateRange | null,
): DateRangeBounds {
  return stabilizeApiBounds(
    dateRangePresetToBounds(preset, now, custom) ?? cappedAllTimeBounds(now),
  );
}

/** True when entry date falls within bounds (inclusive). Null bounds = no filter. */
export function isWithinDateRange(
  isoDate: string,
  bounds: DateRangeBounds | null,
): boolean {
  if (!bounds) return true;
  const t = new Date(isoDate).getTime();
  return t >= new Date(bounds.from).getTime() && t <= new Date(bounds.to).getTime();
}

/** Format ISO / YYYY-MM-DD for date input value. */
export function toDateInputValue(isoOrDate: string | undefined): string {
  if (!isoOrDate) return "";
  return isoOrDate.slice(0, 10);
}
