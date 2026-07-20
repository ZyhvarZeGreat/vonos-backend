"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { NavItem as NavItemConfig } from "@vonos/types";
import { NavItem } from "@/components/molecules/NavItem";
import { typographyRoles } from "@/lib/registries/typography";
import { cn } from "@/lib/utils/cn";
import type { IconComponent } from "@/lib/utils/icons";

export interface NavCollapsibleGroupProps {
  label: string;
  icon?: IconComponent;
  items: NavItemConfig[];
  iconMap: Record<string, IconComponent>;
  activeRoute?: string;
  isNavActive?: (pathname: string, route: string) => boolean;
  collapsed?: boolean;
  defaultOpen?: boolean;
  onItemPrefetch?: (route: string) => void;
}

export function NavCollapsibleGroup({
  label,
  icon: GroupIcon,
  items,
  iconMap,
  activeRoute,
  isNavActive,
  collapsed = false,
  defaultOpen = true,
  onItemPrefetch,
}: NavCollapsibleGroupProps) {
  const panelId = useId();
  const childActive = items.some((item) =>
    isNavActive && activeRoute
      ? isNavActive(activeRoute, item.route)
      : activeRoute === item.route,
  );
  const [open, setOpen] = useState(defaultOpen || childActive);

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  if (collapsed) {
    return (
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const Icon = iconMap[item.icon] ?? GroupIcon;
          return (
            <NavItem
              key={item.route}
              label={item.label}
              icon={Icon ?? (() => null)}
              href={item.route}
              active={
                isNavActive && activeRoute
                  ? isNavActive(activeRoute, item.route)
                  : activeRoute === item.route
              }
              collapsed={collapsed}
              onPrefetch={
                onItemPrefetch ? () => onItemPrefetch(item.route) : undefined
              }
            />
          );
        })}
      </nav>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98]",
          childActive
            ? "font-medium text-[var(--color-text-nav-active)]"
            : "text-[var(--color-text-nav)] hover:bg-[var(--color-surface-nav-hover)] hover:text-[var(--color-text-nav-active)]",
          typographyRoles.navItem,
        )}
      >
        {GroupIcon ? <GroupIcon className="sidebar-icon" /> : null}
        <span className="flex-1">{label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--color-text-nav)] transition-transform duration-150 ease-out",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>
      {open ? (
        <nav
          id={panelId}
          className="motion-pop-in ml-3 flex flex-col gap-0.5 border-l border-[var(--color-border)] pl-2"
        >          {items.map((item) => {
            const Icon = iconMap[item.icon] ?? GroupIcon;
            return (
              <NavItem
                key={item.route}
                label={item.label}
                icon={Icon ?? (() => null)}
                href={item.route}
                active={
                  isNavActive && activeRoute
                    ? isNavActive(activeRoute, item.route)
                    : activeRoute === item.route
                }
                collapsed={false}
                onPrefetch={
                  onItemPrefetch ? () => onItemPrefetch(item.route) : undefined
                }
              />
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
