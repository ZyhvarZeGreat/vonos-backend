import { apiFetch } from "@/lib/api/client";
import type { SupplierListRow } from "@vonos/types";

export type { SupplierListRow };

export interface SupplierKpiSummary {
  totalSuppliers: number;
  onTimeRate: number;
  avgLeadTimeDays: number;
  openPoValue: number;
  currency: string;
}

export async function getSuppliers(): Promise<SupplierListRow[]> {
  const response = await apiFetch("/suppliers");
  if (!response.ok) throw new Error("Failed to fetch suppliers");
  return response.json();
}

export async function getSupplierKpis(): Promise<SupplierKpiSummary> {
  const response = await apiFetch("/suppliers/kpi-summary");
  if (!response.ok) throw new Error("Failed to fetch supplier KPIs");
  return response.json();
}

export async function getSupplier(id: string): Promise<SupplierListRow> {
  const response = await apiFetch(`/suppliers/${id}`);
  if (!response.ok) throw new Error("Failed to fetch supplier");
  return response.json();
}

export interface CreateSupplierRequest {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  locationCode?: string;
  notes?: string;
}

export type UpdateSupplierRequest = Partial<CreateSupplierRequest>;

export async function createSupplier(body: CreateSupplierRequest): Promise<SupplierListRow> {
  const response = await apiFetch("/suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to create supplier");
  return response.json();
}

export async function updateSupplier(
  id: string,
  body: UpdateSupplierRequest,
): Promise<SupplierListRow> {
  const response = await apiFetch(`/suppliers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to update supplier");
  return response.json();
}
