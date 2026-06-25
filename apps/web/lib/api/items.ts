import type { Item, ItemFilters, KpiSummary, StockStatus } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import { DEFAULT_LIST_LIMIT, fetchFirstPage } from "@/lib/api/fetchAllPages";

export async function getItems(
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
      query ? `/items?${query}` : "/items",
      tenantId,
    );
    const response = await apiFetch(path);
    if (!response.ok) throw new Error("Failed to fetch items");
    return response.json();
  }

  return fetchFirstPage(async (cursor, limit) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.category) params.set("category", filters.category);
    if (filters?.search) params.set("search", filters.search);
    if (cursor) params.set("cursor", cursor);
    params.set("limit", String(limit ?? DEFAULT_LIST_LIMIT));
    const path = withTenantQuery(`/items?${params}`, tenantId);
    const response = await apiFetch(path);
    if (!response.ok) throw new Error("Failed to fetch items");
    return response.json();
  });
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
