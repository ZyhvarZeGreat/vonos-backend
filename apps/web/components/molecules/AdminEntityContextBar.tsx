"use client";

import {
  accentTenantCodeForVagUnit,
  getVagViewUnit,
  isVagViewUnitId,
} from "@/lib/registries/vagViewUnits";
import { accentForTenantCode } from "@/lib/registries/tenantAccents";
import { iconForTenantCode } from "@/lib/registries/tenantIcons";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AdminEntitySwitcher } from "@/components/molecules/AdminEntitySwitcher";
import { useAdminEntityStore } from "@/stores/adminEntityStore";

/**
 * VAG module strip: entity scope for Reports / Finance / HRM.
 * Does not leave `/admin/*` — use the top-bar switcher to open a full entity dashboard.
 */
export function AdminEntityContextBar({ className }: { className?: string }) {
  const viewingCode = useAdminEntityStore((s) => s.viewingCode);
  const viewingUnit =
    viewingCode && isVagViewUnitId(viewingCode)
      ? getVagViewUnit(viewingCode)
      : null;
  const ActiveIcon = viewingUnit
    ? iconForTenantCode(accentTenantCodeForVagUnit(viewingUnit.id))
    : Building2;
  const accent = viewingUnit
    ? accentForTenantCode(accentTenantCodeForVagUnit(viewingUnit.id))
    : accentForTenantCode("VAG");

  const title = viewingUnit
    ? `${viewingUnit.badge} — ${viewingUnit.name.replace(/^Vonos\s+/i, "")}`
    : "Group — All entities";
  const detail = viewingUnit
    ? viewingUnit.tenantCodes.length > 1
      ? `Stay in VAG · Reports, Finance, HRM, Stock · ${viewingUnit.tenantCodes.join(" + ")}`
      : `Stay in VAG · Reports, Finance, HRM, Stock · same as /${viewingUnit.enterCode}`
    : "Stay in VAG · consolidated Reports, Finance, HRM & Stock";

  return (
    <div
      className={cn(
        "tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-border-b tw-border-solid tw-border-gray-200 tw-bg-white tw-px-4 tw-py-2.5 sm:tw-px-5",
        className,
      )}
    >
      <div className="tw-flex tw-min-w-0 tw-flex-1 tw-items-center tw-gap-3">
        <span
          className="tw-flex tw-h-9 tw-w-9 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-md tw-text-white"
          style={{ backgroundColor: accent }}
          aria-hidden
        >
          <ActiveIcon className="tw-h-4 tw-w-4" />
        </span>
        <div className="tw-min-w-0">
          <p className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-gray-500">
            Module entity
            <span className="tw-ml-1.5 tw-font-normal tw-normal-case tw-tracking-normal tw-text-gray-400">
              (stay in VAG)
            </span>
          </p>
          <p className="tw-truncate tw-text-sm tw-font-semibold tw-text-gray-900">
            {title}
          </p>
          <p className="tw-truncate tw-text-xs tw-text-gray-500">{detail}</p>
        </div>
      </div>

      <div className="tw-flex tw-w-full tw-min-w-0 tw-flex-col tw-gap-1 sm:tw-w-auto sm:tw-min-w-[18rem] sm:tw-max-w-md">
        <label
          htmlFor="upos-admin-report-entity"
          className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-gray-500"
        >
          Switch module entity
        </label>
        <AdminEntitySwitcher variant="bar" className="tw-w-full" />
      </div>
    </div>
  );
}
