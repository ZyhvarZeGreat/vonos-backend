import type { Job } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import { DEFAULT_LIST_LIMIT, fetchAllPages } from "@/lib/api/fetchAllPages";

export interface JobDetail extends Job {
  materials: Array<{
    id: string;
    jobId: string;
    itemId: string | null;
    name: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    source: string | null;
  }>;
  labourEntries: Array<{
    id: string;
    jobId: string;
    staffId: string;
    staffName?: string | null;
    hours: number;
    rate: number;
    totalCost: number;
  }>;
}

export interface JobFilters {
  status?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export async function getJobs(
  tenantId: string,
  filters?: JobFilters,
): Promise<Job[]> {
  if (filters?.cursor || filters?.limit) {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.cursor) params.set("cursor", filters.cursor);
    if (filters?.limit) params.set("limit", String(filters.limit));
    const query = params.toString();
    const path = withTenantQuery(
      query ? `/jobs?${query}` : "/jobs",
      tenantId,
    );
    const response = await apiFetch(path);
    if (!response.ok) throw new Error("Failed to fetch jobs");
    return response.json();
  }

  return fetchAllPages(async (cursor, limit) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.search) params.set("search", filters.search);
    if (cursor) params.set("cursor", cursor);
    params.set("limit", String(limit ?? DEFAULT_LIST_LIMIT));
    const path = withTenantQuery(`/jobs?${params}`, tenantId);
    const response = await apiFetch(path);
    if (!response.ok) throw new Error("Failed to fetch jobs");
    return response.json();
  });
}

export async function getJob(id: string): Promise<JobDetail> {
  const response = await apiFetch(`/jobs/${id}`);
  if (!response.ok) throw new Error("Failed to fetch job");
  return response.json();
}

export interface CreateJobRequest {
  reference: string;
  description: string;
  customerName?: string;
  vehicleId?: string;
  locationCode?: string;
  hasQuote?: boolean;
  quoteAmount?: number;
  dueDate?: string;
}

export async function createJob(
  tenantId: string,
  body: CreateJobRequest,
): Promise<Job> {
  const path = withTenantQuery("/jobs", tenantId);
  const response = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to create job");
  return response.json();
}

export async function advanceJobStatus(id: string): Promise<Job> {
  const response = await apiFetch(`/jobs/${id}/status`, { method: "PATCH" });
  if (!response.ok) throw new Error("Failed to advance job status");
  return response.json();
}
