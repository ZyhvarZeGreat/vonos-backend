import { apiFetch, withTenantQuery } from "@/lib/api/client";
import { throwApiError } from "@/lib/api/parseApiError";
import type {
  SupplierListRow,
  SupplierFilters,
  ContactDueSummary,
  ContactLedgerEntry,
  CsvImportResult,
  PayContactDueRequest,
  PayContactDueResult,
} from "@vonos/types";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  FILTER_DROPDOWN_INITIAL_LIMIT,
  FILTER_ROSTER_TTL_MS,
  IN_MEMORY_FILTER_CATALOG_LIMIT,
  TYPEAHEAD_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  fetchListPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { appendListQuery, fetchTenantListPage } from "@/lib/api/listPageHelpers";
import { createAccumulatingPicker } from "@/lib/api/accumulatingPicker";
import { compositeListCursorFrom, nameListCursor } from "@/lib/utils/pagination";
import { createAsyncTtlCache } from "@/lib/utils/asyncTtlCache";

export type { SupplierListRow };

const LIST_PATH = "/suppliers";

/** Picker option cache — recent window / search results; cleared on mutations. */
const supplierOptionCache = createAsyncTtlCache<SupplierListRow[]>({
  ttlMs: FILTER_ROSTER_TTL_MS,
  maxEntries: 128,
});

/** Drop cached supplier option lists (call after supplier mutations). */
export function clearSupplierOptionCache(): void {
  supplierOptionCache.clear();
  for (const picker of supplierPickers.values()) picker.clearAll();
  supplierPickers.clear();
}

export interface SupplierKpiSummary {
  totalSuppliers: number;
  onTimeRate: number;
  avgLeadTimeDays: number;
  openPoValue: number;
  currency: string;
}

function supplierExtraParams(filters?: SupplierFilters): Record<string, string | undefined> {
  if (!filters) return {};
  return {
    search: filters.search,
    purchaseDue: filters.purchaseDue ? "true" : undefined,
    purchaseReturn: filters.purchaseReturn ? "true" : undefined,
    advanceBalance: filters.advanceBalance ? "true" : undefined,
    openingBalance: filters.openingBalance ? "true" : undefined,
    assignedToUserId: filters.assignedToUserId,
    status: filters.status,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    includeSummary:
      filters.includeSummary === false
        ? "0"
        : filters.includeSummary === true
          ? "1"
          : undefined,
  };
}

async function fetchSuppliersRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
  filters?: SupplierFilters,
): Promise<SupplierListRow[] | { items: SupplierListRow[]; totalCount: number }> {
  const tenantPath = withTenantQuery(LIST_PATH, tenantId);
  const url = appendListQuery(tenantPath, {
    cursor,
    limit,
    ...supplierExtraParams(filters),
  });
  const response = await apiFetch(url);
  if (!response.ok) throw new Error("Failed to fetch suppliers");
  return response.json();
}

export async function getSuppliersPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  filters?: SupplierFilters,
  init?: { signal?: AbortSignal },
): Promise<ListPage<SupplierListRow>> {
  return fetchTenantListPage(
    LIST_PATH,
    tenantId,
    cursor,
    limit,
    supplierExtraParams({
      ...filters,
      includeSummary: filters?.includeSummary ?? false,
    }),
    init,
  );
}

/** Count + amountSummary only (limit=1) — pair with rows-first getSuppliersPage. */
export async function getSuppliersListSummary(
  tenantId: string,
  filters?: SupplierFilters,
): Promise<Pick<ListPage<SupplierListRow>, "totalCount" | "amountSummary">> {
  const page = await getSuppliersPage(
    tenantId,
    undefined,
    1,
    { ...filters, includeSummary: true },
  );
  return { totalCount: page.totalCount, amountSummary: page.amountSummary };
}

/** Full supplier list for export — not for table rendering. */
export async function getAllSuppliers(
  tenantId: string,
  filters?: SupplierFilters,
): Promise<SupplierListRow[]> {
  return fetchAllPages(
    (cursor, limit) => fetchSuppliersRaw(tenantId, cursor, limit, filters),
    EXPORT_PAGE_SIZE,
    nameListCursor,
  );
}

