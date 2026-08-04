import { isTenantCode } from "@/lib/registries/tenants";

/**
 * True when the tenant should use the HQ6 Ultimate POS theme/chrome.
 * All operating tenants are HQ6; VAG admin (`null` / non-tenant routes) is not.
 */
export function isHq6Tenant(tenantCode: string | null | undefined): boolean {
  return Boolean(tenantCode && isTenantCode(tenantCode));
}

/**
 * Job-centric entities (Mechanic + Painting) — shared automotive contact /
 * overview behaviors. Prefer this over `code === "VA"`.
 */
export function isJobCentricTenant(
  tenantCode: string | null | undefined,
): boolean {
  return tenantCode === "VA" || tenantCode === "VP";
}

/**
 * Full Ultimate POS app shell (sidebar + header + content wrapper)
 * for every operating HQ6 tenant — same chrome as VA.
 */
export function isUposShellTenant(
  tenantCode: string | null | undefined,
): boolean {
  return isHq6Tenant(tenantCode);
}
