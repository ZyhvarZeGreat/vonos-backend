"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  AUTOS_GROUP_ORDER,
  getTenantByCode,
  isOperationsGroupEntity,
} from "@/lib/registries/tenants";
import { iconForTenantCode } from "@/lib/registries/tenantIcons";
import { accentForTenantCode } from "@/lib/registries/tenantAccents";
import { typographyRoles } from "@/lib/registries/typography";
import { cn } from "@/lib/utils/cn";
import { resolveEntitySwitchPath } from "@/lib/utils/tenantRoutes";
import { useAuthStore } from "@/stores/authStore";
import { useAdminEntityStore } from "@/stores/adminEntityStore";
import { useTenantStore } from "@/stores/tenantStore";
import type { TenantCode } from "@/lib/registries/tenants";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchAdminEntity } from "@/lib/admin/prefetchAdminEntity";
import { prefetchRoute } from "@/lib/prefetch/routePrefetchRegistry";
import { dateRangePresetToApiBounds } from "@/lib/utils/dateRange";
import { useUiStore } from "@/stores/uiStore";
import { switchWorkingTenant } from "@/lib/api/auth";
import { formatApiError } from "@/lib/utils/formatApiError";
import { toast } from "@/stores/toastStore";
import { completeNavigationProgress } from "@/stores/navigationBusyStore";

export interface TenantSwitcherProps {
  tenantCode: string;
  tenantName?: string;
  variant?: "sidebar" | "topbar";
  className?: string;
}

/**
 * Entity / work-location switcher.
 * - `super_admin`: Autos Group entities + VAG overview
 * - Staff with multiple work-location clearances: only those Autos entities
 * - Cafe / Saloon / Kids Wear (operations mounts) are isolated — never listed,
 *   and the dropdown is hidden while viewing one of them.
 */
