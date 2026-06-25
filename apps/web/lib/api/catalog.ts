import type { Item, ItemFilters } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import { DEFAULT_LIST_LIMIT, fetchFirstPage } from "@/lib/api/fetchAllPages";

export async function getCatalog(
  tenantId: string,
  filters?: ItemFilters,
): Promise<Item[]> {
  if (filters?.cursor || filters?.limit) {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.category) params.set("category", filters.category);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.cursor) params.set("cursor", filters.cursor);
    if (filters?.limit) params.set("limit", String(filters.limit));
    const query = params.toString();
    const path = withTenantQuery(
      query ? `/catalog?${query}` : "/catalog",
      tenantId,
    );
    const response = await apiFetch(path);
    if (!response.ok) throw new Error("Failed to fetch catalog");
    return response.json();
  }

  return fetchFirstPage(async (cursor, limit) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.category) params.set("category", filters.category);
    if (filters?.search) params.set("search", filters.search);
    if (cursor) params.set("cursor", cursor);
    params.set("limit", String(limit ?? DEFAULT_LIST_LIMIT));
    const path = withTenantQuery(`/catalog?${params}`, tenantId);
    const response = await apiFetch(path);
    if (!response.ok) throw new Error("Failed to fetch catalog");
    return response.json();
  });
}

export async function getCatalogItem(id: string): Promise<Item> {
  const response = await apiFetch(`/catalog/${id}`);
  if (!response.ok) throw new Error("Failed to fetch catalog item");
  return response.json();
}
