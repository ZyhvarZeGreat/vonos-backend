"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/organisms/Sidebar";
import { TopBar } from "@/components/organisms/TopBar";
import { AdminEntityContextBar } from "@/components/molecules/AdminEntityContextBar";
import { getPostLoginPath } from "@/lib/utils/authRedirect";
import { isAuthSkipped } from "@/lib/utils/devAccess";
import {
  isAdminNavActive,
  VAG_NAV_SECTIONS,
} from "@/lib/registries/vagNavSections";
import { adminPageTitle } from "@/lib/utils/adminPageTitle";
import { useAuthStore } from "@/stores/authStore";
import { useAdminEntityStore } from "@/stores/adminEntityStore";
import { useUiStore } from "@/stores/uiStore";
import { PageTransition } from "@/components/atoms/PageTransition";
import { Spinner } from "@/components/atoms/Spinner";
import { Hq6UposStyles } from "@/components/hq6/Hq6UposStyles";
import {
  accentTenantCodeForVagUnit,
  getVagViewUnit,
  isVagViewUnitId,
} from "@/lib/registries/vagViewUnits";
import { tenantAccentStyle } from "@/lib/registries/tenantAccents";
import { scheduleIdle } from "@/lib/prefetch/scheduleIdle";
import { prefetchVagAdminShell } from "@/lib/prefetch/routePrefetchRegistry";

export function AdminShell({
  children,
  title,
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
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const mobileNavOpen = useUiStore((state) => state.mobileNavOpen);
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);
  const viewingCode = useAdminEntityStore((state) => state.viewingCode);
  const viewingUnit =
    viewingCode && isVagViewUnitId(viewingCode)
      ? getVagViewUnit(viewingCode)
      : null;
  /** Accent for HQ6 tokens — viewing unit, else VA green like HQ6 Home. */
  const hq6AccentCode = viewingUnit
    ? accentTenantCodeForVagUnit(viewingUnit.id)
    : "VA";
  /** Switcher identity — VAG when consolidated so Group is the active item. */
  const topbarCode = viewingUnit
    ? accentTenantCodeForVagUnit(viewingUnit.id)
    : "VAG";
  const topbarName = viewingUnit?.name ?? "Vonos Autos Group";

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
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  if (!skipAuth && role && role !== "super_admin") {
    return null;
  }

  const pageTitle = title ?? adminPageTitle(pathname);

  return (
    <div
      className="flex h-screen overflow-hidden bg-background"
      data-hq6="true"
      data-tenant={hq6AccentCode}
      style={tenantAccentStyle(hq6AccentCode)}
    >
      <Hq6UposStyles />
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <Sidebar
        sections={VAG_NAV_SECTIONS}
        tenantName="Vonos Autos Group"
        tenantCode={hq6AccentCode}
        userName={authName ?? undefined}
        userEmail={authEmail ?? undefined}
        activeRoute={pathname}
        isNavActive={isAdminNavActive}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={pageTitle}
          tenantCode={topbarCode}
          tenantName={topbarName}
          variant="admin"
        />
        <AdminEntityContextBar />
        <main className="flex-1 overflow-y-auto">
          {!skipAuth && !hydrated ? (
            <div className="space-y-4 p-4">
              <p className="text-sm text-muted">Loading {pageTitle}…</p>
              <div className="flex min-h-[20vh] items-center justify-center">
                <Spinner size="lg" />
              </div>
            </div>
          ) : (
            <PageTransition className="mx-auto w-full max-w-none">
              {children}
            </PageTransition>
          )}
        </main>
      </div>
    </div>
  );
}
