"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { announceRedirect } from "@/lib/utils/announceRedirect";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { tenantPath } from "@/lib/utils/tenantMount";

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
    return tenantPath(tenant, listSlug, recordId);
  };

  const listPath = adminHrm
    ? `/admin/hrm/${listSlug}`
    : tenantPath(tenant, listSlug);

  return {
    detailPath,
    /** Prefetch the Next.js route chunk so the first navigation isn't a compile wait. */
    prefetchDetail: (recordId: string) => {
      router.prefetch(detailPath(recordId));
    },
    goToDetail: (recordId: string, label = "Opening…") => {
      announceRedirect(label);
      router.prefetch(detailPath(recordId));
      router.push(detailPath(recordId));
    },
    listPath,
    goToList: (label = "Redirecting to list…") => {
      announceRedirect(label);
      router.push(listPath);
    },
  };
}
