"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  Award,
  BadgeDollarSign,
  Banknote,
  Box,
  Briefcase,
  CheckSquare,
  ChefHat,
  CircleArrowUp,
  Coins,
  CreditCard,
  FileBarChart,
  FilePlus,
  FileStack,
  Files,
  FileText,
  FolderTree,
  Grid3x3,
  Headphones,
  Layers,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Monitor,
  Package,
  PackageOpen,
  Percent,
  PieChart,
  PlusCircle,
  Printer,
  Receipt,
  RotateCcw,
  Ruler,
  Scale,
  ScanLine,
  Scissors,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Tags,
  TrendingUp,
  Truck,
  Upload,
  UserX,
  Users,
  Utensils,
  Wallet,
  Wrench,
  X,
  Lock,
  LogOut,
  Car,
  Calendar,
  ClipboardList,
  Clock,
} from "lucide-react";
import type { NavItem as NavItemConfig } from "@vonos/types";
import { NavItem } from "@/components/molecules/NavItem";
import { NavCollapsibleGroup } from "@/components/molecules/NavCollapsibleGroup";
import { TenantSwitcher } from "@/components/molecules/TenantSwitcher";
import { IconButton } from "@/components/atoms/IconButton";
import { SearchBar } from "@/components/atoms/SearchBar";
import { typographyRoles } from "@/lib/registries/typography";
import { sidebarAccentStyle, sidebarHeaderStyle } from "@/lib/registries/tenantAccents";
import { cn } from "@/lib/utils/cn";
import { logout } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/authStore";
import type { IconComponent } from "@/lib/utils/icons";

const iconMap: Record<string, IconComponent> = {
  home: LayoutDashboard,
  "layout-dashboard": LayoutDashboard,
  boxes: Package,
  box: Box,
  package: Package,
  "package-open": PackageOpen,
  truck: Truck,
  "arrow-down-to-line": ArrowDownToLine,
  "arrow-up-from-line": ArrowUpFromLine,
  "arrow-left-right": ArrowRightLeft,
  "arrow-right-left": ArrowRightLeft,
  "circle-arrow-up": CircleArrowUp,
  users: Users,
  "bar-chart-3": PieChart,
  "pie-chart": PieChart,
  wallet: Wallet,
  receipt: Receipt,
  "rotate-ccw": RotateCcw,
  "plus-circle": PlusCircle,
  monitor: Monitor,
  "scan-line": ScanLine,
  "file-plus": FilePlus,
  files: Files,
  "file-text": FileText,
  "file-stack": FileStack,
  percent: Percent,
  upload: Upload,
  "badge-dollar-sign": BadgeDollarSign,
  printer: Printer,
  layers: Layers,
  tags: Tags,
  ruler: Ruler,
  "folder-tree": FolderTree,
  award: Award,
  "shield-check": ShieldCheck,
  "credit-card": CreditCard,
  banknote: Banknote,
  briefcase: Briefcase,
  "check-square": CheckSquare,
  coins: Coins,
  scale: Scale,
  "list-checks": ListChecks,
  "trending-up": TrendingUp,
  "file-bar-chart": FileBarChart,
  utensils: Utensils,
  "chef-hat": ChefHat,
  "grid-3x3": Grid3x3,
  wrench: Wrench,
  car: Car,
  calendar: Calendar,
  "clipboard-list": ClipboardList,
  scissors: Scissors,
  clock: Clock,
  "map-pin": MapPin,
  settings: Settings,
  "shopping-cart": ShoppingCart,
  star: Star,
  "user-x": UserX,
};

const groupIconMap: Record<string, IconComponent> = {
  "User Management": Users,
  Contacts: Users,
  Products: Box,
  Purchases: ShoppingCart,
  Sell: CircleArrowUp,
  Expenses: Receipt,
  "Payment Accounts": CreditCard,
  Reports: PieChart,
  HRM: Briefcase,
  Settings: Settings,
};

export interface NavSection {
  label: string;
  icon?: string;
  collapsible?: boolean;
  items: NavItemConfig[];
}

export interface SidebarProps {
  navItems?: NavItemConfig[];
  sections?: NavSection[];
  tenantName?: string;
  tenantCode?: string;
  userName?: string;
  userEmail?: string;
  activeRoute?: string;
  isNavActive?: (pathname: string, route: string) => boolean;
  collapsed?: boolean;
  showPromo?: boolean;
  className?: string;
}

