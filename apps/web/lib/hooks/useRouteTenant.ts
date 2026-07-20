"use client";

import { useParams, usePathname } from "next/navigation";
import type { TenantConfig } from "@vonos/types";
import {
  getTenantByCode,
  isTenantCode,
  type TenantCode,
} from "@/lib/registries/tenants";
import {
  ADMIN_DEFAULT_ENTITY,
  useAdminEntityStore,
} from "@/stores/adminEntityStore";
import { useTenantStore } from "@/stores/tenantStore";

/**
 * Route tenant = source of truth from the URL (`/VW/...`, `/VISP/...`).
 * On `/admin/*`, falls back to the admin viewing entity (or VA when a
 * concrete tenant is required and Group is selected).
 */
export function useRouteTenant(options?: { adminFallback?: TenantCode | null }) {
  const params = useParams<{ tenant: string }>();
  const pathname = usePathname();
  const tenantCodeParam = params.tenant;
  const adminViewing = useAdminEntityStore((state) => state.viewingCode);
  const storedConfig = useTenantStore((state) => state.tenantConfig);

  if (isTenantCode(tenantCodeParam)) {
    const registry = getTenantByCode(tenantCodeParam);
    const config: TenantConfig | null =
      storedConfig?.code === tenantCodeParam ? storedConfig : null;
    return {
      tenantCode: tenantCodeParam as TenantCode,
      tenantId: registry?.tenantId ?? null,
      registry,
      config,
      tenantName: config?.name ?? registry?.name ?? tenantCodeParam,
    };
  }

  if (pathname?.startsWith("/admin")) {
    const fallback =
      options && "adminFallback" in options
        ? options.adminFallback
        : ADMIN_DEFAULT_ENTITY;
    const code = adminViewing ?? fallback ?? null;
    if (code && isTenantCode(code)) {
      const registry = getTenantByCode(code);
      return {
        tenantCode: code,
        tenantId: registry?.tenantId ?? null,
        registry,
        config: null as TenantConfig | null,
        tenantName: registry?.name ?? code,
      };
    }
  }

  return {
    tenantCode: null,
    tenantId: null,
    registry: null,
    config: null as TenantConfig | null,
    tenantName: "" as string,
  };
}

/** Tenant id for API calls — URL registry, or admin viewing (no VA default). */
export function useTenantId(): string | null {
  return useRouteTenant({ adminFallback: null }).tenantId;
}
