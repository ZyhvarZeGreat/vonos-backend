import type { QueryClient } from "@tanstack/react-query";
import { getCustomerView } from "@/lib/api/customers";
import { getItem } from "@/lib/api/items";
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
import { getPaymentAccounts } from "@/lib/api/paymentAccounts";
import { getCustomerGroups } from "@/lib/api/customerGroups";
import {
  MODAL_RECORD_STALE_MS,
  MODAL_REF_STALE_MS,
  modalKeys,
  prefetchModalQuery,
} from "@/lib/query/modalQueryKeys";

type Qc = QueryClient;

/** Prefetch sale detail + payments (View / View Payments). */
export function prefetchSaleListModals(
  queryClient: Qc,
  tenantId: string,
  saleId: string,
): void {
  prefetchModalQuery(queryClient, {
    queryKey: modalKeys.saleView(tenantId, saleId),
    queryFn: () => getSaleView(saleId, tenantId),
    staleTime: MODAL_RECORD_STALE_MS,
  });
  prefetchModalQuery(queryClient, {
    queryKey: modalKeys.salePayments(tenantId, saleId),
    queryFn: () => getSalePayments(tenantId, saleId),
    staleTime: MODAL_RECORD_STALE_MS,
  });
}

/** Prefetch purchase detail + payments. */
export function prefetchPurchaseListModals(
  queryClient: Qc,
  tenantId: string,
  purchaseId: string,
): void {
  prefetchModalQuery(queryClient, {
    queryKey: modalKeys.purchaseView(tenantId, purchaseId),
    queryFn: () => getPurchaseView(tenantId, purchaseId),
    staleTime: MODAL_RECORD_STALE_MS,
  });
  prefetchModalQuery(queryClient, {
    queryKey: ["purchase-view-payments", tenantId, purchaseId] as const,
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
    queryFn: () => getItem(itemId),
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
    queryFn: () => getPaymentAccounts(tenantId),
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
    queryFn: () => getUsers(tenantId, { limit: 100 }),
    staleTime: MODAL_REF_STALE_MS,
  });
}
