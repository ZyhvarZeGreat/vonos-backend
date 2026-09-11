"use client";

import { Minus, Plus } from "lucide-react";
import type { PayrollEmployeePick } from "@/components/molecules/EmployeePayrollSearch";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import {
  basicSalaryTotal,
  DURATION_UNIT_OPTIONS,
  newPayLine,
  sumPayLines,
  updatePayLine,
  type AmountType,
  type EmployeePayrollDraft,
} from "./payrollDraftUtils";

export type PayrollGroupEmployeeFormProps = {
  employee: PayrollEmployeePick;
  draft: EmployeePayrollDraft;
  onChange: (patch: Partial<EmployeePayrollDraft>) => void;
};

export function PayrollGroupEmployeeForm({
  employee,
  draft,
  onChange,
}: PayrollGroupEmployeeFormProps) {
  const basic = basicSalaryTotal(draft);
  const allowanceTotal = sumPayLines(draft.allowances, basic);
  const deductionTotal = sumPayLines(draft.deductions, basic);
  const grossAmount = basic + allowanceTotal - deductionTotal;

  return (
    <div className="overflow-hidden rounded border border-[#e5e7eb] bg-white">
      <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-[minmax(9rem,11rem)_minmax(11rem,14rem)_minmax(0,1fr)_minmax(0,1fr)_minmax(7rem,9rem)]">
        <div>
          <p className="text-sm font-semibold text-[#111827]">
            {employee.employeeName}
          </p>
          <p className="mt-1 text-xs text-muted">
            {[
              employee.department ? `Dept: ${employee.department}` : null,
              employee.designationName
                ? `Designation: ${employee.designationName}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted">
            Leaves : 0 days
            <br />
            Work Duration : 0.00 hour
            <br />
            Attendance: 0 Days
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-[#111827]">Basic salary</p>
          <div>
            <label className="mb-0.5 block text-xs text-[#555]">
              Total work duration
              <span className="text-red-600">*</span>:
            </label>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              className="form-control hq6-modal-input w-full"
              value={draft.workDuration}
              onChange={(e) => onChange({ workDuration: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-0.5 block text-xs text-[#555]">
              Duration Unit:
            </label>
            <select
              className="form-control select2 hq6-modal-input w-full"
              value={draft.durationUnit}
              onChange={(e) => onChange({ durationUnit: e.target.value })}
            >
              {DURATION_UNIT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-xs text-[#555]">
              Amount per unit duration
              <span className="text-red-600">*</span>:
            </label>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="e.g. 100000"
              className="form-control hq6-modal-input w-full"
              value={draft.amountPerUnit}
              onChange={(e) => onChange({ amountPerUnit: e.target.value })}
            />
          </div>
          <p className="text-sm text-[#111827]">
            Total:{" "}
            <span className="font-semibold tabular-nums">
              {formatCurrency(basic, "NGN")}
            </span>
          </p>
        </div>

        <div className="rounded border border-[#e5e7eb] bg-[#fafafa] p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#111827]">Earnings</p>
            <button
              type="button"
              className="inline-flex size-7 items-center justify-center rounded bg-[#3b82f6] text-white"
              aria-label="Add earning"
              onClick={() =>
                onChange({ allowances: [...draft.allowances, newPayLine()] })
              }
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-[minmax(0,1fr)_minmax(5rem,6.5rem)_minmax(4.5rem,5.5rem)_1.75rem] gap-1.5 text-[11px] text-muted">
            <span>Description</span>
            <span>Amount Type</span>
            <span className="text-right">Amount</span>
            <span />
          </div>
          <div className="space-y-1.5">
            {draft.allowances.map((line, index) => (
              <div
                key={line.id}
                className="grid grid-cols-[minmax(0,1fr)_minmax(5rem,6.5rem)_minmax(4.5rem,5.5rem)_1.75rem] items-center gap-1.5"
              >
                <input
                  className="form-control hq6-modal-input w-full"
                  placeholder="Description"
                  value={line.name}
                  onChange={(e) =>
                    onChange({
                      allowances: updatePayLine(draft.allowances, line.id, {
                        name: e.target.value,
                      }),
                    })
                  }
                />
                <select
                  className="form-control select2 hq6-modal-input w-full"
                  value={line.amountType}
                  onChange={(e) =>
                    onChange({
                      allowances: updatePayLine(draft.allowances, line.id, {
                        amountType: e.target.value as AmountType,
                      }),
                    })
                  }
                >
                  <option value="fixed">Fixed</option>
                  <option value="percent">Percent</option>
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className="form-control hq6-modal-input w-full text-right"
                  value={line.amount}
                  onChange={(e) =>
                    onChange({
                      allowances: updatePayLine(draft.allowances, line.id, {
                        amount: e.target.value,
                      }),
                    })
                  }
                />
                {index === 0 ? (
                  <span className="size-7" />
                ) : (
                  <button
                    type="button"
                    className="inline-flex size-7 items-center justify-center rounded bg-[#ef4444] text-white"
                    aria-label="Remove earning"
                    onClick={() =>
                      onChange({
                        allowances: draft.allowances.filter(
                          (row) => row.id !== line.id,
                        ),
                      })
                    }
                  >
                    <Minus className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-right text-xs text-muted">
            Total: {formatCurrency(allowanceTotal, "NGN")}
          </p>
        </div>

        <div className="rounded border border-[#e5e7eb] bg-[#fafafa] p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#111827]">Deductions</p>
            <button
              type="button"
              className="inline-flex size-7 items-center justify-center rounded bg-[#3b82f6] text-white"
              aria-label="Add deduction"
              onClick={() =>
                onChange({ deductions: [...draft.deductions, newPayLine()] })
              }
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-[minmax(0,1fr)_minmax(5rem,6.5rem)_minmax(4.5rem,5.5rem)_1.75rem] gap-1.5 text-[11px] text-muted">
            <span>Description</span>
            <span>Amount Type</span>
            <span className="text-right">Amount</span>
            <span />
          </div>
          <div className="space-y-1.5">
            {draft.deductions.map((line, index) => (
              <div
                key={line.id}
                className="grid grid-cols-[minmax(0,1fr)_minmax(5rem,6.5rem)_minmax(4.5rem,5.5rem)_1.75rem] items-center gap-1.5"
              >
                <input
                  className="form-control hq6-modal-input w-full"
                  placeholder="Description"
                  value={line.name}
                  onChange={(e) =>
                    onChange({
                      deductions: updatePayLine(draft.deductions, line.id, {
                        name: e.target.value,
                      }),
                    })
                  }
                />
                <select
                  className="form-control select2 hq6-modal-input w-full"
                  value={line.amountType}
                  onChange={(e) =>
                    onChange({
                      deductions: updatePayLine(draft.deductions, line.id, {
                        amountType: e.target.value as AmountType,
                      }),
                    })
                  }
                >
                  <option value="fixed">Fixed</option>
                  <option value="percent">Percent</option>
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className="form-control hq6-modal-input w-full text-right"
                  value={line.amount}
                  onChange={(e) =>
                    onChange({
                      deductions: updatePayLine(draft.deductions, line.id, {
                        amount: e.target.value,
                      }),
                    })
                  }
                />
                {index === 0 ? (
                  <span className="size-7" />
                ) : (
                  <button
                    type="button"
                    className="inline-flex size-7 items-center justify-center rounded bg-[#ef4444] text-white"
                    aria-label="Remove deduction"
                    onClick={() =>
                      onChange({
                        deductions: draft.deductions.filter(
                          (row) => row.id !== line.id,
                        ),
                      })
                    }
                  >
                    <Minus className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-right text-xs text-muted">
            Total: {formatCurrency(deductionTotal, "NGN")}
          </p>
        </div>

        <div className="flex flex-col justify-start xl:items-end">
          <p className="text-sm font-semibold text-[#111827]">Gross Amount</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-[#111827]">
            {formatCurrency(grossAmount, "NGN")}
          </p>
        </div>
      </div>

      <div className="border-t border-[#e5e7eb] px-4 py-3">
        <label className="mb-1 block text-xs font-semibold text-[#555]">
          Note:
        </label>
        <textarea
          className="form-control hq6-modal-input min-h-[4.5rem] w-full"
          value={draft.note}
          placeholder="Total"
          onChange={(e) => onChange({ note: e.target.value })}
        />
      </div>
    </div>
  );
}
