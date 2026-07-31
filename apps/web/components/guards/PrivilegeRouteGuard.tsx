"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useHq6Permissions } from "@/lib/hooks/useHq6Permissions";
import { HQ6_NAV_VIEW_PERMISSIONS } from "@/lib/registries/hq6NavPermissions";
import { notifyInsufficientPrivilege } from "@/lib/utils/privilegeToast";
import { parseTenantPath } from "@/lib/utils/tenantRoutes";

function routeSlugFromPath(pathname: string): string {
  const { section } = parseTenantPath(pathname);
  return section || "";
}

/**
 * If the user opens a page their role cannot view, toast once and send them home.
 */
export function PrivilegeRouteGuard({
  tenantCode,
}: {
  tenantCode: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { canAny, isFullAccess } = useHq6Permissions();
  const lastDenied = useRef<string | null>(null);

  useEffect(() => {
    if (isFullAccess) return;
    const slug = routeSlugFromPath(pathname);
    if (!slug || slug === "overview") return;
    const keys = HQ6_NAV_VIEW_PERMISSIONS[slug];
    if (!keys || keys.length === 0) return;
    if (canAny(...keys)) {
      if (lastDenied.current === pathname) lastDenied.current = null;
      return;
    }
    if (lastDenied.current === pathname) return;
    lastDenied.current = pathname;
    notifyInsufficientPrivilege("view");
    router.replace(`/${tenantCode}/overview`);
  }, [pathname, canAny, isFullAccess, router, tenantCode]);

  return null;
}
