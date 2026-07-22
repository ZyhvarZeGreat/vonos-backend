"use client";

import { useRouteTenant } from "@/lib/hooks/useRouteTenant";

/** True when the current tenant shell should use the HQ6 Ultimate POS visual theme. */
export function useIsVaHq6(): boolean {
  const { tenantCode } = useRouteTenant();
  return tenantCode === "VA";
}
