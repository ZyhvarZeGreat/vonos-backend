import type { Role } from "@vonos/types";
import { canAccessVagPortal, isVagOverviewCode } from "@vonos/types";
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
  allowedTenantCodes?: string[],
): boolean {
  if (!role) return false;
  if (canAccessVagPortal({ role, tenantRoleName })) return true;
  const targetCode = getTenantCodeFromId(targetTenantId);
  if (
    targetCode &&
    allowedTenantCodes?.length &&
    allowedTenantCodes.includes(targetCode)
  ) {
    return true;
  }
  // Cafe entity admins may enter any VAG overview entity (Autos + Cafe).
  if (
    role === "admin" &&
    targetCode &&
    isVagOverviewCode(targetCode) &&
    ((allowedTenantCodes ?? []).includes("VC") ||
      getTenantCodeFromId(userTenantId) === "VC")
  ) {
    return true;
  }
  return userTenantId === targetTenantId;
}
