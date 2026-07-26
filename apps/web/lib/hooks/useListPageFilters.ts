"use client";

import { useMemo, useState } from "react";
import {
  dateRangePresetToApiBounds,
  dateRangePresetToListBounds,
} from "@/lib/utils/dateRange";
import { useUiStore, type CustomDateRange, type DateRangePreset } from "@/stores/uiStore";

/** Shared search + date-range state for ListPageShell pages. */
export function useListPageFilters(options?: {
  /** When set, overrides the global store preset until the user changes it. */
  defaultDateRange?: DateRangePreset;
  /**
   * When true (default), `all_time` omits from/to on list queries so full
   * migrated history is visible. Reports/finance should pass `false` to keep a capped window.
   */
  unboundedAllTime?: boolean;
  /**
   * Keep date range local to this page — do not read/write the global uiStore
   * dateRange (prevents list filters from shrinking VAG/report KPIs).
   */
  isolateDateRange?: boolean;
}) {
  const unboundedAllTime = options?.unboundedAllTime !== false;
  const isolateDateRange = options?.isolateDateRange === true;
  const storeDateRange = useUiStore((state) => state.dateRange);
  const storeCustom = useUiStore((state) => state.customDateRange);
  const setStoreDateRange = useUiStore((state) => state.setDateRange);
  const setStoreCustom = useUiStore((state) => state.setCustomDateRange);
  const [search, setSearch] = useState("");
  const [localDateRange, setLocalDateRange] = useState<DateRangePreset | null>(
    options?.defaultDateRange ?? (isolateDateRange ? "all_time" : null),
  );
  const [localCustom, setLocalCustom] = useState<CustomDateRange | null | undefined>(
    isolateDateRange ? null : undefined,
  );

  const dateRange = isolateDateRange
    ? (localDateRange ?? "all_time")
    : (localDateRange ?? storeDateRange);
  const customDateRange = isolateDateRange
    ? (localCustom ?? null)
    : localCustom === undefined
      ? storeCustom
      : localCustom;

  const setDateRange = (preset: DateRangePreset) => {
    setLocalDateRange(preset);
    if (!isolateDateRange) {
      setStoreDateRange(preset);
      if (preset !== "custom") {
        setStoreCustom(null);
      }
    }
    if (preset !== "custom") {
      setLocalCustom(null);
    }
  };

  const setCustomDateRange = (range: CustomDateRange | null) => {
    setLocalCustom(range);
    if (!isolateDateRange) {
      setStoreCustom(range);
    }
    if (range) setLocalDateRange("custom");
  };

  const bounds = useMemo(() => {
    if (unboundedAllTime) {
      return dateRangePresetToListBounds(dateRange, new Date(), customDateRange);
    }
    return dateRangePresetToApiBounds(dateRange, new Date(), customDateRange);
  }, [customDateRange, dateRange, unboundedAllTime]);

  /** Spread onto `<DateRangeDropdown />` so custom ranges stay in sync with bounds. */
  const dateRangeDropdownProps = {
    value: dateRange,
    onChange: setDateRange,
    customValue: customDateRange,
    onCustomChange: setCustomDateRange,
  };

  return {
    dateRange,
    setDateRange,
    customDateRange,
    setCustomDateRange,
    dateRangeDropdownProps,
    search,
    setSearch,
    bounds,
  };
}
