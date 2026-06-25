import type { Customer, CustomerFilters } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import { DEFAULT_LIST_LIMIT, fetchAllPages } from "@/lib/api/fetchAllPages";

export async function getCustomers(
  tenantId: string,
  filters?: CustomerFilters,
): Promise<Customer[]> {
  if (filters?.cursor || filters?.limit) {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.cursor) params.set("cursor", filters.cursor);
    if (filters?.limit) params.set("limit", String(filters.limit));
    const query = params.toString();
    const path = withTenantQuery(
      query ? `/customers?${query}` : "/customers",
      tenantId,
    );
    const response = await apiFetch(path);
    if (!response.ok) throw new Error("Failed to fetch customers");
    return response.json();
  }

  return fetchAllPages(async (cursor, limit) => {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (cursor) params.set("cursor", cursor);
    params.set("limit", String(limit ?? DEFAULT_LIST_LIMIT));
    const path = withTenantQuery(`/customers?${params}`, tenantId);
    const response = await apiFetch(path);
    if (!response.ok) throw new Error("Failed to fetch customers");
    return response.json();
  });
}

export async function getCustomer(id: string): Promise<Customer> {
  const response = await apiFetch(`/customers/${id}`);
  if (!response.ok) throw new Error("Failed to fetch customer");
  return response.json();
}
