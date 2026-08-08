"use client";

import { useParams, usePathname } from "next/navigation";
import type { TenantConfig } from "@vonos/types";
import { isGroupStockConsumerTenant } from "@vonos/types";
import {
  getTenantByCode,
  isTenantCode,
  type TenantCode,
} from "@/lib/registries/tenants";
import { getTenantConfigByCode } from "@/lib/registries/tenantConfigs";
import { getVagViewUnit, isVagViewUnitId } from "@/lib/registries/vagViewUnits";
import {
  ADMIN_DEFAULT_ENTITY,
  useAdminEntityStore,
} from "@/stores/adminEntityStore";
import { useTenantStore } from "@/stores/tenantStore";

/**
 * Route tenant = source of truth from the URL (`/VW/...`, `/VSP/...`).
 * On `/admin/*`, falls back to the admin viewing entity (or VA when a
 * concrete tenant is required and Group is selected).
 * Combined SP → primary VSP for single-tenant modules.
 * Combined SP → primary VISP for single-tenant modules.
 */
export function useRouteTenant(options?: { adminFallback?: TenantCode | null }) {
  const params = useParams<{ tenant: string }>();
  const pathname = usePathname();
  const tenantCodeParam = params.tenant;
  const adminViewing = useAdminEntityStore((state) => state.viewingCode);
  const storedConfig = useTenantStore((state) => state.tenantConfig);

  if (isTenantCode(tenantCodeParam)) {
    const registry = getTenantByCode(tenantCodeParam);
    const registryConfig = getTenantConfigByCode(tenantCodeParam);
    // Prefer live store config when it matches the URL; otherwise fall back to
    // the static registry so VA/VP archetype (job / price-catalog) is never lost.
    const stored =
      storedConfig?.code === tenantCodeParam ? storedConfig : null;
    const merged = stored ?? registryConfig;
    const config: TenantConfig | null =
      merged && isGroupStockConsumerTenant(tenantCodeParam)
        ? { ...merged, archetype: "job" }
        : merged;
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
    const unitOrTenant = adminViewing ?? fallback ?? null;
    const code =
      unitOrTenant && isVagViewUnitId(unitOrTenant)
        ? getVagViewUnit(unitOrTenant).enterCode
        : unitOrTenant && isTenantCode(unitOrTenant)
          ? unitOrTenant
          : null;
    if (code && isTenantCode(code)) {
      const registry = getTenantByCode(code);
      const unitName =
        adminViewing && isVagViewUnitId(adminViewing)
          ? getVagViewUnit(adminViewing).name
          : null;
      return {
        tenantCode: code,
        tenantId: registry?.tenantId ?? null,
        registry,
        config: getTenantConfigByCode(code),
        tenantName: unitName ?? registry?.name ?? code,
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
