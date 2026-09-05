import type { LoginSuccessResponse } from "@vonos/types";
import { canAccessVagPortal } from "@vonos/types";
import { useAuthStore } from "@/stores/authStore";
import { stripBasePath, withBasePath } from "@/lib/utils/basePath";
import { applyIdempotencyHeaders } from "@/lib/utils/idempotency";
import { resolveViewingTenantId } from "./viewingTenant";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(
  /\/+$/,
  "",
);

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const { token, role, tenantRoleName } = useAuthStore.getState();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (canAccessVagPortal({ role, tenantRoleName })) {
    const viewingTenant = resolveViewingTenantId();
    if (viewingTenant) {
      headers["X-Viewing-Tenant"] = viewingTenant;
    }
  }
  return headers;
}

function applySession(result: LoginSuccessResponse): void {
  useAuthStore.getState().setAuth({
    userId: result.user.id,
    email: result.user.email,
    name: result.user.name,
    tenantId: result.user.tenantId,
    role: result.user.role,
    token: result.accessToken,
    tenantRoleId: result.user.tenantRoleId ?? null,
    tenantRoleName: result.user.tenantRoleName ?? null,
    tenantRolePermissions: result.user.tenantRolePermissions ?? [],
    tenantRoleLocked: result.user.tenantRoleLocked ?? false,
    allowedTenantCodes: result.user.allowedTenantCodes ?? [],
  });
}

function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  const path = stripBasePath(window.location.pathname);
  if (
    path === "/" ||
    path === "" ||
    path === "/login" ||
    path.startsWith("/login/") ||
    path.startsWith("/invite") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/invoice") ||
    path.startsWith("/about") ||
    path.startsWith("/services") ||
    path.startsWith("/shop") ||
    path.startsWith("/track") ||
    path.startsWith("/contact") ||
    path.startsWith("/maintenance")
  ) {
    return;
  }
  const redirect = encodeURIComponent(path + window.location.search);
  window.location.replace(withBasePath(`/login?redirect=${redirect}`));
}

/** Single-flight refresh so parallel 401s share one /auth/refresh. */
let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const preferredTenantId = useAuthStore.getState().tenantId;
      const response = await fetch(apiUrl("/auth/refresh"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: preferredTenantId }),
      });
      if (!response.ok) return false;
      const result = (await response.json()) as LoginSuccessResponse;
      if (!result?.accessToken || !result?.user) return false;
      applySession(result);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function isAuthPath(path: string): boolean {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return (
    normalized === "/auth/refresh" ||
    normalized.startsWith("/auth/login") ||
    normalized.startsWith("/auth/logout") ||
    normalized.startsWith("/auth/verify-2fa") ||
    normalized.startsWith("/auth/invite") ||
    normalized.startsWith("/auth/forgot-password") ||
    normalized.startsWith("/auth/reset-password")
  );
}

/** Authenticated fetch against the NestJS API. Retries once after refresh on 401. */
export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(buildAuthHeaders())) {
    headers.set(key, value);
  }
  // Let the browser set multipart boundary for FormData; do not force JSON.
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (init?.body && !headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }
  applyIdempotencyHeaders(headers);

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status !== 401 || isAuthPath(path)) {
    return response;
  }

  const refreshed = await tryRefreshSession();
  if (!refreshed) {
    useAuthStore.getState().clearAuth();
    redirectToLogin();
    return response;
  }

  const retryHeaders = new Headers(init?.headers);
  for (const [key, value] of Object.entries(buildAuthHeaders())) {
    retryHeaders.set(key, value);
  }
  if (init?.body && !retryHeaders.has("Content-Type") && !isFormData) {
    retryHeaders.set("Content-Type", "application/json");
  }
  applyIdempotencyHeaders(retryHeaders);

  return fetch(apiUrl(path), {
    ...init,
    headers: retryHeaders,
    credentials: "include",
  });
}

/** Append tenantId query param for super-admin entity scoping. */
export function withTenantQuery(path: string, tenantId?: string): string {
  if (!tenantId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}tenantId=${encodeURIComponent(tenantId)}`;
}
