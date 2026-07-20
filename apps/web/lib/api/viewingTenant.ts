import { getTenantByCode, isTenantCode } from "@/lib/registries/tenants";
import { useAdminEntityStore } from "@/stores/adminEntityStore";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";

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
    const parts = window.location.pathname.split("/").filter(Boolean);
    const segment = parts[0];

    if (segment === "admin") {
      const viewingCode = useAdminEntityStore.getState().viewingCode;
      if (viewingCode) {
        return getTenantByCode(viewingCode)?.tenantId ?? null;
      }
      // Group consolidated view — no X-Viewing-Tenant (group endpoints).
      return null;
    }

    if (segment && isTenantCode(segment)) {
      return getTenantByCode(segment)?.tenantId ?? null;
    }
  }

  return (
    useTenantStore.getState().activeTenantId ??
    useTenantStore.getState().tenantConfig?.tenantId ??
    null
  );
}
