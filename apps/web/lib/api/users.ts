import type {
  CreateUserRequest,
  CreateUserResponse,
  InviteUserRequest,
  InviteUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  User,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import { throwApiError } from "@/lib/api/parseApiError";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  FILTER_DROPDOWN_INITIAL_LIMIT,
  FILTER_ROSTER_TTL_MS,
  IN_MEMORY_FILTER_CATALOG_LIMIT,
  fetchAllPages,
  fetchFirstPage,
  fetchListPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { createAccumulatingPicker } from "@/lib/api/accumulatingPicker";
import { createAsyncTtlCache } from "@/lib/utils/asyncTtlCache";
import { nameListCursor } from "@/lib/utils/pagination";

export interface UserListRow extends User {
  tenantCode?: string | null;
  tenantName?: string | null;
}

/** User picker cache — recent window / search; cleared on mutations. */
const userOptionCache = createAsyncTtlCache<UserListRow[]>({
  ttlMs: FILTER_ROSTER_TTL_MS,
  maxEntries: 128,
});

export function clearUserOptionCache(): void {
  userOptionCache.clear();
  for (const picker of userPickers.values()) picker.clearAll();
  userPickers.clear();
}

export interface UserListOptions {
  allTenants?: boolean;
  cursor?: string;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

async function fetchUsersRaw(
  tenantId: string | null,
  options: UserListOptions | undefined,
  cursor?: string,
  limit?: number,
): Promise<UserListRow[]> {
  const params = new URLSearchParams();
  if (options?.allTenants) params.set("allTenants", "true");
  if (options?.search?.trim()) params.set("search", options.search.trim());
  if (options?.role) params.set("role", options.role);
  if (options?.status) params.set("status", options.status);
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));

  const query = params.toString();
  const base = query ? `/users?${query}` : "/users";
  const path = options?.allTenants
    ? base
    : withTenantQuery(base, tenantId ?? undefined);

  const response = await apiFetch(path);
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("You need super admin access to view all users.");
    }
    throw new Error("Failed to fetch users");
  }
  return response.json();
}

export async function getUsersPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  filters: {
    search?: string;
    role?: string;
    status?: string;
    includeSummary?: boolean;
  } = {},
): Promise<ListPage<UserListRow>> {
  return fetchListPage(
    (pageCursor, pageLimit) =>
      fetchUsersRaw(
        tenantId,
        {
          search: filters.search,
          role: filters.role,
          status: filters.status,
        },
        pageCursor,
        pageLimit,
      ),
    cursor,
    limit,
  );
}

export async function getAllTenantUsersPage(
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  filters: {
    search?: string;
    role?: string;
    status?: string;
    includeSummary?: boolean;
  } = {},
): Promise<ListPage<UserListRow>> {
  return fetchListPage(
    (pageCursor, pageLimit) =>
      fetchUsersRaw(
        null,
        {
          allTenants: true,
          search: filters.search,
          role: filters.role,
          status: filters.status,
        },
        pageCursor,
        pageLimit,
      ),
    cursor,
    limit,
  );
}

