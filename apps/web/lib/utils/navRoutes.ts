import type { NavSection } from "@/components/organisms/Sidebar";
import type { TenantConfig } from "@vonos/types";
import { getTenantConfigByCode, navSectionsForConfig } from "@/lib/registries/tenantConfigs";

/** Nav from API config when it matches the route tenant; otherwise static config for that code only. */
export function navSectionsForTenant(
  tenantCode: string,
  config?: TenantConfig | null,
): NavSection[] {
  if (config?.code === tenantCode) {
    return navSectionsForConfig(config);
  }
  const staticConfig = getTenantConfigByCode(tenantCode);
  return staticConfig ? navSectionsForConfig(staticConfig) : [];
}

export function tenantNavPath(tenantCode: string, slug: string): string {
  return `/${tenantCode}/${slug}`;
}