type SupplierPicker = ReturnType<typeof createAccumulatingPicker<SupplierListRow>>;
const supplierPickers = new Map<string, SupplierPicker>();

function supplierPickerFor(tenantId: string): SupplierPicker {
  let picker = supplierPickers.get(tenantId);
  if (!picker) {
    picker = createAccumulatingPicker<SupplierListRow>({
      getCursor: (row) => compositeListCursorFrom(row, "createdAt", "date"),
      searchKeys: ["name", "businessName", "contactName", "phone", "email"],
      fetchPage: (cursor, limit, search) =>
        fetchListPage(
          (pageCursor, pageLimit) =>
            fetchSuppliersRaw(tenantId, pageCursor, pageLimit, {
              search: search || undefined,
              includeSummary: false,
              sortBy: "createdAt",
              sortDir: "desc",
            }),
          cursor,
          limit,
        ),
    });
    supplierPickers.set(tenantId, picker);
  }
  return picker;
}

/**
 * Full supplier roster for export / admin — not for filter dropdowns.
 */
export async function getSupplierRoster(
  tenantId: string,
): Promise<SupplierListRow[]> {
  const cacheKey = JSON.stringify(["supplier-roster", tenantId]);
  return supplierOptionCache.get(cacheKey, async () =>
    fetchAllPages(
      (cursor, limit) =>
        fetchSuppliersRaw(tenantId, cursor, limit, {
          includeSummary: false,
        }),
      Math.min(EXPORT_PAGE_SIZE, IN_MEMORY_FILTER_CATALOG_LIMIT),
      nameListCursor,
      IN_MEMORY_FILTER_CATALOG_LIMIT,
    ),
  );
}

/**
 * Supplier filter/picker — first ~80, scroll for more.
 * Search uses loaded rows first; otherwise API.
 */
export async function getSuppliersForPicker(
  tenantId: string,
  search?: string,
  _opts?: { limit?: number },
): Promise<SupplierListRow[]> {
  const page = await supplierPickerFor(tenantId).load(tenantId, search);
  return page.items;
}

export async function loadMoreSuppliersForPicker(
  tenantId: string,
): Promise<{ items: SupplierListRow[]; appended: SupplierListRow[]; hasMore: boolean }> {
  return supplierPickerFor(tenantId).loadMore(tenantId);
}

export function suppliersPickerHasMore(tenantId: string): boolean {
  return supplierPickerFor(tenantId).hasMore(tenantId);
}

/** Typeahead / option lists — capped; pass search for more matches. */
export async function getSuppliers(
  tenantId: string,
  filters?: SupplierFilters,
): Promise<SupplierListRow[]> {
  // Prefer in-memory roster for dumps and search (match-sorter).
  // Cursor / status / due filters stay on the server.
  const plainPicker =
    !filters?.cursor &&
    !filters?.status &&
    !filters?.assignedToUserId &&
    !filters?.purchaseDue &&
    !filters?.purchaseReturn &&
    !filters?.advanceBalance &&
    !filters?.openingBalance;

  if (plainPicker) {
    return getSuppliersForPicker(tenantId, filters?.search, {
      limit: filters?.limit ?? FILTER_DROPDOWN_INITIAL_LIMIT,
    });
  }

  const cacheKey = JSON.stringify([
    "typeahead",
    tenantId,
    filters?.search ?? "",
    filters?.limit ?? TYPEAHEAD_PAGE_SIZE,
    filters?.status ?? "",
    filters?.assignedToUserId ?? "",
  ]);
  return supplierOptionCache.get(cacheKey, () =>
    fetchFirstPage(
      (cursor, limit) =>
        fetchSuppliersRaw(tenantId, cursor, limit, {
          ...filters,
          // Always skip count/agg on typeahead — keeps search snappy.
          includeSummary: false,
        }),
      filters?.limit ?? TYPEAHEAD_PAGE_SIZE,
    ),
  );
}

