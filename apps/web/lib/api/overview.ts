import type { GroupOverviewDashboard, OverviewDashboard, OverviewPanel } from "@vonos/types";
import { apiFetch } from "@/lib/api/client";

export async function getOverviewDashboard(params?: {
  from?: string;
  to?: string;
}): Promise<OverviewDashboard> {
  const search = new URLSearchParams();
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  const qs = search.toString();
  const response = await apiFetch(`/overview/dashboard${qs ? `?${qs}` : ""}`);
  if (!response.ok) throw new Error("Failed to fetch overview dashboard");
  return response.json();
}

export async function getGroupOverview(params?: {
  from?: string;
  to?: string;
}): Promise<GroupOverviewDashboard> {
  const search = new URLSearchParams();
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  const qs = search.toString();
  const response = await apiFetch(`/overview/group${qs ? `?${qs}` : ""}`);
  if (!response.ok) throw new Error("Failed to fetch group overview");
  return response.json();
}

export async function getStockAlertPanel(): Promise<OverviewPanel> {
  const response = await apiFetch("/overview/panels/stock-alert");
  if (!response.ok) throw new Error("Failed to fetch stock alert panel");
  return response.json();
}

export async function getPurchasePaymentDuesPanel(): Promise<OverviewPanel> {
  const response = await apiFetch("/overview/panels/purchase-payment-dues");
  if (!response.ok) throw new Error("Failed to fetch purchase dues panel");
  return response.json();
}

export async function getSalesPaymentDuesPanel(): Promise<OverviewPanel> {
  const response = await apiFetch("/overview/panels/sales-payment-dues");
  if (!response.ok) throw new Error("Failed to fetch sales dues panel");
  return response.json();
}
