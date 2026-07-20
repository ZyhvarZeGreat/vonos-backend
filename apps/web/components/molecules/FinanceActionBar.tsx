"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Plus, Receipt, ShoppingCart } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Select } from "@/components/atoms/Select";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import {
  AUTOS_GROUP_ENTITIES,
  getTenantByCode,
  type TenantCode,
} from "@/lib/registries/tenants";
import { useAdminEntityStore } from "@/stores/adminEntityStore";

export interface FinanceActionBarProps {
  /** VAG group finance — uses admin viewing entity (or local pick). */
  groupMode?: boolean;
  /** Entity drill-down — tenant is fixed from the route. */
  fixedTenantCode?: TenantCode;
  className?: string;
}

const ENTITY_OPTIONS = AUTOS_GROUP_ENTITIES.map((entity) => ({
  value: entity.code,
  label: `${entity.code} — ${entity.name}`,
}));

/**
 * Admin/group finance actions deep-link into the entity workspace.
 * No global add-sale / add-expense modals — those stay on entity pages.
 */
export function FinanceActionBar({
  groupMode = false,
  fixedTenantCode,
  className,
}: FinanceActionBarProps) {
  const router = useRouter();
  const { tenantCode: routeTenantCode } = useRouteTenant({ adminFallback: null });
  const viewingCode = useAdminEntityStore((s) => s.viewingCode);
  const setViewingCode = useAdminEntityStore((s) => s.setViewingCode);

  const resolvedCode =
    fixedTenantCode ?? (groupMode ? viewingCode : routeTenantCode);
  const activeTenant = resolvedCode ? getTenantByCode(resolvedCode) : null;
  const needsEntity = groupMode && !fixedTenantCode;
  const blocked = !activeTenant;

  const helperText = useMemo(() => {
    if (fixedTenantCode && activeTenant) {
      return `Actions open in ${activeTenant.name}'s workspace (sales, purchases, expenses, payments).`;
    }
    if (groupMode) {
      return "Pick an entity above (or here), then open that department's payments, expenses, sales, or purchases page.";
    }
    return null;
  }, [activeTenant, fixedTenantCode, groupMode]);

  const goToEntity = (suffix: string) => {
    if (!resolvedCode) return;
    router.push(`/${resolvedCode}/${suffix}`);
  };

  return (
    <div
      className={
        className ??
        "rounded-xl border border-border bg-card p-4 shadow-sm print:hidden"
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        {needsEntity ? (
          <div className="min-w-[220px] flex-1 sm:max-w-xs">
            <Select
              label="Entity for actions"
              value={viewingCode ?? ""}
              onChange={(e) =>
                setViewingCode((e.target.value || null) as TenantCode | null)
              }
              options={[{ value: "", label: "Select entity…" }, ...ENTITY_OPTIONS]}
            />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={blocked}
            onClick={() => goToEntity("payments")}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Payments
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={blocked}
            onClick={() => goToEntity("expenses")}
          >
            <Receipt className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={blocked}
            onClick={() => goToEntity("sales")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Sale
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={blocked}
            onClick={() => goToEntity("purchase-orders")}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Record Purchase
          </Button>
        </div>
      </div>
      {helperText ? (
        <p className="mt-3 text-xs text-muted">{helperText}</p>
      ) : null}
    </div>
  );
}
