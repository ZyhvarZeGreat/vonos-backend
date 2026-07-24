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
 * Operating tenants always; all `/admin/*` VAG routes match VA HQ6 as well.
 */
export function useIsVaHq6(): boolean {
  const pathname = usePathname();
  const { tenantCode } = useRouteTenant();
  if (isAdminPath(pathname)) return true;
  return isHq6Tenant(tenantCode);
}
