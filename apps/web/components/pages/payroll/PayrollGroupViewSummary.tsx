"use client";

import { Printer } from "lucide-react";
import type { PayrollGroupDetail } from "@vonos/types";
import { StatusPill } from "@/components/atoms/StatusPill";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { payrollBankDetailLines } from "./payrollDraftUtils";

export type PayrollGroupViewSummaryProps = {
  group: PayrollGroupDetail;
  onPrint?: () => void;
};

export function PayrollGroupViewSummary({
  group,
  onPrint,
}: PayrollGroupViewSummaryProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#111827]">{group.name}</h2>
          <p className="mt-1 text-sm text-muted">
            Status:{" "}
            <StatusPill status={group.status} vocabulary="payrollStatus" />{" "}
            · Payment:{" "}
            <StatusPill
              status={group.paymentStatus}
              vocabulary="payrollStatus"
            />
          </p>
        </div>
        {onPrint ? (
          <button
            type="button"
            className="hq6-btn hq6-btn-outline inline-flex items-center gap-1.5"
            onClick={onPrint}
          >
            <Printer className="size-4" />
            Print
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded border border-[#e5e7eb]">
        <table className="w-full min-w-[48rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-[#fafafa] text-left">
              <th className="px-3 py-2 font-semibold">Employee</th>
              <th className="px-3 py-2 font-semibold">Gross</th>
              <th className="px-3 py-2 font-semibold">Bank details</th>
              <th className="px-3 py-2 font-semibold">Payment</th>
            </tr>
          </thead>
          <tbody>
            {group.payrolls.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[#e5e7eb]/80 align-top last:border-0"
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
                  <StatusPill
                    status={row.paymentStatus}
                    vocabulary="payrollStatus"
                  />
                </td>
              </tr>
            ))}
            {group.payrolls.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-sm text-muted"
                >
                  No payroll rows in this group.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
