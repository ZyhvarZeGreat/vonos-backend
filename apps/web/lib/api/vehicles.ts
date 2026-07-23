import type { Vehicle, VehicleJobHistoryEntry } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { appendListQuery, fetchTenantListPage } from "@/lib/api/listPageHelpers";

const LIST_PATH = "/vehicles";

async function fetchVehiclesRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
): Promise<Vehicle[]> {
  const tenantPath = withTenantQuery(LIST_PATH, tenantId);
  const url = appendListQuery(tenantPath, { cursor, limit });
  const response = await apiFetch(url);
  if (!response.ok) throw new Error("Failed to fetch vehicles");
  return response.json();
}

export async function getVehiclesPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  filters: { search?: string; make?: string; includeSummary?: boolean } = {},
): Promise<ListPage<Vehicle>> {
  return fetchTenantListPage(LIST_PATH, tenantId, cursor, limit, {
    ...filters,
    includeSummary: filters.includeSummary ?? false,
  });
}

/** Full vehicle list for export — not for table rendering. */
export async function getAllVehicles(tenantId: string): Promise<Vehicle[]> {
  return fetchAllPages(
    (cursor, limit) => fetchVehiclesRaw(tenantId, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

export async function getVehicles(tenantId: string): Promise<Vehicle[]> {
  return fetchFirstPage((cursor, limit) =>
    fetchVehiclesRaw(tenantId, cursor, limit),
  );
}

export async function getVehicle(id: string): Promise<Vehicle> {
  const response = await apiFetch(`/vehicles/${id}`);
  if (!response.ok) throw new Error("Failed to fetch vehicle");
  return response.json();
}

export async function getVehicleHistory(id: string): Promise<VehicleJobHistoryEntry[]> {
  const response = await apiFetch(`/vehicles/${id}/history`);
  if (!response.ok) throw new Error("Failed to fetch vehicle history");
  return response.json();
}

export async function createVehicle(
  tenantId: string,
  body: Omit<Vehicle, "id" | "tenantId" | "createdAt" | "updatedAt">,
): Promise<Vehicle> {
  const path = withTenantQuery("/vehicles", tenantId);
  const response = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to create vehicle");
  return response.json();
}

export async function updateVehicle(
  tenantId: string,
  id: string,
  body: Partial<
    Pick<Vehicle, "plateNumber" | "vin" | "make" | "model" | "year" | "ownerName" | "ownerPhone">
  >,
): Promise<Vehicle> {
  const path = withTenantQuery(`/vehicles/${id}`, tenantId);
  const response = await apiFetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to update vehicle");
  return response.json();
}
