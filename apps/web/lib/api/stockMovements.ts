import type {
  MovementSource,
  MovementStatus,
  MovementType,
  PurchaseViewBundle,
  StockMovement,
  StockMovementFilters as StockMovementApiFilters,
  StockMovementListRow,
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

export type { StockMovementListRow };

export type StockMovementFilters = StockMovementApiFilters;

function buildStockMovementsPath(
  tenantId: string,
  filters: StockMovementFilters | undefined,
  cursor?: string,
  limit?: number,
): string {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.source) params.set("source", filters.source);
  if (filters?.locationCode) params.set("locationCode", filters.locationCode);
  if (filters?.supplierId) params.set("supplierId", filters.supplierId);
  if (filters?.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
  if (filters?.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.sortBy) params.set("sortBy", filters.sortBy);
  if (filters?.sortDir) params.set("sortDir", filters.sortDir);
  if (filters?.includeSummary === false) params.set("includeSummary", "0");
  else if (filters?.includeSummary === true) params.set("includeSummary", "1");
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));
  const query = params.toString();
  return withTenantQuery(
    query ? `/stock-movements?${query}` : "/stock-movements",
    tenantId,
  );
}

async function fetchStockMovementsRaw(
  tenantId: string,
  filters: StockMovementFilters | undefined,
  cursor?: string,
  limit?: number,
): Promise<
  StockMovementListRow[] | { items: StockMovementListRow[]; totalCount: number }
> {
  const response = await apiFetch(
    buildStockMovementsPath(tenantId, filters, cursor, limit),
  );
  if (!response.ok) throw new Error("Failed to fetch stock movements");
  return response.json();
}

export async function getStockMovementsPage(
  tenantId: string,
  filters: StockMovementFilters | undefined,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<StockMovementListRow>> {
  return fetchListPage(
    (pageCursor, pageLimit) =>
      fetchStockMovementsRaw(
        tenantId,
        { ...filters, includeSummary: filters?.includeSummary ?? false },
        pageCursor,
        pageLimit,
      ),
    cursor,
    limit,
  );
}

/** Count only (limit=1) — pair with rows-first getStockMovementsPage. */
export async function getStockMovementsListSummary(
  tenantId: string,
  filters?: StockMovementFilters,
): Promise<Pick<ListPage<StockMovementListRow>, "totalCount" | "amountSummary">> {
  const page = await getStockMovementsPage(
    tenantId,
    { ...filters, includeSummary: true },
    undefined,
    1,
  );
  return { totalCount: page.totalCount, amountSummary: page.amountSummary };
}

/** Full movement list for export — not for table rendering. */
export async function getAllStockMovements(
  tenantId: string,
  filters?: StockMovementFilters,
): Promise<StockMovementListRow[]> {
  return fetchAllPages(
    (cursor, limit) => fetchStockMovementsRaw(tenantId, filters, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

export async function getStockMovements(
  tenantId: string,
  filters: StockMovementFilters = {},
): Promise<StockMovementListRow[]> {
  if (filters.cursor || filters.limit) {
    const payload = await fetchStockMovementsRaw(
      tenantId,
      filters,
      filters.cursor,
      filters.limit,
    );
    return Array.isArray(payload) ? payload : payload.items;
  }

  return fetchFirstPage((cursor, limit) =>
    fetchStockMovementsRaw(tenantId, filters, cursor, limit),
  );
}

export async function getStockMovement(id: string): Promise<StockMovement> {
  const response = await apiFetch(`/stock-movements/${id}`);
  if (!response.ok) throw new Error("Failed to fetch stock movement");
  return response.json();
}

/** Purchase modal bundle: movement + payments + supplier (one round-trip). */
export async function getPurchaseView(
  tenantId: string,
  id: string,
): Promise<PurchaseViewBundle> {
  const response = await apiFetch(
    withTenantQuery(`/stock-movements/${id}/view`, tenantId),
  );
  if (!response.ok) throw new Error("Failed to fetch purchase view");
  return response.json();
}

export interface CreateStockMovementRequest {
  type: MovementType;
  reference: string;
  status?: MovementStatus;
  lines: Array<{ itemId: string; sku: string; name: string; quantity: number; unitCost?: number }>;
  notes?: string;
  supplierId?: string;
  source?: MovementSource;
  locationCode?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  date?: string;
}

export async function createStockMovement(
  tenantId: string,
  body: CreateStockMovementRequest,
): Promise<StockMovement> {
  const path = withTenantQuery("/stock-movements", tenantId);
  const response = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to create movement");
  }
  return response.json();
}

export async function updateStockMovementStatus(
  id: string,
  status: MovementStatus,
): Promise<StockMovement> {
  const response = await apiFetch(`/stock-movements/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error("Failed to update movement status");
  return response.json();
}

export async function deleteStockMovement(
  tenantId: string,
  id: string,
): Promise<void> {
  const response = await apiFetch(
    withTenantQuery(`/stock-movements/${id}`, tenantId),
    { method: "DELETE" },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Failed to delete purchase");
  }
}

export async function payStockMovement(
  tenantId: string,
  id: string,
  input: {
    amount: number;
    method?: string;
    accountId?: string;
    note?: string;
    paidOn?: string;
  },
): Promise<{
  movementId: string;
  amountApplied: number;
  currency: string;
  remainingDue: number;
  paymentStatus: string;
}> {
  const response = await apiFetch(
    withTenantQuery(`/stock-movements/${id}/pay`, tenantId),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Failed to record payment");
  }
  return response.json();
}

export async function getStockMovementPayments(
  tenantId: string,
  id: string,
): Promise<
  Array<{
    id: string;
    amount: number;
    currency: string;
    method: string | null;
    paymentRefNo: string | null;
    paidOn: string | null;
    note: string | null;
    accountId: string | null;
    accountName: string | null;
    createdByName: string | null;
  }>
> {
  const response = await apiFetch(
    withTenantQuery(`/stock-movements/${id}/payments`, tenantId),
  );
  if (!response.ok) throw new Error("Failed to fetch purchase payments");
  return response.json();
}
