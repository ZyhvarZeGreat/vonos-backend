import type { QueryClient } from "@tanstack/react-query";
import {
  getPayrollsPage,
  getWorkforcePage,
  getWorkforceStats,
} from "@/lib/api/hrm";
import { ADMIN_ENTITY_STALE_MS } from "@/lib/admin/prefetchAdminEntity";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { stableListFilterKey } from "@/lib/utils/stableListFilterKey";

/** Same filterKey shape useServerListPage builds for empty search + no sort. */
function emptyListFilterKey(filters: Record<string, unknown> = {}): string {
  return stableListFilterKey(filters, null);
}

/**
 * Prefetch HRM list pages on sidebar hover using the same React Query keys as
 * useServerListPage (sliding-window page 0 + summary), so opening HRM / Payroll
 * / Workforce hits warm cache instead of cold typeahead dumps.
 */
export function prefetchEntityHrm(
  queryClient: QueryClient,
  tenantId: string,
): void {
  if (!tenantId) return;

  const year = new Date().getFullYear();
  const workforceFilterKey = emptyListFilterKey();
  const payrollFilters = { year };
  const payrollFilterKey = emptyListFilterKey(payrollFilters);

  void queryClient.prefetchQuery({
    queryKey: ["workforce", tenantId, "stats"],
    queryFn: () => getWorkforceStats(tenantId),
    staleTime: ADMIN_ENTITY_STALE_MS,
  });

  void queryClient.prefetchQuery({
    queryKey: [
      "workforce",
      tenantId,
      workforceFilterKey,
      0,
      null,
      DEFAULT_TABLE_PAGE_SIZE,
      null,
      null,
    ],
    queryFn: () =>
      getWorkforcePage(tenantId, undefined, DEFAULT_TABLE_PAGE_SIZE, undefined, {
        includeSummary: false,
      }),
    staleTime: ADMIN_ENTITY_STALE_MS,
  });

  void queryClient.prefetchQuery({
    queryKey: ["workforce", tenantId, "summary", workforceFilterKey],
    queryFn: () =>
      getWorkforcePage(tenantId, undefined, 1, undefined, {
        includeSummary: true,
      }),
    staleTime: ADMIN_ENTITY_STALE_MS,
  });

  void queryClient.prefetchQuery({
    queryKey: [
      "payrolls",
      tenantId,
      "ytd",
      year,
      payrollFilterKey,
      0,
      null,
      DEFAULT_TABLE_PAGE_SIZE,
      null,
      null,
    ],
    queryFn: () =>
      getPayrollsPage(tenantId, undefined, DEFAULT_TABLE_PAGE_SIZE, {
        ...payrollFilters,
        includeSummary: false,
      }),
    staleTime: ADMIN_ENTITY_STALE_MS,
  });

  void queryClient.prefetchQuery({
    queryKey: ["payrolls", tenantId, "ytd", year, "summary", payrollFilterKey],
    queryFn: () =>
      getPayrollsPage(tenantId, undefined, 1, {
        ...payrollFilters,
        includeSummary: true,
      }),
    staleTime: ADMIN_ENTITY_STALE_MS,
  });
}
