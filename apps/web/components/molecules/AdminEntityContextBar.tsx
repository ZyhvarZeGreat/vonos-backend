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
 * VAG strip under the header: which business’s data to show in Group admin
 * (Reports / Finance / HRM / Stock). Does not leave `/admin/*`.
 * Use the top-bar “Open an app” control to enter a full entity dashboard.
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
    ? viewingUnit.name.replace(/^Vonos\s+/i, "")
    : "All businesses";
  const detail = viewingUnit
    ? viewingUnit.tenantCodes.length > 1
      ? `Group admin view · ${viewingUnit.tenantCodes.join(" + ")} · Reports, Finance, HRM, Stock`
      : `Group admin view · same data as /${viewingUnit.enterCode} · Reports, Finance, HRM, Stock`
    : "Group admin view · combined Reports, Finance, HRM & Stock across the group";

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
            Group information
            <span className="tw-ml-1.5 tw-font-normal tw-normal-case tw-tracking-normal tw-text-gray-400">
              (stay in admin)
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
          Show info for
        </label>
        <AdminEntitySwitcher variant="bar" className="tw-w-full" />
        <p className="tw-mb-0 tw-text-[11px] tw-leading-snug tw-text-gray-400">
          Filters what you see here. To work inside a business app, use{" "}
          <span className="tw-font-semibold tw-text-gray-500">Open an app</span>{" "}
          in the top bar.
        </p>
      </div>
    </div>
  );
}