export function Sidebar({
  navItems,
  sections,
  tenantName,
  tenantCode,
  userName,
  userEmail,
  activeRoute,
  isNavActive,
  collapsed = false,
  showPromo = true,
  className,
}: SidebarProps) {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const storeName = useAuthStore((state) => state.name);
  const storeEmail = useAuthStore((state) => state.email);

  const displayName = userName ?? storeName ?? storeEmail ?? "Account";
  const displayEmail = userEmail ?? storeEmail;

  // Per-user dismissal of the 2FA promo, persisted in localStorage so once a
  // user closes it, it never comes back for them. Start hidden to avoid a
  // show-then-hide flash; reveal in an effect only if not previously dismissed.
  const promoStorageKey = useMemo(
    () => `vonos:promo-dismissed:2fa:${storeEmail ?? "anon"}`,
    [storeEmail],
  );
  const [promoDismissed, setPromoDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPromoDismissed(window.localStorage.getItem(promoStorageKey) === "1");
  }, [promoStorageKey]);

  const handleDismissPromo = () => {
    setPromoDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(promoStorageKey, "1");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuth();
      router.replace("/login");
    }
  };

  const groupedSections: NavSection[] =
    sections ??
    (navItems
      ? [{ label: "Menu", items: navItems }]
      : []);

  return (
    <aside
      style={sidebarAccentStyle(tenantCode ?? "")}
      className={cn(
        "flex h-full flex-shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-sidebar)] text-[var(--color-text-primary)]",
        collapsed ? "w-20" : "w-[var(--space-sidebar-width)]",
        className,
      )}
    >
      {/* Accent-colored header — height matches the top bar */}
      {!collapsed ? (
        <div
          style={sidebarHeaderStyle(tenantCode ?? "")}
          className="flex h-[var(--space-topbar-height)] shrink-0 items-center px-5"
        >
          <TenantSwitcher
            tenantCode={tenantCode ?? ""}
            tenantName={tenantName}
            variant="sidebar"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-6">
        {!collapsed ? (
          <div className="px-2 pb-2 pt-3">
            <SearchBar placeholder="Search" showShortcut />
          </div>
        ) : null}
        {groupedSections.map((section) => (
          <div key={section.label}>
            {section.collapsible ? (
              <NavCollapsibleGroup
                label={section.label}
                icon={
                  section.icon
                    ? iconMap[section.icon] ?? groupIconMap[section.label]
                    : groupIconMap[section.label]
                }
                items={section.items}
                iconMap={iconMap}
                activeRoute={activeRoute}
                isNavActive={isNavActive}
                collapsed={collapsed}
              />
            ) : (
              <>
                {!collapsed ? (
                  <p className={cn("mb-1 px-2", typographyRoles.navSection, "!text-[var(--color-text-nav)]")}>
                    {section.label}
                  </p>
                ) : null}
                <nav className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const Icon = iconMap[item.icon] ?? Package;
                    return (
                      <NavItem
                        key={item.route}
                        label={item.label}
                        icon={Icon}
                        href={item.route}
                        active={
                          isNavActive && activeRoute
                            ? isNavActive(activeRoute, item.route)
                            : activeRoute === item.route
                        }
                        collapsed={collapsed}
                      />
                    );
                  })}
                </nav>
              </>
            )}
          </div>
        ))}

        {/* 2FA promo card */}
        {showPromo && !collapsed && !promoDismissed ? (
          <div className="relative mx-2 mt-auto rounded-xl border border-border bg-card p-4 shadow-sm">
            <button
              type="button"
              onClick={handleDismissPromo}
              className="absolute right-3 top-3 text-muted hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-accent text-white">
              <Lock className="h-4 w-4" />
            </div>
            <h3 className="mb-1 text-base font-semibold leading-tight text-foreground">
              Secure your account
            </h3>
            <p className="mb-4 text-sm leading-snug text-muted">
              Add two-step verification for an extra layer of protection at sign-in.
            </p>
            <button
              type="button"
              className="mb-2 w-full rounded-lg bg-[var(--color-brand-primary)] py-2 text-base font-medium text-white transition-colors hover:bg-[var(--color-brand-primary-hover)]"
            >
              Enable two-step verification
            </button>
            <button
              type="button"
              className="w-full rounded-lg border border-border bg-card py-2 text-base font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-nav-hover)]"
            >
              Learn more
            </button>
          </div>
        ) : null}

        {/* Bottom links */}
        {!collapsed ? (
          <div className="mt-2 flex flex-col gap-0.5">
            <Link
              href="#"
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-2 text-[var(--color-text-nav)] transition-colors hover:bg-[var(--color-surface-nav-hover)] hover:text-[var(--color-text-nav-active)]",
                typographyRoles.navItem,
              )}
            >
              <Headphones className="sidebar-icon" />
              Support
            </Link>
            <Link
              href="#"
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-2 text-[var(--color-text-nav)] transition-colors hover:bg-[var(--color-surface-nav-hover)] hover:text-[var(--color-text-nav-active)]",
                typographyRoles.navItem,
              )}
            >
              <Sparkles className="sidebar-icon" />
              What&apos;s New?
            </Link>
          </div>
        ) : null}
      </div>

      {isAuthenticated ? (
        <div
          className={cn(
            "shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface-sidebar)]",
            collapsed ? "p-3" : "px-5 py-4",
          )}
        >
          {collapsed ? (
            <IconButton
              label="Sign out"
              onClick={handleLogout}
              className="mx-auto text-error hover:bg-[var(--color-error-bg)] hover:text-error"
            >
              <LogOut className="h-5 w-5" />
            </IconButton>
          ) : (
            <>
              <p className={cn(typographyRoles.tenantTitle, "!text-[var(--color-text-primary)]")}>{displayName}</p>
              {displayEmail && displayEmail !== displayName ? (
                <p
                  className={cn(
                    typographyRoles.tenantMeta,
                    "normal-case tracking-normal !text-[var(--color-text-nav)]",
                  )}
                >
                  {displayEmail}
                </p>
              ) : null}
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </>
          )}
        </div>
      ) : null}
    </aside>
  );
}
