import type {
  CreateJobLabourRequest,
  CreateJobMaterialRequest,
  Job,
  JobLabour,
  JobMaterial,
  UpdateJobLabourRequest,
  UpdateJobMaterialRequest,
} from "@vonos/types";
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
    totalSellDue?: number | null;
  } | null;
  vehicle?: {
    id: string;
    plateNumber: string;
    make: string;
    model: string;
    year: number | null;
  } | null;
  materials: JobMaterial[];
  labourEntries: JobLabour[];
}

export interface JobFilters {
  status?: string;
  /** Comma-joined multi-status filter (e.g. active jobs). */
  statuses?: string[];
  search?: string;
  from?: string;
  to?: string;
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
  if (filters?.statuses?.length) params.set("statuses", filters.statuses.join(","));
  if (filters?.search) params.set("search", filters.search);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
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

/** Header + customer/vehicle without materials/labour. */
export async function getJobShell(id: string): Promise<JobDetail> {
  const response = await apiFetch(`/jobs/${id}/shell`);
  if (!response.ok) throw new Error("Failed to fetch job");
  return response.json();
}

export async function getJobCosts(
  id: string,
): Promise<{ materials: JobDetail["materials"]; labourEntries: JobDetail["labourEntries"] }> {
  const response = await apiFetch(`/jobs/${id}/costs`);
  if (!response.ok) throw new Error("Failed to fetch job costs");
  return response.json();
}

/** Reference only — for titles / breadcrumbs. */
export async function getJobMeta(
  id: string,
): Promise<{ id: string; reference: string }> {
  const response = await apiFetch(`/jobs/${id}/meta`);
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

export async function linkJobVehicle(
  jobId: string,
  vehicleId: string | null,
): Promise<JobDetail> {
  const response = await apiFetch(`/jobs/${jobId}/vehicle`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicleId }),
  });
  if (!response.ok) throw new Error("Failed to update job vehicle");
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

export async function updateJobQc(
  id: string,
  body: {
    qcChecklist?: Record<string, boolean> | null;
    qcNotes?: string | null;
  },
): Promise<JobDetail> {
  const response = await apiFetch(`/jobs/${id}/qc`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to update QC");
  return response.json();
}

export async function addJobMaterial(
  jobId: string,
  body: CreateJobMaterialRequest,
): Promise<JobDetail> {
  const response = await apiFetch(`/jobs/${jobId}/materials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to add material");
  return response.json();
}

export async function updateJobMaterial(
  jobId: string,
  materialId: string,
  body: UpdateJobMaterialRequest,
): Promise<JobDetail> {
  const response = await apiFetch(`/jobs/${jobId}/materials/${materialId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to update material");
  return response.json();
}

export async function removeJobMaterial(
  jobId: string,
  materialId: string,
): Promise<JobDetail> {
  const response = await apiFetch(`/jobs/${jobId}/materials/${materialId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to remove material");
  return response.json();
}

export async function addJobLabour(
  jobId: string,
  body: CreateJobLabourRequest,
): Promise<JobDetail> {
  const response = await apiFetch(`/jobs/${jobId}/labour`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to add labour");
  return response.json();
}

export async function updateJobLabour(
  jobId: string,
  labourId: string,
  body: UpdateJobLabourRequest,
): Promise<JobDetail> {
  const response = await apiFetch(`/jobs/${jobId}/labour/${labourId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to update labour");
  return response.json();
}

export async function removeJobLabour(
  jobId: string,
  labourId: string,
): Promise<JobDetail> {
  const response = await apiFetch(`/jobs/${jobId}/labour/${labourId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to remove labour");
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
