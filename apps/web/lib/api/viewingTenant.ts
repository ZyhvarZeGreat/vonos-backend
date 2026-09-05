import { getTenantByCode, isTenantCode } from "@/lib/registries/tenants";
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

/**
 * Tenant id the API should scope to for the current screen.
 * VAG portal users (super_admin or HR) on /admin/* use the admin viewing
 * entity (never a leaked activeTenantId from a previous entity visit).
 * On /{code}/* (or /operations/{VC|VS|VKW}/*) use the URL segment.
 * Everyone else: JWT tenant only.
 */
export function resolveViewingTenantId(): string | null {
  const {
    role,
    tenantId: authTenantId,
    tenantRoleName,
  } = useAuthStore.getState();

  const isPortal = canAccessVagPortal({ role, tenantRoleName });
  if (!isPortal) {
    return authTenantId;
  }

  if (typeof window !== "undefined") {
    const pathname = stripBasePath(window.location.pathname);
    const parts = pathname.split("/").filter(Boolean);
    const segment = parts[0];

    // During entity switch, API calls may run before the URL updates — scope to target.
    const entitySwitch = useUiStore.getState().entitySwitch;
    if (entitySwitch?.code && isTenantCode(entitySwitch.code)) {
      const switchingId = getTenantByCode(entitySwitch.code)?.tenantId;
      if (switchingId) return switchingId;
    }

    if (segment === "admin") {
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

    const { tenantCode: urlTenant } = parseTenantPath(pathname);
    if (urlTenant && isTenantCode(urlTenant)) {
      const fromUrl = getTenantByCode(urlTenant)?.tenantId ?? null;
      const active = useTenantStore.getState().activeTenantId;
      if (fromUrl) return fromUrl;
      if (active) return active;
      return null;
    }
  }

  return (
    useTenantStore.getState().activeTenantId ??
    useTenantStore.getState().tenantConfig?.tenantId ??
    null
  );
}
