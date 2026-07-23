import type {
  CreateDiscountRequest,
  Discount,
  UpdateDiscountRequest,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import { appendListQuery, fetchTenantListPage } from "@/lib/api/listPageHelpers";
import { DEFAULT_TABLE_PAGE_SIZE, type ListPage } from "@/lib/api/fetchAllPages";

export async function getDiscountsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  opts?: { includeSummary?: boolean },
): Promise<ListPage<Discount>> {
  return fetchTenantListPage("/discounts", tenantId, cursor, limit, {
    includeSummary: opts?.includeSummary ?? false,
  });
}

export async function createDiscount(
  tenantId: string,
  body: CreateDiscountRequest,
): Promise<Discount> {
  const response = await apiFetch(withTenantQuery("/discounts", tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to create discount");
  return response.json();
}

export async function updateDiscount(
  tenantId: string,
  id: string,
  body: UpdateDiscountRequest,
): Promise<Discount> {
  const response = await apiFetch(withTenantQuery(`/discounts/${id}`, tenantId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to update discount");
  return response.json();
}

export async function deleteDiscount(tenantId: string, id: string): Promise<void> {
  const response = await apiFetch(withTenantQuery(`/discounts/${id}`, tenantId), {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete discount");
}

export async function searchDiscounts(
  tenantId: string,
  search: string,
): Promise<Discount[]> {
  const url = appendListQuery(withTenantQuery("/discounts", tenantId), { search });
  const response = await apiFetch(url);
  if (!response.ok) throw new Error("Failed to fetch discounts");
  return response.json();
}
