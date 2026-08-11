"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Shield, UserPlus, Users } from "lucide-react";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { useHq6Permissions } from "@/lib/hooks/useHq6Permissions";
import { getTenantByCode, type TenantCode } from "@/lib/registries/tenants";
import {
  getVagViewUnit,
  isVagViewUnitId,
  VAG_VIEW_UNITS,
} from "@/lib/registries/vagViewUnits";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/stores/toastStore";
import { useAdminEntityStore } from "@/stores/adminEntityStore";
import { tenantBasePath } from "@/lib/utils/tenantMount";

export interface HrmActionBarProps {
  /** VAG group HRM — pick entity for manage / add deep links. */
  groupMode?: boolean;
  /** Entity drill-down — tenant fixed from the route / module strip. */
  fixedTenantCode?: TenantCode;
  className?: string;
}

const UNIT_OPTIONS = VAG_VIEW_UNITS.map((unit) => ({
  value: unit.id,
  label: `${unit.badge} — ${unit.name}`,
}));

/**
 * VAG HRM actions — same Add User / Add Role forms as entity apps (HQ6 detail
 * pages), plus manage lists. Entity picker scopes which app the forms open in.
 */
export function HrmActionBar({
  groupMode = false,
  fixedTenantCode,
  className,
}: HrmActionBarProps) {
  const router = useRouter();
  const isHq6 = useIsVaHq6();
  const { requireCan } = useHq6Permissions();
  const { tenantCode: routeTenantCode } = useRouteTenant({ adminFallback: null });
  const viewingCode = useAdminEntityStore((s) => s.viewingCode);
  const setViewingCode = useAdminEntityStore((s) => s.setViewingCode);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const workspaceCode: TenantCode | null = fixedTenantCode
    ? fixedTenantCode
    : viewingCode && isVagViewUnitId(viewingCode)
      ? getVagViewUnit(viewingCode).enterCode
      : routeTenantCode;

  const activeTenant = workspaceCode ? getTenantByCode(workspaceCode) : null;
  const needsEntity = groupMode && !fixedTenantCode;
  const manageBlocked = !activeTenant;

  const helperText = useMemo(() => {
    if (fixedTenantCode && activeTenant) {
      return `Add users or roles for ${activeTenant.name} using the same forms as that app.`;
    }
    if (groupMode) {
      return "Add roles opens the shared group catalog (no entity pick). Pick an entity to add users into a specific business.";
    }
    return null;
  }, [activeTenant, fixedTenantCode, groupMode]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const requireEntity = (): TenantCode | null => {
    if (workspaceCode) return workspaceCode;
    toast.error("Select an entity first");
    return null;
  };

  const goAddUser = () => {
    if (!requireCan("user.create")) return;
    const code = requireEntity();
    if (!code) return;
    setMenuOpen(false);
    router.push(`${tenantBasePath(code)}/users/new/edit`);
  };

  const goAddRole = () => {
    if (!requireCan("roles.create")) return;
    setMenuOpen(false);
    // Shared role catalog — VAG group HRM does not need an entity first.
    if (groupMode && !fixedTenantCode) {
      router.push("/admin/hrm/roles/new/edit");
      return;
    }
    const code = requireEntity();
    if (!code) return;
    router.push(`${tenantBasePath(code)}/roles/new/edit`);
  };

  const actionBtnClass = isHq6
    ? "hq6-btn hq6-btn-outline disabled:cursor-not-allowed disabled:opacity-50"
    : "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-nav-hover)] disabled:cursor-not-allowed disabled:opacity-50";

  const primaryBtnClass = isHq6
    ? "hq6-btn hq6-btn-blue disabled:cursor-not-allowed disabled:opacity-50"
    : "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-primary)] px-3 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div
      className={cn(
        className ??
          (isHq6
            ? "hq6-card hq6-finance-action-bar print:hidden"
            : "rounded-xl border border-border bg-card p-5 shadow-sm print:hidden"),
      )}
    >
      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-3">
        {needsEntity ? (
          <div className="tw-min-w-[220px] tw-flex-1 sm:tw-max-w-xs">
            <label
              htmlFor="hrm-action-entity"
              className={
                isHq6
                  ? "tw-mb-1 tw-block tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-[#6b7280]"
                  : "mb-1.5 block text-sm font-medium text-foreground"
              }
            >
              Entity
            </label>
            <select
              id="hrm-action-entity"
              className={isHq6 ? "form-control select2" : "form-control"}
              value={viewingCode ?? ""}
              onChange={(e) => setViewingCode(e.target.value || null)}
            >
              <option value="">Select entity…</option>
              {UNIT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
          <div className="tw-relative" ref={menuRef}>
            <button
              type="button"
              className={cn(primaryBtnClass, "tw-inline-flex tw-items-center tw-gap-1.5")}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <UserPlus className="tw-h-4 tw-w-4" />
              Add
              <ChevronDown className="tw-h-4 tw-w-4" />
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className={
                  isHq6
                    ? "tw-absolute tw-left-0 tw-z-30 tw-mt-1 tw-min-w-[180px] tw-rounded-md tw-border tw-border-[#e5e7eb] tw-bg-white tw-py-1 tw-shadow-lg"
                    : "absolute left-0 z-30 mt-1 min-w-[180px] rounded-lg border border-border bg-card py-1 shadow-lg"
                }
              >
                <button
                  type="button"
                  role="menuitem"
                  className={
                    isHq6
                      ? "tw-flex tw-w-full tw-items-center tw-gap-2 tw-px-3 tw-py-2 tw-text-left tw-text-sm tw-text-[#111827] hover:tw-bg-[#f3f4f6]"
                      : "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-[var(--color-surface-nav-hover)]"
                  }
                  onClick={goAddUser}
                >
                  <UserPlus className="tw-h-4 tw-w-4" />
                  Add user
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={
                    isHq6
                      ? "tw-flex tw-w-full tw-items-center tw-gap-2 tw-px-3 tw-py-2 tw-text-left tw-text-sm tw-text-[#111827] hover:tw-bg-[#f3f4f6]"
                      : "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-[var(--color-surface-nav-hover)]"
                  }
                  onClick={goAddRole}
                >
                  <Shield className="tw-h-4 tw-w-4" />
                  Add roles
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className={actionBtnClass}
            disabled={manageBlocked}
            onClick={() => {
              if (!requireCan("user.view", "view")) return;
              if (!workspaceCode) return;
              router.push(`/${workspaceCode}/users`);
            }}
          >
            <Users className="tw-h-4 tw-w-4" />
            Manage Users
          </button>
          <button
            type="button"
            className={actionBtnClass}
            disabled={groupMode && !fixedTenantCode ? false : manageBlocked}
            onClick={() => {
              if (!requireCan("roles.view", "view")) return;
              if (groupMode && !fixedTenantCode) {
                router.push("/admin/hrm/roles");
                return;
              }
              if (!workspaceCode) return;
              router.push(`/${workspaceCode}/roles`);
            }}
          >
            <Shield className="tw-h-4 tw-w-4" />
            Manage Roles
          </button>
        </div>
      </div>
      {helperText ? (
        <p
          className={
            isHq6
              ? "tw-mt-3 tw-mb-0 tw-text-xs tw-leading-relaxed tw-text-[#6b7280]"
              : "mt-3 text-xs text-muted"
          }
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
