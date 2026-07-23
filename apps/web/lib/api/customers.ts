import type {
  ContactDueSummary,
  ContactLedgerEntry,
  CreateCustomerInput,
  Customer,
  CustomerContact,
  CustomerFilters,
  CustomerProfile,
  CustomerViewBundle,
  CsvImportResult,
  PayContactDueRequest,
  PayContactDueResult,
  UpdateCustomerInput,
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
): Promise<Customer[] | { items: Customer[]; totalCount: number }> {
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
  if (filters?.includeSummary === false) params.set("includeSummary", "0");
  else if (filters?.includeSummary === true) params.set("includeSummary", "1");
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
      fetchCustomersRaw(
        tenantId,
        { ...filters, includeSummary: filters?.includeSummary ?? false },
        pageCursor,
        pageLimit,
      ),
    cursor,
    limit,
  );
}

/** Count + amountSummary only (limit=1) — pair with rows-first getCustomersPage. */
export async function getCustomersListSummary(
  tenantId: string,
  filters?: CustomerFilters,
): Promise<Pick<ListPage<Customer>, "totalCount" | "amountSummary">> {
  const page = await getCustomersPage(
    tenantId,
    { ...filters, includeSummary: true },
    undefined,
    1,
  );
  return { totalCount: page.totalCount, amountSummary: page.amountSummary };
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
    const payload = await fetchCustomersRaw(
      tenantId,
      filters,
      filters.cursor,
      filters.limit,
    );
    return Array.isArray(payload) ? payload : payload.items;
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

export async function updateCustomer(
  tenantId: string,
  id: string,
  input: UpdateCustomerInput,
): Promise<Customer> {
  const response = await apiFetch(withTenantQuery(`/customers/${id}`, tenantId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Failed to update customer");
  }
  return response.json();
}

export async function setCustomerStatus(
  tenantId: string,
  id: string,
  status: "active" | "inactive",
): Promise<Customer> {
  const response = await apiFetch(
    withTenantQuery(`/customers/${id}/status`, tenantId),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Failed to update customer status");
  }
  return response.json();
}

export async function deleteCustomer(tenantId: string, id: string): Promise<void> {
  const response = await apiFetch(withTenantQuery(`/customers/${id}`, tenantId), {
    method: "DELETE",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Failed to delete customer");
  }
}

export async function payCustomerDue(
  tenantId: string,
  id: string,
  input: PayContactDueRequest,
): Promise<PayContactDueResult> {
  const response = await apiFetch(
    withTenantQuery(`/customers/${id}/pay-due`, tenantId),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Failed to record payment");
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

/** Customer modal bundle: contact + summary + ledger (one round-trip). */
export async function getCustomerView(
  tenantId: string,
  customerId: string,
): Promise<CustomerViewBundle> {
  const response = await apiFetch(
    withTenantQuery(`/customers/${customerId}/view`, tenantId),
  );
  if (!response.ok) throw new Error("Failed to fetch customer view");
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