/** Full tenant user list for export — not for table rendering. */
export async function getAllUsers(
  tenantId: string,
): Promise<UserListRow[]> {
  return fetchAllPages(
    (cursor, limit) => fetchUsersRaw(tenantId, undefined, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

/** Full cross-tenant user list for export — not for table rendering. */
export async function getAllTenantUsers(): Promise<UserListRow[]> {
  return fetchAllPages(
    (cursor, limit) =>
      fetchUsersRaw(null, { allTenants: true }, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

/**
 * Full user roster for export / admin — not for filter dropdowns.
 */
export async function getUserRoster(
  tenantId: string | null,
  options?: Pick<UserListOptions, "allTenants" | "role" | "status">,
): Promise<UserListRow[]> {
  const cacheKey = JSON.stringify([
    "user-roster",
    tenantId,
    options?.allTenants ? 1 : 0,
    options?.role ?? "",
    options?.status ?? "",
  ]);
  return userOptionCache.get(cacheKey, async () =>
    fetchAllPages(
      (cursor, limit) =>
        fetchUsersRaw(
          tenantId,
          {
            allTenants: options?.allTenants,
            role: options?.role,
            status: options?.status,
          },
          cursor,
          limit,
        ),
      Math.min(EXPORT_PAGE_SIZE, IN_MEMORY_FILTER_CATALOG_LIMIT),
      nameListCursor,
      IN_MEMORY_FILTER_CATALOG_LIMIT,
    ),
  );
}

type UserPicker = ReturnType<typeof createAccumulatingPicker<UserListRow>>;
const userPickers = new Map<string, UserPicker>();

function userPickerKey(
  tenantId: string | null,
  opts?: { allTenants?: boolean; role?: string; status?: string },
): string {
  return JSON.stringify([
    tenantId,
    opts?.allTenants ? 1 : 0,
    opts?.role ?? "",
    opts?.status ?? "",
  ]);
}

function userPickerFor(
  tenantId: string | null,
  opts?: { allTenants?: boolean; role?: string; status?: string },
): UserPicker {
  const key = userPickerKey(tenantId, opts);
  let picker = userPickers.get(key);
  if (!picker) {
    picker = createAccumulatingPicker<UserListRow>({
      getCursor: nameListCursor,
      searchKeys: ["name", "email", "username"],
      fetchPage: (cursor, limit, search) =>
        fetchListPage(
          (pageCursor, pageLimit) =>
            fetchUsersRaw(
              tenantId,
              {
                allTenants: opts?.allTenants,
                role: opts?.role,
                status: opts?.status,
                search: search || undefined,
              },
              pageCursor,
              pageLimit,
            ),
          cursor,
          limit,
        ),
    });
    userPickers.set(key, picker);
  }
  return picker;
}

/**
 * User filter/picker — first ~80, scroll for more.
 * Search uses loaded rows first; otherwise API.
 */
export async function getUsersForPicker(
  tenantId: string | null,
  search?: string,
  opts?: {
    limit?: number;
    allTenants?: boolean;
    role?: string;
    status?: string;
  },
): Promise<UserListRow[]> {
  const key = userPickerKey(tenantId, opts);
  const page = await userPickerFor(tenantId, opts).load(key, search);
  return page.items;
}

export async function loadMoreUsersForPicker(
  tenantId: string | null,
  opts?: { allTenants?: boolean; role?: string; status?: string },
): Promise<{ items: UserListRow[]; appended: UserListRow[]; hasMore: boolean }> {
  const key = userPickerKey(tenantId, opts);
  return userPickerFor(tenantId, opts).loadMore(key);
}

export function usersPickerHasMore(
  tenantId: string | null,
  opts?: { allTenants?: boolean; role?: string; status?: string },
): boolean {
  const key = userPickerKey(tenantId, opts);
  return userPickerFor(tenantId, opts).hasMore(key);
}

export async function getUsers(
  tenantId: string | null,
  options?: UserListOptions,
): Promise<UserListRow[]> {
  if (options?.cursor) {
    return fetchUsersRaw(
      tenantId,
      options,
      options.cursor,
      options.limit,
    );
  }

  return getUsersForPicker(tenantId, options?.search, {
    allTenants: options?.allTenants,
    role: options?.role,
    status: options?.status,
    limit: options?.limit ?? FILTER_DROPDOWN_INITIAL_LIMIT,
  });
}

/** Single user for detail pages — prefer over scanning getUsers(). */
export async function getUser(id: string, tenantId?: string | null): Promise<User> {
  const path = withTenantQuery(`/users/${id}`, tenantId ?? undefined);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch user");
  return response.json();
}

export async function inviteUser(
  payload: InviteUserRequest,
  options?: { tenantId?: string | null },
): Promise<InviteUserResponse> {
  const path =
    options?.tenantId && payload.tenantId === undefined
      ? withTenantQuery("/users/invite", options.tenantId)
      : "/users/invite";

  const response = await apiFetch(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return throwApiError(response, "Failed to send invite");
  }

  clearUserOptionCache();
  return response.json();
}

export async function createUser(
  payload: CreateUserRequest,
  options?: { tenantId?: string | null },
): Promise<CreateUserResponse> {
  const path =
    options?.tenantId && payload.tenantId === undefined
      ? withTenantQuery("/users", options.tenantId)
      : "/users";

  const response = await apiFetch(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return throwApiError(response, "Failed to create user");
  }

  clearUserOptionCache();
  return response.json();
}

export async function updateUser(
  id: string,
  payload: UpdateUserRequest,
  options?: { tenantId?: string | null },
): Promise<UpdateUserResponse> {
  const path = withTenantQuery(`/users/${id}`, options?.tenantId ?? undefined);
  const response = await apiFetch(path, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    return throwApiError(response, "Failed to update user");
  }
  clearUserOptionCache();
  return response.json();
}

export async function deactivateUser(
  id: string,
  options?: { tenantId?: string | null },
): Promise<{ user: User }> {
  const path = withTenantQuery(`/users/${id}`, options?.tenantId ?? undefined);
  const response = await apiFetch(path, { method: "DELETE" });
  if (!response.ok) {
    return throwApiError(response, "Failed to deactivate user");
  }
  clearUserOptionCache();
  return response.json();
}
