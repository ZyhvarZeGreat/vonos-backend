"use client";

import { useEffect, useRef } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTenantConfig } from "@/lib/api";
import { canAccessTenant } from "@/lib/utils/authRedirect";
import { isAuthSkipped } from "@/lib/utils/devAccess";
import { getTenantByCode, isTenantCode } from "@/lib/registries/tenants";
import { tenantAccentStyle } from "@/lib/registries/tenantAccents";
import {
  getTenantConfigByCode,
} from "@/lib/registries/tenantConfigs";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { PageShellSkeleton } from "@/components/organisms/skeletons";

export function TenantShell({ children }: { children: React.ReactNode }) {
  const params = useParams<{ tenant: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const previousTenantCode = useRef<string | null>(null);
  const hydrated = useAuthStore((state) => state.hydrated);
  const role = useAuthStore((state) => state.role);
  const userTenantId = useAuthStore((state) => state.tenantId);
  const setTenantConfig = useTenantStore((state) => state.setTenantConfig);
  const clearTenant = useTenantStore((state) => state.clearTenant);

  const skipAuth = isAuthSkipped();
  const tenantCode = params.tenant;
  const registryEntry = isTenantCode(tenantCode) ? getTenantByCode(tenantCode) : null;

  useEffect(() => {
    const stored = useTenantStore.getState().tenantConfig;
    if (stored && stored.code !== tenantCode) {
      clearTenant();
    }
    if (registryEntry?.tenantId) {
      useTenantStore.getState().setActiveTenant(registryEntry.tenantId);
    }
  }, [tenantCode, clearTenant, registryEntry?.tenantId]);

  useEffect(() => {
    if (
      previousTenantCode.current &&
      previousTenantCode.current !== tenantCode
    ) {
      queryClient.invalidateQueries();
    }
    previousTenantCode.current = tenantCode;
  }, [tenantCode, queryClient]);

  const configQuery = useQuery({
    queryKey: ["tenantConfig", registryEntry?.tenantId],
    queryFn: () => getTenantConfig(registryEntry!.tenantId),
    enabled: Boolean(registryEntry?.tenantId),
  });

  useEffect(() => {
    if (skipAuth) return;

    if (!hydrated) return;

    if (!registryEntry) {
      router.replace("/admin/overview");
      return;
    }
    if (!role) return;

    if (
      registryEntry.tenantId &&
      !canAccessTenant(role, userTenantId, registryEntry.tenantId)
    ) {
      router.replace("/admin/overview");
    }
  }, [skipAuth, hydrated, registryEntry, role, userTenantId, router]);

  useEffect(() => {
    if (configQuery.data) {
      setTenantConfig(configQuery.data);
      return;
    }
    if (skipAuth && registryEntry) {
      const fallbackConfig = getTenantConfigByCode(tenantCode);
      if (fallbackConfig) setTenantConfig(fallbackConfig);
    }
  }, [configQuery.data, skipAuth, registryEntry, tenantCode, setTenantConfig]);

  if (!registryEntry) {
    return <PageShellSkeleton />;
  }

  if (!skipAuth && !hydrated) {
    return <PageShellSkeleton />;
  }

  if (!skipAuth && configQuery.isLoading) {
    return <PageShellSkeleton />;
  }

  return (
    <div data-tenant={tenantCode} data-path={pathname} style={tenantAccentStyle(tenantCode)}>
      {children}
    </div>
  );
}
