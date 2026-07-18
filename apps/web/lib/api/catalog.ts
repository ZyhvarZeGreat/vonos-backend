import type { Item, ItemFilters } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  fetchListPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";

async function fetchCatalogRaw(
  tenantId: string,
  filters: ItemFilters | undefined,
  cursor?: string,
  limit?: number,
): Promise<Item[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.locationCode) params.set("locationCode", filters.locationCode);
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));
  const query = params.toString();
  const path = withTenantQuery(query ? `/catalog?${query}` : "/catalog", tenantId);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch catalog");
  return response.json();
}

export async function getCatalogPage(
  tenantId: string,
  filters: ItemFilters | undefined,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<Item>> {
  return fetchListPage(
    (pageCursor, pageLimit) => fetchCatalogRaw(tenantId, filters, pageCursor, pageLimit),
    cursor,
    limit,
  );
}

export async function getAllCatalog(
  tenantId: string,
  filters?: ItemFilters,
): Promise<Item[]> {
  return fetchAllPages(
    (cursor, limit) => fetchCatalogRaw(tenantId, filters, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

export async function getCatalog(
  tenantId: string,
  filters?: ItemFilters,
): Promise<Item[]> {
  if (filters?.cursor || filters?.limit) {
    return fetchCatalogRaw(tenantId, filters, filters.cursor, filters.limit);
  }

  return fetchFirstPage(
    (cursor, limit) => fetchCatalogRaw(tenantId, filters, cursor, limit),
  );
}

export async function getCatalogItem(id: string): Promise<Item> {
  const response = await apiFetch(`/catalog/${id}`);
  if (!response.ok) throw new Error("Failed to fetch catalog item");
  return response.json();
}
