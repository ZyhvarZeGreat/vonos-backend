"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { Payroll, PayrollGroupStatus } from "@vonos/types";
import type { PayrollEmployeePick } from "@/components/molecules/EmployeePayrollSearch";
import { Hq6BusyButton } from "@/components/hq6/Hq6BusyButton";
import { Hq6FormShell } from "@/components/hq6/Hq6Chrome";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { getPayrollGroup, updatePayrollGroupPayrolls } from "@/lib/api/hrm";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { toast } from "@/stores/toastStore";
import { PayrollGroupEmployeeForm } from "./PayrollGroupEmployeeForm";
import {
  basicSalaryTotal,
  buildPayrollNoteFromDraft,
  employeeDraftFromPayroll,
  payrollAmountsFromDraft,
  type EmployeePayrollDraft,
} from "./payrollDraftUtils";

type EditRow = {
  payrollId: string;
  employee: PayrollEmployeePick;
  draft: EmployeePayrollDraft;
  paid: boolean;
  /** Already paid out — new net pay can never go below this. */
  paidToDate: number;
};

function draftNetPay(draft: EmployeePayrollDraft): number {
  const { grossPay, totalAllowance, totalDeduction } =
    payrollAmountsFromDraft(draft);
  return grossPay + totalAllowance - totalDeduction;
}

export type PayrollGroupEditPageProps = {
  groupId: string;
  backHref: string;
  viewHref: string;
  tenantId?: string | null;
};

function payrollToEmployeePick(row: Payroll): PayrollEmployeePick {
  return {
    id: row.employeeRecordId ?? row.id,
    employeeName: row.employeeName,
    employeeId: row.employeeId,
    locationCode: row.locationCode,
    designationId: row.designationId,
    designationName: row.designationName,
    department: row.department ?? null,
    payrollGroupId: row.payrollGroupId,
    payrollGroupName: row.payrollGroupName,
  };
}

function isPayrollPaid(row: Payroll): boolean {
  return (
    row.paymentStatus === "paid" ||
    row.paymentStatus === "partial" ||
    row.status === "paid"
  );
}

