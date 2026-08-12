import type { Role } from "@vonos/types";
import { canAccessVagPortal } from "@vonos/types";
import { getTenantCodeFromId } from "@/lib/registries/tenants";
import { tenantOverviewPath } from "@/lib/utils/tenantRoutes";

export function getPostLoginPath(
  role: Role,
  tenantId: string | null,
  tenantRoleName?: string | null,
): string {
  if (canAccessVagPortal({ role, tenantRoleName })) return "/admin/overview";
  const code = getTenantCodeFromId(tenantId);
  if (code) return tenantOverviewPath(code);
  return "/admin/overview";
}

export { tenantOverviewPath };

export function canAccessTenant(
  role: Role | null,
  userTenantId: string | null,
  targetTenantId: string,
  tenantRoleName?: string | null,
): boolean {
  if (!role) return false;
  if (canAccessVagPortal({ role, tenantRoleName })) return true;
  return userTenantId === targetTenantId;
}
