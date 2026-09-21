"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Hq6BoldStatusBadge } from "@/components/hq6/Hq6BoldStatusBadge";
import { Hq6FormShell } from "@/components/hq6/Hq6Chrome";
import { getPayrollGroup } from "@/lib/api/hrm";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { PayrollGroupViewSummary } from "./PayrollGroupViewSummary";

export type PayrollGroupViewPageProps = {
  groupId: string;
  backHref: string;
  editHref: string;
  payHref: string;
  /** Override route tenant (VAG). */
  tenantId?: string | null;
};

export function PayrollGroupViewPage({
  groupId,
  backHref,
  editHref,
  payHref,
  tenantId: tenantIdProp,
}: PayrollGroupViewPageProps) {
  const routeTenantId = useTenantId();
  const tenantId = tenantIdProp ?? routeTenantId;

  const groupQuery = useQuery({
    queryKey: ["payroll-group", tenantId, groupId],
    enabled: Boolean(tenantId && groupId),
    queryFn: () => getPayrollGroup(tenantId!, groupId),
  });

  const group = groupQuery.data;

  if (groupQuery.isLoading) {
    return (
      <Hq6FormShell title="Payroll group">
        <p className="text-sm text-[#64748b]">Loading payroll group…</p>
      </Hq6FormShell>
    );
  }

  if (groupQuery.isError) {
    return (
      <Hq6FormShell title="Payroll group">
        <p className="text-sm text-[var(--color-error-text)]">
          {groupQuery.error instanceof Error
            ? groupQuery.error.message
            : "Failed to load payroll group"}
        </p>
        <div className="mt-4">
          <Link href={backHref} className="btn btn-default">
            Back to payroll groups
          </Link>
        </div>
      </Hq6FormShell>
    );
  }

  if (!group) {
    return (
      <Hq6FormShell title="Payroll group">
        <p className="text-sm text-[#64748b]">Payroll group not found.</p>
      </Hq6FormShell>
    );
  }

  return (
    <Hq6FormShell
      multiCard
      title={group.name}
      subtitle={`${group.payrollCount} payroll${group.payrollCount === 1 ? "" : "s"}`}
    >
      <section className="hq6-form-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <p className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-[#333]">Status:</span>
                <Hq6BoldStatusBadge status={group.status} kind="payroll" />
              </p>
              <p className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-[#333]">Payment:</span>
                <Hq6BoldStatusBadge
                  status={group.paymentStatus}
                  kind="payment"
                />
              </p>
            </div>
            <div className="grid gap-1 text-sm sm:grid-cols-2">
              <p>
                <span className="text-[#64748b]">Total gross: </span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(group.totalGross, "NGN")}
                </span>
              </p>
              {group.locationCode ? (
                <p>
                  <span className="text-[#64748b]">Location: </span>
                  <span className="font-medium">{group.locationCode}</span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="hq6-btn hq6-btn-outline inline-flex items-center gap-1.5"
              onClick={() => window.print()}
            >
              <Printer className="size-4" />
              Print
            </button>
            <Link href={editHref} className="hq6-btn hq6-btn-outline">
              Edit
            </Link>
            <Link href={payHref} className="hq6-btn hq6-btn-blue">
              Pay
            </Link>
          </div>
        </div>
      </section>

      <PayrollGroupViewSummary group={group} />

      <div className="flex flex-wrap gap-2">
        <Link href={backHref} className="btn btn-default">
          Back to payroll groups
        </Link>
      </div>
    </Hq6FormShell>
  );
}