export async function getSupplierKpis(tenantId: string): Promise<SupplierKpiSummary> {
  const response = await apiFetch(
    withTenantQuery("/suppliers/kpi-summary", tenantId),
  );
  if (!response.ok) throw new Error("Failed to fetch supplier KPIs");
  return response.json();
}

export async function getSupplier(id: string): Promise<SupplierListRow> {
  const response = await apiFetch(`/suppliers/${id}`);
  if (!response.ok) throw new Error("Failed to fetch supplier");
  return response.json();
}

/** Name only — for titles / breadcrumbs. */
export async function getSupplierMeta(
  id: string,
): Promise<{ id: string; name: string }> {
  const response = await apiFetch(`/suppliers/${id}/meta`);
  if (!response.ok) throw new Error("Failed to fetch supplier");
  return response.json();
}

export interface CreateSupplierRequest {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  locationCode?: string;
  notes?: string;
  taxNumber?: string | null;
  openingBalance?: number;
  assignedToUserId?: string;
  accountHolderName?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  bankCode?: string | null;
  bankAccountNo?: string | null;
  taxPayerId?: string | null;
}

export type UpdateSupplierRequest = Partial<CreateSupplierRequest>;

export async function createSupplier(body: CreateSupplierRequest): Promise<SupplierListRow> {
  const response = await apiFetch("/suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) return throwApiError(response, "Failed to create supplier");
  clearSupplierOptionCache();
  return response.json();
}

export async function updateSupplier(
  id: string,
  body: UpdateSupplierRequest,
): Promise<SupplierListRow> {
  const response = await apiFetch(`/suppliers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) return throwApiError(response, "Failed to update supplier");
  clearSupplierOptionCache();
  return response.json();
}

export async function setSupplierStatus(
  tenantId: string,
  id: string,
  status: "active" | "inactive",
): Promise<SupplierListRow> {
  const response = await apiFetch(
    withTenantQuery(`/suppliers/${id}/status`, tenantId),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  if (!response.ok) {
    return throwApiError(response, "Failed to update supplier status");
  }
  clearSupplierOptionCache();
  return response.json();
}

export async function getSupplierSummary(
  tenantId: string,
  supplierId: string,
): Promise<ContactDueSummary> {
  const response = await apiFetch(
    withTenantQuery(`/suppliers/${supplierId}/summary`, tenantId),
  );
  if (!response.ok) throw new Error("Failed to fetch supplier summary");
  return response.json();
}

export async function getSupplierLedger(
  tenantId: string,
  supplierId: string,
): Promise<ContactLedgerEntry[]> {
  const response = await apiFetch(
    withTenantQuery(`/suppliers/${supplierId}/ledger`, tenantId),
  );
  if (!response.ok) throw new Error("Failed to fetch supplier ledger");
  return response.json();
}

export async function importSuppliers(
  tenantId: string,
  csv: string,
): Promise<CsvImportResult> {
  const response = await apiFetch(withTenantQuery("/suppliers/import", tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csv }),
  });
  if (!response.ok) throw new Error("Failed to import suppliers");
  clearSupplierOptionCache();
  return response.json();
}

export async function deleteSupplier(tenantId: string, id: string): Promise<void> {
  const response = await apiFetch(withTenantQuery(`/suppliers/${id}`, tenantId), {
    method: "DELETE",
  });
  if (!response.ok) {
    return throwApiError(response, "Failed to delete supplier");
  }
  clearSupplierOptionCache();
}

export async function paySupplierDue(
  tenantId: string,
  id: string,
  input: PayContactDueRequest,
): Promise<PayContactDueResult> {
  const response = await apiFetch(
    withTenantQuery(`/suppliers/${id}/pay-due`, tenantId),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    return throwApiError(response, "Failed to record payment");
  }
  return response.json();
}

export interface SupplierStockReportRow {
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  totalCost: number;
}

export async function getSupplierStockReport(
  tenantId: string,
  supplierId: string,
): Promise<SupplierStockReportRow[]> {
  const response = await apiFetch(
    withTenantQuery(`/suppliers/${supplierId}/stock-report`, tenantId),
  );
  if (!response.ok) throw new Error("Failed to fetch supplier stock report");
  return response.json();
}
