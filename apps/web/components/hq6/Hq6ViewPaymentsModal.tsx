"use client";

import { useQuery } from "@tanstack/react-query";
import { Mail, Pencil, Printer, Trash2 } from "lucide-react";
import { Hq6Modal } from "@/components/hq6/Hq6Modal";
import { getSalePayments } from "@/lib/api/sales";
import { getStockMovementPayments } from "@/lib/api/stockMovements";
import {
  formatHq6Currency,
  formatHq6Date,
  formatHq6DateTime,
  formatHq6PaymentMethod,
  formatHq6PaymentStatus,
} from "@/lib/utils/hq6Format";
import { toast } from "@/stores/toastStore";
import { cn } from "@/lib/utils/cn";

export type Hq6PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  method: string | null;
  paymentRefNo?: string | null;
  paidOn: string | null;
  note: string | null;
  accountName?: string | null;
  createdByName: string | null;
};

export type Hq6ViewPaymentsContext = {
  customerName?: string;
  customerPhone?: string | null;
  businessName?: string;
  businessLocation?: string | null;
  businessMobile?: string | null;
  businessEmail?: string | null;
  invoiceNo?: string;
  date?: string | null;
  paymentStatus?: string | null;
};

function paymentBadgeClass(status: string | null | undefined): string {
  if (status === "paid") return "hq6-pay-paid";
  if (status === "partial") return "hq6-pay-partial";
  if (status === "due" || status === "overdue") return "hq6-pay-due";
  return "";
}

/** HQ6 “View Payments” modal for sales or purchases. */
export function Hq6ViewPaymentsModal({
  open,
  title,
  tenantId,
  kind,
  recordId,
  context,
  onClose,
}: {
  open: boolean;
  title: string;
  tenantId: string | null;
  kind: "sale" | "purchase";
  recordId: string | null;
  context?: Hq6ViewPaymentsContext | null;
  onClose: () => void;
}) {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["hq6-view-payments", kind, tenantId, recordId],
    queryFn: () =>
      kind === "sale"
        ? getSalePayments(tenantId!, recordId!)
        : getStockMovementPayments(tenantId!, recordId!),
    enabled: Boolean(open && tenantId && recordId),
  });

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xl"
      bodyClassName="hq6-view-payments-body"
      footer={
        <>
          <button
            type="button"
            className="hq6-modal-btn hq6-modal-btn-print"
            onClick={() => window.print()}
          >
            <Printer className="mr-1.5 inline h-4 w-4" />
            Print
          </button>
          <button
            type="button"
            className="hq6-modal-btn hq6-modal-btn-close"
            onClick={onClose}
          >
            Close
          </button>
        </>
      }
    >
      {context ? (
        <div className="mb-4 grid gap-4 text-sm text-[#374151] sm:grid-cols-2">
          <div className="space-y-1">
            {context.customerName ? (
              <p>
                <span className="font-semibold">Customer:</span>{" "}
                {context.customerName}
              </p>
            ) : null}
            {context.customerPhone ? (
              <p>
                <span className="font-semibold">Mobile:</span>{" "}
                {context.customerPhone}
              </p>
            ) : null}
          </div>
          <div className="space-y-1 sm:text-right">
            {context.businessName ? (
              <p className="font-semibold">{context.businessName}</p>
            ) : null}
            {context.businessLocation ? (
              <p>{context.businessLocation}</p>
            ) : null}
            {context.businessMobile ? (
              <p>
                <span className="font-semibold">Mobile:</span>{" "}
                {context.businessMobile}
              </p>
            ) : null}
            {context.businessEmail ? (
              <p>
                <span className="font-semibold">Email:</span>{" "}
                {context.businessEmail}
              </p>
            ) : null}
          </div>
          <div className="space-y-1 sm:col-span-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
            <div className="space-y-1">
              {context.invoiceNo ? (
                <p>
                  <span className="font-semibold">Invoice No.:</span> #
                  {context.invoiceNo}
                </p>
              ) : null}
              {context.date ? (
                <p>
                  <span className="font-semibold">Date:</span>{" "}
                  {formatHq6Date(context.date)}
                </p>
              ) : null}
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">Payment Status:</span>
                <span
                  className={cn(
                    "hq6-pay-badge",
                    paymentBadgeClass(context.paymentStatus),
                  )}
                >
                  {formatHq6PaymentStatus(context.paymentStatus)}
                </span>
              </p>
            </div>
            {kind === "sale" ? (
              <button
                type="button"
                className="hq6-modal-btn hq6-modal-btn-notify inline-flex items-center"
                onClick={() =>
                  toast.info("Payment received notification queued")
                }
              >
                <Mail className="mr-1.5 h-4 w-4" />
                Send Payment Received Notification
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-[#6b7280]">Loading payments…</p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-[#6b7280]">No payments recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-left text-[#6b7280]">
                <th className="pb-2 pr-3 font-medium">Date</th>
                <th className="pb-2 pr-3 font-medium">Reference No</th>
                <th className="pb-2 pr-3 font-medium text-right">Amount</th>
                <th className="pb-2 pr-3 font-medium">Payment Method</th>
                <th className="pb-2 pr-3 font-medium">Payment Note</th>
                <th className="pb-2 pr-3 font-medium">Payment Account</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((row) => (
                <tr key={row.id} className="border-b border-[#f3f4f6]">
                  <td className="whitespace-nowrap py-2 pr-3">
                    {row.paidOn ? formatHq6DateTime(row.paidOn) : "—"}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-3">
                    {row.paymentRefNo ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {formatHq6Currency(row.amount, row.currency)}
                  </td>
                  <td className="py-2 pr-3">
                    {formatHq6PaymentMethod(row.method)}
                  </td>
                  <td className="py-2 pr-3">{row.note ?? ""}</td>
                  <td className="py-2 pr-3">{row.accountName ?? "—"}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="text-[#2563eb] hover:text-[#1d4ed8]"
                        aria-label="Edit payment"
                        onClick={() =>
                          toast.info("Edit payment is not available yet")
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="text-[#dc2626] hover:text-[#b91c1c]"
                        aria-label="Delete payment"
                        onClick={() =>
                          toast.info("Delete payment is not available yet")
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
