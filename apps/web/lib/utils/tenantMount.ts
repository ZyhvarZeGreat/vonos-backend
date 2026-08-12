import { APP_BASE_PATH } from "@/lib/utils/basePath";

/** Tenants whose public mount is `/operations/{CODE}` when the app is not already under that basePath. */
export const OPERATIONS_MOUNTED_TENANTS = new Set<string>(["VC", "VS", "VKW"]);

/**
 * App-absolute mount for a tenant workspace (no trailing slash).
 * VC/VS/VKW → `/operations/{CODE}` when NEXT_PUBLIC_BASE_PATH is unset;
 * when the whole app is already at `/operations`, returns `/${code}` to avoid double nesting.
 */
export function tenantBasePath(code: string | null | undefined): string {
  if (!code) return "/";
  if (
    OPERATIONS_MOUNTED_TENANTS.has(code) &&
    APP_BASE_PATH !== "/operations"
  ) {
    return `/operations/${code}`;
  }
  return `/${code}`;
}

/** Build `/{mount}/…segments` under the tenant mount. */
export function tenantPath(
  tenantCode: string | null | undefined,
  ...segments: string[]
): string {
  const rest = segments.filter(Boolean).join("/");
  const base = tenantBasePath(tenantCode);
  if (!rest) return base;
  if (base === "/") return `/${rest}`;
  return `${base}/${rest}`;
}
