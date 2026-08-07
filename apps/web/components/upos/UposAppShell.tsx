"use client";

/**
 * Ultimate POS app shell — converted from layouts/app.blade.php.
 * Replaces Vonos Sidebar + TopBar for HQ6 operating tenants.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UposSidebar, type UposNavSection } from "@/components/upos/UposSidebar";
import { UposHeader } from "@/components/upos/UposHeader";
import { AdminViewingBanner } from "@/components/molecules/AdminViewingBanner";
import { ApiHealthBanner } from "@/components/molecules/ApiHealthBanner";
import { PageTransition } from "@/components/atoms/PageTransition";
import { Hq6UposStyles } from "@/components/hq6/Hq6UposStyles";
import { CreateRecordModal } from "@/components/organisms/CreateRecordModal";
import { AddSaleModal } from "@/components/organisms/AddSaleModal";
import { AddProductModal } from "@/components/organisms/AddProductModal";
import { AddExpenseModal } from "@/components/organisms/AddExpenseModal";
import { ExportDocumentModal } from "@/components/organisms/ExportDocumentModal";
import { ensureUposStylesheets } from "@/lib/upos/styles";
import { prefetchRoute } from "@/lib/prefetch/routePrefetchRegistry";
import { dateRangePresetToApiBounds } from "@/lib/utils/dateRange";
import { useUiStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { isTenantCode } from "@/lib/registries/tenants";
import { cn } from "@/lib/utils/cn";

const BODY_BASE =
  "tw-font-sans tw-antialiased tw-text-gray-900 tw-bg-gray-100 hold-transition skin-blue-light sidebar-mini";

export interface UposAppShellProps {
  children: ReactNode;
  sections: UposNavSection[];
  tenantCode: string;
  tenantName?: string;
  activeRoute?: string;
  isNavActive?: (pathname: string, route: string) => boolean;
  userName?: string;
  /**
   * `admin` = VAG Group shell (entity switcher, no POS tools, optional
   * context bar). Same UPOS chrome as operating tenants.
   */
  variant?: "tenant" | "admin";
  /** Rendered under the UPOS header (e.g. VAG entity context strip). */
  contextBar?: ReactNode;
}

export function UposAppShell({
  children,
  sections,
  tenantCode,
  tenantName,
  activeRoute,
  isNavActive,
  userName,
  variant = "tenant",
  contextBar,
}: UposAppShellProps) {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  const authRole = useAuthStore((s) => s.role);
  const dateRange = useUiStore((s) => s.dateRange);
  const customDateRange = useUiStore((s) => s.customDateRange);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [stylesReady, setStylesReady] = useState(false);
  const isAdminShell = variant === "admin";

  const markStylesReady = useCallback(() => setStylesReady(true), []);

  // Apply shell classes before paint; wait for CSS so login→dashboard isn't FOUC.
  useLayoutEffect(() => {
    const prevBody = document.body.className;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.documentElement.classList.add("upos-hq6", "upos-shell");
    const collapse =
      typeof window !== "undefined" &&
      localStorage.getItem("upos_sidebar_collapse") === "true";
    setCollapsed(collapse);
    document.body.className = cn(BODY_BASE, collapse && "sidebar-collapse");

    let cancelled = false;
    void ensureUposStylesheets().then(() => {
      if (!cancelled) setStylesReady(true);
    });
    const failSafe = window.setTimeout(() => {
      if (!cancelled) setStylesReady(true);
    }, 2000);

    return () => {
      cancelled = true;
      window.clearTimeout(failSafe);
      document.body.className = prevBody
        .split(/\s+/)
        .filter(
          (c) =>
            c &&
            !c.startsWith("skin-") &&
            c !== "hold-transition" &&
            c !== "sidebar-mini" &&
            c !== "sidebar-collapse" &&
            !c.startsWith("tw-"),
        )
        .join(" ");
      document.documentElement.classList.remove("upos-hq6", "upos-shell");
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    document.body.className = cn(BODY_BASE, collapsed && "sidebar-collapse");
    localStorage.setItem("upos_sidebar_collapse", collapsed ? "true" : "false");
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [activeRoute]);

  const dateBounds = dateRangePresetToApiBounds(
    dateRange,
    new Date(),
    customDateRange,
  );

  const prefetchNavRoute = (route: string) => {
    prefetchRoute(queryClient, {
      pathname: route,
      tenantCode: isTenantCode(tenantCode) ? tenantCode : undefined,
      tenantId: tenantId ?? undefined,
      dateBounds,
    });
  };

  return (
    <>
      <Hq6UposStyles onReady={markStylesReady} />
      {!stylesReady ? (
        <div
          aria-busy="true"
          aria-label="Loading workspace"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "#f3f4f6",
          }}
        />
      ) : null}
      <div
        className="tw-flex thetop"
        style={{
          minHeight: "100vh",
          visibility: stylesReady ? "visible" : "hidden",
        }}
      >
        {mobileOpen ? (
          <button
            type="button"
            className="upos-mobile-nav-backdrop tw-fixed tw-inset-0 lg:tw-hidden"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        <UposSidebar
          sections={sections}
          tenantName={tenantName}
          activeRoute={activeRoute}
          isNavActive={isNavActive}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          onItemPrefetch={tenantId ? prefetchNavRoute : undefined}
          /* Never apply desktop collapse while the mobile drawer is open */
          className={cn(collapsed && !mobileOpen && "sidebar-collapse")}
        />

        <main className="tw-flex tw-flex-col tw-flex-1 tw-h-full tw-min-w-0 tw-bg-gray-100">
          <ApiHealthBanner />
          {!isAdminShell && authRole === "super_admin" ? (
            <AdminViewingBanner
              tenantCode={tenantCode}
              tenantName={tenantName ?? tenantCode}
            />
          ) : null}

          <UposHeader
            tenantCode={tenantCode}
            tenantName={tenantName}
            userName={userName}
            variant={variant}
            onToggleMobile={() => setMobileOpen((v) => !v)}
            onToggleCollapse={() => setCollapsed((v) => !v)}
          />

          {contextBar}

          <div
            className="tw-flex-1 tw-min-w-0 tw-overflow-y-auto tw-overflow-x-auto"
            id="scrollable-container"
            onScroll={(e) => {
              setShowScrollTop(e.currentTarget.scrollTop > 200);
            }}
          >
            <PageTransition className="mx-auto w-full max-w-none">
              {children}
            </PageTransition>

            <div className="tw-mt-auto">
              <div className="tw-mb-4 tw-ms-8 -tw-mt-1 no-print">
                <p className="tw-text-xs tw-font-normal tw-text-gray-500">
                  Vonos Autos Head Office -{" "}
                  <span className="tw-font-mono tw-font-medium">V8.1</span> |
                  Copyright © {new Date().getFullYear()} All rights reserved.
                </p>
              </div>
            </div>
          </div>

          <div
            className={cn("scrolltop no-print", showScrollTop && "active")}
            role="button"
            tabIndex={0}
            onClick={() => {
              document
                .getElementById("scrollable-container")
                ?.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                document
                  .getElementById("scrollable-container")
                  ?.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
          >
            <div className="scroll icon">
              <i className="fas fa-angle-up" />
            </div>
          </div>
        </main>
      </div>
      {/* Global create/export modals — previously only mounted in TopBar,
          which UPOS shell does not use. Without these, Add Customer/Supplier
          and store-driven finance/export actions update uiStore with no UI. */}
      <CreateRecordModal />
      <AddSaleModal />
      <AddProductModal />
      <AddExpenseModal />
      <ExportDocumentModal />
    </>
  );
}
