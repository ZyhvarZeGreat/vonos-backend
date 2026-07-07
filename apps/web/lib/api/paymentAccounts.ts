import type {
  CreatePaymentAccountRequest,
  PaymentAccount,
  PaymentAccountDepositRequest,
  PaymentAccountTransferRequest,
  UpdatePaymentAccountRequest,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { appendListQuery, fetchTenantListPage } from "@/lib/api/listPageHelpers";

const LIST_PATH = "/payment-accounts";

async function fetchPaymentAccountsRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
  extra?: { search?: string },
): Promise<PaymentAccount[]> {
  const tenantPath = withTenantQuery(LIST_PATH, tenantId);
  const url = appendListQuery(tenantPath, { cursor, limit, ...extra });
  const response = await apiFetch(url);
  if (!response.ok) throw new Error("Failed to fetch payment accounts");
  return response.json();
}

export async function getPaymentAccountsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  extra?: { search?: string },
): Promise<ListPage<PaymentAccount>> {
  return fetchTenantListPage(LIST_PATH, tenantId, cursor, limit, extra);
}

export async function getPaymentAccount(
  tenantId: string,
  id: string,
): Promise<PaymentAccount> {
  const response = await apiFetch(withTenantQuery(`${LIST_PATH}/${id}`, tenantId));
  if (!response.ok) throw new Error("Failed to fetch payment account");
  return response.json();
}

export async function createPaymentAccount(
  tenantId: string,
  dto: CreatePaymentAccountRequest,
): Promise<PaymentAccount> {
  const response = await apiFetch(withTenantQuery(LIST_PATH, tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to create payment account");
  }
  return response.json();
}

export async function updatePaymentAccount(
  tenantId: string,
  id: string,
  dto: UpdatePaymentAccountRequest,
): Promise<PaymentAccount> {
  const response = await apiFetch(withTenantQuery(`${LIST_PATH}/${id}`, tenantId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to update payment account");
  }
  return response.json();
}

export async function closePaymentAccount(
  tenantId: string,
  id: string,
): Promise<PaymentAccount> {
  const response = await apiFetch(
    withTenantQuery(`${LIST_PATH}/${id}/close`, tenantId),
    { method: "POST" },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to close payment account");
  }
  return response.json();
}

export async function depositPaymentAccount(
  tenantId: string,
  id: string,
  dto: PaymentAccountDepositRequest,
): Promise<PaymentAccount> {
  const response = await apiFetch(
    withTenantQuery(`${LIST_PATH}/${id}/deposit`, tenantId),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to deposit");
  }
  return response.json();
}

export async function transferPaymentAccounts(
  tenantId: string,
  dto: PaymentAccountTransferRequest,
): Promise<{ from: PaymentAccount; to: PaymentAccount }> {
  const response = await apiFetch(withTenantQuery(`${LIST_PATH}/transfer`, tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to transfer funds");
  }
  return response.json();
}

export async function deletePaymentAccount(
  tenantId: string,
  id: string,
): Promise<void> {
  const response = await apiFetch(withTenantQuery(`${LIST_PATH}/${id}`, tenantId), {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete payment account");
}

/** Full payment account list for export — not for table rendering. */
export async function getAllPaymentAccounts(
  tenantId: string,
  extra?: { search?: string },
): Promise<PaymentAccount[]> {
  return fetchAllPages(
    (cursor, limit) => fetchPaymentAccountsRaw(tenantId, cursor, limit, extra),
    EXPORT_PAGE_SIZE,
  );
}

export async function getPaymentAccounts(
  tenantId: string,
): Promise<PaymentAccount[]> {
  return fetchFirstPage((cursor, limit) =>
    fetchPaymentAccountsRaw(tenantId, cursor, limit),
  );
}
