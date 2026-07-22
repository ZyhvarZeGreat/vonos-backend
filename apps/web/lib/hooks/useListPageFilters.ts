"use client";

import { useMemo, useState } from "react";
import { dateRangePresetToApiBounds } from "@/lib/utils/dateRange";
import { useUiStore, type CustomDateRange, type DateRangePreset } from "@/stores/uiStore";

/** Shared search + date-range state for ListPageShell pages. */
export function useListPageFilters(options?: {
  /** When set, overrides the global store preset until the user changes it. */
  defaultDateRange?: DateRangePreset;
}) {
  const storeDateRange = useUiStore((state) => state.dateRange);
  const storeCustom = useUiStore((state) => state.customDateRange);
  const setStoreDateRange = useUiStore((state) => state.setDateRange);
  const setStoreCustom = useUiStore((state) => state.setCustomDateRange);
  const [search, setSearch] = useState("");
  const [localDateRange, setLocalDateRange] = useState<DateRangePreset | null>(
    options?.defaultDateRange ?? null,
  );
  const [localCustom, setLocalCustom] = useState<CustomDateRange | null | undefined>(
    undefined,
  );

  const dateRange = localDateRange ?? storeDateRange;
  const customDateRange =
    localCustom === undefined ? storeCustom : localCustom;

  const setDateRange = (preset: DateRangePreset) => {
    setLocalDateRange(preset);
    setStoreDateRange(preset);
    if (preset !== "custom") {
      setLocalCustom(null);
      setStoreCustom(null);
    }
  };

  const setCustomDateRange = (range: CustomDateRange | null) => {
    setLocalCustom(range);
    setStoreCustom(range);
    if (range) setLocalDateRange("custom");
  };

  const bounds = useMemo(
    () => dateRangePresetToApiBounds(dateRange, new Date(), customDateRange),
    [customDateRange, dateRange],
  );

  return {
    dateRange,
    setDateRange,
    customDateRange,
    setCustomDateRange,
    search,
    setSearch,
    bounds,
  };
}
