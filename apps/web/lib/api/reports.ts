import type {
  ProfitLossBreakdownTab,
  ReportRunOptions,
  ReportsDashboard,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";

export type ReportRunMode = "shell" | "pl-core" | "pl-summary" | "pl-breakdown" | "full";

export async function getReportsDashboard(params: {
  tab: string;
  from?: string;
  to?: string;
  tenantId?: string;
}): Promise<ReportsDashboard> {
  const search = new URLSearchParams({ tab: params.tab });
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  const path = withTenantQuery(
    `/reports/dashboard?${search.toString()}`,
    params.tenantId,
  );
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch reports dashboard");
  return response.json();
}

export async function getGroupReports(params?: {
  from?: string;
  to?: string;
}): Promise<ReportsDashboard> {
  const search = new URLSearchParams();
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  const qs = search.toString();
  const response = await apiFetch(`/reports/group${qs ? `?${qs}` : ""}`);
  if (!response.ok) throw new Error("Failed to fetch group reports");
  return response.json();
}

export async function runReport(params: {
  reportId: string;
  from?: string;
  to?: string;
  tenantId?: string;
  mode?: ReportRunMode;
  breakdownTab?: ProfitLossBreakdownTab;
} & ReportRunOptions): Promise<ReportsDashboard> {
  const search = new URLSearchParams({ reportId: params.reportId });
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.mode) search.set("mode", params.mode);
  if (params.breakdownTab) search.set("breakdownTab", params.breakdownTab);
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.customerId) search.set("customerId", params.customerId);
  if (params.customerGroupId) search.set("customerGroupId", params.customerGroupId);
  if (params.locationCode) search.set("locationCode", params.locationCode);
  if (params.category) search.set("category", params.category);
  if (params.brandId) search.set("brandId", params.brandId);
  if (params.paymentMethod) search.set("paymentMethod", params.paymentMethod);
  if (params.supplierId) search.set("supplierId", params.supplierId);
  if (params.view) search.set("view", params.view);
  const path = withTenantQuery(`/reports/run?${search.toString()}`, params.tenantId);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to run report");
  return response.json();
}

export async function runGroupReport(params: {
  reportId: string;
  from?: string;
  to?: string;
}): Promise<ReportsDashboard> {
  const search = new URLSearchParams({ reportId: params.reportId });
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  const response = await apiFetch(`/reports/group/run?${search.toString()}`);
  if (!response.ok) throw new Error("Failed to run group report");
  return response.json();
}

/** @deprecated Use getReportsDashboard — kept for legacy callers during migration */
export async function getReportsSummary(): Promise<{
  totalSku: number;
  todayInbound: number;
  todayOutbound: number;
  stockValue: number;
  currency: string;
  totalUnits: number;
  avgTurnover: number;
  stockValuesLabel: string;
}> {
  const response = await apiFetch("/reports/summary");
  if (!response.ok) throw new Error("Failed to fetch reports summary");
  return response.json();
}
