import type { QueryClient } from "@tanstack/react-query";
import { getGroupOverviewSummary } from "@/lib/api/overview";
import { dateRangePresetToApiBounds } from "@/lib/utils/dateRange";

/** Client cache window aligned with VagGroupOverview queries. */
export const GROUP_OVERVIEW_STALE_MS = 10 * 60_000;

/** Prefetch VAG group overview — summary first (details deferred like the UI). */
export function prefetchGroupOverview(queryClient: QueryClient): void {
  const bounds = dateRangePresetToApiBounds("last_7_days");
  const rangeKey = [bounds.from, bounds.to] as const;

  void queryClient.prefetchQuery({
    queryKey: ["groupOverview", "summary", ...rangeKey],
    queryFn: () =>
      getGroupOverviewSummary({ from: bounds.from, to: bounds.to }),
    staleTime: GROUP_OVERVIEW_STALE_MS,
  });
}
