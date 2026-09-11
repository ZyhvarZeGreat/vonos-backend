"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import type { Payroll, PayrollGroupStatus } from "@vonos/types";
import type { PayrollEmployeePick } from "@/components/molecules/EmployeePayrollSearch";
import { Hq6BusyButton } from "@/components/hq6/Hq6BusyButton";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { getPayrollGroup, updatePayrollGroupPayrolls } from "@/lib/api/hrm";
import { toast } from "@/stores/toastStore";
import { PayrollGroupEmployeeForm } from "./PayrollGroupEmployeeForm";
import {
  basicSalaryTotal,
  buildPayrollNoteFromDraft,
  employeeDraftFromPayroll,
  emptyEmployeeDraft,
  payrollAmountsFromDraft,
  type EmployeePayrollDraft,
} from "./payrollDraftUtils";

type EditRow = {
  payrollId: string;
  employee: PayrollEmployeePick;
  draft: EmployeePayrollDraft;
};

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
      })),
    );
  }, [group]);

  const canSave = useMemo(() => {
    if (!groupName.trim()) return false;
    return rows.every((row) => basicSalaryTotal(row.draft) > 0);
  }, [groupName, rows]);

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

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-[#111827]">
          Edit payroll group
        </h1>
        {group ? (
          <p className="mt-1 text-sm text-muted">
            {group.payrollCount} payroll{group.payrollCount === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      {groupQuery.isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : groupQuery.isError ? (
        <p className="text-sm text-[var(--color-error-text)]">
          {groupQuery.error instanceof Error
            ? groupQuery.error.message
            : "Failed to load payroll group"}
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:max-w-lg sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[#555]">
                Payroll group name<span className="text-red-600">*</span>:
              </label>
              <input
                className="form-control hq6-modal-input w-full"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#555]">
                Status<span className="text-red-600">*</span>:
              </label>
              <select
                className="form-control select2 hq6-modal-input w-full"
                value={groupStatus}
                onChange={(e) =>
                  setGroupStatus(e.target.value as PayrollGroupStatus)
                }
              >
                <option value="draft">Draft</option>
                <option value="final">Final</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="inline-flex items-center gap-2 text-sm text-[#555]">
                <input
                  type="checkbox"
                  checked={sendNotification}
                  onChange={(e) => setSendNotification(e.target.checked)}
                />
                Send notification
              </label>
            </div>
          </div>

          <div className="space-y-4">
            {rows.map((row) => (
              <PayrollGroupEmployeeForm
                key={row.payrollId}
                employee={row.employee}
                draft={row.draft}
                onChange={(patch) => patchRowDraft(row.payrollId, patch)}
              />
            ))}
            {rows.length === 0 ? (
              <p className="text-sm text-muted">No payroll rows to edit.</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <Link href={backHref} className="hq6-btn hq6-btn-outline">
              Cancel
            </Link>
            <Hq6BusyButton
              type="button"
              className="hq6-btn hq6-btn-blue"
              busy={updateMutation.isPending}
              busyLabel="Updating…"
              disabled={!canSave}
              onClick={() => updateMutation.mutate()}
            >
              Update
            </Hq6BusyButton>
          </div>
        </>
      )}
    </div>
  );
}
