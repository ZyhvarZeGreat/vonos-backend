"use client";

import { useParams } from "next/navigation";
import type { TenantConfig } from "@vonos/types";
import {
  getTenantByCode,
  isTenantCode,
  type TenantCode,
} from "@/lib/registries/tenants";
import { useTenantStore } from "@/stores/tenantStore";

/**
 * Route tenant = source of truth from the URL (`/VW/...`, `/VISP/...`).
 * Store config is only used when its `code` matches the route tenant.
 */
export function useRouteTenant() {
  const params = useParams<{ tenant: string }>();
  const tenantCode = params.tenant;
  const registry = isTenantCode(tenantCode) ? getTenantByCode(tenantCode) : null;
  const storedConfig = useTenantStore((state) => state.tenantConfig);

  const config: TenantConfig | null =
    storedConfig?.code === tenantCode ? storedConfig : null;

  return {
    tenantCode: isTenantCode(tenantCode) ? (tenantCode as TenantCode) : null,
    tenantId: registry?.tenantId ?? null,
    registry,
    config,
    tenantName: config?.name ?? registry?.name ?? tenantCode,
  };
}

/** Tenant id for API calls — always from the URL registry, never a random fallback. */
export function useTenantId(): string | null {
  return useRouteTenant().tenantId;
}
