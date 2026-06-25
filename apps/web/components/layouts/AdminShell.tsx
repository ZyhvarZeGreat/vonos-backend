"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import { useUiStore } from "@/stores/uiStore";
import { PageShellSkeleton } from "@/components/organisms/skeletons";

export function AdminShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const skipAuth = isAuthSkipped();
  const hydrated = useAuthStore((state) => state.hydrated);
  const role = useAuthStore((state) => state.role);
  const tenantId = useAuthStore((state) => state.tenantId);
  const authName = useAuthStore((state) => state.name);
  const authEmail = useAuthStore((state) => state.email);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);

  useEffect(() => {
    if (skipAuth) return;
    if (!hydrated) return;
    if (role && role !== "super_admin") {
      router.replace(getPostLoginPath(role, tenantId));
    }
  }, [skipAuth, hydrated, role, tenantId, router]);

  if (!skipAuth && !hydrated) {
    return <PageShellSkeleton />;
  }

  if (!skipAuth && role && role !== "super_admin") {
    return null;
  }

  const pageTitle = title ?? adminPageTitle(pathname);

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
        <TopBar title={pageTitle} tenantCode="VAG" tenantName="Vonos Autos Group" />
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="mx-auto max-w-[var(--space-content-max)]">{children}</div>
        </main>
      </div>
    </div>
  );
}
