"use client";

/**
 * Literally lifted from hq6.vonosautomarket.com sidebar HTML:
 * ui-walkthrough/_sidebar/sidebar.html
 * + AdminlteCustomPresenter / common.js accordion behavior.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import type { NavItem as NavItemConfig } from "@vonos/types";
import { cn } from "@/lib/utils/cn";
import {
  HQ6_FA_ICONS,
  HQ6_SIDEBAR_ICONS,
  Hq6Chevron,
} from "@/components/hq6/hq6SidebarIcons";

export interface Hq6NavSection {
  label: string;
  icon?: string;
  collapsible?: boolean;
  items: NavItemConfig[];
}

export interface Hq6SidebarProps {
  sections: Hq6NavSection[];
  tenantName?: string;
  activeRoute?: string;
  isNavActive?: (pathname: string, route: string) => boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onItemPrefetch?: (route: string) => void;
  className?: string;
  collapsed?: boolean;
}

function isItemActive(
  route: string,
  activeRoute: string | undefined,
  isNavActive?: (pathname: string, route: string) => boolean,
): boolean {
  if (!activeRoute) return false;
  return isNavActive ? isNavActive(activeRoute, route) : activeRoute === route;
}

function SectionIcon({ label }: { label: string }) {
  const svg = HQ6_SIDEBAR_ICONS[label] ?? HQ6_FA_ICONS[label];
  if (!svg) return null;
  return (
    <span
      className="hq6-sb-icon-wrap"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function Hq6Sidebar({
  sections,
  tenantName,
  activeRoute,
  isNavActive,
  mobileOpen = false,
  onMobileClose,
  onItemPrefetch,
  className,
  collapsed = false,
}: Hq6SidebarProps) {
  const [openLabel, setOpenLabel] = useState<string | null>(null);

  useEffect(() => {
    const activeSection = sections.find((section) =>
      section.items.some((item) =>
        isItemActive(item.route, activeRoute, isNavActive),
      ),
    );
    if (activeSection?.collapsible) {
      setOpenLabel(activeSection.label);
    }
  }, [activeRoute, isNavActive, sections]);

  const homeHref =
    sections.find((s) => s.label === "Home")?.items[0]?.route ??
    sections[0]?.items[0]?.route ??
    "#";

  const toggleGroup = (label: string) => {
    // Ultimate POS common.js: close other .chiled, toggle current
    setOpenLabel((prev) => (prev === label ? null : label));
  };

  return (
    <aside
      className={cn(
        "side-bar tw-relative tw-h-full tw-bg-white tw-w-64 tw-flex tw-flex-col tw-shrink-0",
        mobileOpen && "small-view-side-active",
        collapsed && "hq6-side-bar-collapsed",
        className,
      )}
    >
      <Link
        href={homeHref}
        className="tw-flex tw-items-center tw-justify-center tw-w-full tw-border-r tw-h-15 tw-shrink-0 tw-border-primary-500/30"
        style={{ backgroundColor: "var(--theme-800, var(--hq6-header, #085d3a))" }}
      >
        <p className="tw-text-lg tw-font-medium tw-text-white side-bar-heading tw-text-center">
          {tenantName ?? "Business"}{" "}
          <span
            className="tw-inline-block tw-w-3 tw-h-3 tw-rounded-full"
            style={{ backgroundColor: "var(--theme-700, #47cd89)" }}
            title="Online"
          />
        </p>
      </Link>

      {onMobileClose ? (
        <button
          type="button"
          className="hq6-sb-mobile-close"
          onClick={onMobileClose}
          aria-label="Close menu"
        >
          ×
        </button>
      ) : null}

      <div
        className="tw-flex-1 tw-p-3 tw-space-y-3 tw-overflow-y-auto tw-border-r tw-border-gray-200"
        id="side-bar"
      >
        {sections.map((section) => {
          const flatItem =
            !section.collapsible && section.items.length === 1
              ? section.items[0]
              : null;
          const childActive = section.items.some((item) =>
            isItemActive(item.route, activeRoute, isNavActive),
          );

          if (flatItem) {
            const active = isItemActive(
              flatItem.route,
              activeRoute,
              isNavActive,
            );
            return (
              <Link
                key={section.label}
                href={flatItem.route}
                prefetch={false}
                title=""
                onPointerDown={
                  onItemPrefetch
                    ? () => onItemPrefetch(flatItem.route)
                    : undefined
                }
                onMouseEnter={
                  onItemPrefetch
                    ? () => onItemPrefetch(flatItem.route)
                    : undefined
                }
                onClick={onMobileClose}
                className={cn(
                  "tw-flex tw-items-center tw-gap-3 tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-tracking-tight tw-text-gray-600 tw-transition-all tw-duration-200 tw-rounded-lg tw-whitespace-nowrap hover:tw-text-gray-900 hover:tw-bg-gray-100",
                  active && "tw-bg-gray-200 tw-text-primary-700",
                )}
              >
                <SectionIcon label={section.label} />
                <span className="tw-truncate">{section.label}</span>
              </Link>
            );
          }

          if (!section.collapsible) {
            return section.items.map((item) => {
              const active = isItemActive(item.route, activeRoute, isNavActive);
              return (
                <Link
                  key={item.route}
                  href={item.route}
                  prefetch={false}
                  title=""
                  onPointerDown={
                    onItemPrefetch
                      ? () => onItemPrefetch(item.route)
                      : undefined
                  }
                  onMouseEnter={
                    onItemPrefetch
                      ? () => onItemPrefetch(item.route)
                      : undefined
                  }
                  onClick={onMobileClose}
                  className={cn(
                    "tw-flex tw-items-center tw-gap-3 tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-tracking-tight tw-text-gray-600 tw-transition-all tw-duration-200 tw-rounded-lg tw-whitespace-nowrap hover:tw-text-gray-900 hover:tw-bg-gray-100",
                    active && "tw-bg-gray-200 tw-text-primary-700",
                  )}
                >
                  <SectionIcon label={item.label} />
                  {!HQ6_SIDEBAR_ICONS[item.label] && !HQ6_FA_ICONS[item.label] ? (
                    <SectionIcon label={section.label} />
                  ) : null}
                  <span className="tw-truncate">{item.label}</span>
                </Link>
              );
            });
          }

          const isOpen = openLabel === section.label;

          return (
            <div key={section.label} className="">
              <button
                type="button"
                title=""
                className={cn(
                  "drop_down tw-flex tw-items-center tw-gap-3 tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-tracking-tight tw-text-gray-600 tw-transition-all tw-duration-200 tw-rounded-lg tw-whitespace-nowrap hover:tw-text-gray-900 hover:tw-bg-gray-100 focus:tw-text-gray-900 focus:tw-bg-gray-100 tw-w-full tw-bg-transparent tw-border-0 tw-cursor-pointer",
                  (isOpen || childActive) && "tw-bg-gray-100",
                )}
                aria-expanded={isOpen}
                onClick={() => toggleGroup(section.label)}
              >
                <SectionIcon label={section.label} />
                <span className="tw-truncate">{section.label}</span>
                <Hq6Chevron open={isOpen} />
              </button>
              <div
                className={cn(
                  "chiled tw-relative tw-mt-2 tw-mb-4 tw-pl-11",
                  !isOpen && "hq6-chiled-closed",
                )}
                style={isOpen ? undefined : { display: "none" }}
              >
                <div className="tw-absolute tw-inset-y-0 tw-w-px tw-h-full tw-bg-gray-200 tw-left-5" />
                <div className="tw-space-y-3.5">
                  {section.items.map((item) => {
                    const active = isItemActive(
                      item.route,
                      activeRoute,
                      isNavActive,
                    );
                    return (
                      <Link
                        key={item.route}
                        href={item.route}
                        prefetch={false}
                        title=""
                        onPointerDown={
                          onItemPrefetch
                            ? () => onItemPrefetch(item.route)
                            : undefined
                        }
                        onMouseEnter={
                          onItemPrefetch
                            ? () => onItemPrefetch(item.route)
                            : undefined
                        }
                        onClick={onMobileClose}
                        className={cn(
                          "tw-flex tw-text-sm tw-font-medium tw-tracking-tight tw-text-gray-600 tw-truncate tw-transition-all tw-duration-200 hover:tw-text-gray-900 tw-whitespace-nowrap",
                          active && "tw-text-primary-700",
                        )}
                      >
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
