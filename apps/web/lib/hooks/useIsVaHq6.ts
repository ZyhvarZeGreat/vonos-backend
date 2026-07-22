"use client";

import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { isHq6Tenant } from "@/lib/utils/isHq6Tenant";

/**
 * True when the current tenant shell should use the HQ6 Ultimate POS visual theme.
 * Name kept for call-site stability; applies to all operating tenants, not only VA.
 */
export function useIsVaHq6(): boolean {
  const { tenantCode } = useRouteTenant();
  return isHq6Tenant(tenantCode);
}
