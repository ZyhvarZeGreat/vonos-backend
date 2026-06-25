import type { PaymentAccount } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";

export async function getPaymentAccounts(tenantId: string): Promise<PaymentAccount[]> {
  const path = withTenantQuery("/payment-accounts", tenantId);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch payment accounts");
  return response.json();
}

export async function getPaymentAccount(id: string): Promise<PaymentAccount> {
  const response = await apiFetch(`/payment-accounts/${id}`);
  if (!response.ok) throw new Error("Failed to fetch payment account");
  return response.json();
}
