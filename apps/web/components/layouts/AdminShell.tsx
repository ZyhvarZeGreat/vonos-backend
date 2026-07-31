"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AdminEntityContextBar } from "@/components/molecules/AdminEntityContextBar";
import { getPostLoginPath } from "@/lib/utils/authRedirect";
import { isAuthSkipped } from "@/lib/utils/devAccess";
import {
  isAdminNavActive,
  VAG_NAV_SECTIONS,
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
import { Spinner } from "@/components/atoms/Spinner";

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
  const authName = useAuthStore((state) => state.name);
  const authEmail = useAuthStore((state) => state.email);
  const viewingCode = useAdminEntityStore((state) => state.viewingCode);
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

  useEffect(() => {
    if (skipAuth) return;
    if (!hydrated) return;
    if (role && role !== "super_admin") {
      router.replace(getPostLoginPath(role, tenantId));
    }
  }, [skipAuth, hydrated, role, tenantId, router]);

  useEffect(() => {
    if (skipAuth) return;
    if (!hydrated || role !== "super_admin") return;
    scheduleIdle(() => prefetchVagAdminShell(queryClient));
  }, [skipAuth, hydrated, role, queryClient]);

  useEffect(() => {
    const theme = uposThemeVars(shellAccentCode);
    const root = document.documentElement;
    for (const [key, value] of Object.entries(theme)) {
      root.style.setProperty(key, value);
    }
  }, [shellAccentCode]);

  if (!skipAuth && role && role !== "super_admin") {
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
        sections={VAG_NAV_SECTIONS}
        tenantCode={shellAccentCode}
        tenantName="Vonos Autos Group"
        activeRoute={pathname}
        isNavActive={isAdminNavActive}
        userName={authName ?? authEmail ?? undefined}
        contextBar={
          !onGroupOverview ? <AdminEntityContextBar /> : undefined
        }
      >
        {!skipAuth && !hydrated ? (
          <div className="hq6-page space-y-4 p-4">
            <p className="text-sm text-muted">Loading…</p>
            <div className="flex min-h-[20vh] items-center justify-center">
              <Spinner size="lg" />
            </div>
          </div>
        ) : (
          children
        )}
      </UposAppShell>
    </div>
  );
}
