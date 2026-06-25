import type { Role } from "@vonos/types";
import { getTenantCodeFromId, type TenantCode } from "@/lib/registries/tenants";
import { tenantOverviewPath } from "@/lib/utils/tenantRoutes";

export function getPostLoginPath(role: Role, tenantId: string | null): string {
  if (role === "super_admin") return "/admin/overview";
  const code = getTenantCodeFromId(tenantId);
  if (code) return tenantOverviewPath(code);
  return "/admin/overview";
}

export { tenantOverviewPath };

export function canAccessTenant(
  role: Role | null,
  userTenantId: string | null,
  targetTenantId: string,
): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;
  return userTenantId === targetTenantId;
}
