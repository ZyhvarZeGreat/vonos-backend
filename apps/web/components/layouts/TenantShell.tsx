"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTenantConfig } from "@/lib/api";
import { canAccessTenant } from "@/lib/utils/authRedirect";
import { isAuthSkipped } from "@/lib/utils/devAccess";
import { getTenantByCode, isTenantCode } from "@/lib/registries/tenants";
import { tenantAccentStyle } from "@/lib/registries/tenantAccents";
import { getTenantConfigByCode } from "@/lib/registries/tenantConfigs";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { Spinner } from "@/components/atoms/Spinner";
import { scheduleIdle } from "@/lib/prefetch/scheduleIdle";
import { prefetchTenantShell } from "@/lib/prefetch/routePrefetchRegistry";

export function TenantShell({ children }: { children: React.ReactNode }) {
  const params = useParams<{ tenant: string }>();
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
  const registryEntry = isTenantCode(tenantCode)
    ? getTenantByCode(tenantCode)
    : null;

  // Keep a real sidebar during entity switches: apply static nav config immediately
  // instead of clearing to null (which used to flash PageShellSkeleton).
  useEffect(() => {
    const fallback = getTenantConfigByCode(tenantCode);
    if (fallback) {
      setTenantConfig(fallback);
    } else {
      const stored = useTenantStore.getState().tenantConfig;
      if (stored && stored.code !== tenantCode) clearTenant();
    }
    if (registryEntry?.tenantId) {
      useTenantStore.getState().setActiveTenant(registryEntry.tenantId);
    }
  }, [tenantCode, clearTenant, setTenantConfig, registryEntry?.tenantId]);

  useEffect(() => {
    if (
      previousTenantCode.current &&
      previousTenantCode.current !== tenantCode
    ) {
      // Refresh entity data, but keep tenantConfig cache so the shell stays mounted.
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== "tenantConfig",
      });
    }
    previousTenantCode.current = tenantCode;
  }, [tenantCode, queryClient]);

  const configQuery = useQuery({
    queryKey: ["tenantConfig", registryEntry?.tenantId],
    queryFn: () => getTenantConfig(registryEntry!.tenantId),
    enabled: Boolean(registryEntry?.tenantId),
    staleTime: 5 * 60_000,
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

  useEffect(() => {
    if (!registryEntry?.tenantId) return;
    if (!isTenantCode(tenantCode)) return;
    scheduleIdle(() =>
      prefetchTenantShell(queryClient, tenantCode, registryEntry.tenantId),
    );
  }, [tenantCode, registryEntry?.tenantId, queryClient]);

  // Unknown route tenant — keep chrome free; show a simple loader.
  if (!registryEntry) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  // First paint before auth hydrate — don't fake the whole app shell.
  if (!skipAuth && !hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  // While tenant config fetches, keep the real sidebar/top bar; page content
  // uses its own skeletons. Static registry config already drives nav.
  return (
    <div data-tenant={tenantCode} style={tenantAccentStyle(tenantCode)}>
      {children}
    </div>
  );
}
