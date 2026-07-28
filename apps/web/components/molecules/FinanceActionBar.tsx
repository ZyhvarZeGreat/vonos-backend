"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Plus, Receipt, ShoppingCart } from "lucide-react";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { getTenantByCode, type TenantCode } from "@/lib/registries/tenants";
import {
  getVagViewUnit,
  isVagViewUnitId,
  VAG_VIEW_UNITS,
} from "@/lib/registries/vagViewUnits";
import { useAdminEntityStore } from "@/stores/adminEntityStore";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import { cn } from "@/lib/utils/cn";

export interface FinanceActionBarProps {
  /** VAG group finance — uses admin viewing entity (or local pick). */
  groupMode?: boolean;
  /** Entity drill-down — tenant is fixed from the route. */
  fixedTenantCode?: TenantCode;
  className?: string;
}

const UNIT_OPTIONS = VAG_VIEW_UNITS.map((unit) => ({
  value: unit.id,
  label: `${unit.badge} — ${unit.name.replace(/^Vonos\s+/i, "")}`,
}));

/**
 * Admin/group finance actions.
 * Expense + Sale open in-place modals for the chosen entity (no page redirect).
 * Payments / purchases still deep-link into that entity’s list pages.
 */
export function FinanceActionBar({
  groupMode = false,
  fixedTenantCode,
  className,
}: FinanceActionBarProps) {
  const router = useRouter();
  const isHq6 = useIsVaHq6();
  const { tenantCode: routeTenantCode } = useRouteTenant({ adminFallback: null });
  const viewingCode = useAdminEntityStore((s) => s.viewingCode);
  const setViewingCode = useAdminEntityStore((s) => s.setViewingCode);
  const openAddExpenseModal = useUiStore((s) => s.openAddExpenseModal);
  const openAddSaleModal = useUiStore((s) => s.openAddSaleModal);

  const workspaceCode: TenantCode | null = fixedTenantCode
    ? fixedTenantCode
    : viewingCode && isVagViewUnitId(viewingCode)
      ? getVagViewUnit(viewingCode).enterCode
      : routeTenantCode;

  const activeTenant = workspaceCode ? getTenantByCode(workspaceCode) : null;
  const needsEntity = groupMode && !fixedTenantCode;
  const blocked = !activeTenant;

  const helperText = useMemo(() => {
    if (fixedTenantCode && activeTenant) {
      return `Expense and sale stay on this page for ${activeTenant.name}. Payments and purchases open that app’s list.`;
    }
    if (groupMode) {
      return "Pick which business to post for, then Add Expense or Add Sale here (no redirect). Payments / purchases open that app’s page.";
    }
    return null;
  }, [activeTenant, fixedTenantCode, groupMode]);

  const requireTenant = (): string | null => {
    if (!activeTenant?.tenantId) {
      toast.error("Choose a business first");
      return null;
    }
    return activeTenant.tenantId;
  };

  const goToEntity = (suffix: string) => {
    if (!workspaceCode) {
      toast.error("Choose a business first");
      return;
    }
    router.push(`/${workspaceCode}/${suffix}`);
  };

  const actionBtnClass = isHq6
    ? "hq6-btn hq6-btn-outline disabled:cursor-not-allowed disabled:opacity-50"
    : "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-nav-hover)] disabled:cursor-not-allowed disabled:opacity-50";

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
              htmlFor="finance-action-entity"
              className={
                isHq6
                  ? "tw-mb-1 tw-block tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-[#6b7280]"
                  : "mb-1.5 block text-sm font-medium text-foreground"
              }
            >
              Post for business
            </label>
            <select
              id="finance-action-entity"
              className={isHq6 ? "form-control select2" : "form-control"}
              value={viewingCode ?? ""}
              onChange={(e) => setViewingCode(e.target.value || null)}
            >
              <option value="">Select business…</option>
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
            className={actionBtnClass}
            disabled={blocked}
            onClick={() => goToEntity("payments")}
          >
            <CreditCard className="tw-h-4 tw-w-4" />
            Payments
          </button>
          <button
            type="button"
            className={actionBtnClass}
            disabled={blocked}
            onClick={() => {
              const tenantId = requireTenant();
              if (tenantId) openAddExpenseModal(tenantId);
            }}
          >
            <Receipt className="tw-h-4 tw-w-4" />
            Add Expense
          </button>
          <button
            type="button"
            className={actionBtnClass}
            disabled={blocked}
            onClick={() => {
              const tenantId = requireTenant();
              if (tenantId) openAddSaleModal(tenantId);
            }}
          >
            <Plus className="tw-h-4 tw-w-4" />
            Add Sale
          </button>
          <button
            type="button"
            className={actionBtnClass}
            disabled={blocked}
            onClick={() => goToEntity("purchase-orders")}
          >
            <ShoppingCart className="tw-h-4 tw-w-4" />
            Record Purchase
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
