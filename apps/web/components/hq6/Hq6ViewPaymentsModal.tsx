"use client";

import { useQuery } from "@tanstack/react-query";
import { Hq6Modal, Hq6ModalSaveClose } from "@/components/hq6/Hq6Modal";
import { getSalePayments } from "@/lib/api/sales";
import { getStockMovementPayments } from "@/lib/api/stockMovements";
import { formatHq6Currency, formatHq6DateTime } from "@/lib/utils/hq6Format";

export type Hq6PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  method: string | null;
  paidOn: string | null;
  note: string | null;
  createdByName: string | null;
};

/** HQ6 “View Payments” modal for sales or purchases. */
export function Hq6ViewPaymentsModal({
  open,
  title,
  tenantId,
  kind,
  recordId,
  onClose,
}: {
  open: boolean;
  title: string;
  tenantId: string | null;
  kind: "sale" | "purchase";
  recordId: string | null;
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
      size="lg"
      footer={<Hq6ModalSaveClose onClose={onClose} closeLabel="Close" />}
    >
      {isLoading ? (
        <p className="text-sm text-[#6b7280]">Loading payments…</p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-[#6b7280]">No payments recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-left text-[#6b7280]">
                <th className="pb-2 pr-3 font-medium">Date</th>
                <th className="pb-2 pr-3 font-medium">Method</th>
                <th className="pb-2 pr-3 font-medium">Note</th>
                <th className="pb-2 pr-3 font-medium">By</th>
                <th className="pb-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((row) => (
                <tr key={row.id} className="border-b border-[#f3f4f6]">
                  <td className="whitespace-nowrap py-2 pr-3">
                    {row.paidOn ? formatHq6DateTime(row.paidOn) : "—"}
                  </td>
                  <td className="py-2 pr-3 capitalize">{row.method ?? "—"}</td>
                  <td className="py-2 pr-3">{row.note ?? "—"}</td>
                  <td className="py-2 pr-3">{row.createdByName ?? "—"}</td>
                  <td className="py-2 text-right tabular-nums">
                    {formatHq6Currency(row.amount, row.currency)}
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
