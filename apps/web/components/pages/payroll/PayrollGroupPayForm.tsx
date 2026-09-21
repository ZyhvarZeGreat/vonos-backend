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
  };
}

export function arePayRowsReady(
  rows: Payroll[],
  payRowForms: Record<string, PayRowForm>,
): boolean {
  return rows.every((row) => {
    const form = payRowForms[row.id];
    return Boolean(form?.accountId?.trim() && form?.method?.trim());
  });
}

export type PayPayrollBatch = {
  tenantId: string;
  payrollIds: string[];
  accountId: string;
  method: string;
  paidOn: string;
};

export function buildPayPayrollBatches(
  rows: Payroll[],
  payRowForms: Record<string, PayRowForm>,
): PayPayrollBatch[] {
  const batchMap = new Map<string, PayPayrollBatch>();
  for (const row of rows) {
    const form = payRowForms[row.id] ?? emptyPayRowForm();
    const paidOnIso = paidOnToIso(form.paidOn);
    const key = `${row.tenantId}|${form.accountId}|${form.method}|${paidOnIso}`;
    const existing = batchMap.get(key);
    if (existing) {
      existing.payrollIds.push(row.id);
      continue;
    }
    batchMap.set(key, {
      tenantId: row.tenantId,
      payrollIds: [row.id],
      accountId: form.accountId,
      method: form.method,
      paidOn: paidOnIso,
    });
  }
  return [...batchMap.values()];
}

export type PayrollGroupPayFormProps = {
  rows: Payroll[];
  payRowForms: Record<string, PayRowForm>;
  onPatchPayRowForm: (payrollId: string, patch: Partial<PayRowForm>) => void;
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
  tenantId,
  form,
  onPatch,
}: {
  tenantId: string;
  form: PayRowForm;
  onPatch: (patch: Partial<PayRowForm>) => void;
}) {
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
          Payment Account:
        </label>
        <div className="input-group hq6-add-payment-input-group hq6-payroll-pay-kv-control">
          <span className="input-group-addon" aria-hidden>
            <i className="fas fa-money-bill-alt" />
          </span>
          <PaymentAccountSelect
            tenantId={tenantId}
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
}: PayrollGroupPayFormProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[#64748b]">No unpaid payrolls in this group.</p>
    );
  }

  return (
    <div className="table-responsive hq6-payroll-group-pay-table-wrap">
      <table className="table table-bordered hq6-payroll-group-pay-table">
        <thead>
          <tr>
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
                    <td colSpan={4}>
                      <div className="hq6-payroll-pay-divider" role="presentation" />
                    </td>
                  </tr>
                ) : null}
                <tr className="hq6-payroll-pay-row">
                  <td className="hq6-payroll-pay-employee">{row.employeeName}</td>
                  <td className="hq6-payroll-pay-gross tabular-nums">
                    {formatHq6Currency(row.grossPay, "NGN")}
                  </td>
                  <td className="hq6-payroll-pay-bank-cell">
                    <PayrollBankDetailsCell row={row} />
                  </td>
                  <td className="hq6-payroll-pay-form-cell">
                    <PayrollPayEmployeeFields
                      tenantId={row.tenantId}
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
