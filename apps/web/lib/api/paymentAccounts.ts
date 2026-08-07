import type {
  CreatePaymentAccountRequest,
  PaymentAccount,
  PaymentAccountDepositRequest,
  PaymentAccountTransferRequest,
  UpdatePaymentAccountRequest,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import { throwApiError } from "@/lib/api/parseApiError";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  FILTER_ROSTER_TTL_MS,
  IN_MEMORY_FILTER_CATALOG_LIMIT,
  TYPEAHEAD_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { appendListQuery, fetchTenantListPage } from "@/lib/api/listPageHelpers";
import { createAsyncTtlCache } from "@/lib/utils/asyncTtlCache";
import { matchSorter, rankings } from "match-sorter";

const LIST_PATH = "/payment-accounts";

/** Full payment-account roster — cleared only on account mutations. */
const paymentAccountOptionCache = createAsyncTtlCache<PaymentAccount[]>({
  ttlMs: FILTER_ROSTER_TTL_MS,
  maxEntries: 64,
});

/** Drop cached payment-account option lists (call after account mutations). */
export function clearPaymentAccountOptionCache(): void {
  paymentAccountOptionCache.clear();
}

async function fetchPaymentAccountsRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
  extra?: { search?: string; openOnly?: boolean; lite?: boolean },
): Promise<PaymentAccount[]> {
  const tenantPath = withTenantQuery(LIST_PATH, tenantId);
  const url = appendListQuery(tenantPath, {
    cursor,
    limit,
    search: extra?.search,
    openOnly: extra?.openOnly ? "1" : undefined,
    lite: extra?.lite ? "1" : undefined,
  });
  const response = await apiFetch(url);
  if (!response.ok) throw new Error("Failed to fetch payment accounts");
  return response.json();
}

export async function getPaymentAccountsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  extra?: { search?: string; includeSummary?: boolean },
): Promise<ListPage<PaymentAccount>> {
  return fetchTenantListPage(LIST_PATH, tenantId, cursor, limit, {
    ...extra,
    includeSummary: extra?.includeSummary ?? false,
  });
}

export async function getPaymentAccount(
  tenantId: string,
  id: string,
): Promise<PaymentAccount> {
  const response = await apiFetch(withTenantQuery(`${LIST_PATH}/${id}`, tenantId));
  if (!response.ok) throw new Error("Failed to fetch payment account");
  return response.json();
}

