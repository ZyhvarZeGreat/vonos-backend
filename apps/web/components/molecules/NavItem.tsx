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
        "flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors",
        active
          ? "bg-[var(--color-surface-nav-active)] font-medium text-[var(--color-text-nav-active)]"
          : "font-normal text-[var(--color-text-nav)] hover:bg-[var(--color-surface-nav-hover)] hover:text-[var(--color-text-nav-active)]",
      )}
    >
      <Icon className="sidebar-icon" />
      {!collapsed ? <span>{label}</span> : null}
    </Link>
  );
}
