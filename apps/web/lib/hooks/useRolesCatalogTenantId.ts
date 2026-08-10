"use client";

import { usePathname } from "next/navigation";
import { useAppPermissions } from "@/lib/hooks/useHq6Permissions";
import { useTenantId } from "@/lib/hooks/useRouteTenant";

/**
 * Backend catalog key for VAG — remapped to the first operating tenant in
 * TenantRolesService.resolveCatalogTenantId, then propagated to all entities.
 */
export const VAG_TENANT_ID = "tenant_vag_001";

/**
 * Tenant id for shared role-definition API calls.
 * On `/admin/hrm/roles*` with Group Overview (no entity entered), VAG uses
 * {@link VAG_TENANT_ID} so the list/create/edit flows work without Enter entity.
 */
export function useRolesCatalogTenantId(): string | null {
  const tenantId = useTenantId();
  const pathname = usePathname();
  const { isVag } = useAppPermissions();

  if (tenantId) return tenantId;

  if (
    isVag &&
    Boolean(pathname?.startsWith("/admin/hrm/roles"))
  ) {
    return VAG_TENANT_ID;
  }

  return null;
}

/** True when managing the group-wide role catalog from VAG admin HRM. */
export function useIsVagRolesCatalogRoute(): boolean {
  const pathname = usePathname();
  const { isVag } = useAppPermissions();
  return Boolean(isVag && pathname?.startsWith("/admin/hrm/roles"));
}
