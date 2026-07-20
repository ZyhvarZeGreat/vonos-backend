"use client";

import Link from "next/link";
import type { IconComponent } from "@/lib/utils/icons";
import { typographyRoles } from "@/lib/registries/typography";
import { cn } from "@/lib/utils/cn";

export interface NavItemProps {
  label: string;
  icon: IconComponent;
  href: string;
  active?: boolean;
  collapsed?: boolean;
  onPrefetch?: () => void;
}

export function NavItem({
  label,
  icon: Icon,
  href,
  active = false,
  collapsed = false,
  onPrefetch,
}: NavItemProps) {
  return (
    <Link
      href={href}
      prefetch
      onPointerDown={onPrefetch}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className={cn(
        typographyRoles.navItem,
        "relative flex items-center gap-3 rounded-md px-2 py-1.5 transition-[background-color,color,transform] duration-150 ease-out",
        active
          ? "bg-[var(--color-surface-nav-active)] font-medium text-[var(--color-brand-primary)]"
          : "font-normal text-[var(--color-text-nav)] hover:bg-[var(--color-surface-nav-hover)] hover:text-[var(--color-text-nav-active)] active:scale-[0.98]",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute inset-y-1 left-0 w-1 origin-center rounded-full bg-[var(--color-brand-primary)] motion-pop-in"
        />
      ) : null}
      <Icon className="sidebar-icon" />
      {!collapsed ? <span>{label}</span> : null}
    </Link>
  );
}
