import { parseTenantConfig, type TenantConfig, type UpdateTenantConfigRequest } from "@vonos/types";
import { apiFetch } from "@/lib/api/client";

export async function getTenantConfig(tenantId: string): Promise<TenantConfig> {
  const response = await apiFetch(`/tenants/${tenantId}/config`);
  if (!response.ok) throw new Error("Failed to fetch tenant config");
  const data: unknown = await response.json();
  return parseTenantConfig(data);
}

export async function updateTenantConfig(
  tenantId: string,
  patch: UpdateTenantConfigRequest,
): Promise<TenantConfig> {
  const response = await apiFetch(`/tenants/${tenantId}/config`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error("Failed to save tenant settings");
  const data: unknown = await response.json();
  return parseTenantConfig(data);
}
