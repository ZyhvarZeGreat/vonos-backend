import type { DateRangePreset } from "@/stores/uiStore";

export interface DateRangeBounds {
  from: string;
  to: string;
}

/** Convert a UI date preset to ISO bounds (inclusive end = now). */
export function dateRangePresetToBounds(
  preset: DateRangePreset,
  now = new Date(),
): DateRangeBounds | null {
  if (preset === "all_time") {
    return null;
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

/** True when entry date falls within bounds (inclusive). Null bounds = all time. */
export function isWithinDateRange(
  isoDate: string,
  bounds: DateRangeBounds | null,
): boolean {
  if (!bounds) return true;
  const t = new Date(isoDate).getTime();
  return t >= new Date(bounds.from).getTime() && t <= new Date(bounds.to).getTime();
}