export async function createPaymentAccount(
  tenantId: string,
  dto: CreatePaymentAccountRequest,
): Promise<PaymentAccount> {
  const response = await apiFetch(withTenantQuery(LIST_PATH, tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    return throwApiError(response, "Failed to create payment account");
  }
  clearPaymentAccountOptionCache();
  return response.json();
}

export async function updatePaymentAccount(
  tenantId: string,
  id: string,
  dto: UpdatePaymentAccountRequest,
): Promise<PaymentAccount> {
  const response = await apiFetch(withTenantQuery(`${LIST_PATH}/${id}`, tenantId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    return throwApiError(response, "Failed to update payment account");
  }
  clearPaymentAccountOptionCache();
  return response.json();
}

export async function closePaymentAccount(
  tenantId: string,
  id: string,
): Promise<PaymentAccount> {
  const response = await apiFetch(
    withTenantQuery(`${LIST_PATH}/${id}/close`, tenantId),
    { method: "POST" },
  );
  if (!response.ok) {
    return throwApiError(response, "Failed to close payment account");
  }
  clearPaymentAccountOptionCache();
  return response.json();
}

export async function depositPaymentAccount(
  tenantId: string,
  id: string,
  dto: PaymentAccountDepositRequest,
): Promise<PaymentAccount> {
  const response = await apiFetch(
    withTenantQuery(`${LIST_PATH}/${id}/deposit`, tenantId),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    },
  );
  if (!response.ok) {
    return throwApiError(response, "Failed to deposit");
  }
  return response.json();
}

export async function transferPaymentAccounts(
  tenantId: string,
  dto: PaymentAccountTransferRequest,
): Promise<{ from: PaymentAccount; to: PaymentAccount }> {
  const response = await apiFetch(withTenantQuery(`${LIST_PATH}/transfer`, tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    return throwApiError(response, "Failed to transfer funds");
  }
  clearPaymentAccountOptionCache();
  return response.json();
}

export async function deletePaymentAccount(
  tenantId: string,
  id: string,
): Promise<void> {
  const response = await apiFetch(withTenantQuery(`${LIST_PATH}/${id}`, tenantId), {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete payment account");
  clearPaymentAccountOptionCache();
}

/** Full payment account list for export — not for table rendering. */
export async function getAllPaymentAccounts(
  tenantId: string,
  extra?: { search?: string },
): Promise<PaymentAccount[]> {
  return fetchAllPages(
    (cursor, limit) => fetchPaymentAccountsRaw(tenantId, cursor, limit, extra),
    EXPORT_PAGE_SIZE,
  );
}

export async function getPaymentAccounts(
  tenantId: string,
  opts?: {
    search?: string;
    limit?: number;
    openOnly?: boolean;
    lite?: boolean;
  },
): Promise<PaymentAccount[]> {
  const cacheKey = JSON.stringify([
    tenantId,
    opts?.search ?? "",
    opts?.limit ?? TYPEAHEAD_PAGE_SIZE,
    opts?.openOnly ? 1 : 0,
    opts?.lite ? 1 : 0,
  ]);
  return paymentAccountOptionCache.get(cacheKey, () =>
    fetchFirstPage(
      (cursor, limit) =>
        fetchPaymentAccountsRaw(tenantId, cursor, limit, {
          search: opts?.search,
          openOnly: opts?.openOnly,
          lite: opts?.lite,
        }),
      opts?.limit ?? TYPEAHEAD_PAGE_SIZE,
    ),
  );
}

/**
 * Open payment-account roster for pickers — loaded once into memory.
 * Capped at IN_MEMORY_FILTER_CATALOG_LIMIT.
 */
export async function getPaymentAccountRoster(
  tenantId: string,
): Promise<PaymentAccount[]> {
  const cacheKey = JSON.stringify(["payment-account-roster-v2", tenantId]);
  return paymentAccountOptionCache.get(cacheKey, async () =>
    fetchAllPages(
      (cursor, limit) =>
        fetchPaymentAccountsRaw(tenantId, cursor, limit, {
          openOnly: true,
          // Include live balances so searchable pickers can show them
          // (same UX as VA pay modals — one roster load, then local match-sorter).
          lite: false,
        }),
      Math.min(EXPORT_PAGE_SIZE, IN_MEMORY_FILTER_CATALOG_LIMIT),
      (row) => row.id,
      IN_MEMORY_FILTER_CATALOG_LIMIT,
    ),
  );
}

/**
 * Open payment accounts for pickers (cash tills + banks).
 * Full roster cached; `search` / `limit` are local match-sorter only.
 */
export async function getPaymentAccountsForPicker(
  tenantId: string,
  opts?: { search?: string; limit?: number },
): Promise<PaymentAccount[]> {
  const roster = await getPaymentAccountRoster(tenantId);
  const q = opts?.search?.trim() ?? "";
  const matched = q
    ? matchSorter(roster, q, {
        keys: ["name", "accountNumber"],
        threshold: rankings.CONTAINS,
        keepDiacritics: true,
      })
    : roster;
  const limit = opts?.limit;
  return limit != null ? matched.slice(0, limit) : matched;
}

export async function getUnlinkedPaymentsCount(
  tenantId: string,
): Promise<{ count: number }> {
  const response = await apiFetch(
    withTenantQuery(`${LIST_PATH}/unlinked-payments-count`, tenantId),
  );
  if (!response.ok) throw new Error("Failed to count unlinked payments");
  return response.json();
}

export async function backfillSalePaymentCredits(
  tenantId: string,
): Promise<{ linkedOrphans: number; createdCredits: number; skipped: number }> {
  const response = await apiFetch(
    withTenantQuery(`${LIST_PATH}/backfill-sale-payment-credits`, tenantId),
    { method: "POST" },
  );
  if (!response.ok) {
    return throwApiError(response, "Failed to backfill sale payment credits");
  }
  return response.json();
}
