import { apiFetch, withTenantQuery } from "@/lib/api/client";

export interface CashRegisterSummary {
  salesCount: number;
  totalSales: number;
  cash: number;
  card: number;
  other: number;
}

export interface CashRegisterView {
  id: string;
  tenantId: string;
  locationCode: string | null;
  status: string;
  openingBalance: number;
  openedAt: string;
  closedAt: string | null;
  closingAmount: number | null;
  totalCardSlips: number | null;
  totalCheques: number | null;
  closingNote: string | null;
  summary: CashRegisterSummary;
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text) as T;
}

export async function getCurrentRegister(
  tenantId: string,
): Promise<CashRegisterView | null> {
  const response = await apiFetch(
    withTenantQuery("/cash-register/current", tenantId),
  );
  if (!response.ok) throw new Error("Failed to fetch register");
  return readJson<CashRegisterView>(response);
}

export async function getRegisterHistory(
  tenantId: string,
  limit = 20,
): Promise<CashRegisterView[]> {
  const response = await apiFetch(
    withTenantQuery(`/cash-register?limit=${limit}`, tenantId),
  );
  if (!response.ok) throw new Error("Failed to fetch register history");
  return (await readJson<CashRegisterView[]>(response)) ?? [];
}

export async function openRegister(
  tenantId: string,
  body: { openingBalance: number; locationCode?: string },
): Promise<CashRegisterView> {
  const response = await apiFetch(withTenantQuery("/cash-register/open", tenantId), {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to open register");
  const parsed = await readJson<CashRegisterView>(response);
  if (!parsed) throw new Error("Failed to open register");
  return parsed;
}

export async function closeRegister(
  tenantId: string,
  body: {
    closingAmount: number;
    totalCardSlips?: number;
    totalCheques?: number;
    closingNote?: string;
  },
): Promise<CashRegisterView> {
  const response = await apiFetch(withTenantQuery("/cash-register/close", tenantId), {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to close register");
  const parsed = await readJson<CashRegisterView>(response);
  if (!parsed) throw new Error("Failed to close register");
  return parsed;
}
