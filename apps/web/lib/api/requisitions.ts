import type { CreateRequisitionRequest, Requisition } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { appendListQuery, fetchTenantListPage } from "@/lib/api/listPageHelpers";

const LIST_PATH = "/requisitions";

async function fetchRequisitionsRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
): Promise<Requisition[]> {
  const tenantPath = withTenantQuery(LIST_PATH, tenantId);
  const url = appendListQuery(tenantPath, { cursor, limit });
  const response = await apiFetch(url);
  if (!response.ok) throw new Error("Failed to fetch requisitions");
  return response.json();
}

export async function getRequisitionsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  filters: { search?: string; includeSummary?: boolean } = {},
): Promise<ListPage<Requisition>> {
  return fetchTenantListPage(LIST_PATH, tenantId, cursor, limit, {
    ...filters,
    includeSummary: filters.includeSummary ?? false,
  });
}

/** Full requisition list for export — not for table rendering. */
export async function getAllRequisitions(tenantId: string): Promise<Requisition[]> {
  return fetchAllPages(
    (cursor, limit) => fetchRequisitionsRaw(tenantId, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

export async function getRequisitions(tenantId: string): Promise<Requisition[]> {
  return fetchFirstPage((cursor, limit) =>
    fetchRequisitionsRaw(tenantId, cursor, limit),
  );
}

export async function getRequisition(
  tenantId: string,
  id: string,
): Promise<Requisition> {
  const path = withTenantQuery(`/requisitions/${id}`, tenantId);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch requisition");
  return response.json();
}

const INCOMING_PATH = "/requisitions/incoming";

async function fetchIncomingRequisitionsRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
): Promise<Requisition[]> {
  const tenantPath = withTenantQuery(INCOMING_PATH, tenantId);
  const url = appendListQuery(tenantPath, { cursor, limit });
  const response = await apiFetch(url);
  if (!response.ok) throw new Error("Failed to fetch incoming requisitions");
  return response.json();
}

export async function getIncomingRequisitionsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  filters: { search?: string; includeSummary?: boolean } = {},
): Promise<ListPage<Requisition>> {
  return fetchTenantListPage(INCOMING_PATH, tenantId, cursor, limit, {
    ...filters,
    includeSummary: filters.includeSummary ?? false,
  });
}

export async function getAllIncomingRequisitions(
  tenantId: string,
): Promise<Requisition[]> {
  return fetchAllPages(
    (cursor, limit) => fetchIncomingRequisitionsRaw(tenantId, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
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

async function transitionRequisition(
  tenantId: string,
  id: string,
  action: "approve" | "reject" | "fulfill" | "cancel",
): Promise<Requisition> {
  const path = withTenantQuery(`/requisitions/${id}/${action}`, tenantId);
  const response = await apiFetch(path, { method: "POST" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;
    throw new Error(message || `Failed to ${action} requisition`);
  }
  return response.json();
}

export function approveRequisition(
  tenantId: string,
  id: string,
): Promise<Requisition> {
  return transitionRequisition(tenantId, id, "approve");
}

export function rejectRequisition(
  tenantId: string,
  id: string,
): Promise<Requisition> {
  return transitionRequisition(tenantId, id, "reject");
}

/** Fulfils an approved requisition as a warehouse-first stock transfer. */
export function fulfillRequisition(
  tenantId: string,
  id: string,
): Promise<Requisition> {
  return transitionRequisition(tenantId, id, "fulfill");
}

/** Requesting tenant cancels a Pending requisition. */
export function cancelRequisition(
  tenantId: string,
  id: string,
): Promise<Requisition> {
  return transitionRequisition(tenantId, id, "cancel");
}
