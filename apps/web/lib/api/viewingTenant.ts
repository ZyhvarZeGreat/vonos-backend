import {
  getTenantByCode,
  getTenantCodeFromId,
  isTenantCode,
} from "@/lib/registries/tenants";
import { stripBasePath } from "@/lib/utils/basePath";
import { parseTenantPath } from "@/lib/utils/tenantRoutes";
import {
  adminViewingTenantId,
  useAdminEntityStore,
} from "@/stores/adminEntityStore";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { useUiStore } from "@/stores/uiStore";
import { canAccessVagPortal } from "@vonos/types";

/** Staff cleared for more than one work location — each tab follows its URL. */
export function hasMultiEntityClearance(
  allowedTenantCodes: string[] | undefined,
): boolean {
  return (allowedTenantCodes?.length ?? 0) > 1;
}

/** Send X-Viewing-Tenant (VAG portal or multi-location staff). */
export function usesViewingTenantHeader(): boolean {
  const { role, tenantRoleName, allowedTenantCodes } = useAuthStore.getState();
  return (
    canAccessVagPortal({ role, tenantRoleName }) ||
    hasMultiEntityClearance(allowedTenantCodes)
  );
}

function tenantIdFromUrlPath(pathname: string): string | null {
  const entitySwitch = useUiStore.getState().entitySwitch;
  if (entitySwitch?.code && isTenantCode(entitySwitch.code)) {
    return getTenantByCode(entitySwitch.code)?.tenantId ?? null;
  }

  const { tenantCode: urlTenant } = parseTenantPath(pathname);
  if (!urlTenant || !isTenantCode(urlTenant)) return null;
  return getTenantByCode(urlTenant)?.tenantId ?? null;
}

/**
 * Tenant id the API should scope to for the current screen.
 * VAG portal users (super_admin or HR) on /admin/* use the admin viewing
 * entity (never a leaked activeTenantId from a previous entity visit).
 * On /{code}/* (or /operations/{VC|VS|VKW}/*) use the URL segment.
 * Multi-location staff: URL segment when cleared for that entity.
 * Everyone else: JWT tenant only.
 */
export function resolveViewingTenantId(): string | null {
  const {
    role,
    tenantId: authTenantId,
    tenantRoleName,
    allowedTenantCodes,
  } = useAuthStore.getState();

  const isPortal = canAccessVagPortal({ role, tenantRoleName });
  const multiEntity = hasMultiEntityClearance(allowedTenantCodes);

  if (!isPortal && !multiEntity) {
    return authTenantId;
  }

  if (typeof window !== "undefined") {
    const pathname = stripBasePath(window.location.pathname);
    const parts = pathname.split("/").filter(Boolean);
    const segment = parts[0];

    if (segment === "admin") {
      if (!isPortal) {
        return authTenantId;
      }
      // Manage users / roles / payroll are group-wide — do not inherit the
      // entity switcher scope (otherwise GET/PATCH hit the wrong tenant, or
      // shared catalogs / cross-business payroll are overridden by
      // X-Viewing-Tenant).
      if (
        parts[1] === "hrm" &&
        (parts[2] === "users" || parts[2] === "roles" || parts[2] === "payroll")
      ) {
        return null;
      }
      const viewingCode = useAdminEntityStore.getState().viewingCode;
      // SP combined → primary VSP for single-tenant headers
      return adminViewingTenantId(viewingCode);
    }

    const fromUrl = tenantIdFromUrlPath(pathname);
    if (fromUrl) {
      if (isPortal) {
        return fromUrl;
      }
      const code = getTenantCodeFromId(fromUrl);
      if (code && allowedTenantCodes.includes(code)) {
        return fromUrl;
      }
    }
  }

  if (isPortal) {
    return (
      useTenantStore.getState().activeTenantId ??
      useTenantStore.getState().tenantConfig?.tenantId ??
      null
    );
  }

  return authTenantId;
}

/** Attach X-Viewing-Tenant when the session uses URL/tab entity scoping. */
export function applyViewingTenantHeader(
  headers: Record<string, string>,
): void {
  if (!usesViewingTenantHeader()) return;
  const viewingTenant = resolveViewingTenantId();
  if (viewingTenant) {
    headers["X-Viewing-Tenant"] = viewingTenant;
  }
}
