"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/organisms/Sidebar";
import { TopBar } from "@/components/organisms/TopBar";
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
import { AdminEntityContextBar } from "@/components/molecules/AdminEntityContextBar";
import { getTenantByCode } from "@/lib/registries/tenants";
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
  const viewingCode = useAdminEntityStore((state) => state.viewingCode);
  const viewingTenant = viewingCode ? getTenantByCode(viewingCode) : null;
  const topbarCode = viewingCode ?? "VAG";
  const topbarName = viewingTenant?.name ?? "Vonos Autos Group";

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

  if (!skipAuth && role && role !== "super_admin") {
    return null;
  }

  const pageTitle = title ?? adminPageTitle(pathname);
  const showContentLoader = !skipAuth && !hydrated;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        sections={VAG_NAV_SECTIONS}
        tenantName="Vonos Autos Group"
        tenantCode="VAG"
        userName={authName ?? undefined}
        userEmail={authEmail ?? undefined}
        activeRoute={pathname}
        isNavActive={isAdminNavActive}
        collapsed={sidebarCollapsed}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={pageTitle} tenantCode={topbarCode} tenantName={topbarName} />
        <AdminEntityContextBar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          {showContentLoader ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <PageTransition className="mx-auto max-w-[var(--space-content-max)]">
              {children}
            </PageTransition>
          )}
        </main>
      </div>
    </div>
  );
}
