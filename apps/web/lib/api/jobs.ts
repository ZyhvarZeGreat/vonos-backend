import type { Job } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  fetchListPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";

export interface JobDetail extends Job {
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
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

async function fetchJobsRaw(
  tenantId: string,
  filters: JobFilters | undefined,
  cursor?: string,
  limit?: number,
): Promise<Job[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));
  const query = params.toString();
  const path = withTenantQuery(query ? `/jobs?${query}` : "/jobs", tenantId);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch jobs");
  return response.json();
}

export async function getJobsPage(
  tenantId: string,
  filters: JobFilters | undefined,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<Job>> {
  return fetchListPage(
    (pageCursor, pageLimit) => fetchJobsRaw(tenantId, filters, pageCursor, pageLimit),
    cursor,
    limit,
  );
}

/** Full job list for export — not for table rendering. */
export async function getAllJobs(
  tenantId: string,
  filters?: JobFilters,
): Promise<Job[]> {
  return fetchAllPages(
    (cursor, limit) => fetchJobsRaw(tenantId, filters, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

export async function getJobs(
  tenantId: string,
  filters?: JobFilters,
): Promise<Job[]> {
  if (filters?.cursor || filters?.limit) {
    return fetchJobsRaw(tenantId, filters, filters.cursor, filters.limit);
  }

  return fetchFirstPage(
    (cursor, limit) => fetchJobsRaw(tenantId, filters, cursor, limit),
  );
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

export interface UpdateJobBillingRequest {
  hasQuote?: boolean;
  quoteAmount?: number | null;
  quoteNotes?: string | null;
  quoteValidUntil?: string | null;
  invoiceAmount?: number | null;
  invoiceNotes?: string | null;
}

export async function updateJobBilling(
  id: string,
  body: UpdateJobBillingRequest,
): Promise<JobDetail> {
  const response = await apiFetch(`/jobs/${id}/billing`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to update job billing");
  return response.json();
}

export async function updateJob(
  id: string,
  body: Partial<CreateJobRequest>,
): Promise<Job> {
  const response = await apiFetch(`/jobs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to update job");
  return response.json();
}
