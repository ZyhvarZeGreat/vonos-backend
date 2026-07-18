import type {
  CustomerGroup,
  CreateCustomerGroupRequest,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { appendListQuery, fetchTenantListPage } from "@/lib/api/listPageHelpers";

const LIST_PATH = "/customer-groups";

async function fetchCustomerGroupsRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
): Promise<CustomerGroup[]> {
  const tenantPath = withTenantQuery(LIST_PATH, tenantId);
  const url = appendListQuery(tenantPath, { cursor, limit });
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Failed to fetch customer groups");
  return res.json();
}

export async function getCustomerGroupsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  filters: { search?: string; discount?: 'has' | 'none' } = {},
): Promise<ListPage<CustomerGroup>> {
  return fetchTenantListPage(LIST_PATH, tenantId, cursor, limit, filters);
}

/** Full customer group list for export — not for table rendering. */
export async function getAllCustomerGroups(
  tenantId: string,
): Promise<CustomerGroup[]> {
  return fetchAllPages(
    (cursor, limit) => fetchCustomerGroupsRaw(tenantId, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

export async function getCustomerGroups(
  tenantId: string,
): Promise<CustomerGroup[]> {
  return fetchFirstPage((cursor, limit) =>
    fetchCustomerGroupsRaw(tenantId, cursor, limit),
  );
}

export async function createCustomerGroup(
  tenantId: string,
  dto: CreateCustomerGroupRequest,
): Promise<CustomerGroup> {
  const res = await apiFetch(withTenantQuery(LIST_PATH, tenantId), {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to create customer group");
  return res.json();
}

export async function deleteCustomerGroup(
  tenantId: string,
  id: string,
): Promise<void> {
  const res = await apiFetch(
    withTenantQuery(`/customer-groups/${id}`, tenantId),
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to delete customer group");
}
