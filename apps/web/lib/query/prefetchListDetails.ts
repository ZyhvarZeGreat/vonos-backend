import type { QueryClient } from "@tanstack/react-query";
import type { Customer, CustomerProfile, Item, Job, User, Vehicle } from "@vonos/types";
import { getCustomer, getCustomerSummary } from "@/lib/api/customers";
import { getCatalogItem } from "@/lib/api/catalog";
import { getJobShell, type JobDetail } from "@/lib/api/jobs";
import { getStockMovement } from "@/lib/api/stockMovements";
import { getSupplier, getSupplierSummary, type SupplierListRow } from "@/lib/api/suppliers";
import { getUser } from "@/lib/api/users";
import { getVehicle } from "@/lib/api/vehicles";
import { seedModalQuery, prefetchModalQuery } from "@/lib/query/modalQueryKeys";

/** Detail pages share this stale window with list→detail prefetch. */
export const DETAIL_RECORD_STALE_MS = 60_000;

type Qc = QueryClient;

/** Collect rows from any RQ cache entries under a key prefix (list pages, etc.). */
export function collectCachedListRows<T extends { id: string }>(
  queryClient: Qc,
  keyPrefix: readonly unknown[],
): T[] {
  const byId = new Map<string, T>();
  for (const [, data] of queryClient.getQueriesData({ queryKey: [...keyPrefix] })) {
    if (!data || typeof data !== "object") continue;
    const items = Array.isArray(data)
      ? data
      : Array.isArray((data as { items?: unknown }).items)
        ? ((data as { items: T[] }).items)
        : null;
    if (!items) continue;
    for (const row of items) {
      if (row && typeof row === "object" && "id" in row && typeof row.id === "string") {
        byId.set(row.id, row);
      }
    }
  }
  return [...byId.values()];
}

function customerProfileFromListRow(row: Customer): CustomerProfile {
  return {
    ...row,
    transactionHistory: [],
  };
}

/** Prefetch customer detail shell + summary (no history until Sales tab). */
export function prefetchCustomerDetail(
  queryClient: Qc,
  tenantId: string,
  customerId: string,
  listRow?: Customer,
): void {
  if (listRow) {
    seedModalQuery(
      queryClient,
      ["customer", tenantId, customerId],
      customerProfileFromListRow(listRow),
    );
  }
  prefetchModalQuery(queryClient, {
    queryKey: ["customer", tenantId, customerId],
    queryFn: () => getCustomer(customerId),
    staleTime: DETAIL_RECORD_STALE_MS,
  });
  prefetchModalQuery(queryClient, {
    queryKey: ["customer-summary", tenantId, customerId],
    queryFn: () => getCustomerSummary(tenantId, customerId),
    staleTime: DETAIL_RECORD_STALE_MS,
  });
}

/** Prefetch supplier detail + summary (no rollup recompute on server). */
export function prefetchSupplierDetail(
  queryClient: Qc,
  tenantId: string,
  supplierId: string,
  listRow?: SupplierListRow,
): void {
  if (listRow) {
    seedModalQuery(queryClient, ["supplier", tenantId, supplierId], listRow);
  }
  prefetchModalQuery(queryClient, {
    queryKey: ["supplier", tenantId, supplierId],
    queryFn: () => getSupplier(supplierId),
    staleTime: DETAIL_RECORD_STALE_MS,
  });
  prefetchModalQuery(queryClient, {
    queryKey: ["supplier-summary", tenantId, supplierId],
    queryFn: () => getSupplierSummary(tenantId, supplierId),
    staleTime: DETAIL_RECORD_STALE_MS,
  });
}

/** Prefetch catalog / product detail. */
export function prefetchCatalogDetail(
  queryClient: Qc,
  tenantId: string,
  itemId: string,
  listRow?: Item,
  catalogMode = true,
): void {
  const queryKey = [
    "item",
    tenantId,
    itemId,
    catalogMode ? "catalog" : "inventory",
  ] as const;
  if (listRow) {
    seedModalQuery(queryClient, queryKey, listRow);
  }
  prefetchModalQuery(queryClient, {
    queryKey,
    queryFn: () => getCatalogItem(itemId),
    staleTime: DETAIL_RECORD_STALE_MS,
  });
}

/** Prefetch job shell for detail route. */
export function prefetchJobDetail(
  queryClient: Qc,
  tenantId: string,
  jobId: string,
  listRow?: Job,
): void {
  const queryKey = ["job", tenantId, jobId, "shell"] as const;
  if (listRow) {
    seedModalQuery(queryClient, queryKey, {
      ...listRow,
      materials: [],
      labourEntries: [],
    } as JobDetail);
  }
  prefetchModalQuery(queryClient, {
    queryKey,
    queryFn: () => getJobShell(jobId),
    staleTime: DETAIL_RECORD_STALE_MS,
  });
}

/** Prefetch vehicle shell (history loads after shell on detail). */
export function prefetchVehicleDetail(
  queryClient: Qc,
  tenantId: string,
  vehicleId: string,
  listRow?: Vehicle,
): void {
  const queryKey = ["vehicle", tenantId, vehicleId] as const;
  if (listRow) {
    seedModalQuery(queryClient, queryKey, listRow);
  }
  prefetchModalQuery(queryClient, {
    queryKey,
    queryFn: () => getVehicle(vehicleId),
    staleTime: DETAIL_RECORD_STALE_MS,
  });
}

/** Prefetch stock movement detail. */
export function prefetchMovementDetail(
  queryClient: Qc,
  tenantId: string,
  movementId: string,
): void {
  prefetchModalQuery(queryClient, {
    queryKey: ["stock-movement", tenantId, movementId],
    queryFn: () => getStockMovement(movementId),
    staleTime: DETAIL_RECORD_STALE_MS,
  });
}

/** Prefetch user detail. */
export function prefetchUserDetail(
  queryClient: Qc,
  tenantId: string,
  userId: string,
  listRow?: User,
): void {
  const queryKey = ["user", tenantId, userId] as const;
  if (listRow) {
    seedModalQuery(queryClient, queryKey, listRow);
  }
  prefetchModalQuery(queryClient, {
    queryKey,
    queryFn: () => getUser(userId, tenantId),
    staleTime: DETAIL_RECORD_STALE_MS,
  });
}
