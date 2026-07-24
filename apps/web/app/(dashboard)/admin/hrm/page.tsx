"use client";

import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import { HrmPageView } from "@/components/pages/HrmPageView";
import { HrView } from "@/components/pages/HrView";
import {
  getVagViewUnit,
  isVagViewUnitId,
} from "@/lib/registries/vagViewUnits";
import { useAdminEntityStore } from "@/stores/adminEntityStore";

/**
 * VAG HRM — same module as Vonos Automotive.
 * Entity / Spare Parts selected → that unit's HRM (SP uses VISP as primary).
 * Group view → cross-entity workforce.
 */
export default function AdminHrmPage() {
  const viewingCode = useAdminEntityStore((s) => s.viewingCode);
  const viewingUnit =
    viewingCode && isVagViewUnitId(viewingCode)
      ? getVagViewUnit(viewingCode)
      : null;

  if (viewingUnit) {
    return (
      <Hq6PageFrame
        title={`HRM — ${viewingUnit.name}`}
        subtitle="Entity HRM · switch above to change without leaving"
      >
        <div className="space-y-3">
          <div className="hq6-card px-4 py-3 text-sm text-[#6b7280]">
            HRM for{" "}
            <span className="font-semibold text-[#111827]">{viewingUnit.name}</span>
            {viewingUnit.description ? (
              <>
                {" "}
                ({viewingUnit.description}). Primary workspace:{" "}
                <span className="font-semibold text-[#111827]">
                  /{viewingUnit.enterCode}/hrm
                </span>
                .
              </>
            ) : (
              <>
                {" "}
                — same as{" "}
                <span className="font-semibold text-[#111827]">
                  /{viewingUnit.enterCode}/hrm
                </span>
                .
              </>
            )}{" "}
            Switch entity above to change — stay on HRM.
          </div>
          <HrmPageView defaultTab="dashboard" forceFullTabs />
        </div>
      </Hq6PageFrame>
    );
  }

  return (
    <Hq6PageFrame
      title="HRM"
      subtitle="Group workforce across all entities"
    >
      <div className="space-y-3">
        <div className="hq6-card px-4 py-3 text-sm text-[#6b7280]">
          Group workforce across all entities. Pick Automotive, Warehouse, or Spare
          Parts (VISP+VSP) in the top-bar switcher for that unit&apos;s full HRM —
          no need to leave this page.
        </div>
        <HrView allTenants />
      </div>
    </Hq6PageFrame>
  );
}
