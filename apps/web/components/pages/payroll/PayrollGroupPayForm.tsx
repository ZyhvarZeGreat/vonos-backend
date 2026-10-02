"use client";

import { Fragment } from "react";
import type { Payroll } from "@vonos/types";
import { Hq6DateTimeInput } from "@/components/hq6/Hq6DateTimeInput";
import { PaymentAccountSelect } from "@/components/hq6/PaymentAccountSelect";
import { formatHq6Currency } from "@/lib/utils/hq6Format";
import { HQ6_PAYMENT_METHOD_OPTIONS } from "@/lib/utils/hq6PaymentMethods";

export type PayRowForm = {
  paidOn: string;
  accountId: string;
  method: string;
  /** Tick = include this employee in this payment run (partial pays allowed). */
  selected: boolean;
  /**
   * Amount to pay this run. Empty = pay the full remaining net pay;
   * otherwise a partial payment (must be 0 < amount ≤ remaining).
   */
  amount: string;
};

export function nowPaidOnLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function paidOnToIso(value: string): string {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function emptyPayRowForm(): PayRowForm {
  return {
    paidOn: nowPaidOnLocal(),
    accountId: "",
    method: "",
    selected: true,
    amount: "",
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Net pay still owed on a row (full net minus payments already received). */
export function rowRemainingNet(row: Payroll): number {
  return Math.max(0, roundMoney(row.netPay - (row.paidToDate ?? 0)));
}

/**
 * Effective amount for this run: blank = full remaining balance, otherwise
 * the entered partial amount (NaN when invalid).
 */
export function resolvePayAmount(row: Payroll, form: PayRowForm): number {
  const remaining = rowRemainingNet(row);
  const raw = form.amount?.trim();
  if (!raw) return remaining;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return NaN;
  return roundMoney(parsed);
}

/** Rows ticked for this run — unticked rows simply stay unpaid. */
export function selectedPayRows(
  rows: Payroll[],
  payRowForms: Record<string, PayRowForm>,
): Payroll[] {
  return rows.filter((row) => (payRowForms[row.id] ?? emptyPayRowForm()).selected);
}

/**
 * Only the ticked rows need an account/method and a valid amount — one
 * incomplete row must not block paying everyone else in the group.
 */
export function arePayRowsReady(
  rows: Payroll[],
  payRowForms: Record<string, PayRowForm>,
): boolean {
  const selected = selectedPayRows(rows, payRowForms);
  if (selected.length === 0) return false;
  return selected.every((row) => {
    const form = payRowForms[row.id] ?? emptyPayRowForm();
    if (!form.accountId?.trim() || !form.method?.trim()) return false;
    const amount = resolvePayAmount(row, form);
    const remaining = rowRemainingNet(row);
    return (
      Number.isFinite(amount) && amount > 0 && amount <= remaining + 0.01
    );
  });
}

export type PayPayrollBatch = {
  tenantId: string;
  payrollIds: string[];
  accountId: string;
  method: string;
  paidOn: string;
  /** Per-payroll amount for this run (full remaining unless edited). */
  amounts: Record<string, number>;
};

export function buildPayPayrollBatches(
  rows: Payroll[],
  payRowForms: Record<string, PayRowForm>,
): PayPayrollBatch[] {
  const batchMap = new Map<string, PayPayrollBatch>();
  for (const row of selectedPayRows(rows, payRowForms)) {
    const form = payRowForms[row.id] ?? emptyPayRowForm();
    const paidOnIso = paidOnToIso(form.paidOn);
    const amount = resolvePayAmount(row, form);
    const key = `${row.tenantId}|${form.accountId}|${form.method}|${paidOnIso}`;
    const existing = batchMap.get(key);
    if (existing) {
      existing.payrollIds.push(row.id);
      if (Number.isFinite(amount)) existing.amounts[row.id] = amount;
      continue;
    }
    batchMap.set(key, {
      tenantId: row.tenantId,
      payrollIds: [row.id],
      accountId: form.accountId,
      method: form.method,
      paidOn: paidOnIso,
      amounts: Number.isFinite(amount) ? { [row.id]: amount } : {},
    });
  }
  return [...batchMap.values()];
}

export type PayrollGroupPayFormProps = {
  rows: Payroll[];
  payRowForms: Record<string, PayRowForm>;
  onPatchPayRowForm: (payrollId: string, patch: Partial<PayRowForm>) => void;
  onToggleAllRows?: (selected: boolean) => void;
};

function hq6BankDetailLines(row: Payroll): Array<{ label: string; value: string }> {
  return [
    { label: "Bank Name", value: row.bankName?.trim() || "" },
    { label: "Branch", value: row.bankBranch?.trim() || "" },
    {
      label: "Bank Identifier Code",
      value: row.bankCode?.trim() || "",
    },
    {
      label: "Account Holder's Name",
      value: row.accountHolderName?.trim() || "",
    },
    { label: "Bank Account No.", value: row.bankAccountNo?.trim() || "" },
    { label: "Tax Payer ID", value: row.taxPayerId?.trim() || "" },
  ];
}

function PayrollBankDetailsCell({ row }: { row: Payroll }) {
  return (
    <div className="hq6-payroll-pay-bank-details">
      {hq6BankDetailLines(row).map((line) => (
        <div key={line.label} className="hq6-payroll-pay-kv-row">
          <span className="hq6-payroll-pay-kv-label">{line.label}:</span>
          <span className="hq6-payroll-pay-kv-value">{line.value || "—"}</span>
        </div>
      ))}
    </div>
  );
}

function PayrollPayEmployeeFields({
  row,
  form,
  onPatch,
}: {
  row: Payroll;
  form: PayRowForm;
  onPatch: (patch: Partial<PayRowForm>) => void;
}) {
  const remaining = rowRemainingNet(row);
  const paidToDate = row.paidToDate ?? 0;
  const amountValue = resolvePayAmount(row, form);
  const amountValid =
    form.amount?.trim() !== "" &&
    Number.isFinite(amountValue) &&
    amountValue > 0 &&
    amountValue <= remaining + 0.01;
  return (
    <div className="hq6-payroll-pay-fields">
      <div className="hq6-add-payment-field hq6-payroll-pay-kv-row">
        <label className="hq6-add-payment-label hq6-payroll-pay-kv-label">
          Paid on: <span className="req">*</span>
        </label>
        <div className="input-group hq6-add-payment-input-group hq6-payroll-pay-kv-control">
          <span className="input-group-addon" aria-hidden>
            <i className="fa fa-calendar" />
          </span>
          <Hq6DateTimeInput
            className="form-control hq6-modal-input"
            value={form.paidOn}
            onChange={(value) => onPatch({ paidOn: value })}
          />
        </div>
      </div>

      <div className="hq6-add-payment-field hq6-payroll-pay-kv-row">
        <label className="hq6-add-payment-label hq6-payroll-pay-kv-label">
          Amount: <span className="req">*</span>
        </label>
        <div className="input-group hq6-add-payment-input-group hq6-payroll-pay-kv-control">
          <span className="input-group-addon" aria-hidden>
            <i className="fa fa-coins" />
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="form-control hq6-modal-input tabular-nums"
            value={form.amount}
            placeholder={formatHq6Currency(remaining, "NGN")}
            aria-label={`Payment amount for ${row.employeeName}`}
            onChange={(e) => onPatch({ amount: e.target.value })}
          />
        </div>
        <p
          className={`hq6-payroll-pay-amount-hint${
            form.amount?.trim() !== "" && !amountValid ? " is-invalid" : ""
          }`}
        >
          {paidToDate > 0 ? (
            <>
              Paid {formatHq6Currency(paidToDate, "NGN")} of{" "}
              {formatHq6Currency(row.netPay, "NGN")} —{" "}
            </>
          ) : null}
          {form.amount?.trim() === ""
            ? `pays full remaining ${formatHq6Currency(remaining, "NGN")}`
            : amountValid
              ? `pays ${formatHq6Currency(amountValue, "NGN")} now`
              : `enter 0 – ${formatHq6Currency(remaining, "NGN")}`}
        </p>
      </div>

      <div className="hq6-add-payment-field hq6-payroll-pay-kv-row">
        <label className="hq6-add-payment-label hq6-payroll-pay-kv-label">
          Payment Account:
        </label>
        <div className="input-group hq6-add-payment-input-group hq6-payroll-pay-kv-control">
          <span className="input-group-addon" aria-hidden>
            <i className="fas fa-money-bill-alt" />
          </span>
          <PaymentAccountSelect
            tenantId={row.tenantId}
            value={form.accountId}
            onChange={(accountId) => onPatch({ accountId })}
            emptyLabel="None"
          />
        </div>
      </div>

      <div className="hq6-add-payment-field hq6-payroll-pay-kv-row">
        <label className="hq6-add-payment-label hq6-payroll-pay-kv-label">
          Payment Method: <span className="req">*</span>
        </label>
        <div className="input-group hq6-add-payment-input-group hq6-payroll-pay-kv-control">
          <span className="input-group-addon" aria-hidden>
            <i className="fas fa-money-bill-alt" />
          </span>
          <select
            className="form-control hq6-modal-input"
            value={form.method}
            onChange={(e) => onPatch({ method: e.target.value })}
            required
          >
            <option value="">Please Select</option>
            {HQ6_PAYMENT_METHOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export function PayrollGroupPayForm({
  rows,
  payRowForms,
  onPatchPayRowForm,
  onToggleAllRows,
}: PayrollGroupPayFormProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[#64748b]">No unpaid payrolls in this group.</p>
    );
  }

  const selected = selectedPayRows(rows, payRowForms);
  const allSelected = selected.length === rows.length;

  return (
    <div className="table-responsive hq6-payroll-group-pay-table-wrap">
      <table className="table table-bordered hq6-payroll-group-pay-table">
        <thead>
          <tr>
            <th className="hq6-payroll-pay-select-cell">
              <label className="hq6-payroll-pay-select-label">
                <input
                  type="checkbox"
                  checked={allSelected}
                  aria-label={allSelected ? "Unselect all" : "Select all"}
                  onChange={(e) => onToggleAllRows?.(e.target.checked)}
                />
                <span>Pay</span>
              </label>
            </th>
            <th>Employee</th>
            <th>Gross Amount</th>
            <th>Bank Details</th>
            <th>Add payment</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const form = payRowForms[row.id] ?? emptyPayRowForm();
            return (
              <Fragment key={row.id}>
                {index > 0 ? (
                  <tr className="hq6-payroll-pay-divider-row" aria-hidden>
                    <td colSpan={5}>
                      <div className="hq6-payroll-pay-divider" role="presentation" />
                    </td>
                  </tr>
                ) : null}
                <tr className="hq6-payroll-pay-row">
                  <td className="hq6-payroll-pay-select-cell">
                    <input
                      type="checkbox"
                      checked={form.selected}
                      aria-label={`Pay ${row.employeeName}`}
                      onChange={(e) =>
                        onPatchPayRowForm(row.id, { selected: e.target.checked })
                      }
                    />
                  </td>
                  <td className="hq6-payroll-pay-employee">{row.employeeName}</td>
                  <td className="hq6-payroll-pay-gross tabular-nums">
                    <div className="hq6-payroll-pay-amount-row">
                      <span className="hq6-payroll-pay-amount-label">Gross</span>
                      <span>{formatHq6Currency(row.grossPay || 0, "NGN")}</span>
                    </div>
                    <div className="hq6-payroll-pay-amount-row hq6-payroll-pay-amount-row--muted">
                      <span className="hq6-payroll-pay-amount-label">Earnings</span>
                      <span>+ {formatHq6Currency(row.totalAllowance || 0, "NGN")}</span>
                    </div>
                    <div className="hq6-payroll-pay-amount-row hq6-payroll-pay-amount-row--muted">
                      <span className="hq6-payroll-pay-amount-label">Deductions</span>
                      <span>− {formatHq6Currency(row.totalDeduction || 0, "NGN")}</span>
                    </div>
                    <div className="hq6-payroll-pay-amount-row hq6-payroll-pay-amount-row--net">
                      <span className="hq6-payroll-pay-amount-label">Net pay</span>
                      <span>{formatHq6Currency(row.netPay, "NGN")}</span>
                    </div>
                    {(row.paidToDate ?? 0) > 0 ? (
                      <>
                        <div className="hq6-payroll-pay-amount-row hq6-payroll-pay-amount-row--muted">
                          <span className="hq6-payroll-pay-amount-label">
                            Already paid
                          </span>
                          <span>
                            {formatHq6Currency(row.paidToDate ?? 0, "NGN")}
                          </span>
                        </div>
                        <div className="hq6-payroll-pay-amount-row hq6-payroll-pay-amount-row--net">
                          <span className="hq6-payroll-pay-amount-label">
                            Remaining
                          </span>
                          <span>
                            {formatHq6Currency(rowRemainingNet(row), "NGN")}
                          </span>
                        </div>
                      </>
                    ) : null}
                  </td>
                  <td className="hq6-payroll-pay-bank-cell">
                    <PayrollBankDetailsCell row={row} />
                  </td>
                  <td className="hq6-payroll-pay-form-cell">
                    <PayrollPayEmployeeFields
                      row={row}
                      form={form}
                      onPatch={(patch) => onPatchPayRowForm(row.id, patch)}
                    />
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