export function PayrollGroupEditPage({
  groupId,
  backHref,
  viewHref,
  tenantId: tenantIdProp,
}: PayrollGroupEditPageProps) {
  const router = useRouter();
  const routeTenantId = useTenantId();
  const tenantId = tenantIdProp ?? routeTenantId;

  const groupQuery = useQuery({
    queryKey: ["payroll-group", tenantId, groupId],
    enabled: Boolean(tenantId && groupId),
    queryFn: () => getPayrollGroup(tenantId!, groupId),
  });

  const group = groupQuery.data;
  const [groupName, setGroupName] = useState("");
  const [groupStatus, setGroupStatus] = useState<PayrollGroupStatus>("draft");
  const [sendNotification, setSendNotification] = useState(false);
  const [rows, setRows] = useState<EditRow[]>([]);

  useEffect(() => {
    if (!group) return;
    setGroupName(group.name);
    setGroupStatus(group.status);
    setRows(
      group.payrolls.map((payroll) => ({
        payrollId: payroll.id,
        employee: payrollToEmployeePick(payroll),
        draft: employeeDraftFromPayroll(payroll),
        paid: isPayrollPaid(payroll),
        paidToDate: payroll.paidToDate ?? 0,
      })),
    );
  }, [group]);

  const paidCount = useMemo(() => rows.filter((row) => row.paid).length, [rows]);
  const hasPaidRows = paidCount > 0;

  /** Every row is editable; rows with money out must keep net >= paid-to-date. */
  const rowViolations = useMemo(() => {
    const out: Record<string, string> = {};
    for (const row of rows) {
      if (draftNetPay(row.draft) < row.paidToDate - 0.01) {
        out[row.payrollId] =
          `Net pay cannot go below ${formatCurrency(row.paidToDate, "NGN")} already paid — ` +
          `raise earnings or lower deductions first.`;
      }
    }
    return out;
  }, [rows]);

  const canSave = useMemo(() => {
    if (!groupName.trim()) return false;
    if (rows.length === 0) return true;
    if (Object.keys(rowViolations).length > 0) return false;
    return rows.every((row) => basicSalaryTotal(row.draft) > 0);
  }, [groupName, rows, rowViolations]);

  const updateMutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Select a business first");
      return updatePayrollGroupPayrolls(tenantId, groupId, {
        name: groupName.trim(),
        status: groupStatus,
        sendNotification,
        employees: rows.map((row) => {
          const { grossPay, totalAllowance, totalDeduction } =
            payrollAmountsFromDraft(row.draft);
          return {
            payrollId: row.payrollId,
            grossPay,
            totalAllowance,
            totalDeduction,
            note: buildPayrollNoteFromDraft(row.draft),
          };
        }),
      });
    },
    invalidateKeys: [
      ["payroll-group", tenantId, groupId],
      ["payrolls"],
      ["payroll-groups", tenantId],
    ],
    onSuccess: () => {
      toast.success("Payroll group updated");
      router.push(viewHref);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  function patchRowDraft(payrollId: string, patch: Partial<EmployeePayrollDraft>) {
    setRows((prev) =>
      prev.map((row) =>
        row.payrollId === payrollId
          ? { ...row, draft: { ...row.draft, ...patch } }
          : row,
      ),
    );
  }

  if (groupQuery.isLoading) {
    return (
      <Hq6FormShell title="Edit payroll group">
        <p className="text-sm text-[#64748b]">Loading…</p>
      </Hq6FormShell>
    );
  }

  if (groupQuery.isError) {
    return (
      <Hq6FormShell title="Edit payroll group">
        <p className="text-sm text-[var(--color-error-text)]">
          {groupQuery.error instanceof Error
            ? groupQuery.error.message
            : "Failed to load payroll group"}
        </p>
        <div className="mt-4">
          <Link href={backHref} className="btn btn-default">
            Back
          </Link>
        </div>
      </Hq6FormShell>
    );
  }

  return (
    <Hq6FormShell
      multiCard
      title="Edit payroll group"
      subtitle={
        group
          ? `${group.payrollCount} payroll${group.payrollCount === 1 ? "" : "s"}`
          : undefined
      }
    >
      <section className="hq6-form-card">
        <h2 className="hq6-form-card-title">Group details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="hq6-form-label md:col-span-2">
            <span>
              Payroll group name<span className="req">*</span>
            </span>
            <input
              className="form-control"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </label>
          <label className="hq6-form-label">
            <span>
              Status<span className="req">*</span>
            </span>
            <select
              className="form-control"
              value={groupStatus}
              onChange={(e) =>
                setGroupStatus(e.target.value as PayrollGroupStatus)
              }
            >
              <option value="draft" disabled={hasPaidRows}>
                Draft
              </option>
              <option value="final">Final</option>
            </select>
            {hasPaidRows ? (
              <p className="mt-1 text-xs text-[#b45309]">
                Rows with money paid out stay editable, but net pay cannot go
                below what was already paid — invoices and balances re-sync on
                save.
              </p>
            ) : groupStatus === "final" ? (
              <p className="mt-1 text-xs text-[#b45309]">
                Final payrolls can be paid from the Payroll Groups tab.
              </p>
            ) : (
              <p className="mt-1 text-xs text-[#64748b]">
                Draft — switch to Final when amounts are confirmed.
              </p>
            )}
          </label>
          <div className="flex items-end pb-1">
            <label className="inline-flex items-center gap-2 text-sm text-[#374151]">
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
              />
              Send notification
            </label>
          </div>
        </div>
      </section>

      {rows.length === 0 ? (
        <section className="hq6-form-card">
          <p className="text-sm text-[#64748b]">No payroll rows to edit.</p>
        </section>
      ) : (
        rows.map((row, index) => (
          <section key={row.payrollId} className="hq6-form-card">
            <h2 className="hq6-form-card-title">
              Employee {index + 1}
              {row.paid
                ? ` · Paid ${formatCurrency(row.paidToDate, "NGN")} so far`
                : ""}
            </h2>
            <PayrollGroupEmployeeForm
              employee={row.employee}
              draft={row.draft}
              readOnly={false}
              onChange={(patch) => patchRowDraft(row.payrollId, patch)}
            />
            {rowViolations[row.payrollId] ? (
              <p className="mt-2 text-xs text-[var(--color-error-text)]">
                {rowViolations[row.payrollId]}
              </p>
            ) : null}
          </section>
        ))
      )}

      <div className="flex flex-wrap gap-2">
        <Hq6BusyButton
          type="button"
          className="hq6-btn-purple"
          busy={updateMutation.isPending}
          busyLabel="Updating…"
          disabled={!canSave}
          onClick={() => updateMutation.mutate()}
        >
          Update
        </Hq6BusyButton>
        <Link href={backHref} className="btn btn-default">
          Cancel
        </Link>
      </div>
    </Hq6FormShell>
  );
}
