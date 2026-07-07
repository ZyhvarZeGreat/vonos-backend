import { apiFetch, withTenantQuery } from "@/lib/api/client";
import type { SupplierListRow } from "@vonos/types";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { appendListQuery, fetchTenantListPage } from "@/lib/api/listPageHelpers";

export type { SupplierListRow };

const LIST_PATH = "/suppliers";

export interface SupplierKpiSummary {
  totalSuppliers: number;
  onTimeRate: number;
  avgLeadTimeDays: number;
  openPoValue: number;
  currency: string;
}

async function fetchSuppliersRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
): Promise<SupplierListRow[]> {
  const tenantPath = withTenantQuery(LIST_PATH, tenantId);
  const url = appendListQuery(tenantPath, { cursor, limit });
  const response = await apiFetch(url);
  if (!response.ok) throw new Error("Failed to fetch suppliers");
  return response.json();
}

export async function getSuppliersPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<SupplierListRow>> {
  return fetchTenantListPage(LIST_PATH, tenantId, cursor, limit);
}

/** Full supplier list for export — not for table rendering. */
export async function getAllSuppliers(tenantId: string): Promise<SupplierListRow[]> {
  return fetchAllPages(
    (cursor, limit) => fetchSuppliersRaw(tenantId, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

export async function getSuppliers(tenantId: string): Promise<SupplierListRow[]> {
  return fetchFirstPage((cursor, limit) =>
    fetchSuppliersRaw(tenantId, cursor, limit),
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

export interface CreateSupplierRequest {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  locationCode?: string;
  notes?: string;
}

export type UpdateSupplierRequest = Partial<CreateSupplierRequest>;

export async function createSupplier(body: CreateSupplierRequest): Promise<SupplierListRow> {
  const response = await apiFetch("/suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to create supplier");
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
  if (!response.ok) throw new Error("Failed to update supplier");
  return response.json();
}
