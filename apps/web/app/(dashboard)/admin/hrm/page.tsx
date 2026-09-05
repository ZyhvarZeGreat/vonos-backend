"use client";

import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import { HrmPageView } from "@/components/pages/HrmPageView";
import {
  getVagViewUnit,
  isVagViewUnitId,
} from "@/lib/registries/vagViewUnits";
import { useAdminEntityStore } from "@/stores/adminEntityStore";
import Link from "next/link";

/**
 * VAG Group HRM summary. User/role actions live in the sidebar under HRM:
 * Manage users · Add users · Add roles.
 */
export default function AdminHrmPage() {
  const viewingCode = useAdminEntityStore((s) => s.viewingCode);
  const viewingUnit =
    viewingCode && isVagViewUnitId(viewingCode)
      ? getVagViewUnit(viewingCode)
      : null;

  const title = viewingUnit ? `HRM — ${viewingUnit.name}` : "HRM";
  const subtitle = viewingUnit
    ? `Group summary for ${viewingUnit.name}`
    : "Group HRM summary";

  return (
    <Hq6PageFrame title={title} subtitle={subtitle}>
      <div className="space-y-3">
        <div className="hq6-card px-4 py-3 text-sm text-[#6b7280]">
          Use the sidebar under <span className="font-semibold text-[#111827]">HRM</span>
          :{" "}
          <Link href="/admin/hrm/users" className="tw-text-[#3c8dbc] tw-underline">
            Manage users
          </Link>
          ,{" "}
          <Link
            href="/admin/hrm/users/new/edit"
            className="tw-text-[#3c8dbc] tw-underline"
          >
            Add users
          </Link>
          ,{" "}
          <Link
            href="/admin/hrm/roles/new/edit"
            className="tw-text-[#3c8dbc] tw-underline"
          >
            Add roles
          </Link>
          ,{" "}
          <Link href="/admin/hrm/payroll" className="tw-text-[#3c8dbc] tw-underline">
            Payroll
          </Link>
          . Role definitions are shared across all businesses — no entity pick
          needed. For users, assign entities on the add/edit form. Payroll lists
          and pays staff across every business.
        </div>
        <HrmPageView defaultTab="dashboard" summaryOnly />
      </div>
    </Hq6PageFrame>
  );
}
