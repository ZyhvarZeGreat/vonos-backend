import { reportEntryBySlug } from "@/lib/registries/reportRegistry";
import { isTenantCode } from "@/lib/registries/tenants";
import { VAG_NAV_SECTIONS } from "@/lib/registries/vagNavSections";

/** Top-bar title for nested VAG admin routes. */
export function adminPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "admin" && segments.length >= 3) {
    const section = segments[1];
    const code = segments[2];
    const tenantLabel = isTenantCode(code) ? code : null;

    if (section === "finance" && tenantLabel && segments.length === 3) {
      return `Finance · ${tenantLabel}`;
    }

    if (section === "reports" && tenantLabel) {
      if (segments.length === 3) {
        return `Reports · ${tenantLabel}`;
      }
      const slug = segments[3];
      const entry = reportEntryBySlug(slug);
      if (entry) {
        return `${entry.label} · ${tenantLabel}`;
      }
      return `Reports · ${tenantLabel}`;
    }
  }

  const flat = VAG_NAV_SECTIONS.flatMap((s) => s.items);
  const match = flat.find(
    (item) => pathname === item.route || pathname.startsWith(`${item.route}/`),
  );
  return match?.label ?? "Vonos Autos Group";
}
