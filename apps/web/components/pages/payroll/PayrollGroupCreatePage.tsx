"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { PayrollGroupStatus } from "@vonos/types";
import { Hq6BusyButton } from "@/components/hq6/Hq6BusyButton";
import { Hq6FormShell } from "@/components/hq6";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import {
  createPayroll,
  createPayrollGroup,
  getLatestPayrollForEmployee,
} from "@/lib/api/hrm";
import { toast } from "@/stores/toastStore";
import { PayrollGroupEmployeeForm } from "./PayrollGroupEmployeeForm";
import {
  basicSalaryTotal,
  buildEmployeeCreateDraft,
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

  const employeeIdsKey = session?.employees.map((e) => e.id).join(",") ?? "";

  const latestPayrollsQuery = useQuery({
    queryKey: ["payroll-latest-for-create", writeTenantId, employeeIdsKey],
    enabled: Boolean(writeTenantId && session && session.employees.length > 0),
    queryFn: async () => {
      const pairs = await Promise.all(
        session!.employees.map(async (employee) => {
          const payroll = await getLatestPayrollForEmployee(
            writeTenantId!,
            employee.id,
          );
          return [employee.id, payroll] as const;
        }),
      );
      return Object.fromEntries(pairs) as Record<
        string,
        Awaited<ReturnType<typeof getLatestPayrollForEmployee>>
      >;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (
      !session ||
      !latestPayrollsQuery.isSuccess ||
      employeeDraftsInitialized(employeeDrafts, session.employees)
    ) {
      return;
    }
    const latestByEmployee = latestPayrollsQuery.data ?? {};
    const drafts: Record<string, EmployeePayrollDraft> = {};
    for (const employee of session.employees) {
      drafts[employee.id] = buildEmployeeCreateDraft(
        employee.id,
        latestByEmployee[employee.id],
      );
    }
    setEmployeeDrafts(drafts);
  }, [
    session,
    latestPayrollsQuery.data,
    latestPayrollsQuery.isSuccess,
    employeeDrafts,
  ]);

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
      <Hq6FormShell title="Add Payroll">
        <p className="text-sm text-muted">Redirecting to payroll list…</p>
      </Hq6FormShell>
    );
  }

  const canSave =
    payrollGroupName.trim().length > 0 &&
    session.employees.every((employee) => {
      const draft = employeeDrafts[employee.id] ?? emptyEmployeeDraft();
      return basicSalaryTotal(draft) > 0;
    });

  const subtitle = `${allTenants ? tenantName : "Create payroll group"} · ${monthLabel}`;

  return (
    <Hq6FormShell multiCard title="Add Payroll" subtitle={subtitle}>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <section className="hq6-form-card space-y-6 p-5 md:p-6">
          <h2 className="hq6-form-card-title">Payroll group</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#555]">
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
            <div className="space-y-2">
              <label className="flex items-center gap-1 text-xs font-semibold text-[#555]">
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
              <p className="text-xs leading-relaxed text-[#b45309]">
                {groupStatus === "final"
                  ? "Final payrolls can be paid from the Payroll Groups tab"
                  : "Draft — switch to Final when amounts are confirmed"}
              </p>
            </div>
          </div>
        </section>

        {createMutation.isError ? (
          <p className="text-sm text-[var(--color-error-text)]">
            {createMutation.error instanceof Error
              ? createMutation.error.message
              : "Failed to create payroll"}
          </p>
        ) : null}

        {latestPayrollsQuery.isLoading ? (
          <p className="text-sm text-muted">Loading salary defaults…</p>
        ) : null}

        {session.employees.map((employee) => (
          <section key={employee.id} className="hq6-form-card p-0">
            <PayrollGroupEmployeeForm
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
          </section>
        ))}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-2">
          <Link href={backHref} className="btn btn-default">
            Cancel
          </Link>
          <Hq6BusyButton
            type="button"
            className="hq6-btn-purple"
            busy={createMutation.isPending}
            busyLabel="Saving…"
            disabled={!canSave}
            onClick={() => createMutation.mutate()}
          >
            {groupStatus === "final" ? "Save as final" : "Save as draft"}
          </Hq6BusyButton>
        </div>
      </div>
    </Hq6FormShell>
  );
}

function employeeDraftsInitialized(
  drafts: Record<string, EmployeePayrollDraft>,
  employees: { id: string }[],
): boolean {
  if (employees.length === 0) return true;
  return employees.every((employee) => Boolean(drafts[employee.id]));
}
