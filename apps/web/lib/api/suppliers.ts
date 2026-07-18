import { apiFetch, withTenantQuery } from "@/lib/api/client";
import type {
  SupplierListRow,
  SupplierFilters,
  ContactDueSummary,
  ContactLedgerEntry,
  CsvImportResult,
} from "@vonos/types";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  TYPEAHEAD_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { appendListQuery, fetchTenantListPage } from "@/lib/api/listPageHelpers";
import { nameListCursor } from "@/lib/utils/pagination";

export type { SupplierListRow };

const LIST_PATH = "/suppliers";

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
  };
}

async function fetchSuppliersRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
  filters?: SupplierFilters,
): Promise<SupplierListRow[]> {
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
): Promise<ListPage<SupplierListRow>> {
  return fetchTenantListPage(LIST_PATH, tenantId, cursor, limit, supplierExtraParams(filters));
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

/** Typeahead / option lists — capped; pass search for more matches. */
export async function getSuppliers(
  tenantId: string,
  filters?: SupplierFilters,
): Promise<SupplierListRow[]> {
  return fetchFirstPage(
    (cursor, limit) => fetchSuppliersRaw(tenantId, cursor, limit, filters),
    filters?.limit ?? TYPEAHEAD_PAGE_SIZE,
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
  return response.json();
}
