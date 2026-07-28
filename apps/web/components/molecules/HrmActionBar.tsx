"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Users } from "lucide-react";
import { InviteUserModal } from "@/components/organisms/InviteUserModal";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { hasPermission } from "@/lib/utils/permissions";
import { getTenantByCode, type TenantCode } from "@/lib/registries/tenants";
import {
  getVagViewUnit,
  isVagViewUnitId,
  VAG_VIEW_UNITS,
} from "@/lib/registries/vagViewUnits";
import { cn } from "@/lib/utils/cn";
import { useAdminEntityStore } from "@/stores/adminEntityStore";
import { useAuthStore } from "@/stores/authStore";

export interface HrmActionBarProps {
  /** VAG group HRM — pick entity for manage-users deep link. */
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
 * VAG HRM actions — add/invite users (modal with entity pick) and open
 * an entity's Users list. Mirrors FinanceActionBar for group overview.
 */
export function HrmActionBar({
  groupMode = false,
  fixedTenantCode,
  className,
}: HrmActionBarProps) {
  const router = useRouter();
  const isHq6 = useIsVaHq6();
  const authRole = useAuthStore((s) => s.role);
  const canInvite = authRole ? hasPermission(authRole, "manageUsers") : false;
  const { tenantCode: routeTenantCode } = useRouteTenant({ adminFallback: null });
  const viewingCode = useAdminEntityStore((s) => s.viewingCode);
  const setViewingCode = useAdminEntityStore((s) => s.setViewingCode);
  const [inviteOpen, setInviteOpen] = useState(false);

  const workspaceCode: TenantCode | null = fixedTenantCode
    ? fixedTenantCode
    : viewingCode && isVagViewUnitId(viewingCode)
      ? getVagViewUnit(viewingCode).enterCode
      : routeTenantCode;

  const activeTenant = workspaceCode ? getTenantByCode(workspaceCode) : null;
  const needsEntity = groupMode && !fixedTenantCode;
  const manageBlocked = !activeTenant;

  const defaultTenantId = activeTenant?.tenantId ?? null;

  const helperText = useMemo(() => {
    if (fixedTenantCode && activeTenant) {
      return `Add users to ${activeTenant.name}, or open that entity's Users list.`;
    }
    if (groupMode) {
      return "Invite or create staff for any entity (or VAG). Pick a module entity to open its Users page.";
    }
    return null;
  }, [activeTenant, fixedTenantCode, groupMode]);

  if (!canInvite) return null;

  const actionBtnClass = isHq6
    ? "hq6-btn hq6-btn-outline disabled:cursor-not-allowed disabled:opacity-50"
    : "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-nav-hover)] disabled:cursor-not-allowed disabled:opacity-50";

  const primaryBtnClass = isHq6
    ? "hq6-btn hq6-btn-blue disabled:cursor-not-allowed disabled:opacity-50"
    : "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-primary)] px-3 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <>
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
                Entity for users
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

          <div className="tw-flex tw-flex-wrap tw-gap-2">
            <button
              type="button"
              className={primaryBtnClass}
              onClick={() => setInviteOpen(true)}
            >
              <UserPlus className="tw-h-4 tw-w-4" />
              Add User
            </button>
            <button
              type="button"
              className={actionBtnClass}
              disabled={manageBlocked}
              onClick={() => {
                if (!workspaceCode) return;
                router.push(`/${workspaceCode}/users`);
              }}
            >
              <Users className="tw-h-4 tw-w-4" />
              Manage Users
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

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        allTenants={groupMode}
        defaultTenantId={defaultTenantId}
      />
    </>
  );
}
