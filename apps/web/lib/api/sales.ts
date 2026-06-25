import type { CreateSaleRequest, Sale, SaleDetail, SaleFilters } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import { DEFAULT_LIST_LIMIT, fetchFirstPage } from "@/lib/api/fetchAllPages";

export async function getSales(
  tenantId: string,
  filters?: SaleFilters,
): Promise<Sale[]> {
  if (filters?.cursor || filters?.limit) {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.cursor) params.set("cursor", filters.cursor);
    if (filters?.limit) params.set("limit", String(filters.limit));
    const query = params.toString();
    const path = withTenantQuery(query ? `/sales?${query}` : "/sales", tenantId);
    const response = await apiFetch(path);
    if (!response.ok) throw new Error("Failed to fetch sales");
    return response.json();
  }

  return fetchFirstPage(async (cursor, limit) => {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (cursor) params.set("cursor", cursor);
    params.set("limit", String(limit ?? DEFAULT_LIST_LIMIT));
    const path = withTenantQuery(`/sales?${params}`, tenantId);
    const response = await apiFetch(path);
    if (!response.ok) throw new Error("Failed to fetch sales");
    return response.json();
  });
}

export async function getSale(id: string, tenantId: string): Promise<SaleDetail> {
  const path = withTenantQuery(`/sales/${id}`, tenantId);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch sale");
  return response.json();
}

export async function createSale(
  tenantId: string,
  body: CreateSaleRequest,
): Promise<SaleDetail> {
  const path = withTenantQuery("/sales", tenantId);
  const response = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to create sale");
  return response.json();
}
