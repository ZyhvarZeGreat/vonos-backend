import { isTenantCode } from "@/lib/registries/tenants";

/**
 * True when the tenant should use the HQ6 Ultimate POS theme/chrome.
 * All 7 operating tenants are HQ6; VAG admin (`null` / non-tenant routes) is not.
 */
export function isHq6Tenant(tenantCode: string | null | undefined): boolean {
  return Boolean(tenantCode && isTenantCode(tenantCode));
}
