import type { CreateRequisitionRequest, Requisition } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";

export async function getRequisitions(tenantId: string): Promise<Requisition[]> {
  const path = withTenantQuery("/requisitions", tenantId);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch requisitions");
  return response.json();
}

export async function createRequisition(
  tenantId: string,
  body: CreateRequisitionRequest,
): Promise<Requisition> {
  const path = withTenantQuery("/requisitions", tenantId);
  const response = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to create requisition");
  return response.json();
}