export function TenantSwitcher({
  tenantCode,
  tenantName,
  variant = "topbar",
  className,
}: TenantSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const role = useAuthStore((state) => state.role);
  const setAuth = useAuthStore((state) => state.setAuth);
  const allowedTenantCodes = useAuthStore((state) => state.allowedTenantCodes);
  const setAdminViewing = useAdminEntityStore((s) => s.setViewingCode);
  const queryClient = useQueryClient();
  const dateRange = useUiStore((s) => s.dateRange);
  const customDateRange = useUiStore((s) => s.customDateRange);
  const beginEntitySwitch = useUiStore((s) => s.beginEntitySwitch);
  const clearEntitySwitch = useUiStore((s) => s.clearEntitySwitch);
  const isSuperAdmin = role === "super_admin";
  const onOpsMount = isOperationsGroupEntity(tenantCode);
  const onAdmin = pathname.startsWith("/admin");
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const warmedRef = useRef<Set<string>>(new Set());
  const tenant = getTenantByCode(tenantCode);
  const dateBounds = useMemo(
    () => dateRangePresetToApiBounds(dateRange, new Date(), customDateRange),
    [customDateRange, dateRange],
  );

  const switchableEntities = useMemo(() => {
    const base = !isSuperAdmin
      ? (allowedTenantCodes ?? [])
          .map((code) => getTenantByCode(code))
          .filter((e): e is NonNullable<typeof e> => Boolean(e))
      : AUTOS_GROUP_ORDER.map((code) => getTenantByCode(code)).filter(
          (e): e is NonNullable<typeof e> => Boolean(e),
        );
    // VC / VS / VKW are separate /operations mounts — not switch targets.
    return base.filter((e) => !isOperationsGroupEntity(e.code));
  }, [allowedTenantCodes, isSuperAdmin]);

  const canSwitchEntities =
    !onOpsMount &&
    (isSuperAdmin
      ? switchableEntities.length > 0
      : switchableEntities.length > 1);

  const warmEntityRoute = (code: TenantCode) => {
    const href = resolveEntitySwitchPath(code, pathname);
    const target = getTenantByCode(code);
    prefetchRoute(queryClient, {
      pathname: href,
      tenantCode: code,
      tenantId: target?.tenantId,
      dateBounds,
    });
    if (!onAdmin || !isSuperAdmin) return;
    const key = `${pathname}:${code}`;
    if (warmedRef.current.has(key)) return;
    warmedRef.current.add(key);
    void prefetchAdminEntity(queryClient, {
      code,
      pathname,
      dateBounds,
    }).catch(() => {
      warmedRef.current.delete(key);
    });
  };

  const displayName = tenantName ?? tenant?.name ?? tenantCode;
  const meta = tenant ? tenant.code : tenantCode;
  const isSidebar = variant === "sidebar";
  const EntityIcon = iconForTenantCode(tenantCode);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function startSwitch(code: string, name: string, href: string) {
    beginEntitySwitch({ code, name, href });
    if (onAdmin) {
      setAdminViewing(null);
    }
    setOpen(false);
  }

  function announceSwitch(code: string, name: string) {
    toast.success(`Now viewing: ${name} (${code})`);
  }

  function applyStaffSession(result: Awaited<ReturnType<typeof switchWorkingTenant>>) {
    setAuth({
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
      tenantId: result.user.tenantId,
      role: result.user.role,
      token: result.accessToken,
      tenantRoleId: result.user.tenantRoleId ?? null,
      tenantRoleName: result.user.tenantRoleName ?? null,
      tenantRolePermissions: result.user.tenantRolePermissions ?? [],
      tenantRoleLocked: result.user.tenantRoleLocked ?? false,
      allowedTenantCodes: result.user.allowedTenantCodes ?? [],
    });
    if (result.user.tenantId) {
      useTenantStore.getState().setActiveTenant(result.user.tenantId);
    }
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== "tenantConfig",
    });
  }

  async function navigateToEntity(code: string) {
    if (code === "VAG") {
      if (!isSuperAdmin) return;
      if (pathname.startsWith("/admin/overview")) {
        toast.info("Already on Group overview");
        return;
      }
      startSwitch("VAG", "Vonos Autos Group", "/admin/overview");
      announceSwitch("VAG", "Vonos Autos Group");
      router.push("/admin/overview");
      return;
    }
    const entry = getTenantByCode(code);
    if (!entry || entry.code === tenantCode) {
      if (entry?.code === tenantCode) {
        toast.info(`Already viewing ${entry.name} (${entry.code})`);
      }
      return;
    }
    const href = resolveEntitySwitchPath(entry.code, pathname);

    if (!isSuperAdmin) {
      if (switching) return;
      setSwitching(true);
      // Show progress immediately while JWT is re-scoped.
      startSwitch(entry.code, entry.name, href);
      toast.info(`Switching to ${entry.name}…`);
      try {
        const result = await switchWorkingTenant(entry.code);
        applyStaffSession(result);
        announceSwitch(entry.code, entry.name);
        router.push(href);
      } catch (error) {
        clearEntitySwitch();
        completeNavigationProgress();
        toast.error(formatApiError(error, "Could not switch location"));
      } finally {
        setSwitching(false);
      }
      return;
    }

    if (entry.tenantId) {
      useTenantStore.getState().setActiveTenant(entry.tenantId);
    }
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== "tenantConfig",
    });
    startSwitch(entry.code, entry.name, href);
    announceSwitch(entry.code, entry.name);
    router.push(href);
  }

  /* ——— Topbar: native select (responsive, matches HQ6 filters) ——— */
  if (!isSidebar) {
    if (!canSwitchEntities) {
      return (
        <div
          className={cn(
            "flex min-w-0 max-w-[10rem] items-center gap-2 px-1 sm:max-w-[14rem]",
            className,
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/20 text-white">
            <EntityIcon className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 truncate text-sm font-medium text-white">
            <span className="hidden lg:inline">{displayName}</span>
            <span className="lg:hidden">{meta}</span>
          </span>
        </div>
      );
    }

    return (
      <div ref={rootRef} className={cn("relative min-w-0", className)}>
        <label htmlFor="upos-entity-switcher" className="sr-only">
          {isSuperAdmin ? "Switch entity" : "Switch location"}
        </label>
        <select
          id="upos-entity-switcher"
          className="form-control select2 upos-header-entity-select"
          value={onAdmin && isSuperAdmin ? "VAG" : tenantCode}
          disabled={switching}
          aria-label={
            isSuperAdmin
              ? `Current entity: ${displayName}. Switch entity.`
              : `Current location: ${displayName}. Switch location.`
          }
          onMouseEnter={() => {
            for (const entity of switchableEntities) {
              warmEntityRoute(entity.code as TenantCode);
            }
          }}
          onChange={(event) => {
            void navigateToEntity(event.target.value);
          }}
        >
          {switchableEntities.map((entity) => (
            <option key={entity.code} value={entity.code}>
              {entity.code} — {entity.name.replace(/^Vonos\s+/i, "")}
            </option>
          ))}
          {isSuperAdmin ? (
            <option value="VAG">VAG — Group overview</option>
          ) : null}
        </select>
      </div>
    );
  }

  /* ——— Sidebar: richer dropdown menu ——— */
  const entityButtonContent = (
    <>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/15 text-white">
        <EntityIcon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn(typographyRoles.tenantTitle, "truncate !text-sm !text-white")}>
          {meta}
        </p>
        <p
          className={cn(
            typographyRoles.tenantMeta,
            "truncate !text-[11px] !text-white/70",
          )}
        >
          {displayName.replace(/^Vonos\s+/i, "")}
        </p>
      </div>
    </>
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {canSwitchEntities ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-2 rounded-md p-0 text-left transition-colors hover:bg-white/8"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={
            isSuperAdmin
              ? `Current entity: ${displayName}. Switch entity.`
              : `Current location: ${displayName}. Switch location.`
          }
        >
          {entityButtonContent}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-white/60 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      ) : (
        <div className="flex w-full items-center gap-2 rounded-md p-0 text-left">
          {entityButtonContent}
        </div>
      )}

      {open && canSwitchEntities ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-lg">
          <div className="border-b border-border px-3 py-2">
            <p className={typographyRoles.caption}>
              {isSuperAdmin ? "Switch entity" : "Switch location"}
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto p-1">
            {switchableEntities.map((entity) => {
              const isActive = entity.code === tenantCode;
              const href = resolveEntitySwitchPath(entity.code, pathname);
              const Icon = iconForTenantCode(entity.code);
              const accent = accentForTenantCode(entity.code);
              return (
                <Link
                  key={entity.code}
                  href={href}
                  onMouseEnter={() => warmEntityRoute(entity.code as TenantCode)}
                  onFocus={() => warmEntityRoute(entity.code as TenantCode)}
                  onClick={(event) => {
                    if (isActive) {
                      event.preventDefault();
                      toast.info(
                        `Already viewing ${entity.name} (${entity.code})`,
                      );
                      return;
                    }
                    event.preventDefault();
                    void navigateToEntity(entity.code);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2.5 transition-colors",
                    isActive
                      ? "bg-[var(--color-surface-nav-active)]"
                      : "hover:bg-[var(--color-surface-nav-hover)]",
                  )}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white"
                    style={{ backgroundColor: accent }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <p className={cn(typographyRoles.tenantTitle, "truncate text-sm")}>
                      {entity.name}
                    </p>
                    <p className={typographyRoles.tenantMeta}>{entity.code}</p>
                  </span>
                </Link>
              );
            })}
            {isSuperAdmin ? (
              <Link
                href="/admin/overview"
                onClick={(event) => {
                  event.preventDefault();
                  void navigateToEntity("VAG");
                }}
                className="mt-1 flex items-center gap-2.5 rounded-md border-t border-border px-2.5 py-2.5 transition-colors hover:bg-[var(--color-surface-nav-hover)]"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white"
                  style={{ backgroundColor: accentForTenantCode("VAG") }}
                >
                  {(() => {
                    const Icon = iconForTenantCode("VAG");
                    return <Icon className="h-3.5 w-3.5" />;
                  })()}
                </span>
                <span className="min-w-0 flex-1">
                  <p
                    className={cn(
                      typographyRoles.tenantTitle,
                      "truncate text-sm font-medium",
                    )}
                  >
                    Vonos Autos Group
                  </p>
                  <p className={typographyRoles.tenantMeta}>Group overview</p>
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
