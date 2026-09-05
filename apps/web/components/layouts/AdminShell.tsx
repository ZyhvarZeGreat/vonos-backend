"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AdminEntityContextBar } from "@/components/molecules/AdminEntityContextBar";
import { getPostLoginPath } from "@/lib/utils/authRedirect";
import { isAuthSkipped } from "@/lib/utils/devAccess";
import {
  filterVagNavSectionsByPermissions,
  isAdminNavActive,
  VAG_NAV_SECTIONS,
  VAG_NAV_VIEW_PERMISSIONS,
} from "@/lib/registries/vagNavSections";
import { useAuthStore } from "@/stores/authStore";
import { useAdminEntityStore } from "@/stores/adminEntityStore";
import {
  accentTenantCodeForVagUnit,
  getVagViewUnit,
  isVagViewUnitId,
} from "@/lib/registries/vagViewUnits";
import { tenantAccentStyle, uposThemeVars } from "@/lib/registries/tenantAccents";
import { scheduleIdle } from "@/lib/prefetch/scheduleIdle";
import { prefetchVagAdminShell } from "@/lib/prefetch/routePrefetchRegistry";
import { UposAppShell } from "@/components/upos/UposAppShell";
import { TopProgressBar } from "@/components/atoms/TopProgressBar";
import { useAppPermissions } from "@/lib/hooks/useHq6Permissions";

/**
 * VAG Group admin shell — same Ultimate POS chrome as operating tenants
 * (`html.upos-shell` + `html.upos-hq6`) so forms, selects, and page layout match.
 */
export function AdminShell({
  children,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const skipAuth = isAuthSkipped();
  const hydrated = useAuthStore((state) => state.hydrated);
  const role = useAuthStore((state) => state.role);
  const tenantId = useAuthStore((state) => state.tenantId);
  const tenantRoleName = useAuthStore((state) => state.tenantRoleName);
  const authName = useAuthStore((state) => state.name);
  const authEmail = useAuthStore((state) => state.email);
  const viewingCode = useAdminEntityStore((state) => state.viewingCode);
  const { canAny, isFullAccess, isVag } = useAppPermissions();
  const viewingUnit =
    viewingCode && isVagViewUnitId(viewingCode)
      ? getVagViewUnit(viewingCode)
      : null;
  /** Accent — viewing unit, else slate VAG (never default to VA green on Group). */
  const shellAccentCode = viewingUnit
    ? accentTenantCodeForVagUnit(viewingUnit.id)
    : "VAG";
  const onGroupOverview =
    pathname === "/admin/overview" || pathname.startsWith("/admin/overview/");
  /** Users assign entities on the form / list is group-wide — no second location select. */
  const onHrmUsers = pathname.startsWith("/admin/hrm/users");
  /** Payroll lists all businesses — entity switcher not required. */
  const onHrmPayroll = pathname.startsWith("/admin/hrm/payroll");
  const showEntityContextBar = !onGroupOverview && !onHrmUsers && !onHrmPayroll;

  const navSections = useMemo(
    () =>
      filterVagNavSectionsByPermissions(
        VAG_NAV_SECTIONS,
        canAny,
        isFullAccess,
      ),
    [canAny, isFullAccess],
  );

  useEffect(() => {
    if (skipAuth) return;
    if (!hydrated) return;
    if (role && !isVag) {
      router.replace(getPostLoginPath(role, tenantId, tenantRoleName));
    }
  }, [skipAuth, hydrated, role, isVag, tenantId, tenantRoleName, router]);

  // Block deep-links to Finance / financial Reports when the assigned role
  // does not include those permissions (e.g. HR on VAG).
  useEffect(() => {
    if (skipAuth || !hydrated || !isVag) return;
    if (isFullAccess) return;
    const match = Object.entries(VAG_NAV_VIEW_PERMISSIONS).find(([route]) => {
      if (route === "/admin/overview") return false;
      return pathname === route || pathname.startsWith(`${route}/`);
    });
    if (!match) return;
    const [, keys] = match;
    if (keys.length === 0) return;
    if (!canAny(...keys)) {
      router.replace("/admin/hrm/users");
    }
  }, [skipAuth, hydrated, isVag, isFullAccess, canAny, pathname, router]);

  useEffect(() => {
    if (skipAuth) return;
    if (!hydrated || !isVag) return;
    scheduleIdle(() => prefetchVagAdminShell(queryClient));
  }, [skipAuth, hydrated, isVag, queryClient]);

  useEffect(() => {
    const theme = uposThemeVars(shellAccentCode);
    const root = document.documentElement;
    for (const [key, value] of Object.entries(theme)) {
      root.style.setProperty(key, value);
    }
  }, [shellAccentCode]);

  if (!skipAuth && role && !isVag) {
    return null;
  }

  return (
    <div
      data-hq6="true"
      data-upos-shell="true"
      data-tenant={shellAccentCode}
      style={tenantAccentStyle(shellAccentCode)}
      className="min-h-screen tw-bg-gray-100"
    >
      <TopProgressBar />
      <UposAppShell
        variant="admin"
        sections={navSections}
        tenantCode={shellAccentCode}
        tenantName="Vonos Autos Group"
        activeRoute={pathname}
        isNavActive={isAdminNavActive}
        userName={authName ?? authEmail ?? undefined}
        contextBar={
          showEntityContextBar ? <AdminEntityContextBar /> : undefined
        }
      >
        {!skipAuth && !hydrated ? (
          <div className="min-h-[40vh]" aria-hidden />
        ) : (
          children
        )}
      </UposAppShell>
    </div>
  );
}
