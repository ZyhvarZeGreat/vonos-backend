import { getTenantConfigByCode, allNavRoutesForConfig } from "@/lib/registries/tenantConfigs";
import { isEntityPageSlug } from "@/lib/registries/entityPages";
import type { TenantCode } from "@/lib/registries/tenants";
import { isTenantCode } from "@/lib/registries/tenants";
import {
  OPERATIONS_MOUNTED_TENANTS,
  tenantPath,
} from "@/lib/utils/tenantMount";

export {
  OPERATIONS_MOUNTED_TENANTS,
  tenantBasePath,
  tenantPath,
} from "@/lib/utils/tenantMount";

export interface ParsedTenantPath {
  tenantCode: string | null;
  /** overview | finance | list slug (inventory, jobs, …) */
  section: string;
  recordId: string | null;
}

/** Parse /{tenant}/… or /operations/{VS|VKW}/… into tenant, section, and optional record id. */
export function parseTenantPath(pathname: string): ParsedTenantPath {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) {
    return { tenantCode: null, section: "overview", recordId: null };
  }

  if (parts[0] === "admin") {
    return {
      tenantCode: null,
      section: parts[1] ?? "overview",
      recordId: parts[2] ?? null,
    };
  }

  let offset = 0;
  if (
    parts[0] === "operations" &&
    parts[1] &&
    OPERATIONS_MOUNTED_TENANTS.has(parts[1])
  ) {
    offset = 1;
  }

  const tenantCode = parts[offset] ?? null;
  const section = parts[offset + 1] ?? "overview";
  const recordId =
    parts.length >= offset + 3 &&
    section !== "overview" &&
    section !== "finance"
      ? (parts[offset + 2] ?? null)
      : null;

  return { tenantCode, section, recordId };
}

export function tenantOverviewPath(code: TenantCode): string {
  return tenantPath(code, "overview");
}

export function tenantListPath(tenantCode: string, listSlug: string): string {
  return tenantPath(tenantCode, listSlug);
}

export function tenantFinancePath(tenantCode: string): string {
  return tenantPath(tenantCode, "finance");
}

export function tenantDetailPath(
  tenantCode: string,
  listSlug: string,
  recordId: string,
): string {
  return tenantPath(tenantCode, listSlug, recordId);
}

/** True when pathname is on this nav route (list or detail under it). */
export function isNavRouteActive(pathname: string, route: string): boolean {
  if (pathname === route) return true;
  return pathname.startsWith(`${route}/`);
}

function sectionExistsForTenant(tenantCode: string, section: string): boolean {
  if (section === "overview" || section === "finance") return true;
  if (isEntityPageSlug(tenantCode, section)) return true;
  const config = getTenantConfigByCode(tenantCode);
  if (!config) return false;
  return allNavRoutesForConfig(config).some((item) => {
    return parseTenantPath(item.route).section === section;
  });
}

/** Map VAG admin sections to the closest tenant workspace screen. */
const ADMIN_SECTION_TO_TENANT_SECTION: Record<string, string> = {
  overview: "overview",
  finance: "finance",
  reports: "reports",
  users: "users",
  stock: "inventory",
};

/**
 * Preserve the current screen when switching entities.
 * From `/admin/*`, enter the target entity workspace at the equivalent page.
 */
export function resolveEntitySwitchPath(
  targetTenantCode: string,
  pathname: string,
): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "admin") {
    const adminSection = parts[1] ?? "overview";
    const section = ADMIN_SECTION_TO_TENANT_SECTION[adminSection] ?? "overview";

    if (section === "overview") {
      return tenantOverviewPath(targetTenantCode as TenantCode);
    }

    if (section === "finance") {
      return tenantFinancePath(targetTenantCode);
    }

    if (sectionExistsForTenant(targetTenantCode, section)) {
      return tenantListPath(targetTenantCode, section);
    }

    return tenantOverviewPath(targetTenantCode as TenantCode);
  }

  const { section } = parseTenantPath(pathname);

  if (section === "overview") {
    return tenantOverviewPath(targetTenantCode as TenantCode);
  }

  if (section === "finance") {
    return tenantFinancePath(targetTenantCode);
  }

  if (sectionExistsForTenant(targetTenantCode, section)) {
    return tenantListPath(targetTenantCode, section);
  }

  if (isTenantCode(targetTenantCode)) {
    return tenantOverviewPath(targetTenantCode);
  }

  return "/admin/overview";
}

export function listSlugFromPathname(pathname: string): string {
  return parseTenantPath(pathname).section;
}
