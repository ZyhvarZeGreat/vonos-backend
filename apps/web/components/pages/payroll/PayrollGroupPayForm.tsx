"use client";

import type { Payroll, PayrollGroupStatus } from "@vonos/types";
import { Hq6Field } from "@/components/hq6/Hq6Modal";
import { Hq6DateTimeInput } from "@/components/hq6/Hq6DateTimeInput";
import { PaymentAccountSelect } from "@/components/hq6/PaymentAccountSelect";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { HQ6_PAYMENT_METHOD_OPTIONS } from "@/lib/utils/hq6PaymentMethods";
import { payrollBankDetailLines } from "./payrollDraftUtils";

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
  groupStatus: PayrollGroupStatus;
};

export function PayrollGroupPayForm({
  rows,
  payRowForms,
  onPatchPayRowForm,
  groupStatus,
}: PayrollGroupPayFormProps) {
  return (
    <div className="space-y-4">
      {groupStatus !== "final" ? (
        <p className="rounded border border-[#fcd34d] bg-[#fffbeb] px-3 py-2 text-sm text-[#b45309]">
          This payroll group is still in draft status. Mark it final before
          paying, or proceed at your own risk.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[52rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              <th className="px-3 py-2 font-semibold">Employee</th>
              <th className="px-3 py-2 font-semibold">Net pay</th>
              <th className="px-3 py-2 font-semibold">Bank details</th>
              <th className="px-3 py-2 font-semibold">Add payment</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const form = payRowForms[row.id] ?? emptyPayRowForm();
              return (
                <tr
                  key={row.id}
                  className="border-b border-border/80 align-top last:border-0"
                >
                  <td className="px-3 py-3 font-medium">{row.employeeName}</td>
                  <td className="px-3 py-3 tabular-nums whitespace-nowrap">
                    {formatCurrency(row.netPay, "NGN")}
                  </td>
                  <td className="px-3 py-3 text-xs leading-5 text-muted">
                    {payrollBankDetailLines(row).map((line) => (
                      <div key={line.label}>
                        {line.label}: {line.value || "—"}
                      </div>
                    ))}
                  </td>
                  <td className="px-3 py-3">
                    <div className="min-w-[14rem] space-y-2">
                      <Hq6Field label="Paid on" required>
                        <Hq6DateTimeInput
                          value={form.paidOn}
                          onChange={(value) =>
                            onPatchPayRowForm(row.id, { paidOn: value })
                          }
                        />
                      </Hq6Field>
                      <Hq6Field label="Payment Account">
                        <PaymentAccountSelect
                          tenantId={row.tenantId}
                          value={form.accountId}
                          onChange={(accountId) =>
                            onPatchPayRowForm(row.id, { accountId })
                          }
                          emptyLabel="None"
                        />
                      </Hq6Field>
                      <Hq6Field label="Payment Method" required>
                        <select
                          className="form-control"
                          value={form.method}
                          onChange={(e) =>
                            onPatchPayRowForm(row.id, {
                              method: e.target.value,
                            })
                          }
                        >
                          <option value="">Please Select</option>
                          {HQ6_PAYMENT_METHOD_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </Hq6Field>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-sm text-muted"
                >
                  No unpaid payrolls.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
