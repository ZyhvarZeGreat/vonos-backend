import type {
  CafeTable,
  CafeTableStatus,
  CreateCafeTableRequest,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { appendListQuery, fetchTenantListPage } from "@/lib/api/listPageHelpers";

const LIST_PATH = "/cafe-tables";

async function fetchCafeTablesRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
): Promise<CafeTable[]> {
  const tenantPath = withTenantQuery(LIST_PATH, tenantId);
  const url = appendListQuery(tenantPath, { cursor, limit });
  const response = await apiFetch(url);
  if (!response.ok) throw new Error("Failed to fetch tables");
  return response.json();
}

export async function getCafeTablesPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<CafeTable>> {
  return fetchTenantListPage(LIST_PATH, tenantId, cursor, limit);
}

/** Full table list for export — not for table rendering. */
export async function getAllCafeTables(tenantId: string): Promise<CafeTable[]> {
  return fetchAllPages(
    (cursor, limit) => fetchCafeTablesRaw(tenantId, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

export async function getCafeTables(tenantId: string): Promise<CafeTable[]> {
  return fetchFirstPage((cursor, limit) =>
    fetchCafeTablesRaw(tenantId, cursor, limit),
  );
}

export async function createCafeTable(
  tenantId: string,
  body: CreateCafeTableRequest,
): Promise<CafeTable> {
  const path = withTenantQuery("/cafe-tables", tenantId);
  const response = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to create table");
  return response.json();
}

export async function updateCafeTableStatus(
  id: string,
  status: CafeTableStatus,
): Promise<CafeTable> {
  const response = await apiFetch(`/cafe-tables/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error("Failed to update table status");
  return response.json();
}
