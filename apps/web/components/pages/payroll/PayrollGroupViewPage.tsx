"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { getPayrollGroup } from "@/lib/api/hrm";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to payroll groups
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={editHref} className="hq6-btn hq6-btn-outline">
            Edit
          </Link>
          <Link href={payHref} className="hq6-btn hq6-btn-blue">
            Pay
          </Link>
        </div>
      </div>

      {groupQuery.isLoading ? (
        <p className="text-sm text-muted">Loading payroll group…</p>
      ) : groupQuery.isError ? (
        <p className="text-sm text-[var(--color-error-text)]">
          {groupQuery.error instanceof Error
            ? groupQuery.error.message
            : "Failed to load payroll group"}
        </p>
      ) : group ? (
        <PayrollGroupViewSummary
          group={group}
          onPrint={() => window.print()}
        />
      ) : null}
    </div>
  );
}
