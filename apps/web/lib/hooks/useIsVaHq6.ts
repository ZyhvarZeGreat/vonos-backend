"use client";

import { usePathname } from "next/navigation";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { isHq6Tenant } from "@/lib/utils/isHq6Tenant";

/** Entire VAG admin shell uses HQ6 chrome (same as VA). */
function isAdminPath(pathname: string | null): boolean {
  return Boolean(pathname?.startsWith("/admin"));
}

/**
 * True when the current shell should use the HQ6 Ultimate POS visual theme.
 * All operating tenants (VA, VP, VW, VISP, VSP, VC, VS, VKW); `/admin/*` too.
 * Name is historical — not VA-only.
 */
export function useIsVaHq6(): boolean {
  const pathname = usePathname();
  const { tenantCode } = useRouteTenant();
  if (isAdminPath(pathname)) return true;
  return isHq6Tenant(tenantCode);
}

/** Alias — prefer this name in new code. */
export const useIsHq6 = useIsVaHq6;
