"use client";

/**
 * Ultimate POS app shell — converted from layouts/app.blade.php.
 * Replaces Vonos Sidebar + TopBar for the VA trial tenant only.
 */
import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UposSidebar, type UposNavSection } from "@/components/upos/UposSidebar";
import { UposHeader } from "@/components/upos/UposHeader";
import { AdminViewingBanner } from "@/components/molecules/AdminViewingBanner";
import { PageTransition } from "@/components/atoms/PageTransition";
import { Hq6UposStyles } from "@/components/hq6/Hq6UposStyles";
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
}

export function UposAppShell({
  children,
  sections,
  tenantCode,
  tenantName,
  activeRoute,
  isNavActive,
  userName,
}: UposAppShellProps) {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  const authRole = useAuthStore((s) => s.role);
  const dateRange = useUiStore((s) => s.dateRange);
  const customDateRange = useUiStore((s) => s.customDateRange);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const prevBody = document.body.className;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.documentElement.classList.add("upos-hq6", "upos-shell");
    const collapse =
      typeof window !== "undefined" &&
      localStorage.getItem("upos_sidebar_collapse") === "true";
    setCollapsed(collapse);
    document.body.className = cn(BODY_BASE, collapse && "sidebar-collapse");
    return () => {
      document.body.className = prevBody;
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
      <Hq6UposStyles />
      <div className="tw-flex thetop" style={{ minHeight: "100vh" }}>
        {mobileOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
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
          className={cn(collapsed && "sidebar-collapse")}
        />

        <main className="tw-flex tw-flex-col tw-flex-1 tw-h-full tw-min-w-0 tw-bg-gray-100">
          {authRole === "super_admin" ? (
            <AdminViewingBanner
              tenantCode={tenantCode}
              tenantName={tenantName ?? tenantCode}
            />
          ) : null}

          <UposHeader
            tenantCode={tenantCode}
            userName={userName}
            onToggleMobile={() => setMobileOpen((v) => !v)}
            onToggleCollapse={() => setCollapsed((v) => !v)}
          />

          <div
            className="tw-flex-1 tw-overflow-y-auto tw-h-screen"
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
    </>
  );
}
