import { getTenantByCode, isTenantCode } from "@/lib/registries/tenants";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";

/**
 * Tenant id the API should scope to for the current screen.
 * Super admins: URL path (`/VM/finance` → Vonos Mechanics) beats store (can be stale).
 * Everyone else: JWT tenant only.
 */
export function resolveViewingTenantId(): string | null {
  const { role, tenantId: authTenantId } = useAuthStore.getState();

  if (role !== "super_admin") {
    return authTenantId;
  }

  if (typeof window !== "undefined") {
    const segment = window.location.pathname.split("/").filter(Boolean)[0];
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
