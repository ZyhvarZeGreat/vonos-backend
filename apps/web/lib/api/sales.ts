import type { CreateSaleRequest, CreateSaleReturnRequest, Sale, SaleDetail, SaleFilters, CsvImportResult, UpdateSaleShippingRequest } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  fetchListPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";

async function fetchSalesRaw(
  tenantId: string,
  filters: SaleFilters | undefined,
  cursor?: string,
  limit?: number,
): Promise<Sale[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.saleStatus) params.set("saleStatus", filters.saleStatus);
  if (filters?.returnsOnly) params.set("returnsOnly", "true");
  if (filters?.shipmentsOnly) params.set("shipmentsOnly", "true");
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));
  const query = params.toString();
  const path = withTenantQuery(query ? `/sales?${query}` : "/sales", tenantId);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch sales");
  return response.json();
}

export async function getSalesPage(
  tenantId: string,
  filters: SaleFilters | undefined,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<Sale>> {
  return fetchListPage(
    (pageCursor, pageLimit) => fetchSalesRaw(tenantId, filters, pageCursor, pageLimit),
    cursor,
    limit,
  );
}

export async function getAllSales(
  tenantId: string,
  filters?: SaleFilters,
): Promise<Sale[]> {
  return fetchAllPages(
    (cursor, limit) => fetchSalesRaw(tenantId, filters, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

export async function getSales(
  tenantId: string,
  filters?: SaleFilters,
): Promise<Sale[]> {
  if (filters?.cursor || filters?.limit) {
    return fetchSalesRaw(tenantId, filters, filters.cursor, filters.limit);
  }

  return fetchFirstPage(
    (cursor, limit) => fetchSalesRaw(tenantId, filters, cursor, limit),
  );
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

export async function finalizeSale(
  tenantId: string,
  saleId: string,
  body?: { payments?: CreateSaleRequest["payments"] },
): Promise<SaleDetail> {
  const path = withTenantQuery(`/sales/${saleId}/finalize`, tenantId);
  const response = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!response.ok) throw new Error("Failed to finalize sale");
  return response.json();
}

export async function importSales(
  tenantId: string,
  csv: string,
): Promise<CsvImportResult> {
  const path = withTenantQuery("/sales/import", tenantId);
  const response = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csv }),
  });
  if (!response.ok) throw new Error("Failed to import sales");
  return response.json();
}

export async function createSaleReturn(
  tenantId: string,
  saleId: string,
  body: CreateSaleReturnRequest,
): Promise<SaleDetail> {
  const path = withTenantQuery(`/sales/${saleId}/return`, tenantId);
  const response = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;
    const message = Array.isArray(payload?.message)
      ? payload.message.join(", ")
      : payload?.message;
    throw new Error(message || "Failed to create return");
  }
  return response.json();
}

export async function updateSaleShipping(
  tenantId: string,
  saleId: string,
  body: UpdateSaleShippingRequest,
): Promise<SaleDetail> {
  const path = withTenantQuery(`/sales/${saleId}/shipping`, tenantId);
  const response = await apiFetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to update shipping");
  return response.json();
}
