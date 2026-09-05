import type {
  Item,
  ItemFilters,
  ItemLocationStockInput,
  KpiSummary,
  PeerStockBySkuResult,
  StockAvailabilityResult,
  StockStatus,
  CsvImportResult,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import { throwApiError } from "@/lib/api/parseApiError";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  FILTER_ROSTER_TTL_MS,
  IN_MEMORY_FILTER_CATALOG_LIMIT,
  TYPEAHEAD_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  fetchListPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { itemListCursor } from "@/lib/utils/pagination";
import { createAsyncTtlCache } from "@/lib/utils/asyncTtlCache";
import { matchSorter, rankings } from "match-sorter";

const itemOptionCache = createAsyncTtlCache<Item[]>({
  ttlMs: FILTER_ROSTER_TTL_MS,
  maxEntries: 64,
});

/** Drop cached item option lists (call after item mutations). */
export function clearItemOptionCache(): void {
  itemOptionCache.clear();
}

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
  if (filters?.unit) params.set("unit", filters.unit);
  if (filters?.brandName) params.set("brandName", filters.brandName);
  if (filters?.availableForRetail === true) params.set("availableForRetail", "true");
  if (filters?.availableForRetail === false) params.set("availableForRetail", "false");
  if (filters?.sortBy) params.set("sortBy", filters.sortBy);
  if (filters?.sortDir) params.set("sortDir", filters.sortDir);
  if (filters?.includeSummary === false) params.set("includeSummary", "false");
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
  signal?: AbortSignal,
): Promise<Item[]> {
  const response = await apiFetch(
    buildItemsPath(tenantId, filters, cursor, limit),
    signal ? { signal } : undefined,
  );
  if (!response.ok) throw new Error("Failed to fetch items");
  return response.json();
}

