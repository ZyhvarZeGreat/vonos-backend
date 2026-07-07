import type { CreateSalonServiceRequest, SalonService } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { appendListQuery, fetchTenantListPage } from "@/lib/api/listPageHelpers";

const LIST_PATH = "/salon-services";

async function fetchSalonServicesRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
): Promise<SalonService[]> {
  const tenantPath = withTenantQuery(LIST_PATH, tenantId);
  const url = appendListQuery(tenantPath, { cursor, limit });
  const response = await apiFetch(url);
  if (!response.ok) throw new Error("Failed to fetch services");
  return response.json();
}

export async function getSalonServicesPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<SalonService>> {
  return fetchTenantListPage(LIST_PATH, tenantId, cursor, limit);
}

/** Full service list for export — not for table rendering. */
export async function getAllSalonServices(tenantId: string): Promise<SalonService[]> {
  return fetchAllPages(
    (cursor, limit) => fetchSalonServicesRaw(tenantId, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

export async function getSalonServices(tenantId: string): Promise<SalonService[]> {
  return fetchFirstPage((cursor, limit) =>
    fetchSalonServicesRaw(tenantId, cursor, limit),
  );
}

export async function createSalonService(
  tenantId: string,
  body: CreateSalonServiceRequest,
): Promise<SalonService> {
  const path = withTenantQuery("/salon-services", tenantId);
  const response = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to create service");
  return response.json();
}
