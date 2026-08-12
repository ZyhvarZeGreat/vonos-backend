import type { QueryClient } from "@tanstack/react-query";
import { getCustomerView } from "@/lib/api/customers";
import { getCatalogItem } from "@/lib/api/catalog";
import { getJobShell } from "@/lib/api/jobs";
import { getExpense } from "@/lib/api/expenses";
import { getRequisition } from "@/lib/api/requisitions";
import { getSalePayments, getSaleView } from "@/lib/api/sales";
import {
  getPurchaseView,
  getStockMovement,
  getStockMovementPayments,
} from "@/lib/api/stockMovements";
import { getUsers } from "@/lib/api/users";
import { getPaymentAccountsForPicker } from "@/lib/api/paymentAccounts";
import { getCustomerGroups } from "@/lib/api/customerGroups";
import {
  MODAL_RECORD_STALE_MS,
  MODAL_REF_STALE_MS,
  modalKeys,
  prefetchModalQuery,
} from "@/lib/query/modalQueryKeys";
import { seedSaleViewSideCaches } from "@/lib/query/seedSaleViewCaches";

type Qc = QueryClient;

/** Prefetch full sale invoice bundle (View). Also seeds payments + activity caches. */
export function prefetchSaleListModals(
  queryClient: Qc,
  tenantId: string,
  saleId: string,
): void {
  prefetchModalQuery(queryClient, {
    queryKey: modalKeys.saleView(tenantId, saleId),
    queryFn: async () => {
      const bundle = await getSaleView(saleId, tenantId);
      seedSaleViewSideCaches(queryClient, tenantId, bundle);
      return bundle;
    },
    staleTime: MODAL_RECORD_STALE_MS,
  });
}

/** Prefetch payments only — used by View Payments (much lighter than /view). */
export function prefetchSalePaymentsModal(
  queryClient: Qc,
  tenantId: string,
  saleId: string,
): void {
  prefetchModalQuery(queryClient, {
    queryKey: modalKeys.salePayments(tenantId, saleId),
    queryFn: () => getSalePayments(tenantId, saleId),
    staleTime: MODAL_RECORD_STALE_MS,
  });
}

/** Prefetch purchase detail + seed payments cache. */
export function prefetchPurchaseListModals(
  queryClient: Qc,
  tenantId: string,
  purchaseId: string,
): void {
  prefetchModalQuery(queryClient, {
    queryKey: modalKeys.purchaseView(tenantId, purchaseId),
    queryFn: async () => {
      const bundle = await getPurchaseView(tenantId, purchaseId);
      queryClient.setQueryData(
        modalKeys.purchasePayments(tenantId, purchaseId),
        bundle.payments,
      );
      return bundle;
    },
    staleTime: MODAL_RECORD_STALE_MS,
  });
}

/** Prefetch purchase payments only — View Payments. */
export function prefetchPurchasePaymentsModal(
  queryClient: Qc,
  tenantId: string,
  purchaseId: string,
): void {
  prefetchModalQuery(queryClient, {
    queryKey: modalKeys.purchasePayments(tenantId, purchaseId),
    queryFn: () => getStockMovementPayments(tenantId, purchaseId),
    staleTime: MODAL_RECORD_STALE_MS,
  });
}

export function prefetchCustomerListModals(
  queryClient: Qc,
  tenantId: string,
  customerId: string,
): void {
  prefetchModalQuery(queryClient, {
    queryKey: modalKeys.customerView(tenantId, customerId),
    queryFn: () => getCustomerView(tenantId, customerId),
    staleTime: MODAL_RECORD_STALE_MS,
  });
}

export function prefetchMovementListModals(
  queryClient: Qc,
  tenantId: string,
  movementId: string,
): void {
  prefetchModalQuery(queryClient, {
    queryKey: modalKeys.movement(tenantId, movementId),
    queryFn: () => getStockMovement(movementId),
    staleTime: MODAL_RECORD_STALE_MS,
  });
}

export function prefetchRequisitionListModals(
  queryClient: Qc,
  tenantId: string,
  requisitionId: string,
): void {
  prefetchModalQuery(queryClient, {
    queryKey: modalKeys.requisition(tenantId, requisitionId),
    queryFn: () => getRequisition(tenantId, requisitionId),
    staleTime: MODAL_RECORD_STALE_MS,
  });
}

export function prefetchJobListModals(
  queryClient: Qc,
  tenantId: string,
  jobId: string,
): void {
  prefetchModalQuery(queryClient, {
    queryKey: modalKeys.job(tenantId, jobId),
    queryFn: () => getJobShell(jobId),
    staleTime: MODAL_RECORD_STALE_MS,
  });
}

export function prefetchExpenseListModals(
  queryClient: Qc,
  tenantId: string,
  expenseId: string,
): void {
  prefetchModalQuery(queryClient, {
    queryKey: modalKeys.expense(tenantId, expenseId),
    queryFn: () => getExpense(tenantId, expenseId),
    staleTime: MODAL_RECORD_STALE_MS,
  });
}

export function prefetchItemListModals(
  queryClient: Qc,
  tenantId: string,
  itemId: string,
): void {
  prefetchModalQuery(queryClient, {
    queryKey: modalKeys.item(tenantId, itemId),
    queryFn: () => getCatalogItem(itemId),
    staleTime: MODAL_RECORD_STALE_MS,
  });
}

/** Payment accounts for Pay modals (purchase / supplier / customer). */
export function prefetchPaymentAccountsRef(
  queryClient: Qc,
  tenantId: string,
): void {
  prefetchModalQuery(queryClient, {
    queryKey: modalKeys.paymentAccounts(tenantId),
    queryFn: () => getPaymentAccountsForPicker(tenantId),
    staleTime: MODAL_REF_STALE_MS,
  });
}

/** Shared ref data for contact pay / edit modals. */
export function prefetchContactModalRefs(
  queryClient: Qc,
  tenantId: string,
): void {
  prefetchPaymentAccountsRef(queryClient, tenantId);
  prefetchModalQuery(queryClient, {
    queryKey: modalKeys.customerGroups(tenantId),
    queryFn: () => getCustomerGroups(tenantId),
    staleTime: MODAL_REF_STALE_MS,
  });
  prefetchModalQuery(queryClient, {
    queryKey: modalKeys.usersFilter(tenantId),
    queryFn: () => getUsers(tenantId),
    staleTime: MODAL_REF_STALE_MS,
  });
}
