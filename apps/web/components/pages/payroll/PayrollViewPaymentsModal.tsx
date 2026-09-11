"use client";

import { useQuery } from "@tanstack/react-query";
import type { Payroll } from "@vonos/types";
import { Hq6Modal } from "@/components/hq6/Hq6Modal";
import { getPayrollPayments } from "@/lib/api/hrm";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import {
  formatHq6DateTime,
  formatHq6PaymentMethod,
} from "@/lib/utils/hq6Format";

export type PayrollViewPaymentsModalProps = {
  open: boolean;
  onClose: () => void;
  tenantId: string | null;
  payroll: Payroll | null;
};

export function PayrollViewPaymentsModal({
  open,
  onClose,
  tenantId,
  payroll,
}: PayrollViewPaymentsModalProps) {
  const paymentsQuery = useQuery({
    queryKey: ["payroll-payments", tenantId, payroll?.id],
    enabled: open && Boolean(tenantId && payroll?.id),
    queryFn: () => getPayrollPayments(tenantId!, payroll!.id),
  });

  const payments = paymentsQuery.data ?? [];

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title={
        payroll
          ? `Payments — ${payroll.employeeName}`
          : "Payroll payments"
      }
      size="lg"
    >
      {paymentsQuery.isLoading ? (
        <p className="text-sm text-muted">Loading payments…</p>
      ) : paymentsQuery.isError ? (
        <p className="text-sm text-[var(--color-error-text)]">
          {paymentsQuery.error instanceof Error
            ? paymentsQuery.error.message
            : "Failed to load payments"}
        </p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-muted">No payments recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left">
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Ref</th>
                <th className="px-3 py-2 font-semibold">Amount</th>
                <th className="px-3 py-2 font-semibold">Method</th>
                <th className="px-3 py-2 font-semibold">Account</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b border-border/80 last:border-0"
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {payment.paidOn
                      ? formatHq6DateTime(payment.paidOn)
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {payment.paymentRefNo?.trim() || "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatCurrency(payment.amount, "NGN")}
                  </td>
                  <td className="px-3 py-2">
                    {formatHq6PaymentMethod(payment.method)}
                  </td>
                  <td className="px-3 py-2">
                    {payment.accountName?.trim() || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Hq6Modal>
  );
}
