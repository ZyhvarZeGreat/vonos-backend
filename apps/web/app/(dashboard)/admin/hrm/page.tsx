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
 * VAG Group HRM — summary dashboard only (full HRM lives in each entity app).
 * “Show info for” scopes which tenant’s summary loads (SP → VSP).
 * Add / invite users stays on Group admin.
 */
export default function AdminHrmPage() {
  const viewingCode = useAdminEntityStore((s) => s.viewingCode);
  const viewingUnit =
    viewingCode && isVagViewUnitId(viewingCode)
      ? getVagViewUnit(viewingCode)
      : null;

  const title = viewingUnit ? `HRM — ${viewingUnit.name}` : "HRM";
  const subtitle = viewingUnit
    ? `Group summary for ${viewingUnit.name} · full HRM is in that business app`
    : "Group HRM summary · invite users here · open an app for full HRM modules";

  return (
    <Hq6PageFrame title={title} subtitle={subtitle}>
      <div className="space-y-3">
        <HrmActionBar
          groupMode
          fixedTenantCode={viewingUnit?.enterCode}
        />
        <div className="hq6-card px-4 py-3 text-sm text-[#6b7280]">
          Group admin shows the <span className="font-semibold text-[#111827]">HRM summary</span>{" "}
          only. Leave, payroll, attendance, and other modules open inside each
          business via{" "}
          <span className="font-semibold text-[#111827]">Open app</span> in the
          top bar
          {viewingUnit ? (
            <>
              {" "}
              (or go to{" "}
              <span className="font-semibold text-[#111827]">
                /{viewingUnit.enterCode}/hrm
              </span>
              ).
            </>
          ) : (
            <>.</>
          )}
        </div>
        <HrmPageView defaultTab="dashboard" summaryOnly />
      </div>
    </Hq6PageFrame>
  );
}
