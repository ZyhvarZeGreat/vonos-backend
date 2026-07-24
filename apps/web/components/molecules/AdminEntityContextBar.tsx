"use client";

import { Building2 } from "lucide-react";
import {
  accentTenantCodeForVagUnit,
  getVagViewUnit,
  isVagViewUnitId,
} from "@/lib/registries/vagViewUnits";
import { accentForTenantCode } from "@/lib/registries/tenantAccents";
import { iconForTenantCode } from "@/lib/registries/tenantIcons";
import { cn } from "@/lib/utils/cn";
import { AdminEntitySwitcher } from "@/components/molecules/AdminEntitySwitcher";
import { useAdminEntityStore } from "@/stores/adminEntityStore";

/**
 * Persistent admin strip: which entity scope is active for Finance / Reports /
 * HRM, plus the switcher to change it without leaving the module.
 */
export function AdminEntityContextBar({ className }: { className?: string }) {
  const viewingCode = useAdminEntityStore((s) => s.viewingCode);
  const viewingUnit =
    viewingCode && isVagViewUnitId(viewingCode)
      ? getVagViewUnit(viewingCode)
      : null;
  const label = viewingUnit
    ? `${viewingUnit.name} (${viewingUnit.badge})`
    : "All entities (Group)";
  const ActiveIcon = viewingUnit
    ? iconForTenantCode(accentTenantCodeForVagUnit(viewingUnit.id))
    : Building2;
  const accent = viewingUnit
    ? accentForTenantCode(accentTenantCodeForVagUnit(viewingUnit.id))
    : accentForTenantCode("VAG");

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b border-border bg-[var(--color-surface-muted)]/80 px-4 py-2.5 sm:px-6",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white"
          style={{ backgroundColor: accent }}
        >
          <ActiveIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Viewing
          </p>
          <p className="truncate text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted">
            Finance, reports, and entity-scoped modules use this selection. Use
            the top-bar switcher to open a full entity workspace.
          </p>
        </div>
      </div>

      <AdminEntitySwitcher variant="bar" className="shrink-0" />
    </div>
  );
}
