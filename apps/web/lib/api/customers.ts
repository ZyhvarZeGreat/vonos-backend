import type { CreateCustomerInput, Customer, CustomerFilters, CustomerProfile } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  fetchListPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";

async function fetchCustomersRaw(
  tenantId: string,
  filters: CustomerFilters | undefined,
  cursor?: string,
  limit?: number,
): Promise<Customer[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));
  const query = params.toString();
  const path = withTenantQuery(
    query ? `/customers?${query}` : "/customers",
    tenantId,
  );
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch customers");
  return response.json();
}

export async function getCustomersPage(
  tenantId: string,
  filters: CustomerFilters | undefined,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<Customer>> {
  return fetchListPage(
    (pageCursor, pageLimit) =>
      fetchCustomersRaw(tenantId, filters, pageCursor, pageLimit),
    cursor,
    limit,
  );
}

/** Full customer list for export — not for table rendering. */
export async function getAllCustomers(
  tenantId: string,
  filters?: CustomerFilters,
): Promise<Customer[]> {
  return fetchAllPages(
    (cursor, limit) => fetchCustomersRaw(tenantId, filters, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

export async function getCustomers(
  tenantId: string,
  filters?: CustomerFilters,
): Promise<Customer[]> {
  if (filters?.cursor || filters?.limit) {
    return fetchCustomersRaw(tenantId, filters, filters.cursor, filters.limit);
  }

  return fetchFirstPage(
    (cursor, limit) => fetchCustomersRaw(tenantId, filters, cursor, limit),
  );
}

export async function getCustomer(id: string): Promise<CustomerProfile> {
  const response = await apiFetch(`/customers/${id}`);
  if (!response.ok) throw new Error("Failed to fetch customer");
  return response.json();
}

export async function createCustomer(
  tenantId: string,
  input: CreateCustomerInput,
): Promise<Customer> {
  const response = await apiFetch(withTenantQuery("/customers", tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Failed to create customer");
  }
  return response.json();
}
