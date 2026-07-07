import type {
  CreateUserRequest,
  CreateUserResponse,
  InviteUserRequest,
  InviteUserResponse,
  User,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  fetchListPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";

export interface UserListRow extends User {
  tenantCode?: string | null;
  tenantName?: string | null;
}

export interface UserListOptions {
  allTenants?: boolean;
  cursor?: string;
  limit?: number;
}

async function fetchUsersRaw(
  tenantId: string | null,
  options: UserListOptions | undefined,
  cursor?: string,
  limit?: number,
): Promise<UserListRow[]> {
  const params = new URLSearchParams();
  if (options?.allTenants) params.set("allTenants", "true");
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
): Promise<ListPage<UserListRow>> {
  return fetchListPage(
    (pageCursor, pageLimit) =>
      fetchUsersRaw(tenantId, undefined, pageCursor, pageLimit),
    cursor,
    limit,
  );
}

export async function getAllTenantUsersPage(
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<UserListRow>> {
  return fetchListPage(
    (pageCursor, pageLimit) =>
      fetchUsersRaw(null, { allTenants: true }, pageCursor, pageLimit),
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

export async function getUsers(
  tenantId: string | null,
  options?: UserListOptions,
): Promise<UserListRow[]> {
  if (options?.cursor || options?.limit) {
    return fetchUsersRaw(
      tenantId,
      options,
      options.cursor,
      options.limit,
    );
  }

  return fetchFirstPage((cursor, limit) =>
    fetchUsersRaw(tenantId, options, cursor, limit),
  );
}

async function parseUserMutationError(
  response: Response,
  fallback: string,
): Promise<never> {
  const body = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;
  const message = Array.isArray(body?.message)
    ? body.message.join(", ")
    : body?.message;
  throw new Error(message ?? fallback);
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
    return parseUserMutationError(response, "Failed to send invite");
  }

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
    return parseUserMutationError(response, "Failed to create user");
  }

  return response.json();
}
