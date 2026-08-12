import type { QueryClient } from "@tanstack/react-query";
import type { Role } from "@vonos/types";
import { getTenantConfig } from "@/lib/api";
import { prefetchGroupOverview } from "@/lib/prefetch/prefetchGroupOverview";
import {
  prefetchRoute,
  ROUTE_PREFETCH_STALE_MS,
} from "@/lib/prefetch/routePrefetchRegistry";
import { getTenantByCode, getTenantCodeFromId } from "@/lib/registries/tenants";
import { getTenantConfigByCode } from "@/lib/registries/tenantConfigs";
import { getPostLoginPath } from "@/lib/utils/authRedirect";
import { useTenantStore } from "@/stores/tenantStore";

/**
 * Warm destination RSC + React Query cache before `router.replace` so
 * post-login shell paint is not blocked on cold fetches.
 */
export function warmPostLoginDestination(
  queryClient: QueryClient,
  options: {
    role: Role;
    tenantId: string | null;
    tenantRoleName?: string | null;
    destination?: string;
  },
): string {
  const destination =
    options.destination ??
    getPostLoginPath(options.role, options.tenantId, options.tenantRoleName);

  if (destination.startsWith("/admin")) {
    prefetchGroupOverview(queryClient);
    return destination;
  }

  const code = getTenantCodeFromId(options.tenantId);
  if (!code) return destination;

  const config = getTenantConfigByCode(code);
  if (config) {
    useTenantStore.getState().setTenantConfig(config);
  }

  const tenant = getTenantByCode(code);
  if (tenant) {
    useTenantStore.getState().setActiveTenant(tenant.tenantId);
    void queryClient.prefetchQuery({
      queryKey: ["tenantConfig", tenant.tenantId],
      queryFn: () => getTenantConfig(tenant.tenantId),
      staleTime: ROUTE_PREFETCH_STALE_MS,
    });
    prefetchRoute(queryClient, {
      pathname: destination,
      tenantCode: code,
      tenantId: tenant.tenantId,
    });
    // All entities share the HQ6 Ultimate POS home chunk.
    void import("@/components/pages/Hq6OverviewView");
  }

  return destination;
}
