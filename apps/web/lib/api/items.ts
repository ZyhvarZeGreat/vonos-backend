import type {
  Item,
  ItemFilters,
  ItemLocationStockInput,
  KpiSummary,
  StockAvailabilityResult,
  StockStatus,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  fetchListPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";

function buildItemsPath(
  tenantId: string,
  filters: ItemFilters | undefined,
  cursor?: string,
  limit?: number,
): string {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.locationCode) params.set("locationCode", filters.locationCode);
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));
  const query = params.toString();
  return withTenantQuery(query ? `/items?${query}` : "/items", tenantId);
}

async function fetchItemsRaw(
  tenantId: string,
  filters: ItemFilters | undefined,
  cursor?: string,
  limit?: number,
): Promise<Item[]> {
  const response = await apiFetch(buildItemsPath(tenantId, filters, cursor, limit));
  if (!response.ok) throw new Error("Failed to fetch items");
  return response.json();
}

export async function getItemsPage(
  tenantId: string,
  filters: ItemFilters | undefined,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<Item>> {
  return fetchListPage(
    (pageCursor, pageLimit) => fetchItemsRaw(tenantId, filters, pageCursor, pageLimit),
    cursor,
    limit,
  );
}

/** Full inventory list for export — not for table rendering. */
export async function getAllItems(
  tenantId: string,
  filters?: ItemFilters,
): Promise<Item[]> {
  return fetchAllPages(
    (cursor, limit) => fetchItemsRaw(tenantId, filters, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

export async function getItems(
  tenantId: string,
  filters?: ItemFilters,
): Promise<Item[]> {
  if (filters?.cursor || filters?.limit) {
    return fetchItemsRaw(tenantId, filters, filters.cursor, filters.limit);
  }

  return fetchFirstPage(
    (cursor, limit) => fetchItemsRaw(tenantId, filters, cursor, limit),
  );
}

export async function getStockAvailability(
  search?: string,
): Promise<StockAvailabilityResult> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const query = params.toString();
  const path = query
    ? `/items/stock-availability?${query}`
    : "/items/stock-availability";
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch stock availability");
  return response.json();
}

export async function getItem(id: string): Promise<Item> {
  const response = await apiFetch(`/items/${id}`);
  if (!response.ok) throw new Error("Failed to fetch item");
  return response.json();
}

export async function getKpiSummary(tenantId: string): Promise<KpiSummary> {
  const response = await apiFetch(
    withTenantQuery("/items/kpi-summary", tenantId),
  );
  if (!response.ok) throw new Error("Failed to fetch KPI summary");
  return response.json();
}

export interface CreateItemRequest {
  sku: string;
  name: string;
  category?: string;
  quantity?: number;
  binLocation?: string;
  locationCode?: string;
  reorderPoint?: number;
  costPrice: number;
  currency?: string;
  status?: StockStatus;
  availableForRetail?: boolean;
  locationStock?: ItemLocationStockInput[];
}

export type UpdateItemRequest = Partial<CreateItemRequest>;

export async function createItem(
  tenantId: string,
  body: CreateItemRequest,
): Promise<Item> {
  const path = withTenantQuery("/items", tenantId);
  const response = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to create item");
  return response.json();
}

export async function updateItem(
  id: string,
  body: UpdateItemRequest,
): Promise<Item> {
  const response = await apiFetch(`/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to update item");
  return response.json();
}
