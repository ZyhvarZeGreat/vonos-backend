import type {
  Item,
  ItemFilters,
  ItemLocationStockInput,
  KpiSummary,
  StockAvailabilityResult,
  StockStatus,
  CsvImportResult,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  TYPEAHEAD_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  fetchListPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { itemListCursor } from "@/lib/utils/pagination";

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
  if (filters?.sortBy) params.set("sortBy", filters.sortBy);
  if (filters?.sortDir) params.set("sortDir", filters.sortDir);
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
    itemListCursor,
  );
}

/** Typeahead / option lists — capped; pass search for more matches. */
export async function getItems(
  tenantId: string,
  filters?: ItemFilters,
): Promise<Item[]> {
  if (filters?.cursor || filters?.limit) {
    return fetchItemsRaw(tenantId, filters, filters.cursor, filters.limit);
  }

  return fetchFirstPage(
    (cursor, limit) => fetchItemsRaw(tenantId, filters, cursor, limit),
    TYPEAHEAD_PAGE_SIZE,
  );
}

export async function getStockAvailability(
  searchOrParams?:
    | string
    | {
        search?: string;
        limit?: number;
        entityCode?: string;
        availability?: "all" | "available" | "unavailable";
      },
): Promise<StockAvailabilityResult> {
  const params =
    typeof searchOrParams === "string"
      ? { search: searchOrParams }
      : (searchOrParams ?? {});
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.entityCode) searchParams.set("entityCode", params.entityCode);
  if (params.availability && params.availability !== "all") {
    searchParams.set("availability", params.availability);
  }
  const query = searchParams.toString();
  const path = query
    ? `/items/stock-availability?${query}`
    : "/items/stock-availability";
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch stock availability");
  return response.json();
}

export type SourceAvailability = {
  sku: string;
  sourceTenantCode: string;
  onHand: number;
  reserved: number;
  available: number;
};

/** Available qty at a source tenant for requisition planning. */
export async function getSourceAvailability(
  tenantId: string,
  sku: string,
  sourceTenantCode: string,
): Promise<SourceAvailability> {
  const params = new URLSearchParams({
    sku,
    sourceTenantCode,
  });
  const path = withTenantQuery(
    `/items/source-availability?${params.toString()}`,
    tenantId,
  );
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch source availability");
  return response.json();
}

export async function getItem(id: string): Promise<Item> {
  const response = await apiFetch(`/items/${id}`);
  if (!response.ok) throw new Error("Failed to fetch item");
  return response.json();
}

/** Name / SKU only — for titles / breadcrumbs. */
export async function getItemMeta(
  id: string,
): Promise<{ id: string; name: string; sku: string }> {
  const response = await apiFetch(`/items/${id}/meta`);
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
  subCategory?: string;
  description?: string;
  barcodeType?: string;
  unit?: string;
  weight?: string;
  carModel?: string;
  enableImei?: boolean;
  preparationMinutes?: number;
  quantity?: number;
  binLocation?: string;
  locationCode?: string;
  reorderPoint?: number;
  costPrice: number;
  sellPrice?: number;
  currency?: string;
  status?: StockStatus;
  availableForRetail?: boolean;
  brandId?: string;
  brandName?: string;
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

export async function importItems(
  tenantId: string,
  csv: string,
): Promise<CsvImportResult> {
  const response = await apiFetch(withTenantQuery("/items/import", tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csv }),
  });
  if (!response.ok) throw new Error("Failed to import products");
  return response.json();
}

export async function bulkUpdatePrices(
  tenantId: string,
  body: {
    category?: string;
    itemIds?: string[];
    adjustmentType: "fixed" | "percentage";
    adjustmentValue: number;
  },
): Promise<{ updated: number }> {
  const response = await apiFetch(withTenantQuery("/items/bulk-price", tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to update prices");
  return response.json();
}
