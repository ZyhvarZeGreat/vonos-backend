import type { CreateSalonServiceRequest, SalonService } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";

export async function getSalonServices(tenantId: string): Promise<SalonService[]> {
  const path = withTenantQuery("/salon-services", tenantId);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch services");
  return response.json();
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
