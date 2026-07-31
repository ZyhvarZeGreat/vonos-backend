"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { startNavigationProgress } from "@/stores/navigationBusyStore";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";

export function useRecordNavigation(listSlug: string) {
  const params = useParams<{ tenant: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { tenantCode } = useRouteTenant({ adminFallback: null });

  /** VAG admin HRM hosts the same user/role forms under /admin/hrm/*. */
  const adminHrm =
    Boolean(pathname?.startsWith("/admin/hrm")) &&
    (listSlug === "users" || listSlug === "roles");

  const tenant = params.tenant || tenantCode || "";

  const detailPath = (recordId: string) => {
    if (adminHrm) {
      return `/admin/hrm/${listSlug}/${recordId}`;
    }
    return `/${tenant}/${listSlug}/${recordId}`;
  };

  const listPath = adminHrm
    ? `/admin/hrm/${listSlug}`
    : `/${tenant}/${listSlug}`;

  return {
    detailPath,
    /** Prefetch the Next.js route chunk so the first navigation isn't a compile wait. */
    prefetchDetail: (recordId: string) => {
      router.prefetch(detailPath(recordId));
    },
    goToDetail: (recordId: string) => {
      startNavigationProgress();
      router.prefetch(detailPath(recordId));
      router.push(detailPath(recordId));
    },
    listPath,
    goToList: () => {
      startNavigationProgress();
      router.push(listPath);
    },
  };
}
