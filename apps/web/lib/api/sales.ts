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
): Promise<Sale[] | { items: Sale[]; totalCount: number }> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.saleStatus) params.set("saleStatus", filters.saleStatus);
  if (filters?.returnsOnly) params.set("returnsOnly", "true");
  if (filters?.shipmentsOnly) params.set("shipmentsOnly", "true");
  if (filters?.locationCode) params.set("locationCode", filters.locationCode);
  if (filters?.customerId) params.set("customerId", filters.customerId);
  if (filters?.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
  if (filters?.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
  if (filters?.shippingStatus) params.set("shippingStatus", filters.shippingStatus);
  if (filters?.cleanerUserId) params.set("cleanerUserId", filters.cleanerUserId);
  if (filters?.serviceStaffEmployeeId) {
    params.set("serviceStaffEmployeeId", filters.serviceStaffEmployeeId);
  }
  if (filters?.createdByUserId) params.set("createdByUserId", filters.createdByUserId);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.sortBy) params.set("sortBy", filters.sortBy);
  if (filters?.sortDir) params.set("sortDir", filters.sortDir);
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
    const payload = await fetchSalesRaw(
      tenantId,
      filters,
      filters.cursor,
      filters.limit,
    );
    return Array.isArray(payload) ? payload : payload.items;
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

/** Reference only — for titles / breadcrumbs. */
export async function getSaleMeta(
  id: string,
  tenantId: string,
): Promise<{ id: string; reference: string }> {
  const path = withTenantQuery(`/sales/${id}/meta`, tenantId);
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

export async function deleteSale(tenantId: string, id: string): Promise<void> {
  const response = await apiFetch(withTenantQuery(`/sales/${id}`, tenantId), {
    method: "DELETE",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Failed to delete sale");
  }
}

export interface SalePaymentRow {
  id: string;
  amount: number;
  currency: string;
  method: string | null;
  paidOn: string | null;
  note: string | null;
  createdByName: string | null;
}

export async function getSalePayments(
  tenantId: string,
  saleId: string,
): Promise<SalePaymentRow[]> {
  const response = await apiFetch(
    withTenantQuery(`/sales/${saleId}/payments`, tenantId),
  );
  if (!response.ok) throw new Error("Failed to fetch sale payments");
  return response.json();
}