export async function getItemsPage(
  tenantId: string,
  filters: ItemFilters | undefined,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  init?: { signal?: AbortSignal },
): Promise<ListPage<Item>> {
  return fetchListPage(
    (pageCursor, pageLimit) =>
      fetchItemsRaw(tenantId, filters, pageCursor, pageLimit, init?.signal),
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

/**
 * Item roster for pickers / label search — loaded once into memory.
 * Capped at IN_MEMORY_FILTER_CATALOG_LIMIT.
 */
export async function getItemRoster(
  tenantId: string,
  filters?: Pick<ItemFilters, "availableForRetail" | "status" | "category">,
): Promise<Item[]> {
  const cacheKey = JSON.stringify([
    "item-roster",
    tenantId,
    filters?.availableForRetail ?? null,
    filters?.status ?? null,
    filters?.category ?? null,
  ]);
  return itemOptionCache.get(cacheKey, async () =>
    fetchAllPages(
      (cursor, limit) =>
        fetchItemsRaw(
          tenantId,
          { ...filters, includeSummary: false },
          cursor,
          limit,
        ),
      Math.min(EXPORT_PAGE_SIZE, IN_MEMORY_FILTER_CATALOG_LIMIT),
      itemListCursor,
      IN_MEMORY_FILTER_CATALOG_LIMIT,
    ),
  );
}

/**
 * Item picker / product search — full roster cached; `search` / `limit` are
 * local match-sorter only (no per-keystroke API).
 */
export async function getItemsForPicker(
  tenantId: string,
  search?: string,
  opts?: {
    limit?: number;
    availableForRetail?: boolean;
    status?: StockStatus;
    category?: string;
  },
): Promise<Item[]> {
  const roster = await getItemRoster(tenantId, {
    availableForRetail: opts?.availableForRetail,
    status: opts?.status,
    category: opts?.category,
  });
  const q = search?.trim() ?? "";
  const matched = q
    ? matchSorter(roster, q, {
        keys: ["name", "sku", "category", "brandName", "carModel", "description"],
        threshold: rankings.CONTAINS,
        keepDiacritics: false,
      })
    : roster;
  const limit = opts?.limit;
  return limit != null ? matched.slice(0, limit) : matched;
}

/** Typeahead / option lists — capped; search is local match-sorter. */
export async function getItems(
  tenantId: string,
  filters?: ItemFilters,
): Promise<Item[]> {
  const plainPicker =
    !filters?.cursor &&
    !filters?.locationCode &&
    !filters?.unit &&
    !filters?.brandName &&
    !filters?.sortBy &&
    !filters?.sortDir;

  if (plainPicker) {
    return getItemsForPicker(tenantId, filters?.search, {
      limit: filters?.limit,
      availableForRetail: filters?.availableForRetail,
      status: filters?.status,
      category: filters?.category,
    });
  }

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
        stockHomesOnly?: boolean;
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
  if (params.stockHomesOnly) searchParams.set("stockHomesOnly", "1");
  const query = searchParams.toString();
  const path = query
    ? `/items/stock-availability?${query}`
    : "/items/stock-availability";
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch stock availability");
  return response.json();
}

export async function getPeerStockBySkus(
  skus: string[],
): Promise<PeerStockBySkuResult> {
  const unique = [
    ...new Set(skus.map((s) => s.trim()).filter(Boolean)),
  ].slice(0, 100);
  if (unique.length === 0) return { rows: [] };
  const searchParams = new URLSearchParams({ skus: unique.join(",") });
  const response = await apiFetch(`/items/peer-stock?${searchParams}`);
  if (!response.ok) throw new Error("Failed to fetch peer stock");
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

export interface ItemStockHistoryRow {
  id: string;
  date: string;
  reference: string;
  type: string;
  status: string;
  quantity: number;
  quantityChange: number;
  newQuantity: number;
  unitCost: number | null;
  customerSupplierInfo: string | null;
  createdByName?: string | null;
}

export interface OpeningStockRecord {
  id: string;
  quantity: number;
  unitCost: number | null;
  date: string;
  note: string | null;
  createdByName: string | null;
  /** ISO timestamp — when the OS row was first saved. */
  createdAt?: string | null;
  locationCode: string | null;
}

export async function getItemStockHistory(
  id: string,
): Promise<ItemStockHistoryRow[]> {
  const response = await apiFetch(`/items/${id}/stock-history`);
  if (!response.ok) throw new Error("Failed to fetch stock history");
  return response.json();
}

export async function getItemOpeningStock(
  id: string,
): Promise<OpeningStockRecord[]> {
  const response = await apiFetch(`/items/${id}/opening-stock`);
  if (!response.ok) throw new Error("Failed to fetch opening stock");
  return response.json();
}

export async function saveItemOpeningStock(
  id: string,
  body: {
    locationCode: string;
    costPrice?: number;
    rows: Array<{
      id?: string;
      quantity: number;
      unitCost: number;
      date: string;
      note?: string;
    }>;
  },
  tenantId?: string,
  /** Current item — used to preserve other location bins on legacy fallback. */
  currentItem?: Item | null,
): Promise<Item> {
  const osPath = tenantId
    ? withTenantQuery(`/items/${id}/opening-stock`, tenantId)
    : `/items/${id}/opening-stock`;

  // Prefer dedicated opening-stock route (dated OS/… movements).
  for (const method of ["POST", "PATCH"] as const) {
    const response = await apiFetch(osPath, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      clearItemOptionCache();
      return response.json();
    }
    // Live API may not have deployed this route yet — try next / fall back.
    if (response.status !== 404) {
      return throwApiError(response, "Failed to save opening stock");
    }
  }

  // Fallback: PATCH /items/:id (always exists) — set on-hand qty for the location.
  // Does not keep per-row OS history until the dedicated route is live on Railway.
  const nextQty = body.rows.reduce(
    (sum, row) => sum + (Number(row.quantity) || 0),
    0,
  );
  const loc = body.locationCode.trim();
  const otherLocs = (currentItem?.locationStock ?? [])
    .filter((row) => row.locationCode.trim().toLowerCase() !== loc.toLowerCase())
    .map((row) => ({
      locationCode: row.locationCode,
      quantity: row.quantity,
      binLocation: row.binLocation ?? "",
    }));

  return updateItem(
    id,
    {
      locationCode: loc,
      costPrice: body.costPrice,
      locationStock: [
        ...otherLocs,
        { locationCode: loc, quantity: nextQty, binLocation: "" },
      ],
    },
    tenantId,
  );
}

export async function deleteItem(tenantId: string, id: string): Promise<void> {
  const response = await apiFetch(withTenantQuery(`/items/${id}`, tenantId), {
    method: "DELETE",
  });
  if (!response.ok) {
    return throwApiError(response, "Failed to delete product");
  }
  clearItemOptionCache();
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
  imageUrl?: string | null;
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
  sellPrice?: number | null;
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
  if (!response.ok) return throwApiError(response, "Failed to create item");
  clearItemOptionCache();
  return response.json();
}

export async function updateItem(
  id: string,
  body: UpdateItemRequest,
  tenantId?: string,
): Promise<Item> {
  const path = tenantId ? withTenantQuery(`/items/${id}`, tenantId) : `/items/${id}`;
  const response = await apiFetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) return throwApiError(response, "Failed to update item");
  clearItemOptionCache();
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

export async function importOpeningStock(
  tenantId: string,
  csv: string,
): Promise<CsvImportResult> {
  const response = await apiFetch(
    withTenantQuery("/items/import-opening-stock", tenantId),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    },
  );
  if (!response.ok) throw new Error("Failed to import opening stock");
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
