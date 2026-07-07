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
): Promise<ListPage<Requisition>> {
  return fetchTenantListPage(LIST_PATH, tenantId, cursor, limit);
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
  action: "approve" | "reject" | "fulfill",
): Promise<Requisition> {
  const path = withTenantQuery(`/requisitions/${id}/${action}`, tenantId);
  const response = await apiFetch(path, { method: "POST" });
  if (!response.ok) throw new Error(`Failed to ${action} requisition`);
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
