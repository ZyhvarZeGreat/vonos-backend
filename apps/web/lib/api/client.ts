import { useAuthStore } from "@/stores/authStore";
import { resolveViewingTenantId } from "./viewingTenant";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const { token, role } = useAuthStore.getState();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (role === "super_admin") {
    const viewingTenant = resolveViewingTenantId();
    if (viewingTenant) {
      headers["X-Viewing-Tenant"] = viewingTenant;
    }
  }
  return headers;
}

/** Authenticated fetch against the NestJS API. */
export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(buildAuthHeaders())) {
    headers.set(key, value);
  }
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(apiUrl(path), { ...init, headers, credentials: "include" });
}

/** Append tenantId query param for super-admin entity scoping. */
export function withTenantQuery(path: string, tenantId?: string): string {
  if (!tenantId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}tenantId=${encodeURIComponent(tenantId)}`;
}
