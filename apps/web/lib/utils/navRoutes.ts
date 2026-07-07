import type { NavSection } from "@/components/organisms/Sidebar";
import type { TenantConfig } from "@vonos/types";
import { getTenantConfigByCode, navSectionsForConfig } from "@/lib/registries/tenantConfigs";

/** Union API + static enabledModules so sidebar feature flags (e.g. hrm) stay visible when DB seed lags. */
function resolveTenantNavConfig(
  tenantCode: string,
  api?: TenantConfig | null,
): TenantConfig | null {
  const staticConfig = getTenantConfigByCode(tenantCode);
  if (!api || api.code !== tenantCode) return staticConfig;
  if (!staticConfig) return api;
  const modules = new Set([...api.enabledModules, ...staticConfig.enabledModules]);
  return { ...staticConfig, ...api, enabledModules: [...modules] };
}

/** Nav from merged API + static config when codes match; otherwise static config for that code only. */
export function navSectionsForTenant(
  tenantCode: string,
  config?: TenantConfig | null,
): NavSection[] {
  const resolved = resolveTenantNavConfig(tenantCode, config);
  return resolved ? navSectionsForConfig(resolved) : [];
}

export function tenantNavPath(tenantCode: string, slug: string): string {
  return `/${tenantCode}/${slug}`;
}
