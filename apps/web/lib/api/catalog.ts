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
): Promise<Item[] | { items: Item[]; totalCount?: number }> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.locationCode) params.set("locationCode", filters.locationCode);
  if (filters?.unit) params.set("unit", filters.unit);
  if (filters?.brandName) params.set("brandName", filters.brandName);
  if (filters?.availableForRetail === true) params.set("availableForRetail", "true");
  if (filters?.availableForRetail === false) params.set("availableForRetail", "false");
  if (filters?.sortBy) params.set("sortBy", filters.sortBy);
  if (filters?.sortDir) params.set("sortDir", filters.sortDir);
  // Rows-first by default — count is a second round-trip via includeSummary.
  if (filters?.includeSummary === false) params.set("includeSummary", "0");
  else if (filters?.includeSummary === true) params.set("includeSummary", "1");
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
    (pageCursor, pageLimit) =>
      fetchCatalogRaw(
        tenantId,
        { ...filters, includeSummary: filters?.includeSummary ?? false },
        pageCursor,
        pageLimit,
      ),
    cursor,
    limit,
  );
}

/** Count only (limit=1) — pair with rows-first getCatalogPage. */
export async function getCatalogListSummary(
  tenantId: string,
  filters?: ItemFilters,
): Promise<Pick<ListPage<Item>, "totalCount">> {
  const page = await getCatalogPage(
    tenantId,
    { ...filters, includeSummary: true },
    undefined,
    1,
  );
  return { totalCount: page.totalCount };
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
    const payload = await fetchCatalogRaw(
      tenantId,
      filters,
      filters.cursor,
      filters.limit,
    );
    return Array.isArray(payload) ? payload : (payload.items ?? []);
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
