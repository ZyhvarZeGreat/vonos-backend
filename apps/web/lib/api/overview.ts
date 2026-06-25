import type { GroupOverviewDashboard, OverviewDashboard } from "@vonos/types";
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
