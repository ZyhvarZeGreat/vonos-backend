"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { UPOS_AUDIT_PAGES } from "@/lib/registries/uposPageAudit";
import { hq6CopyForSlug } from "@/lib/registries/hq6PageCopy";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { cn } from "@/lib/utils/cn";
import { tenantBasePath } from "@/lib/utils/tenantMount";

export type Hq6BreadcrumbItem = {
  label: string;
  href?: string;
};

/**
 * AdminLTE / UPOS content-header breadcrumbs:
 * Home › Section › Page  (active page is plain text).
 */
export function Hq6Breadcrumbs({
  items,
  className,
}: {
  items: Hq6BreadcrumbItem[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <ol className={cn("breadcrumb", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <li
            key={`${item.label}-${index}`}
            className={isLast ? "active" : undefined}
          >
            {!isLast && item.href ? (
              <Link href={item.href}>
                {index === 0 ? (
                  <>
                    <i className="fa fa-dashboard" aria-hidden /> {item.label}
                  </>
                ) : (
                  item.label
                )}
              </Link>
            ) : (
              item.label
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Build crumbs from the current tenant route + ui-audit sidebar map.
 * Home › {section} › {page title}
 */
export function useHq6Breadcrumbs(options?: {
  /** Override the leaf label (e.g. record name). */
  leafLabel?: string;
  /** Extra middle crumbs after section. */
  extras?: Hq6BreadcrumbItem[];
}): Hq6BreadcrumbItem[] {
  const pathname = usePathname() ?? "";
  const { tenantCode } = useRouteTenant();
  const leafLabel = options?.leafLabel;
  const extras = options?.extras;

  return useMemo(() => {
    const code = (tenantCode ?? "").toUpperCase();
    if (!code) {
      return [{ label: "Home", href: "/admin" }];
    }
    const homeHref = `${tenantBasePath(code)}/overview`;
    const crumbs: Hq6BreadcrumbItem[] = [
      { label: "Home", href: homeHref },
    ];

    const path = pathname.replace(/\/+$/, "") || "/";
    const match = UPOS_AUDIT_PAGES.find((page) => {
      const route = page.route.replace(/^\/VA/i, tenantBasePath(code));
      return (
        path === route ||
        path.startsWith(`${route}/`) ||
        path.toLowerCase() === route.toLowerCase()
      );
    });

    if (match) {
      if (match.section && match.section !== "Home") {
        crumbs.push({ label: match.section });
      }
      if (extras?.length) crumbs.push(...extras);
      crumbs.push({
        label: leafLabel?.trim() || match.label,
      });
      return crumbs;
    }

    // Fallback: derive from last path segment + hq6 copy.
    const parts = path.split("/").filter(Boolean);
    const slug = parts[1] ?? "overview";
    if (slug === "overview") {
      crumbs.push({ label: leafLabel?.trim() || "Home" });
      return crumbs;
    }
    const copy = hq6CopyForSlug(slug);
    if (extras?.length) crumbs.push(...extras);
    crumbs.push({
      label: leafLabel?.trim() || copy.title || slug.replace(/-/g, " "),
    });
    return crumbs;
  }, [extras, leafLabel, pathname, tenantCode]);
}
