"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useHq6Permissions } from "@/lib/hooks/useHq6Permissions";
import { useHrmAccess } from "@/lib/hooks/useHrmAccess";
import { HQ6_NAV_VIEW_PERMISSIONS } from "@/lib/registries/hq6NavPermissions";
import { notifyInsufficientPrivilege } from "@/lib/utils/privilegeToast";
import { parseTenantPath } from "@/lib/utils/tenantRoutes";
import { isAuthSkipped } from "@/lib/utils/devAccess";
import { useAuthStore } from "@/stores/authStore";
import { tenantBasePath } from "@/lib/utils/tenantMount";

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
  const { canManageHrm } = useHrmAccess();
  const hydrated = useAuthStore((s) => s.hydrated);
  const lastDenied = useRef<string | null>(null);

  useEffect(() => {
    if (isAuthSkipped()) return;
    if (!hydrated) return;
    if (isFullAccess) return;
    const { section: slug, recordId } = parseTenantPath(pathname);
    if (!slug || slug === "overview") return;

    // HRM is private to HR / Accountant / Admin; everyone else may only open
    // the module root or their own payslips.
    if (slug === "hrm") {
      if (canManageHrm || recordId === null || recordId === "my-payrolls") {
        if (lastDenied.current === pathname) lastDenied.current = null;
        return;
      }
      if (lastDenied.current === pathname) return;
      lastDenied.current = pathname;
      notifyInsufficientPrivilege("view");
      router.replace(`${tenantBasePath(tenantCode)}/hrm/my-payrolls`);
      return;
    }

    const keys = HQ6_NAV_VIEW_PERMISSIONS[slug];
    if (!keys || keys.length === 0) return;
    if (canAny(...keys)) {
      if (lastDenied.current === pathname) lastDenied.current = null;
      return;
    }
    if (lastDenied.current === pathname) return;
    lastDenied.current = pathname;
    notifyInsufficientPrivilege("view");
    router.replace(`${tenantBasePath(tenantCode)}/overview`);
  }, [pathname, canAny, isFullAccess, canManageHrm, hydrated, router, tenantCode]);

  return null;
}
