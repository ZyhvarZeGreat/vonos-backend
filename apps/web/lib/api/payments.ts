import type { AccountTransaction, PaymentRecord } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";

export async function getPayments(
  tenantId: string,
  filters?: { accountId?: string },
): Promise<PaymentRecord[]> {
  const params = new URLSearchParams();
  if (filters?.accountId) params.set("accountId", filters.accountId);
  const qs = params.toString();
  const path = withTenantQuery(qs ? `/payments?${qs}` : "/payments", tenantId);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch payments");
  return response.json();
}

export async function getAccountBook(accountId: string): Promise<AccountTransaction[]> {
  const response = await apiFetch(`/payments/account-book/${accountId}`);
  if (!response.ok) throw new Error("Failed to fetch account book");
  return response.json();
}
