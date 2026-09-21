"use client";

import type { Payroll, PayrollGroupDetail } from "@vonos/types";
import { Hq6BoldStatusBadge } from "@/components/hq6/Hq6BoldStatusBadge";
import { Hq6AddPaymentWellsRow } from "@/components/hq6/Hq6AddPaymentForm";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { payrollBankDetailLines } from "./payrollDraftUtils";

export type PayrollGroupViewSummaryProps = {
  group: PayrollGroupDetail;
};

function bankDetailsSummary(row: Payroll): string {
  const lines = payrollBankDetailLines(row)
    .filter((line) => line.value.trim())
    .map((line) => `${line.label}: ${line.value}`);
  return lines.length > 0 ? lines.join(" · ") : "—";
}

function employeeWells(row: Payroll) {
  return {
    partyLabel: "Employee",
    partyName: row.employeeName,
    partyExtra: [
      row.designationName?.trim()
        ? `Designation: ${row.designationName}`
        : null,
      row.department?.trim() ? `Department: ${row.department}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || null,
    docLabel: "Bank details",
    docRef: bankDetailsSummary(row),
    locationName: row.locationCode?.trim() || null,
    totalAmount: formatCurrency(row.netPay, "NGN"),
    paymentDue: formatCurrency(row.netPay, "NGN"),
  };
}

export function PayrollGroupViewSummary({ group }: PayrollGroupViewSummaryProps) {
  return (
    <div className="hq6-add-payment-body space-y-4">
      {group.payrolls.length === 0 ? (
        <section className="hq6-form-card">
          <p className="text-sm text-[#64748b]">No payroll rows in this group.</p>
        </section>
      ) : (
        group.payrolls.map((row, index) => (
          <section key={row.id} className="hq6-form-card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="hq6-form-card-title mb-0">
                Employee {index + 1} · {row.employeeName}
              </h2>
              <Hq6BoldStatusBadge status={row.paymentStatus} kind="payment" />
            </div>

            <Hq6AddPaymentWellsRow wells={employeeWells(row)} />

            <div className="mt-3 grid gap-2 border-t border-[#e5e7eb] pt-3 text-sm md:grid-cols-3">
              <div>
                <span className="text-[#64748b]">Gross pay: </span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(row.grossPay, "NGN")}
                </span>
              </div>
              <div>
                <span className="text-[#64748b]">Allowances: </span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(row.totalAllowance, "NGN")}
                </span>
              </div>
              <div>
                <span className="text-[#64748b]">Deductions: </span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(row.totalDeduction, "NGN")}
                </span>
              </div>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
