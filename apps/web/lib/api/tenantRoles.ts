import type {
  CreateTenantRoleRequest,
  ImportTenantRolesRequest,
  TenantRole,
  UpdateTenantRoleRequest,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import { throwApiError } from "@/lib/api/parseApiError";
import { clearEmployeeOptionCache } from "@/lib/api/hrm";

export async function getTenantRoles(
  tenantId: string,
  options?: { search?: string },
): Promise<TenantRole[]> {
  const params = new URLSearchParams();
  if (options?.search?.trim()) params.set("search", options.search.trim());
  const query = params.toString();
  const base = query ? `/tenant-roles?${query}` : "/tenant-roles";
  const response = await apiFetch(withTenantQuery(base, tenantId));
  if (!response.ok) {
    throw new Error("Failed to fetch roles");
  }
  return response.json();
}

export async function getTenantRole(
  tenantId: string,
  id: string,
): Promise<TenantRole> {
  const response = await apiFetch(
    withTenantQuery(`/tenant-roles/${id}`, tenantId),
  );
  if (!response.ok) {
    throw new Error("Failed to fetch role");
  }
  return response.json();
}

export async function createTenantRole(
  tenantId: string,
  payload: CreateTenantRoleRequest,
): Promise<TenantRole> {
  const response = await apiFetch(withTenantQuery("/tenant-roles", tenantId), {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    return throwApiError(response, "Failed to create role");
  }
  clearEmployeeOptionCache();
  return response.json();
}

export async function updateTenantRole(
  tenantId: string,
  id: string,
  payload: UpdateTenantRoleRequest,
): Promise<TenantRole> {
  const response = await apiFetch(
    withTenantQuery(`/tenant-roles/${id}`, tenantId),
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    return throwApiError(response, "Failed to update role");
  }
  clearEmployeeOptionCache();
  return response.json();
}

export async function deleteTenantRole(
  tenantId: string,
  id: string,
): Promise<void> {
  const response = await apiFetch(
    withTenantQuery(`/tenant-roles/${id}`, tenantId),
    { method: "DELETE" },
  );
  if (!response.ok) {
    return throwApiError(response, "Failed to delete role");
  }
  clearEmployeeOptionCache();
}

export async function importTenantRoles(
  tenantId: string,
  payload: ImportTenantRolesRequest,
): Promise<TenantRole[]> {
  const response = await apiFetch(
    withTenantQuery("/tenant-roles/import", tenantId),
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    return throwApiError(response, "Failed to import roles");
  }
  return response.json();
}
