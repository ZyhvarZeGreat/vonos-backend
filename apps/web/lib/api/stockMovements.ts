import type { MovementSource, MovementStatus, MovementType, StockMovement } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";

export interface StockMovementListRow {
  id: string;
  reference: string;
  supplierOrDest: string;
  itemCount: number;
  status: MovementStatus;
  date: string;
}

export interface StockMovementFilters {
  type?: MovementType;
  status?: MovementStatus;
  source?: MovementSource;
  cursor?: string;
  limit?: number;
}

export async function getStockMovements(
  tenantId: string,
  filters: StockMovementFilters,
): Promise<StockMovementListRow[]> {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.status) params.set("status", filters.status);
  if (filters.source) params.set("source", filters.source);
  if (filters.cursor) params.set("cursor", filters.cursor);
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  const path = withTenantQuery(
    query ? `/stock-movements?${query}` : "/stock-movements",
    tenantId,
  );
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch stock movements");
  return response.json();
}

export async function getStockMovement(id: string): Promise<StockMovement> {
  const response = await apiFetch(`/stock-movements/${id}`);
  if (!response.ok) throw new Error("Failed to fetch stock movement");
  return response.json();
}

export interface CreateStockMovementRequest {
  type: MovementType;
  reference: string;
  status?: MovementStatus;
  lines: Array<{ itemId: string; sku: string; name: string; quantity: number; unitCost?: number }>;
  notes?: string;
  supplierId?: string;
  source?: MovementSource;
  locationCode?: string;
  date?: string;
}

export async function createStockMovement(
  tenantId: string,
  body: CreateStockMovementRequest,
): Promise<StockMovement> {
  const path = withTenantQuery("/stock-movements", tenantId);
  const response = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to create movement");
  }
  return response.json();
}

export async function updateStockMovementStatus(
  id: string,
  status: MovementStatus,
): Promise<StockMovement> {
  const response = await apiFetch(`/stock-movements/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error("Failed to update movement status");
  return response.json();
}
