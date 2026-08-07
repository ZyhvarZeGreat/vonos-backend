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
import { throwApiError } from "@/lib/api/parseApiError";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  FILTER_DROPDOWN_INITIAL_LIMIT,
  FILTER_ROSTER_TTL_MS,
  IN_MEMORY_FILTER_CATALOG_LIMIT,
  TYPEAHEAD_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  fetchListPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { createAccumulatingPicker } from "@/lib/api/accumulatingPicker";
import { customerListCursor } from "@/lib/utils/pagination";
import { createAsyncTtlCache } from "@/lib/utils/asyncTtlCache";

/**
 * Picker option cache — search result pages; cleared on mutations.
 */
const customerOptionCache = createAsyncTtlCache<Customer[]>({
  ttlMs: FILTER_ROSTER_TTL_MS,
  maxEntries: 128,
});

type CustomerPicker = ReturnType<typeof createAccumulatingPicker<Customer>>;
const customerPickers = new Map<string, CustomerPicker>();

function customerPickerFor(tenantId: string): CustomerPicker {
  let picker = customerPickers.get(tenantId);
  if (!picker) {
    picker = createAccumulatingPicker<Customer>({
      getCursor: (row) => customerListCursor(row, "createdAt"),
      searchKeys: ["name", "businessName", "phone", "email", "contactId"],
      fetchPage: (cursor, limit, search) =>
        fetchListPage(
          (pageCursor, pageLimit) =>
            fetchCustomersRaw(
              tenantId,
              {
                search: search || undefined,
                includeSummary: false,
                lite: true,
                sortBy: "createdAt",
                sortDir: "desc",
              },
              pageCursor,
              pageLimit,
            ),
          cursor,
          limit,
        ),
    });
    customerPickers.set(tenantId, picker);
  }
  return picker;
}

async function fetchCustomersRaw(
  tenantId: string,
  filters: CustomerFilters | undefined,
  cursor?: string,
  limit?: number,
  signal?: AbortSignal,
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
  if (filters?.assignedToEmployeeId)
    params.set("assignedToEmployeeId", filters.assignedToEmployeeId);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.includeSummary === false) params.set("includeSummary", "0");
  else if (filters?.includeSummary === true) params.set("includeSummary", "1");
  if (filters?.lite) params.set("lite", "1");
  if (filters?.sortBy) params.set("sortBy", filters.sortBy);
  if (filters?.sortDir) params.set("sortDir", filters.sortDir);
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));
  const query = params.toString();
  const path = withTenantQuery(
    query ? `/customers?${query}` : "/customers",
    tenantId,
  );
  const response = await apiFetch(path, signal ? { signal } : undefined);
  if (!response.ok) throw new Error("Failed to fetch customers");
  return response.json();
}

