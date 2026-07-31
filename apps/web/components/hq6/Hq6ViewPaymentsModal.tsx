"use client";

import { paymentAmountSchema } from "@/lib/validation/schemas";
import { parseForm } from "@/lib/validation/parseForm";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Mail, Pencil, Printer, Trash2 } from "lucide-react";
import { Hq6Field, Hq6Modal } from "@/components/hq6/Hq6Modal";
import {
  deleteSalePayment,
  getSalePayments,
  type SalePaymentRow,
  updateSalePayment,
} from "@/lib/api/sales";
import { getPaymentAccounts } from "@/lib/api/paymentAccounts";
import { getStockMovementPayments } from "@/lib/api/stockMovements";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import {
  MODAL_RECORD_STALE_MS,
  MODAL_REF_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import {
  formatHq6Currency,
  formatHq6Date,
  formatHq6DateTime,
  formatHq6PaymentMethod,
  formatHq6PaymentStatus,
} from "@/lib/utils/hq6Format";
import { toast } from "@/stores/toastStore";
import { cn } from "@/lib/utils/cn";
import { hq6PaymentBadgeClass } from "@/lib/utils/hq6PaymentBadge";

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
  /** Purchase status label when kind=purchase */
  purchaseStatus?: string | null;
  supplierName?: string | null;
};

function paymentBadgeClass(status: string | null | undefined): string {
  return hq6PaymentBadgeClass(status);
}

const METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

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
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SalePaymentRow | null>(null);
  const [viewing, setViewing] = useState<SalePaymentRow | null>(null);
  const [printRow, setPrintRow] = useState<SalePaymentRow | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMethod, setEditMethod] = useState("cash");
  const [editNote, setEditNote] = useState("");
  const [editPaidOn, setEditPaidOn] = useState("");
  const [editRef, setEditRef] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editBankAccountNo, setEditBankAccountNo] = useState("");
  const [editDocName, setEditDocName] = useState("");

  const paymentsQueryKey =
    kind === "sale"
      ? modalKeys.salePayments(tenantId, recordId)
      : (["purchase-view-payments", tenantId, recordId] as const);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: paymentsQueryKey,
    queryFn: () =>
      kind === "sale"
        ? getSalePayments(tenantId!, recordId!)
        : getStockMovementPayments(tenantId!, recordId!),
    enabled: Boolean(open && tenantId && recordId),
    staleTime: MODAL_RECORD_STALE_MS,
    placeholderData: (prev) => prev,
  });

  const { data: paymentAccounts = [] } = useQuery({
    queryKey: modalKeys.paymentAccounts(tenantId),
    queryFn: () => getPaymentAccounts(tenantId!),
    enabled: Boolean(editing && tenantId),
    staleTime: MODAL_REF_STALE_MS,
  });

  useEffect(() => {
    if (!editing) return;
    setEditAmount(String(editing.amount));
    setEditMethod(editing.method ?? "cash");
    setEditNote(editing.note ?? "");
    setEditPaidOn(
      editing.paidOn ? editing.paidOn.slice(0, 16) : new Date().toISOString().slice(0, 16),
    );
    setEditRef(editing.paymentRefNo ?? "");
    setEditAccountId(editing.accountId ?? "");
    setEditBankAccountNo("");
    setEditDocName("");
  }, [editing]);

  const saveMutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId || !recordId || !editing) throw new Error("Missing payment");
      if (kind !== "sale") throw new Error("Purchase payment edit is not available yet");
      const valid = parseForm(
        paymentAmountSchema,
        { amount: editAmount },
        { toast: false },
      );
      if (!valid) throw new Error("Enter a valid amount");
      const amount = Number(valid.amount);
      if (!editAccountId.trim()) {
        throw new Error(
          "Select a Payment Account so this payment stays on the account book",
        );
      }
      return updateSalePayment(tenantId, recordId, editing.id, {
        amount,
        method: editMethod,
        note: [
          editNote.trim(),
          editBankAccountNo.trim()
            ? `Bank Account No: ${editBankAccountNo.trim()}`
            : "",
        ]
          .filter(Boolean)
          .join(" | ") || null,
        paidOn: editPaidOn ? new Date(editPaidOn).toISOString() : null,
        paymentRefNo: editRef.trim() || null,
        accountId: editAccountId || null,
      });
    },
    successMessage: "Payment updated",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: paymentsQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      await queryClient.invalidateQueries({
        queryKey: ["payment-accounts", tenantId],
      });
      setEditing(null);
    },
  });

  const deleteMutation = useAppMutation({
    mutationFn: async (paymentId: string) => {
      if (!tenantId || !recordId) throw new Error("Missing payment");
      if (kind !== "sale") throw new Error("Purchase payment delete is not available yet");
      await deleteSalePayment(tenantId, recordId, paymentId);
    },
    successMessage: "Payment deleted",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: paymentsQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });

  const showLoading = isLoading && payments.length === 0;

  const printPaymentDoc = (row: SalePaymentRow | null) => {
    setPrintRow(row);
    window.setTimeout(() => window.print(), 150);
  };

  return (
    <>
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
              onClick={() => {
                setPrintRow(null);
                window.print();
              }}
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
          <div className="mb-4 grid gap-4 text-sm text-[#374151] sm:grid-cols-3">
            <div className="space-y-1">
              {context.supplierName ? (
                <>
                  <p className="font-semibold">Supplier:</p>
                  <p>{context.supplierName}</p>
                </>
              ) : null}
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
            <div className="space-y-1">
              {context.businessName ? (
                <>
                  <p className="font-semibold">Business:</p>
                  <p className="font-semibold">{context.businessName}</p>
                </>
              ) : null}
              {context.businessLocation ? <p>{context.businessLocation}</p> : null}
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
            <div className="space-y-1">
              {context.invoiceNo ? (
                <p>
                  <span className="font-semibold">Reference No:</span> #
                  {context.invoiceNo}
                </p>
              ) : null}
              {context.date ? (
                <p>
                  <span className="font-semibold">Date:</span>{" "}
                  {formatHq6Date(context.date)}
                </p>
              ) : null}
              {context.purchaseStatus ? (
                <p>
                  <span className="font-semibold">Purchase Status:</span>{" "}
                  {context.purchaseStatus}
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
              {kind === "sale" ? (
                <button
                  type="button"
                  className="hq6-modal-btn hq6-modal-btn-notify mt-2 inline-flex items-center"
                  onClick={() =>
                    toast.info("Payment received notification queued")
                  }
                >
                  <Mail className="mr-1.5 h-4 w-4" />
                  Send Payment Received Notification
                </button>
              ) : (
                <button
                  type="button"
                  className="hq6-modal-btn hq6-modal-btn-notify mt-2 inline-flex items-center"
                  onClick={() =>
                    toast.info("Payment paid notification queued")
                  }
                >
                  <Mail className="mr-1.5 h-4 w-4" />
                  Payment Paid Notification
                </button>
              )}
            </div>
          </div>
        ) : null}

        {showLoading ? (
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
                      <div className="flex flex-wrap items-center gap-1">
                        {kind === "sale" ? (
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#3b82f6] text-white"
                            title="Edit payment"
                            onClick={() => setEditing(row)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        {kind === "sale" ? (
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#ef4444] text-white"
                            title="Delete payment"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Delete this payment? Sale payment status will be recalculated.",
                                )
                              ) {
                                deleteMutation.mutate(row.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#8b5cf6] text-white"
                          title="View payment"
                          onClick={() => setViewing(row)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0ea5e9] text-white"
                          title="Print payment"
                          onClick={() => printPaymentDoc(row)}
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Single-payment print sheet (hidden until print) */}
        {printRow ? (
          <div className="hq6-print-payment-only hidden print:block">
            <h2 className="mb-3 text-lg font-bold">
              Reference No: {context?.invoiceNo ?? recordId}
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-black text-left">
                  <th className="py-1">Date</th>
                  <th className="py-1">Reference No</th>
                  <th className="py-1">Amount</th>
                  <th className="py-1">Payment Method</th>
                  <th className="py-1">Payment Note</th>
                  <th className="py-1">Payment Account</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1">
                    {printRow.paidOn ? formatHq6DateTime(printRow.paidOn) : "—"}
                  </td>
                  <td className="py-1">{printRow.paymentRefNo ?? "—"}</td>
                  <td className="py-1">
                    {formatHq6Currency(printRow.amount, printRow.currency)}
                  </td>
                  <td className="py-1">
                    {formatHq6PaymentMethod(printRow.method)}
                  </td>
                  <td className="py-1">{printRow.note ?? ""}</td>
                  <td className="py-1">{printRow.accountName ?? "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </Hq6Modal>

      <Hq6Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit payment"
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="hq6-modal-btn hq6-modal-btn-print"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Updating…" : "Update"}
            </button>
            <button
              type="button"
              className="hq6-modal-btn hq6-modal-btn-close"
              onClick={() => setEditing(null)}
            >
              Close
            </button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded border border-[#e5e7eb] bg-[#f9fafb] p-3 space-y-1">
              <p>
                <span className="font-semibold">
                  {context?.supplierName ? "Supplier:" : "Customer:"}
                </span>{" "}
                {context?.supplierName ?? context?.customerName ?? "—"}
              </p>
              <p>
                <span className="font-semibold">Business:</span>{" "}
                {context?.businessName ?? "—"}
              </p>
            </div>
            <div className="rounded border border-[#e5e7eb] bg-[#f9fafb] p-3 space-y-1">
              <p>
                <span className="font-semibold">Reference No:</span>{" "}
                {editRef || context?.invoiceNo || "—"}
              </p>
              <p>
                <span className="font-semibold">Location:</span>{" "}
                {context?.businessLocation ?? "—"}
              </p>
            </div>
            <div className="rounded border border-[#e5e7eb] bg-[#f9fafb] p-3 space-y-1">
              <p>
                <span className="font-semibold">Total amount:</span>{" "}
                {editing
                  ? formatHq6Currency(editing.amount, editing.currency)
                  : "—"}
              </p>
              <p>
                <span className="font-semibold">Payment Note:</span>{" "}
                {editing?.note?.trim() || "—"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Hq6Field label="Payment Method" required>
              <select
                className="hq6-modal-input"
                value={editMethod}
                onChange={(e) => setEditMethod(e.target.value)}
              >
                {METHOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Hq6Field>
            <Hq6Field label="Paid on" required>
              <input
                className="hq6-modal-input"
                type="datetime-local"
                value={editPaidOn}
                onChange={(e) => setEditPaidOn(e.target.value)}
              />
            </Hq6Field>
            <Hq6Field label="Amount" required>
              <input
                className="hq6-modal-input"
                type="number"
                min="0"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </Hq6Field>
          </div>

          <Hq6Field label="Attach Document">
            <input
              className="hq6-modal-input"
              type="file"
              accept=".pdf,.csv,.zip,.doc,.docx,.jpeg,.jpg,.png"
              onChange={(e) =>
                setEditDocName(e.target.files?.[0]?.name ?? "")
              }
            />
            <p className="mt-1 text-xs text-[#6b7280]">
              {editDocName
                ? `Selected: ${editDocName}`
                : "Previously uploaded file will be replaced. Allowed File: .pdf, .csv, .zip, .doc, .docx, .jpeg, .jpg, .png"}
            </p>
          </Hq6Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Hq6Field label="Payment Account">
              <select
                className="hq6-modal-input"
                value={editAccountId}
                onChange={(e) => setEditAccountId(e.target.value)}
              >
                <option value="">None</option>
                {paymentAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                    {typeof acc.balance === "number"
                      ? ` (Balance: ${acc.balance.toLocaleString()})`
                      : ""}
                  </option>
                ))}
              </select>
            </Hq6Field>
            <Hq6Field label="Bank Account No">
              <input
                className="hq6-modal-input"
                placeholder="Bank Account No"
                value={editBankAccountNo}
                onChange={(e) => setEditBankAccountNo(e.target.value)}
              />
            </Hq6Field>
          </div>

          <Hq6Field label="Payment Note">
            <textarea
              className="hq6-modal-input"
              rows={4}
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
            />
          </Hq6Field>
        </div>
      </Hq6Modal>

      <Hq6Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={
          viewing
            ? `View Payment ( Reference No: ${viewing.paymentRefNo ?? context?.invoiceNo ?? "—"} )`
            : "View Payment"
        }
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="hq6-modal-btn hq6-modal-btn-print"
              onClick={() => viewing && printPaymentDoc(viewing)}
            >
              <Printer className="mr-1.5 inline h-4 w-4" />
              Print
            </button>
            <button
              type="button"
              className="hq6-modal-btn hq6-modal-btn-close"
              onClick={() => setViewing(null)}
            >
              Close
            </button>
          </>
        }
      >
        {viewing ? (
          <div className="space-y-4 text-sm text-[#111827]">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p>
                  <span className="font-normal">Customer:</span>{" "}
                  <span className="font-semibold">
                    {context?.customerName ?? context?.supplierName ?? "—"}
                  </span>
                </p>
                {context?.customerPhone ? (
                  <p>{context.customerPhone}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <p>
                  <span className="font-normal">Business:</span>{" "}
                  <span className="font-semibold">
                    {context?.businessName ?? "—"}
                  </span>
                </p>
                {context?.businessLocation ? (
                  <p>{context.businessLocation}</p>
                ) : null}
                {context?.businessMobile ? (
                  <p>Mobile: {context.businessMobile}</p>
                ) : null}
                {context?.businessEmail ? (
                  <p>Email: {context.businessEmail}</p>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 border-t border-[#e5e7eb] pt-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p>
                  Amount :{" "}
                  <span className="font-semibold">
                    {formatHq6Currency(viewing.amount, viewing.currency)}
                  </span>
                </p>
                <p>
                  Payment Method :{" "}
                  <span className="font-semibold">
                    {formatHq6PaymentMethod(viewing.method)}
                  </span>
                </p>
                <p>
                  Payment Note :{" "}
                  <span className="font-semibold">{viewing.note || ""}</span>
                </p>
              </div>
              <div className="space-y-2">
                <p>
                  Reference No:{" "}
                  <span className="font-semibold">
                    {viewing.paymentRefNo ?? context?.invoiceNo ?? "—"}
                  </span>
                </p>
                <p>
                  Paid on:{" "}
                  <span className="font-semibold">
                    {viewing.paidOn
                      ? formatHq6DateTime(viewing.paidOn)
                      : "—"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </Hq6Modal>
    </>
  );
}
