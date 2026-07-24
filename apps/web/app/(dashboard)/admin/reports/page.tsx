"use client";

import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import { EntityReportsView } from "@/components/pages/EntityReportsView";
import { VagGroupReportsView } from "@/components/pages/ReportsView";
import {
  getVagViewUnit,
  isVagViewUnitId,
} from "@/lib/registries/vagViewUnits";
import { useAdminEntityStore } from "@/stores/adminEntityStore";

/**
 * VAG Reports — group roll-up by default; entity/SP selection shows that
 * unit's reports (SP → VISP archetype hub; VSP still reachable via Open links).
 */
export default function AdminReportsPage() {
  const viewingCode = useAdminEntityStore((s) => s.viewingCode);
  const viewingUnit =
    viewingCode && isVagViewUnitId(viewingCode)
      ? getVagViewUnit(viewingCode)
      : null;

  if (viewingUnit) {
    return (
      <Hq6PageFrame
        title={`Reports — ${viewingUnit.name}`}
        subtitle="Entity reports · switch above to change without leaving"
      >
        <div className="space-y-3">
          <div className="hq6-card px-4 py-3 text-sm text-[#6b7280]">
            Reports for{" "}
            <span className="font-semibold text-[#111827]">{viewingUnit.name}</span>
            {viewingUnit.tenantCodes.length > 1 ? (
              <>
                {" "}
                — showing {viewingUnit.enterCode} sheets; open{" "}
                {viewingUnit.tenantCodes
                  .filter((c) => c !== viewingUnit.enterCode)
                  .join(", ")}{" "}
                from the entity workspace for marketplace-only reports.
              </>
            ) : (
              <>
                {" "}
                — same as /{viewingUnit.enterCode}/reports.
              </>
            )}{" "}
            Switch entity above to change without leaving Reports.
          </div>
          <EntityReportsView tenantCode={viewingUnit.enterCode} />
        </div>
      </Hq6PageFrame>
    );
  }

  return (
    <Hq6PageFrame title="Reports" subtitle="Group roll-up across entities">
      <VagGroupReportsView />
    </Hq6PageFrame>
  );
}
