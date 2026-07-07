import type {
  LedgerEntry,
  LedgerEntryType,
  LedgerEntitySummary,
  LedgerListRow,
  LedgerSummary,
  CreateManualExpenseRequest,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "./client";
import { fetchAllPages, fetchFirstPage } from "./fetchAllPages";

export const LEDGER_TABLE_PAGE_SIZE = 50;

export interface LedgerQueryFilters {
  type?: LedgerEntryType;
  category?: string;
  from?: string;
  to?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface LedgerPage<T extends { id: string }> {
  items: T[];
  hasMore: boolean;
  pageSize: number;
}

function buildLedgerQuery(filters?: LedgerQueryFilters, cursor?: string, limit?: number): string {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.search) params.set("search", filters.search);
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return qs ? `/ledger?${qs}` : "/ledger";
}

async function fetchLedgerPage<T extends { id: string }>(
  buildPath: (cursor?: string, limit?: number) => string,
  cursor: string | undefined,
  limit: number,
): Promise<LedgerPage<T>> {
  const response = await apiFetch(buildPath(cursor, limit));
  if (!response.ok) throw new Error("Failed to fetch ledger entries");
  const items = (await response.json()) as T[];
  return {
    items,
    hasMore: items.length >= limit,
    pageSize: limit,
  };
}

export async function getLedgerEntriesPage(
  tenantId: string,
  filters: LedgerQueryFilters | undefined,
  cursor: string | undefined,
  limit = LEDGER_TABLE_PAGE_SIZE,
): Promise<LedgerPage<LedgerEntry>> {
  return fetchLedgerPage<LedgerEntry>(
    (pageCursor, pageLimit) =>
      withTenantQuery(buildLedgerQuery(filters, pageCursor, pageLimit), tenantId),
    cursor,
    limit,
  );
}

export async function getGroupLedgerEntriesPage(
  filters: LedgerQueryFilters | undefined,
  cursor: string | undefined,
  limit = LEDGER_TABLE_PAGE_SIZE,
): Promise<LedgerPage<LedgerListRow>> {
  return fetchLedgerPage<LedgerListRow>(
    (pageCursor, pageLimit) =>
      buildLedgerQuery(filters, pageCursor, pageLimit).replace("/ledger", "/ledger/group"),
    cursor,
    limit,
  );
}

export async function getLedgerEntries(
  tenantId: string,
  filters?: LedgerQueryFilters,
): Promise<LedgerEntry[]> {
  return fetchFirstPage(async (cursor, limit) => {
    const path = withTenantQuery(buildLedgerQuery(filters, cursor, limit), tenantId);
    const response = await apiFetch(path);
    if (!response.ok) throw new Error("Failed to fetch ledger entries");
    return response.json();
  });
}

/** Full ledger list for export only — not for table rendering. */
export async function getAllLedgerEntries(
  tenantId: string,
  filters?: LedgerQueryFilters,
): Promise<LedgerEntry[]> {
  return fetchAllPages(async (cursor, limit) => {
    const path = withTenantQuery(buildLedgerQuery(filters, cursor, limit), tenantId);
    const response = await apiFetch(path);
    if (!response.ok) throw new Error("Failed to fetch ledger entries");
    return response.json();
  });
}

export async function getLedgerCategories(
  tenantId: string,
  from?: string,
  to?: string,
): Promise<string[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  const path = withTenantQuery(
    qs ? `/ledger/categories?${qs}` : "/ledger/categories",
    tenantId,
  );
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch ledger categories");
  return response.json();
}

export async function getGroupLedgerCategories(
  from?: string,
  to?: string,
): Promise<string[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  const path = qs ? `/ledger/group/categories?${qs}` : "/ledger/group/categories";
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch ledger categories");
  return response.json();
}

export async function getLedgerSummary(
  tenantId: string,
  from?: string,
  to?: string,
): Promise<LedgerSummary> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  const path = withTenantQuery(qs ? `/ledger/summary?${qs}` : "/ledger/summary", tenantId);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch ledger summary");
  return response.json();
}

export async function getGroupLedgerEntries(
  filters?: LedgerQueryFilters,
): Promise<LedgerListRow[]> {
  return fetchFirstPage(async (cursor, limit) => {
    const path = buildLedgerQuery(filters, cursor, limit).replace(
      "/ledger",
      "/ledger/group",
    );
    const response = await apiFetch(path);
    if (!response.ok) throw new Error("Failed to fetch group ledger entries");
    return response.json();
  });
}

/** Full group ledger list for export only. */
export async function getAllGroupLedgerEntries(
  filters?: LedgerQueryFilters,
): Promise<LedgerListRow[]> {
  return fetchAllPages(async (cursor, limit) => {
    const path = buildLedgerQuery(filters, cursor, limit).replace(
      "/ledger",
      "/ledger/group",
    );
    const response = await apiFetch(path);
    if (!response.ok) throw new Error("Failed to fetch group ledger entries");
    return response.json();
  });
}

export async function getGroupLedgerSummary(
  from?: string,
  to?: string,
): Promise<LedgerSummary> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  const path = qs ? `/ledger/group/summary?${qs}` : "/ledger/group/summary";
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch group ledger summary");
  return response.json();
}

export async function getGroupLedgerByEntity(
  from?: string,
  to?: string,
): Promise<LedgerEntitySummary[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  const path = qs ? `/ledger/group/by-entity?${qs}` : "/ledger/group/by-entity";
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch entity finance breakdown");
  return response.json();
}

export interface LedgerCharts {
  plTrend: Array<{ label: string; revenue: number; costs: number }>;
  revenueByCategory: Array<{ label: string; value: number }>;
}

export async function getLedgerCharts(
  tenantId: string,
  from?: string,
  to?: string,
): Promise<LedgerCharts> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  const path = withTenantQuery(
    qs ? `/ledger/charts?${qs}` : "/ledger/charts",
    tenantId,
  );
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch ledger charts");
  return response.json();
}

export async function getGroupLedgerCharts(
  from?: string,
  to?: string,
): Promise<LedgerCharts> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  const path = qs ? `/ledger/group/charts?${qs}` : "/ledger/group/charts";
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch group ledger charts");
  return response.json();
}

export async function createManualExpense(
  tenantId: string,
  body: CreateManualExpenseRequest,
): Promise<LedgerEntry> {
  const path = withTenantQuery("/ledger", tenantId);
  const response = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to create expense");
  }
  return response.json();
}
