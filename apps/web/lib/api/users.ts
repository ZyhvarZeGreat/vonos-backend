import type {
  CreateUserRequest,
  CreateUserResponse,
  InviteUserRequest,
  InviteUserResponse,
  User,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";

export interface UserListRow extends User {
  tenantCode?: string | null;
  tenantName?: string | null;
}

export async function getUsers(
  tenantId: string | null,
  options?: { allTenants?: boolean },
): Promise<UserListRow[]> {
  const params = new URLSearchParams();
  if (options?.allTenants) {
    params.set("allTenants", "true");
  }

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
