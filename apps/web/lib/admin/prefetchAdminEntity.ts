import type { QueryClient } from "@tanstack/react-query";
import { getLedgerEntriesPage, getLedgerSummary, LEDGER_TABLE_PAGE_SIZE } from "@/lib/api/ledger";
import { getStockAvailability } from "@/lib/api/items";
import { getWorkforce } from "@/lib/api/hrm";
import { getTenantByCode, type TenantCode } from "@/lib/registries/tenants";
import type { DateRangeBounds } from "@/lib/utils/dateRange";

/** Client cache window for admin entity-scoped reads (longer than server Redis TTL). */
export const ADMIN_ENTITY_STALE_MS = 10 * 60_000;

export interface PrefetchAdminEntityOptions {
  code: TenantCode;
  pathname: string;
  dateBounds?: DateRangeBounds | null;
}

function adminSection(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  return parts[0] === "admin" ? (parts[1] ?? "overview") : "";
}

/**
 * Warm React Query (and thus Redis on miss) for the hot path of the current
 * admin route so entity switches feel instant after hover/open.
 */
export async function prefetchAdminEntity(
  queryClient: QueryClient,
  { code, pathname, dateBounds }: PrefetchAdminEntityOptions,
): Promise<void> {
  const tenant = getTenantByCode(code);
  if (!tenant) return;

  const tenantId = tenant.tenantId;
  const from = dateBounds?.from;
  const to = dateBounds?.to;
  const section = adminSection(pathname);

  const tasks: Array<Promise<unknown>> = [];

  if (section === "finance" || section === "overview") {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: ["adminFinanceSummary", tenantId, from, to],
        queryFn: () => getLedgerSummary(tenantId, from, to),
        staleTime: ADMIN_ENTITY_STALE_MS,
      }),
    );

    if (section === "finance") {
      const filters = {
        limit: LEDGER_TABLE_PAGE_SIZE,
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      };
      const filterKey = JSON.stringify({
        groupMode: false,
        tenantId,
        ...filters,
      });
      tasks.push(
        queryClient.prefetchQuery({
          queryKey: ["ledgerTablePage", tenantId, filterKey, undefined],
          queryFn: () => getLedgerEntriesPage(tenantId, filters, undefined, LEDGER_TABLE_PAGE_SIZE),
          staleTime: ADMIN_ENTITY_STALE_MS,
        }),
      );
    }
  }

  if (section === "stock") {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: ["stock-availability", "", code, "all"],
        queryFn: () =>
          getStockAvailability({
            limit: 10,
            entityCode: code,
            availability: "all",
          }),
        staleTime: ADMIN_ENTITY_STALE_MS,
      }),
    );
  }

  if (section === "users") {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: ["workforce", tenantId, "dashboard"],
        queryFn: () => getWorkforce(tenantId),
        staleTime: ADMIN_ENTITY_STALE_MS,
      }),
    );
  }

  await Promise.all(tasks);
}
