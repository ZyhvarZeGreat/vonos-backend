import type { QueryClient } from "@tanstack/react-query";
import type { SaleViewBundle } from "@vonos/types";
import { modalKeys } from "@/lib/query/modalQueryKeys";

/** Audit feed key used by useAuditHistoryFeed / Hq6AuditTrail. */
export function saleAuditQueryKey(
  tenantId: string | null | undefined,
  saleId: string,
) {
  return ["audit-entity", tenantId, "sale", saleId] as const;
}

/**
 * After /sales/:id/view loads (or prefetches), seed sibling caches so
 * payments + activity paint with the invoice — no second round-trip.
 */
export function seedSaleViewSideCaches(
  queryClient: QueryClient,
  tenantId: string,
  bundle: SaleViewBundle,
): void {
  const saleId = bundle.sale.id;
  queryClient.setQueryData(
    modalKeys.salePayments(tenantId, saleId),
    bundle.payments,
  );
  queryClient.setQueryData(
    saleAuditQueryKey(tenantId, saleId),
    bundle.activities ?? [],
  );
}
