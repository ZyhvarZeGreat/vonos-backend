"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import type { PayrollGroupStatus } from "@vonos/types";
import { Hq6BusyButton } from "@/components/hq6/Hq6BusyButton";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import {
  createPayroll,
  createPayrollGroup,
  getPayComponents,
} from "@/lib/api/hrm";
import { toast } from "@/stores/toastStore";
import { PayrollGroupEmployeeForm } from "./PayrollGroupEmployeeForm";
import {
  basicSalaryTotal,
  employeeDraftFromPayComponents,
  emptyEmployeeDraft,
  buildPayrollNoteFromDraft,
  payrollAmountsFromDraft,
  type EmployeePayrollDraft,
} from "./payrollDraftUtils";
import {
  clearPayrollCreateSession,
  loadPayrollCreateSession,
} from "./payrollCreateSession";

export type PayrollGroupCreatePageProps = {
  backHref: string;
  payrollListHref: string;
  /** VAG all-tenants create flow — session carries tenantId. */
  allTenants?: boolean;
};

export function PayrollGroupCreatePage({
  backHref,
  payrollListHref,
  allTenants = false,
}: PayrollGroupCreatePageProps) {
  const router = useRouter();
  const routeTenantId = useTenantId();
  const { tenantName } = useRouteTenant();
  const [session] = useState(() => loadPayrollCreateSession());
  const [payrollGroupName, setPayrollGroupName] = useState("");
  const [groupStatus, setGroupStatus] = useState<PayrollGroupStatus>("draft");
  const [employeeDrafts, setEmployeeDrafts] = useState<
    Record<string, EmployeePayrollDraft>
  >({});

  const writeTenantId = allTenants
    ? session?.tenantId ?? null
    : routeTenantId ?? null;

  const monthLabel = useMemo(() => {
    if (!session?.month) return "";
    const d = new Date(`${session.month}-01`);
    if (Number.isNaN(d.getTime())) return session.month;
    return d.toLocaleString("en", { month: "long", year: "numeric" });
  }, [session?.month]);

  useEffect(() => {
    if (!session) {
      router.replace(payrollListHref);
    }
  }, [session, router, payrollListHref]);

  useEffect(() => {
    if (session && !payrollGroupName) {
      setPayrollGroupName(`Payroll for ${monthLabel}`);
    }
  }, [session, monthLabel, payrollGroupName]);

  const payComponentsQuery = useQuery({
    queryKey: ["pay-components", writeTenantId, "create-draft"],
    enabled: Boolean(writeTenantId && session),
    queryFn: () => getPayComponents(writeTenantId!),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!session || employeeDraftsInitialized(employeeDrafts, session.employees)) {
      return;
    }
    const catalog = payComponentsQuery.data ?? [];
    const baseDraft = employeeDraftFromPayComponents(catalog);
    const drafts: Record<string, EmployeePayrollDraft> = {};
    for (const employee of session.employees) {
      drafts[employee.id] = {
        ...baseDraft,
        allowances: baseDraft.allowances.map((line) => ({
          ...line,
          id: `line-${employee.id}-a-${line.id}`,
        })),
        deductions: baseDraft.deductions.map((line) => ({
          ...line,
          id: `line-${employee.id}-d-${line.id}`,
        })),
      };
    }
    setEmployeeDrafts(drafts);
  }, [session, payComponentsQuery.data, employeeDrafts]);

  const createMutation = useAppMutation({
    mutationFn: async () => {
      if (!writeTenantId || !session) {
        throw new Error("Select a business first");
      }
      const groupName = payrollGroupName.trim();
      if (!groupName) {
        throw new Error("Payroll group name is required");
      }
      if (session.employees.length === 0) {
        throw new Error("Select at least one employee");
      }

      const group = await createPayrollGroup(writeTenantId, {
        name: groupName,
        locationCode: session.locationCode || undefined,
        status: groupStatus,
      });

      const payrollMonth = `${session.month}-01`;
      const payrollStatus = groupStatus === "final" ? "final" : "draft";
      for (const employee of session.employees) {
        const draft = employeeDrafts[employee.id] ?? emptyEmployeeDraft();
        const basic = basicSalaryTotal(draft);
        if (!Number.isFinite(basic) || basic <= 0) {
          throw new Error(
            `Enter work duration and amount per unit for ${employee.employeeName}`,
          );
        }
        const { grossPay, totalAllowance, totalDeduction } =
          payrollAmountsFromDraft(draft);

        await createPayroll(writeTenantId, {
          employeeRecordId: employee.id,
          payrollGroupId: group.id,
          locationCode:
            employee.locationCode || session.locationCode || undefined,
          grossPay,
          totalAllowance,
          totalDeduction,
          status: payrollStatus,
          payrollMonth,
          note: buildPayrollNoteFromDraft(draft),
        });
      }

      return { group, status: groupStatus };
    },
    invalidateKeys: [["payrolls"], ["payroll-groups", writeTenantId]],
    onSuccess: ({ status }) => {
      clearPayrollCreateSession();
      const count = session?.employees.length ?? 0;
      if (status === "final") {
        toast.success(
          count === 1
            ? "Payroll saved as final — open Payroll Groups to pay"
            : `Payroll group saved as final (${count} employees) — pay from Payroll Groups`,
        );
      } else {
        toast.success(
          count === 1
            ? "Draft payroll saved — finalize from Payroll Groups when ready"
            : `Draft payroll group saved (${count} employees) — finalize from Payroll Groups when ready`,
        );
      }
      router.push(payrollListHref);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (!session) {
    return (
      <p className="text-sm text-muted">Redirecting to payroll list…</p>
    );
  }

  const canSave =
    payrollGroupName.trim().length > 0 &&
    session.employees.every((employee) => {
      const draft = employeeDrafts[employee.id] ?? emptyEmployeeDraft();
      return basicSalaryTotal(draft) > 0;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-[#111827]">Add Payroll</h1>
        <p className="mt-1 text-sm text-muted">
          {allTenants ? tenantName : "Create payroll group"} · {monthLabel}
        </p>
      </div>

      <div className="grid gap-3 sm:max-w-md sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#555]">
            Payroll group name<span className="text-red-600">*</span>:
          </label>
          <input
            className="form-control hq6-modal-input w-full"
            value={payrollGroupName}
            onChange={(e) => setPayrollGroupName(e.target.value)}
            placeholder={`Payroll for ${monthLabel}`}
            required
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-[#555]">
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
          <p className="mt-1 text-xs text-[#b45309]">
            {groupStatus === "final"
              ? "Final payrolls can be paid from the Payroll Groups tab"
              : "Draft — switch to Final when amounts are confirmed"}
          </p>
        </div>
      </div>

      {createMutation.isError ? (
        <p className="text-sm text-[var(--color-error-text)]">
          {createMutation.error instanceof Error
            ? createMutation.error.message
            : "Failed to create payroll"}
        </p>
      ) : null}

      <div className="space-y-4">
        {session.employees.map((employee) => (
          <PayrollGroupEmployeeForm
            key={employee.id}
            employee={employee}
            draft={employeeDrafts[employee.id] ?? emptyEmployeeDraft()}
            onChange={(patch) =>
              setEmployeeDrafts((prev) => ({
                ...prev,
                [employee.id]: {
                  ...(prev[employee.id] ?? emptyEmployeeDraft()),
                  ...patch,
                },
              }))
            }
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Link href={backHref} className="hq6-btn hq6-btn-outline">
          Cancel
        </Link>
        <Hq6BusyButton
          type="button"
          className="hq6-btn hq6-btn-blue"
          busy={createMutation.isPending}
          busyLabel="Saving…"
          disabled={!canSave}
          onClick={() => createMutation.mutate()}
        >
          {groupStatus === "final" ? "Save as final" : "Save as draft"}
        </Hq6BusyButton>
      </div>
    </div>
  );
}

function employeeDraftsInitialized(
  drafts: Record<string, EmployeePayrollDraft>,
  employees: { id: string }[],
): boolean {
  if (employees.length === 0) return true;
  return employees.every((employee) => Boolean(drafts[employee.id]));
}
