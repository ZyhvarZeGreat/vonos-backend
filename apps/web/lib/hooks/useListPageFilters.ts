"use client";

import { useMemo, useState } from "react";
import { dateRangePresetToBounds } from "@/lib/utils/dateRange";
import { useUiStore } from "@/stores/uiStore";

/** Shared search + date-range state for ListPageShell pages. */
export function useListPageFilters() {
  const dateRange = useUiStore((state) => state.dateRange);
  const setDateRange = useUiStore((state) => state.setDateRange);
  const [search, setSearch] = useState("");
  const bounds = useMemo(() => dateRangePresetToBounds(dateRange), [dateRange]);

  return {
    dateRange,
    setDateRange,
    search,
    setSearch,
    bounds,
  };
}
