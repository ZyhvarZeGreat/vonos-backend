"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Plus, Receipt, ShoppingCart } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Select } from "@/components/atoms/Select";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import {
  ENTITY_LIST,
  getTenantByCode,
  type TenantCode,
} from "@/lib/registries/tenants";
import { useUiStore } from "@/stores/uiStore";

export interface FinanceActionBarProps {
  /** VAG group finance — admin picks entity before acting. */
  groupMode?: boolean;
  /** Entity drill-down — tenant is fixed from the route. */
  fixedTenantCode?: TenantCode;
  className?: string;
}

const ENTITY_OPTIONS = ENTITY_LIST.map((entity) => ({
  value: entity.code,
  label: `${entity.code} — ${entity.name}`,
}));

export function FinanceActionBar({
  groupMode = false,
  fixedTenantCode,
  className,
}: FinanceActionBarProps) {
  const router = useRouter();
  const { tenantCode: routeTenantCode } = useRouteTenant();
  const openAddExpenseModal = useUiStore((state) => state.openAddExpenseModal);
  const openAddSaleModal = useUiStore((state) => state.openAddSaleModal);
  const [pickedCode, setPickedCode] = useState<TenantCode | "">("");

  const resolvedCode =
    fixedTenantCode ?? (groupMode ? pickedCode || null : routeTenantCode);
  const activeTenant = resolvedCode ? getTenantByCode(resolvedCode) : null;
  const needsEntity = groupMode && !fixedTenantCode;
  const blocked = !activeTenant;

  const helperText = useMemo(() => {
    if (fixedTenantCode && activeTenant) {
      return `Actions apply to ${activeTenant.name}. Sales and purchases open in that entity workspace.`;
    }
    if (groupMode) {
      return "Choose an entity, then record payments, expenses, sales, or purchases for that department.";
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
              label="Entity"
              value={pickedCode}
              onChange={(e) => setPickedCode(e.target.value as TenantCode | "")}
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
            onClick={() => {
              if (!activeTenant) return;
              openAddExpenseModal(activeTenant.tenantId);
            }}
          >
            <Receipt className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={blocked}
            onClick={() => {
              if (!activeTenant) return;
              openAddSaleModal(activeTenant.tenantId);
            }}
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
