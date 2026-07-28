"use client";

import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import { HrmActionBar } from "@/components/molecules/HrmActionBar";
import { HrmPageView } from "@/components/pages/HrmPageView";
import {
  getVagViewUnit,
  isVagViewUnitId,
} from "@/lib/registries/vagViewUnits";
import { useAdminEntityStore } from "@/stores/adminEntityStore";

/**
 * VAG HRM — same HrmPageView module as entity apps (`/{code}/hrm`).
 * “Show info for” scopes which tenant’s HRM loads (SP → VSP).
 * Group (no entity) falls back to Automotive (VA) via useRouteTenant.
 * Add User stays on the group overview (HQ6 hides Users under HRM tabs).
 */
export default function AdminHrmPage() {
  const viewingCode = useAdminEntityStore((s) => s.viewingCode);
  const viewingUnit =
    viewingCode && isVagViewUnitId(viewingCode)
      ? getVagViewUnit(viewingCode)
      : null;

  const title = viewingUnit ? `HRM — ${viewingUnit.name}` : "HRM";
  const subtitle = viewingUnit
    ? `Same module as /${viewingUnit.enterCode}/hrm · change “Show info for” above`
    : "Group HRM · add users across entities · pick a business under “Show info for” above";

  return (
    <Hq6PageFrame title={title} subtitle={subtitle}>
      <div className="space-y-3">
        <HrmActionBar
          groupMode
          fixedTenantCode={viewingUnit?.enterCode}
        />
        <div className="hq6-card px-4 py-3 text-sm text-[#6b7280]">
          {viewingUnit ? (
            <>
              Showing the same HRM as{" "}
              <span className="font-semibold text-[#111827]">
                /{viewingUnit.enterCode}/hrm
              </span>
              {viewingUnit.tenantCodes.length > 1 ? (
                <>
                  {" "}
                  (roll-up unit: {viewingUnit.tenantCodes.join(" + ")})
                </>
              ) : null}
              . Use{" "}
              <span className="font-semibold text-[#111827]">
                Show info for
              </span>{" "}
              above to switch without leaving Group admin. The top-bar{" "}
              <span className="font-semibold text-[#111827]">Open an app</span>{" "}
              control leaves admin and opens that business&apos;s full dashboard.
            </>
          ) : (
            <>
              Group overview — invite or create users for any entity below, then
              browse Automotive (VA) HRM by default. Pick a business under{" "}
              <span className="font-semibold text-[#111827]">
                Show info for
              </span>{" "}
              above for Warehouse or Spare Parts. Top-bar{" "}
              <span className="font-semibold text-[#111827]">Open an app</span>{" "}
              leaves Group admin for a full entity dashboard.
            </>
          )}
        </div>
        <HrmPageView defaultTab="dashboard" forceFullTabs />
      </div>
    </Hq6PageFrame>
  );
}
