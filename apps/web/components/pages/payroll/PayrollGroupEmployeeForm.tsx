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
  type PayLine,
} from "./payrollDraftUtils";

export type PayrollGroupEmployeeFormProps = {
  employee: PayrollEmployeePick;
  draft: EmployeePayrollDraft;
  onChange: (patch: Partial<EmployeePayrollDraft>) => void;
  /** Paid payroll rows are read-only on edit. */
  readOnly?: boolean;
};

type PayLineSectionProps = {
  title: string;
  addLabel: string;
  lines: PayLine[];
  onLinesChange: (lines: PayLine[]) => void;
  readOnly?: boolean;
  basic: number;
};

function PayLineSection({
  title,
  addLabel,
  lines,
  onLinesChange,
  readOnly = false,
  basic,
}: PayLineSectionProps) {
  const total = sumPayLines(lines, basic);
  const fieldProps = readOnly ? { readOnly: true, disabled: true } : {};

  function insertLine(afterIndex: number) {
    const next = [...lines];
    next.splice(afterIndex + 1, 0, newPayLine());
    onLinesChange(next);
  }

  function removeLine(id: string) {
    if (lines.length <= 1) return;
    onLinesChange(lines.filter((row) => row.id !== id));
  }

  function patchLine(id: string, patch: Partial<PayLine>) {
    onLinesChange(updatePayLine(lines, id, patch));
  }

  return (
    <div className="rounded border border-[#e5e7eb] bg-[#fafafa] p-3">
      <p className="mb-2 text-sm font-semibold text-[#111827]">{title}</p>

      <div className="mb-1 grid grid-cols-[minmax(0,1.35fr)_minmax(6rem,7rem)_minmax(5.5rem,6.5rem)_4.5rem] gap-2 text-[11px] font-medium uppercase tracking-wide text-[#64748b]">
        <span>Description</span>
        <span>Amount type</span>
        <span className="text-right">Amount</span>
        <span className="text-center">Action</span>
      </div>

      <div className="space-y-2">
        {lines.map((line, index) => (
          <div
            key={line.id}
            className="grid grid-cols-[minmax(0,1.35fr)_minmax(6rem,7rem)_minmax(5.5rem,6.5rem)_4.5rem] items-center gap-2"
          >
            <input
              className="form-control hq6-modal-input w-full"
              placeholder="Description"
              value={line.name}
              onChange={(e) => patchLine(line.id, { name: e.target.value })}
              {...fieldProps}
            />
            <select
              className="form-control select2 hq6-modal-input w-full"
              value={line.amountType}
              onChange={(e) =>
                patchLine(line.id, { amountType: e.target.value as AmountType })
              }
              disabled={readOnly}
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
              onChange={(e) => patchLine(line.id, { amount: e.target.value })}
              {...fieldProps}
            />
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                className="inline-flex size-7 items-center justify-center rounded bg-[#3b82f6] text-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={addLabel}
                title={addLabel}
                disabled={readOnly}
                onClick={() => insertLine(index)}
              >
                <Plus className="size-3.5" />
              </button>
              {lines.length > 1 ? (
                <button
                  type="button"
                  className="inline-flex size-7 items-center justify-center rounded bg-[#ef4444] text-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Remove ${title.toLowerCase()} row`}
                  disabled={readOnly}
                  onClick={() => removeLine(line.id)}
                >
                  <Minus className="size-3.5" />
                </button>
              ) : (
                <span className="size-7" aria-hidden />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="hq6-btn hq6-btn-sm hq6-btn-blue disabled:cursor-not-allowed disabled:opacity-40"
          disabled={readOnly}
          onClick={() => onLinesChange([...lines, newPayLine()])}
        >
          <Plus className="size-3.5" />
          {addLabel}
        </button>
        <p className="text-xs text-[#64748b]">
          Total:{" "}
          <span className="font-semibold tabular-nums text-[#111827]">
            {formatCurrency(total, "NGN")}
          </span>
        </p>
      </div>
    </div>
  );
}

export function PayrollGroupEmployeeForm({
  employee,
  draft,
  onChange,
  readOnly = false,
}: PayrollGroupEmployeeFormProps) {
  const basic = basicSalaryTotal(draft);
  const allowanceTotal = sumPayLines(draft.allowances, basic);
  const deductionTotal = sumPayLines(draft.deductions, basic);
  const grossAmount = basic + allowanceTotal - deductionTotal;

  const fieldProps = readOnly ? { readOnly: true, disabled: true } : {};

  return (
    <div
      className={
        readOnly
          ? "overflow-hidden rounded border border-[#e5e7eb] bg-[#f8fafc] opacity-95"
          : "overflow-hidden rounded border border-[#e5e7eb] bg-white"
      }
    >
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(10rem,12rem)_minmax(11rem,14rem)_minmax(0,1fr)_minmax(0,1fr)_minmax(7rem,9rem)]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[#111827]">
              {employee.employeeName}
            </p>
            {readOnly ? (
              <span className="hq6-pay-paid text-[11px] uppercase tracking-wide">
                Paid
              </span>
            ) : null}
          </div>
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
              {...fieldProps}
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
              disabled={readOnly}
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
              {...fieldProps}
            />
          </div>
          <p className="text-sm text-[#111827]">
            Total:{" "}
            <span className="font-semibold tabular-nums">
              {formatCurrency(basic, "NGN")}
            </span>
          </p>
        </div>

        <PayLineSection
          title="Earnings"
          addLabel="Add earning"
          lines={draft.allowances}
          basic={basic}
          readOnly={readOnly}
          onLinesChange={(allowances) => onChange({ allowances })}
        />

        <PayLineSection
          title="Deductions"
          addLabel="Add deduction"
          lines={draft.deductions}
          basic={basic}
          readOnly={readOnly}
          onLinesChange={(deductions) => onChange({ deductions })}
        />

        <div className="flex flex-col justify-start lg:items-end">
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
          readOnly={readOnly}
          disabled={readOnly}
        />
      </div>
    </div>
  );
}
