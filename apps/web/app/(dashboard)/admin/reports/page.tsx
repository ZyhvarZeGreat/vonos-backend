"use client";

import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import {
  AdminEntityReportsHub,
  VagGroupReportsView,
} from "@/lib/registries/lazyEntityViews";
import {
  getVagViewUnit,
  isVagViewUnitId,
} from "@/lib/registries/vagViewUnits";
import { useAdminEntityStore } from "@/stores/adminEntityStore";

/**
 * VAG Reports — group roll-up by default; entity/SP selection shows the same
 * reports hub as that entity’s `/reports` (dashboard + printable sheets).
 */
export default function AdminReportsPage() {
  const viewingCode = useAdminEntityStore((s) => s.viewingCode);
  const viewingUnit =
    viewingCode && isVagViewUnitId(viewingCode)
      ? getVagViewUnit(viewingCode)
      : null;

  if (viewingUnit) {
    return (
      <AdminEntityReportsHub
        tenantCode={viewingUnit.enterCode}
        embedded
        title={`Reports — ${viewingUnit.name}`}
        subtitle="Same report sheets as the entity app · scoped by Show info for"
      />
    );
  }

  return (
    <Hq6PageFrame title="Reports" subtitle="Group roll-up across entities">
      <VagGroupReportsView />
    </Hq6PageFrame>
  );
}
