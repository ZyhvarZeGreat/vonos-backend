"use client";

import { useParams, usePathname } from "next/navigation";
import { Sidebar } from "@/components/organisms/Sidebar";
import { TopBar } from "@/components/organisms/TopBar";
import { isNavRouteActive, parseTenantPath } from "@/lib/utils/tenantRoutes";
import { getEntityPageMeta } from "@/lib/registries/entityPageMeta";
import { navSectionsForTenant } from "@/lib/utils/navRoutes";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { useRecordTitle } from "@/lib/hooks/useRecordTitle";
import { TenantShell } from "@/components/layouts/TenantShell";
import { AdminViewingBanner } from "@/components/molecules/AdminViewingBanner";
import { PageTransition } from "@/components/atoms/PageTransition";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantShell>
      <TenantLayoutInner>{children}</TenantLayoutInner>
    </TenantShell>
  );
}

function TenantLayoutInner({ children }: { children: React.ReactNode }) {
  const params = useParams<{ tenant: string }>();
  const pathname = usePathname();
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const openCreateModal = useUiStore((state) => state.openCreateModal);
  const openExportModal = useUiStore((state) => state.openExportModal);
  const { tenantId, config, tenantName } = useRouteTenant();
  const authName = useAuthStore((state) => state.name);
  const authEmail = useAuthStore((state) => state.email);
  const authRole = useAuthStore((state) => state.role);
  const navSections = navSectionsForTenant(params.tenant, config);

  const { section, recordId } = parseTenantPath(pathname);
  const detailTitle = useRecordTitle(
    recordId ? section : "",
    recordId,
    tenantId,
  );

  const pageConfig = getEntityPageMeta(params.tenant, section);
  const isFinance = section === "finance";
  const isOverview = section === "overview";

  const pageTitle =
    detailTitle ??
    pageConfig?.title ??
    (isOverview
      ? "Overview"
      : isFinance
        ? "Finance"
        : section.charAt(0).toUpperCase() + section.slice(1).replace(/-/g, " "));

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        sections={navSections}
        tenantName={tenantName ?? params.tenant}
        tenantCode={params.tenant}
        userName={authName ?? undefined}
        userEmail={authEmail ?? undefined}
        activeRoute={pathname}
        isNavActive={isNavRouteActive}
        collapsed={sidebarCollapsed}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {authRole === "super_admin" ? (
          <AdminViewingBanner
            tenantCode={params.tenant}
            tenantName={tenantName ?? params.tenant}
          />
        ) : null}
        <TopBar
          title={pageTitle}
          tenantCode={params.tenant}
          tenantName={tenantName ?? params.tenant}
          primaryActionLabel={
            recordId || isOverview || isFinance
              ? undefined
              : pageConfig?.primaryActionLabel
          }
          onPrimaryAction={
            recordId || isOverview
              ? undefined
              : pageConfig?.openCreateOnPrimary && pageConfig.createFlowKey
                ? () =>
                    openCreateModal(
                      pageConfig.createFlowKey!,
                      pageConfig.createCopy ?? pageConfig.newOrderCopy,
                    )
                : isFinance
                  ? () =>
                      openExportModal({
                        title: "Export Finance",
                        subtitle: "Export current tab as CSV",
                      })
                  : undefined
          }
        />
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <PageTransition className="mx-auto max-w-[var(--space-content-max)]">
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
