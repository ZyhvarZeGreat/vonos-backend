import type { Vehicle } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";

export async function getVehicles(tenantId: string): Promise<Vehicle[]> {
  const path = withTenantQuery("/vehicles", tenantId);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch vehicles");
  return response.json();
}

export async function getVehicle(id: string): Promise<Vehicle> {
  const response = await apiFetch(`/vehicles/${id}`);
  if (!response.ok) throw new Error("Failed to fetch vehicle");
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
