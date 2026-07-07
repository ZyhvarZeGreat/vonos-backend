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
}

export function NavItem({
  label,
  icon: Icon,
  href,
  active = false,
  collapsed = false,
}: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        typographyRoles.navItem,
        "relative flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors",
        active
          ? "bg-[var(--color-surface-nav-active)] font-medium text-[var(--color-brand-primary)]"
          : "font-normal text-[var(--color-text-nav)] hover:bg-[var(--color-surface-nav-hover)] hover:text-[var(--color-text-nav-active)]",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute inset-y-1 left-0 w-1 rounded-full bg-[var(--color-brand-primary)]"
        />
      ) : null}
      <Icon className="sidebar-icon" />
      {!collapsed ? <span>{label}</span> : null}
    </Link>
  );
}
