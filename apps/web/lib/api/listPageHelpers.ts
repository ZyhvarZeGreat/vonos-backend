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
  [key: string]: string | number | undefined;
}

export function appendListQuery(
  basePath: string,
  params: ListQueryParams,
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      qs.set(key, String(value));
    }
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
