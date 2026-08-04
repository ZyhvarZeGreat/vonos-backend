import type { ListSortState } from "@/lib/api/fetchAllPages";

/**
 * Stable React Query filter segment for list pages.
 * - Drops null/undefined/"" so empty filters match prefetch + remounts
 * - Sorts keys so insertion order never splits the cache
 * - Local search is excluded (client match-sorter); pass search only for server mode
 */
export function stableListFilterKey(
  filters: Record<string, unknown> = {},
  sort: ListSortState | null = null,
  options?: { search?: string },
): string {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (key === "search") continue;
    if (value == null || value === "") continue;
    cleaned[key] = value;
  }
  const search = options?.search?.trim();
  if (search) cleaned.search = search;

  const ordered: Record<string, unknown> = {};
  for (const key of Object.keys(cleaned).sort()) {
    ordered[key] = cleaned[key];
  }
  ordered.sortBy = sort?.sortBy ?? null;
  ordered.sortDir = sort?.sortDir ?? null;
  return JSON.stringify(ordered);
}
