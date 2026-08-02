import { getTenantByCode, isTenantCode } from "@/lib/registries/tenants";
import { stripBasePath } from "@/lib/utils/basePath";
import {
  adminViewingTenantId,
  useAdminEntityStore,
} from "@/stores/adminEntityStore";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { useUiStore } from "@/stores/uiStore";

/**
 * Tenant id the API should scope to for the current screen.
 * Super admins on /admin/* use the admin viewing entity (never a leaked
 * activeTenantId from a previous entity visit).
 * Super admins on /{code}/* use the URL segment.
 * Everyone else: JWT tenant only.
 */
export function resolveViewingTenantId(): string | null {
  const { role, tenantId: authTenantId } = useAuthStore.getState();

  if (role !== "super_admin") {
    return authTenantId;
  }

  if (typeof window !== "undefined") {
    const parts = stripBasePath(window.location.pathname)
      .split("/")
      .filter(Boolean);
    const segment = parts[0];

    // During entity switch, API calls may run before the URL updates — scope to target.
    const entitySwitch = useUiStore.getState().entitySwitch;
    if (entitySwitch?.code && isTenantCode(entitySwitch.code)) {
      const switchingId = getTenantByCode(entitySwitch.code)?.tenantId;
      if (switchingId) return switchingId;
    }

    if (segment === "admin") {
      const viewingCode = useAdminEntityStore.getState().viewingCode;
      // SP combined → primary VSP for single-tenant headers
      return adminViewingTenantId(viewingCode);
    }

    if (segment && isTenantCode(segment)) {
      const fromUrl = getTenantByCode(segment)?.tenantId ?? null;
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
