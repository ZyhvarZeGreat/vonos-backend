"use client";

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
    onLinesChange(lines.filter((row) => row.id !== id));
  }

  function patchLine(id: string, patch: Partial<PayLine>) {
    onLinesChange(updatePayLine(lines, id, patch));
  }

  return (
    <div className="hq6-payroll-lines-panel min-w-0">
      <p className="hq6-payroll-lines-title">{title}</p>

      <div className="hq6-payroll-lines-stack">
        {lines.length === 0 ? (
          <p className="hq6-payroll-lines-empty">No {title.toLowerCase()} added.</p>
        ) : null}
        {lines.map((line, index) => (
          <div key={line.id} className="hq6-payroll-line-card">
            <input
              className="form-control hq6-modal-input w-full"
              placeholder="Description"
              value={line.name}
              onChange={(e) => patchLine(line.id, { name: e.target.value })}
              {...fieldProps}
            />
            <div className="hq6-payroll-line-meta">
              <select
                className="form-control select2 hq6-modal-input"
                value={line.amountType}
                onChange={(e) =>
                  patchLine(line.id, {
                    amountType: e.target.value as AmountType,
                  })
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
                className="form-control hq6-modal-input"
                placeholder="Amount"
                value={line.amount}
                onChange={(e) => patchLine(line.id, { amount: e.target.value })}
                {...fieldProps}
              />
              <div className="hq6-payroll-line-actions">
                <button
                  type="button"
                  className="hq6-payroll-line-btn hq6-payroll-line-btn--add"
                  aria-label={addLabel}
                  title={addLabel}
                  disabled={readOnly}
                  onClick={() => insertLine(index)}
                >
                  +
                </button>
                <button
                  type="button"
                  className="hq6-payroll-line-btn hq6-payroll-line-btn--remove"
                  aria-label={`Remove ${title.toLowerCase()} row`}
                  title={`Remove ${title.toLowerCase()} row`}
                  disabled={readOnly}
                  onClick={() => removeLine(line.id)}
                >
                  −
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hq6-payroll-lines-footer">
        <button
          type="button"
          className="hq6-payroll-add-line-btn"
          disabled={readOnly}
          onClick={() => onLinesChange([...lines, newPayLine()])}
        >
          + {addLabel}
        </button>
        <p className="hq6-payroll-lines-total">
          Total:{" "}
          <span>{formatCurrency(total, "NGN")}</span>
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
  const readOnlyHint = readOnly
    ? "This payroll is paid — earnings and deductions cannot be changed."
    : null;
  const basic = basicSalaryTotal(draft);
  const allowanceTotal = sumPayLines(draft.allowances, basic);
  const deductionTotal = sumPayLines(draft.deductions, basic);
  const grossAmount = basic + allowanceTotal - deductionTotal;

  const fieldProps = readOnly ? { readOnly: true, disabled: true } : {};

  return (
    <div
      className={
        readOnly ? "hq6-payroll-employee-form is-readonly" : "hq6-payroll-employee-form"
      }
    >
      <div className="hq6-payroll-employee-row-wrap">
        <div className="hq6-payroll-employee-row">
          <div className="hq6-payroll-employee-col hq6-payroll-employee-col--info">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-[#111827]">
                {employee.employeeName}
              </p>
              {readOnly ? (
                <span className="hq6-pay-paid text-[11px] uppercase tracking-wide">
                  Paid
                </span>
              ) : null}
            </div>
            {readOnlyHint ? (
              <p className="text-xs font-medium text-[#b45309]">{readOnlyHint}</p>
            ) : null}
            <p className="text-xs leading-relaxed text-muted">
              {[
                employee.department ? `Dept: ${employee.department}` : null,
                employee.designationName
                  ? `Designation: ${employee.designationName}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
            <p className="text-xs leading-6 text-muted">
              Leaves : 0 days
              <br />
              Work Duration : 0.00 hour
              <br />
              Attendance: 0 Days
            </p>
          </div>

          <div className="hq6-payroll-employee-col hq6-payroll-employee-col--salary">
            <p className="hq6-payroll-section-title">Basic salary</p>
            <div className="hq6-payroll-field">
              <label className="hq6-payroll-field-label">
                Total work duration<span className="text-red-600">*</span>:
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
            <div className="hq6-payroll-field">
              <label className="hq6-payroll-field-label">Duration Unit:</label>
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
            <div className="hq6-payroll-field">
              <label className="hq6-payroll-field-label">
                Amount per unit duration<span className="text-red-600">*</span>:
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
            <p className="hq6-payroll-inline-total">
              Total: <span>{formatCurrency(basic, "NGN")}</span>
            </p>
          </div>

          <div className="hq6-payroll-employee-col hq6-payroll-employee-col--lines">
            <PayLineSection
              title="Earnings"
              addLabel="Add earning"
              lines={draft.allowances}
              basic={basic}
              readOnly={readOnly}
              onLinesChange={(allowances) => onChange({ allowances })}
            />
          </div>

          <div className="hq6-payroll-employee-col hq6-payroll-employee-col--lines">
            <PayLineSection
              title="Deductions"
              addLabel="Add deduction"
              lines={draft.deductions}
              basic={basic}
              readOnly={readOnly}
              onLinesChange={(deductions) => onChange({ deductions })}
            />
          </div>

          <div className="hq6-payroll-employee-col hq6-payroll-employee-col--gross">
            <p className="hq6-payroll-section-title">Gross Amount</p>
            <p className="hq6-payroll-gross-value">{formatCurrency(grossAmount, "NGN")}</p>
          </div>
        </div>
      </div>

      <div className="hq6-payroll-note-wrap">
        <label className="hq6-payroll-field-label">Note:</label>
        <textarea
          className="form-control hq6-modal-input min-h-[5rem] w-full"
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
