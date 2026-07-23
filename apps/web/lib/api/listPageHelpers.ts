import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  fetchListPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";

export interface ListQueryParams {
  cursor?: string;
  limit?: number;
  search?: string;
  includeSummary?: boolean | string | number;
  [key: string]: string | number | boolean | undefined;
}

function normalizeIncludeSummary(
  value: boolean | string | number | undefined,
): "0" | "1" | undefined {
  if (value === undefined) return "0"; // rows-first default
  if (value === false || value === "0" || value === 0) return "0";
  if (value === true || value === "1" || value === 1) return "1";
  return undefined;
}

export function appendListQuery(
  basePath: string,
  params: ListQueryParams,
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    if (key === "includeSummary") {
      const normalized = normalizeIncludeSummary(
        value as boolean | string | number | undefined,
      );
      if (normalized) qs.set(key, normalized);
      continue;
    }
    qs.set(key, String(value));
  }
  const query = qs.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export async function fetchJsonListPage<T extends { id: string }>(
  path: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  extraParams: Omit<ListQueryParams, "cursor" | "limit"> = {},
): Promise<ListPage<T>> {
  return fetchListPage(async (pageCursor, pageLimit) => {
    const url = appendListQuery(path, {
      includeSummary: false,
      ...extraParams,
      cursor: pageCursor,
      limit: pageLimit,
    });
    const response = await apiFetch(url);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { message?: string | string[] }
        | null;
      const message = Array.isArray(body?.message)
        ? body.message.join(", ")
        : body?.message;
      throw new Error(message ?? `Failed to fetch list (${response.status})`);
    }
    return response.json();
  }, cursor, limit);
}

export async function fetchTenantListPage<T extends { id: string }>(
  path: string,
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  extraParams: Omit<ListQueryParams, "cursor" | "limit"> = {},
): Promise<ListPage<T>> {
  const tenantPath = withTenantQuery(path, tenantId);
  return fetchJsonListPage<T>(tenantPath, cursor, limit, extraParams);
}
