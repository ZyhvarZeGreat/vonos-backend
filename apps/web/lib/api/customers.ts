import type {
  ContactDueSummary,
  ContactLedgerEntry,
  CreateCustomerInput,
  Customer,
  CustomerContact,
  CustomerFilters,
  CustomerProfile,
  CsvImportResult,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  TYPEAHEAD_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  fetchListPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { customerListCursor } from "@/lib/utils/pagination";

async function fetchCustomersRaw(
  tenantId: string,
  filters: CustomerFilters | undefined,
  cursor?: string,
  limit?: number,
): Promise<Customer[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.sellDue) params.set("sellDue", "true");
  if (filters?.sellReturn) params.set("sellReturn", "true");
  if (filters?.advanceBalance) params.set("advanceBalance", "true");
  if (filters?.openingBalance) params.set("openingBalance", "true");
  if (filters?.hasNoSellMonths) {
    params.set("hasNoSellMonths", String(filters.hasNoSellMonths));
  }
  if (filters?.customerGroupId) params.set("customerGroupId", filters.customerGroupId);
  if (filters?.assignedToUserId) params.set("assignedToUserId", filters.assignedToUserId);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
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
    customerListCursor,
  );
}

/** Typeahead / option lists — capped; pass search for more matches. */
export async function getCustomers(
  tenantId: string,
  filters?: CustomerFilters,
): Promise<Customer[]> {
  if (filters?.cursor || filters?.limit) {
    return fetchCustomersRaw(tenantId, filters, filters.cursor, filters.limit);
  }

  return fetchFirstPage(
    (cursor, limit) => fetchCustomersRaw(tenantId, filters, cursor, limit),
    TYPEAHEAD_PAGE_SIZE,
  );
}

export async function getCustomer(id: string): Promise<CustomerProfile> {
  const response = await apiFetch(`/customers/${id}`);
  if (!response.ok) throw new Error("Failed to fetch customer");
  return response.json();
}

/** Name / email / phone / due — no transaction history. Prefer for forms and titles. */
export async function getCustomerContact(id: string): Promise<CustomerContact> {
  const response = await apiFetch(`/customers/${id}/contact`);
  if (!response.ok) throw new Error("Failed to fetch customer contact");
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

export async function getCustomerSummary(
  tenantId: string,
  customerId: string,
): Promise<ContactDueSummary> {
  const response = await apiFetch(
    withTenantQuery(`/customers/${customerId}/summary`, tenantId),
  );
  if (!response.ok) throw new Error("Failed to fetch customer summary");
  return response.json();
}

export async function getCustomerLedger(
  tenantId: string,
  customerId: string,
): Promise<ContactLedgerEntry[]> {
  const response = await apiFetch(
    withTenantQuery(`/customers/${customerId}/ledger`, tenantId),
  );
  if (!response.ok) throw new Error("Failed to fetch customer ledger");
  return response.json();
}

export async function importCustomers(
  tenantId: string,
  csv: string,
): Promise<CsvImportResult> {
  const response = await apiFetch(withTenantQuery("/customers/import", tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csv }),
  });
  if (!response.ok) throw new Error("Failed to import customers");
  return response.json();
}
