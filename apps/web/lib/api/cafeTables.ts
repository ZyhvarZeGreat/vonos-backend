import type {
  CafeTable,
  CafeTableStatus,
  CreateCafeTableRequest,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";

export async function getCafeTables(tenantId: string): Promise<CafeTable[]> {
  const path = withTenantQuery("/cafe-tables", tenantId);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch tables");
  return response.json();
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