export async function getCustomersPage(
  tenantId: string,
  filters: CustomerFilters | undefined,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  init?: { signal?: AbortSignal },
): Promise<ListPage<Customer>> {
  return fetchListPage(
    (pageCursor, pageLimit) =>
      fetchCustomersRaw(
        tenantId,
        { ...filters, includeSummary: filters?.includeSummary ?? false },
        pageCursor,
        pageLimit,
        init?.signal,
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

/**
 * Full customer roster for export / admin — not for filter dropdowns.
 * Capped at IN_MEMORY_FILTER_CATALOG_LIMIT.
 */
export async function getCustomerRoster(tenantId: string): Promise<Customer[]> {
  const cacheKey = JSON.stringify(["customer-roster", tenantId]);
  return customerOptionCache.get(cacheKey, async () =>
    fetchAllPages(
      (cursor, limit) =>
        fetchCustomersRaw(
          tenantId,
          { includeSummary: false, lite: true },
          cursor,
          limit,
        ),
      Math.min(EXPORT_PAGE_SIZE, IN_MEMORY_FILTER_CATALOG_LIMIT),
      customerListCursor,
      IN_MEMORY_FILTER_CATALOG_LIMIT,
    ),
  );
}

/**
 * Customer filter/picker — first ~80, then scroll for more batches.
 * Search matches loaded rows first; if none, fetches from the API.
 */
export async function getCustomersForPicker(
  tenantId: string,
  search?: string,
  _opts?: { limit?: number },
): Promise<Customer[]> {
  const page = await customerPickerFor(tenantId).load(tenantId, search);
  return page.items;
}

/** Next batch while scrolling the customer filter dropdown. */
export async function loadMoreCustomersForPicker(
  tenantId: string,
): Promise<{ items: Customer[]; appended: Customer[]; hasMore: boolean }> {
  return customerPickerFor(tenantId).loadMore(tenantId);
}

export function customersPickerHasMore(tenantId: string): boolean {
  return customerPickerFor(tenantId).hasMore(tenantId);
}

/** Typeahead / option lists — capped; pass search for more matches. */
export async function getCustomers(
  tenantId: string,
  filters?: CustomerFilters,
): Promise<Customer[]> {
  // Option lists never render totals or the legacy Contact ID — skip both the
  // count + amount aggregate and the legacy-id resolution round-trip.
  const typeaheadFilters: CustomerFilters = {
    ...filters,
    includeSummary: false,
    lite: true,
  };

  // Roster + match-sorter for dumps and search (no per-keystroke Neon).
  // Cursor / group / due filters stay on the server.
  const plainPicker =
    !typeaheadFilters.cursor &&
    !typeaheadFilters.customerGroupId &&
    !typeaheadFilters.assignedToEmployeeId &&
    !typeaheadFilters.status &&
    !typeaheadFilters.sellDue &&
    !typeaheadFilters.sellReturn &&
    !typeaheadFilters.advanceBalance &&
    !typeaheadFilters.openingBalance;

  if (plainPicker) {
    return getCustomersForPicker(tenantId, typeaheadFilters.search, {
      limit: typeaheadFilters.limit ?? FILTER_DROPDOWN_INITIAL_LIMIT,
    });
  }

  const cacheKey = JSON.stringify([
    "typeahead",
    tenantId,
    typeaheadFilters.search ?? "",
    typeaheadFilters.limit ?? TYPEAHEAD_PAGE_SIZE,
    typeaheadFilters.cursor ?? "",
    typeaheadFilters.customerGroupId ?? "",
    typeaheadFilters.assignedToEmployeeId ?? "",
    typeaheadFilters.status ?? "",
  ]);

  return customerOptionCache.get(cacheKey, async () => {
    if (typeaheadFilters.cursor || typeaheadFilters.limit) {
      const payload = await fetchCustomersRaw(
        tenantId,
        typeaheadFilters,
        typeaheadFilters.cursor,
        typeaheadFilters.limit,
      );
      return Array.isArray(payload) ? payload : payload.items;
    }

    return fetchFirstPage(
      (cursor, limit) =>
        fetchCustomersRaw(tenantId, typeaheadFilters, cursor, limit),
      TYPEAHEAD_PAGE_SIZE,
    );
  });
}

/** Drop cached typeahead option lists (call after creating/editing a customer). */
export function clearCustomerOptionCache(): void {
  customerOptionCache.clear();
  for (const picker of customerPickers.values()) picker.clearAll();
  customerPickers.clear();
}

/** Profile shell — denormalized totals, empty transactionHistory (fast). */
export async function getCustomer(id: string): Promise<CustomerProfile> {
  const response = await apiFetch(`/customers/${id}`);
  if (!response.ok) throw new Error("Failed to fetch customer");
  return response.json();
}

/** Sales / jobs / appointments feed — load only when the sales tab needs it. */
export async function getCustomerHistory(
  id: string,
): Promise<CustomerProfile["transactionHistory"]> {
  const response = await apiFetch(`/customers/${id}/history`);
  if (!response.ok) throw new Error("Failed to fetch customer history");
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
    return throwApiError(response, "Failed to create customer");
  }
  clearCustomerOptionCache();
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
    return throwApiError(response, "Failed to update customer");
  }
  clearCustomerOptionCache();
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
    return throwApiError(response, "Failed to update customer status");
  }
  clearCustomerOptionCache();
  return response.json();
}

export async function deleteCustomer(tenantId: string, id: string): Promise<void> {
  const response = await apiFetch(withTenantQuery(`/customers/${id}`, tenantId), {
    method: "DELETE",
  });
  if (!response.ok) {
    return throwApiError(response, "Failed to delete customer");
  }
  clearCustomerOptionCache();
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
    return throwApiError(response, "Failed to record payment");
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
