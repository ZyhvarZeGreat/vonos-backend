import type { QueryClient, QueryKey } from "@tanstack/react-query";

/** Shared stale times for modal-related caches. */
export const MODAL_REF_STALE_MS = 10 * 60_000;
export const MODAL_RECORD_STALE_MS = 60_000;

/** Stable React Query keys for record view bundles + shared reference data. */
export const modalKeys = {
  saleView: (tenantId: string | null | undefined, id: string | null | undefined) =>
    ["sale-view", tenantId, id] as const,
  purchaseView: (tenantId: string | null | undefined, id: string | null | undefined) =>
    ["purchase-view", tenantId, id] as const,
  customerView: (tenantId: string | null | undefined, id: string | null | undefined) =>
    ["customer-view", tenantId, id] as const,
  item: (tenantId: string | null | undefined, id: string | null | undefined) =>
    ["item-modal", tenantId, id] as const,
  job: (tenantId: string | null | undefined, id: string | null | undefined) =>
    ["job-modal", tenantId, id] as const,
  expense: (tenantId: string | null | undefined, id: string | null | undefined) =>
    ["expense-modal", tenantId, id] as const,
  movement: (tenantId: string | null | undefined, id: string | null | undefined) =>
    ["movement-modal", tenantId, id] as const,
  requisition: (tenantId: string | null | undefined, id: string | null | undefined) =>
    ["requisition-modal", tenantId, id] as const,
  salePayments: (tenantId: string | null | undefined, id: string | null | undefined) =>
    ["sale-view-payments", tenantId, id] as const,
  invoiceSettings: (tenantId: string | null | undefined) =>
    ["invoice-settings", tenantId] as const,
  usersFilter: (tenantId: string | null | undefined) =>
    ["users", tenantId, "filter"] as const,
  paymentAccounts: (tenantId: string | null | undefined) =>
    ["payment-accounts", tenantId] as const,
  customerGroups: (tenantId: string | null | undefined) =>
    ["customer-groups", tenantId] as const,
};

/** Seed a query cache entry so the modal can paint before the network returns. */
export function seedModalQuery<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  partial: T,
): void {
  const existing = queryClient.getQueryData<T>(queryKey);
  if (existing) return;
  queryClient.setQueryData(queryKey, partial);
}

export function prefetchModalQuery<T>(
  queryClient: QueryClient,
  options: {
    queryKey: QueryKey;
    queryFn: () => Promise<T>;
    staleTime?: number;
  },
): void {
  void queryClient.prefetchQuery({
    queryKey: options.queryKey,
    queryFn: options.queryFn,
    staleTime: options.staleTime ?? MODAL_RECORD_STALE_MS,
  });
}
