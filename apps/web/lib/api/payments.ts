import type { AccountTransaction, PaymentRecord } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { appendListQuery, fetchJsonListPage, fetchTenantListPage } from "@/lib/api/listPageHelpers";

const PAYMENTS_PATH = "/payments";

export interface PaymentFilters {
  accountId?: string;
  from?: string;
  to?: string;
  search?: string;
  cursor?: string;
  limit?: number;
  includeSummary?: boolean;
}

async function fetchPaymentsRaw(
  tenantId: string,
  filters: PaymentFilters | undefined,
  cursor?: string,
  limit?: number,
): Promise<PaymentRecord[]> {
  const tenantPath = withTenantQuery(PAYMENTS_PATH, tenantId);
  const url = appendListQuery(tenantPath, {
    accountId: filters?.accountId,
    from: filters?.from,
    to: filters?.to,
    search: filters?.search,
    cursor,
    limit,
  });
  const response = await apiFetch(url);
  if (!response.ok) throw new Error("Failed to fetch payments");
  return response.json();
}

async function fetchAccountBookRaw(
  accountId: string,
  cursor?: string,
  limit?: number,
  filters: { from?: string; to?: string; search?: string; type?: string } = {},
): Promise<AccountTransaction[]> {
  const url = appendListQuery(`/payments/account-book/${accountId}`, {
    cursor,
    limit,
    from: filters.from,
    to: filters.to,
    search: filters.search,
    type: filters.type,
  });
  const response = await apiFetch(url);
  if (!response.ok) throw new Error("Failed to fetch account book");
  return response.json();
}

export async function getPaymentsPage(
  tenantId: string,
  filters: PaymentFilters | undefined,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<PaymentRecord>> {
  return fetchTenantListPage(PAYMENTS_PATH, tenantId, cursor, limit, {
    accountId: filters?.accountId,
    from: filters?.from,
    to: filters?.to,
    search: filters?.search,
    includeSummary: filters?.includeSummary ?? false,
  });
}

export async function getAccountBookPage(
  accountId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  filters: {
    from?: string;
    to?: string;
    search?: string;
    type?: string;
    includeSummary?: boolean;
  } = {},
): Promise<ListPage<AccountTransaction>> {
  return fetchJsonListPage(
    `/payments/account-book/${accountId}`,
    cursor,
    limit,
    {
      ...filters,
      includeSummary: filters.includeSummary ?? false,
    },
  );
}

/** Full payment list for export — not for table rendering. */
export async function getAllPayments(
  tenantId: string,
  filters?: PaymentFilters,
): Promise<PaymentRecord[]> {
  return fetchAllPages(
    (cursor, limit) => fetchPaymentsRaw(tenantId, filters, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

/** Full account book for export — not for table rendering. */
export async function getAllAccountBook(
  accountId: string,
): Promise<AccountTransaction[]> {
  return fetchAllPages(
    (cursor, limit) => fetchAccountBookRaw(accountId, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

export async function getPayments(
  tenantId: string,
  filters?: PaymentFilters,
): Promise<PaymentRecord[]> {
  if (filters?.cursor || filters?.limit) {
    return fetchPaymentsRaw(
      tenantId,
      filters,
      filters.cursor,
      filters.limit,
    );
  }

  return fetchFirstPage((cursor, limit) =>
    fetchPaymentsRaw(tenantId, filters, cursor, limit),
  );
}

export async function getAccountBook(
  accountId: string,
): Promise<AccountTransaction[]> {
  return fetchFirstPage((cursor, limit) =>
    fetchAccountBookRaw(accountId, cursor, limit),
  );
}
