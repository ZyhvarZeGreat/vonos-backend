"use client";

import { Hq6DateTimeInput } from "@/components/hq6/Hq6DateTimeInput";

import { paymentAmountSchema } from "@/lib/validation/schemas";
import { parseForm } from "@/lib/validation/parseForm";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Mail, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import { Hq6BusyButton } from "@/components/hq6/Hq6BusyButton";
import { Hq6Field, Hq6Modal } from "@/components/hq6/Hq6Modal";
import { Hq6AuditTrail } from "@/components/hq6/Hq6AuditTrail";
import {
  deleteSalePayment,
  getSalePayments,
  type SalePaymentRow,
  updateSalePayment,
} from "@/lib/api/sales";
import { getPaymentAccountsForPicker } from "@/lib/api/paymentAccounts";
import { paymentAccountPickerLabel } from "@/lib/utils/pickerLabels";
import {
  deleteStockMovementPayment,
  getStockMovementPayments,
  updateStockMovementPayment,
} from "@/lib/api/stockMovements";
import type { PurchaseViewBundle, SaleViewBundle } from "@vonos/types";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import {
  MODAL_RECORD_STALE_MS,
  MODAL_REF_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import { patchEntityInQueries } from "@/lib/query/optimistic";
import {
  formatHq6Currency,
  formatHq6Date,
  formatHq6DateTime,
  formatHq6PaymentMethod,
  formatHq6PaymentStatus,
} from "@/lib/utils/hq6Format";
import { toast } from "@/stores/toastStore";
import { cn } from "@/lib/utils/cn";
import { hq6PaymentBadgeClass, canAddPaymentForStatus } from "@/lib/utils/hq6PaymentBadge";
import { filterSelectablePaymentAccounts } from "@/lib/utils/paymentAccountPicker";
import { HQ6_PAYMENT_METHOD_OPTIONS } from "@/lib/utils/hq6PaymentMethods";

function paymentStatusFromPaid(total: number, paid: number): string {
  if (paid <= 0) return "due";
  if (paid + 0.0001 >= total) return "paid";
  return "partial";
}

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
  /** Remaining balance — preferred for Add Payment visibility. */
  remainingDue?: number | null;
  /** Purchase status label when kind=purchase */
  purchaseStatus?: string | null;
  supplierName?: string | null;
};

function paymentBadgeClass(status: string | null | undefined): string {
  return hq6PaymentBadgeClass(status);
}

const METHOD_OPTIONS = HQ6_PAYMENT_METHOD_OPTIONS;

function extractBankAccountNo(note: string | null | undefined): string {
  if (!note) return "";
  const match = note.match(/Bank Account No:\s*(.+?)(?:\s*\||$)/i);
  return match?.[1]?.trim() ?? "";
}

function stripBankAccountFromNote(note: string | null | undefined): string {
  if (!note) return "";
  return note
    .replace(/\s*\|\s*Bank Account No:\s*.+$/i, "")
    .replace(/^Bank Account No:\s*.+$/i, "")
    .trim();
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
  onAddPayment,
}: {
  open: boolean;
  title: string;
  tenantId: string | null;
  kind: "sale" | "purchase";
  recordId: string | null;
  context?: Hq6ViewPaymentsContext | null;
  onClose: () => void;
  /** UPOS: show “Add Payment” when invoice/PO is not fully paid. */
  onAddPayment?: () => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SalePaymentRow | null>(null);
  const [viewing, setViewing] = useState<SalePaymentRow | null>(null);
  const [deleting, setDeleting] = useState<SalePaymentRow | null>(null);
  const [printRow, setPrintRow] = useState<SalePaymentRow | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMethod, setEditMethod] = useState("cash");
  const [editNote, setEditNote] = useState("");
  const [editPaidOn, setEditPaidOn] = useState("");
  const [editRef, setEditRef] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editBankAccountNo, setEditBankAccountNo] = useState("");
  const [editDocName, setEditDocName] = useState("");

  const paymentStatus = context?.paymentStatus;
  const canAddPayment =
    Boolean(onAddPayment) &&
    canAddPaymentForStatus(paymentStatus, context?.remainingDue);

  // Light payments endpoint — not the full invoice /view bundle.
  // If invoice View already cached this sale, paint payments instantly.
  const saleViewCached = queryClient.getQueryData<SaleViewBundle>(
    modalKeys.saleView(tenantId, recordId),
  );
  const purchaseViewCached = queryClient.getQueryData<PurchaseViewBundle>(
    modalKeys.purchaseView(tenantId, recordId),
  );
  const salePaymentsSeed =
    kind === "sale" && saleViewCached?.sale?.id === recordId
      ? saleViewCached.payments
      : undefined;
  const purchasePaymentsSeed =
    kind === "purchase" && purchaseViewCached?.movement?.id === recordId
      ? purchaseViewCached.payments
      : undefined;

  const { data: salePayments, isLoading: saleLoading } = useQuery({
    queryKey: modalKeys.salePayments(tenantId, recordId),
    queryFn: () => getSalePayments(tenantId!, recordId!),
    enabled: Boolean(open && kind === "sale" && tenantId && recordId),
    staleTime: MODAL_RECORD_STALE_MS,
    initialData: salePaymentsSeed,
    initialDataUpdatedAt: salePaymentsSeed
      ? queryClient.getQueryState(modalKeys.saleView(tenantId, recordId))
          ?.dataUpdatedAt
      : undefined,
    placeholderData: (prev) => prev,
  });

  const { data: purchasePayments, isLoading: purchaseLoading } = useQuery({
    queryKey: modalKeys.purchasePayments(tenantId, recordId),
    queryFn: () => getStockMovementPayments(tenantId!, recordId!),
    enabled: Boolean(open && kind === "purchase" && tenantId && recordId),
    staleTime: MODAL_RECORD_STALE_MS,
    initialData: purchasePaymentsSeed,
    initialDataUpdatedAt: purchasePaymentsSeed
      ? queryClient.getQueryState(modalKeys.purchaseView(tenantId, recordId))
          ?.dataUpdatedAt
      : undefined,
    placeholderData: (prev) => prev,
  });

  const payments: SalePaymentRow[] =
    kind === "sale" ? (salePayments ?? []) : (purchasePayments ?? []);
  const isLoading = kind === "sale" ? saleLoading : purchaseLoading;

  const paymentsQueryKey =
    kind === "sale"
      ? modalKeys.salePayments(tenantId, recordId)
      : modalKeys.purchasePayments(tenantId, recordId);

  const { data: paymentAccountsRaw = [] } = useQuery({
    queryKey: modalKeys.paymentAccounts(tenantId),
    queryFn: () => getPaymentAccountsForPicker(tenantId!),
    enabled: Boolean(editing && tenantId),
    staleTime: MODAL_REF_STALE_MS,
  });
  const paymentAccounts = useMemo(
    () => filterSelectablePaymentAccounts(paymentAccountsRaw),
    [paymentAccountsRaw],
  );

  useEffect(() => {
    if (!editing) return;
    setEditAmount(String(editing.amount));
    setEditMethod(editing.method ?? "cash");
    setEditNote(stripBankAccountFromNote(editing.note));
    setEditPaidOn(
      editing.paidOn
        ? editing.paidOn.slice(0, 16)
        : new Date().toISOString().slice(0, 16),
    );
    setEditRef(editing.paymentRefNo ?? "");
    setEditAccountId(editing.accountId ?? "");
    setEditBankAccountNo(extractBankAccountNo(editing.note));
    setEditDocName("");
  }, [editing]);

  const saveMutation = useAppMutation({
    mutationFn: async (vars: {
      paymentId: string;
      amount: number;
      method: string;
      note: string | null;
      paidOn: string | null;
      paymentRefNo: string | null;
      accountId: string;
    }) => {
      if (!tenantId || !recordId) throw new Error("Missing payment");
      const payload = {
        amount: vars.amount,
        method: vars.method,
        note: vars.note,
        paidOn: vars.paidOn,
        paymentRefNo: vars.paymentRefNo,
        accountId: vars.accountId,
      };
      if (kind === "sale") {
        return updateSalePayment(tenantId, recordId, vars.paymentId, payload);
      }
      return updateStockMovementPayment(
        tenantId,
        recordId,
        vars.paymentId,
        payload,
      );
    },
    successMessage: "Payment updated",
    progressLabel: "Updating payment",
    optimistic: {
      // List rows are patched in update — do not invalidate sales/purchases
      // lists or a stale cache page can flip Paid → Due.
      invalidate: false,
      keys: [
        paymentsQueryKey,
        kind === "sale" ? ["sales"] : ["stock-movements"],
        kind === "sale"
          ? modalKeys.saleView(tenantId, recordId)
          : modalKeys.purchaseView(tenantId, recordId),
        ["payment-accounts", tenantId],
      ],
      update: (qc, vars) => {
        const amount = vars.amount;
        const accountName =
          paymentAccounts.find((a) => a.id === vars.accountId)?.name ?? null;
        const prevRows =
          qc.getQueryData<SalePaymentRow[]>(paymentsQueryKey) ?? payments;
        const nextRows = prevRows.map((row) =>
          row.id === vars.paymentId
            ? {
                ...row,
                amount: Number.isFinite(amount) ? amount : row.amount,
                method: vars.method,
                note: vars.note,
                paidOn: vars.paidOn ?? row.paidOn,
                paymentRefNo: vars.paymentRefNo,
                accountId: vars.accountId || null,
                accountName: accountName ?? row.accountName ?? null,
              }
            : row,
        );
        qc.setQueryData(paymentsQueryKey, nextRows);

        const paid = nextRows.reduce((sum, row) => sum + row.amount, 0);
        const prevPaid = prevRows.reduce((sum, row) => sum + row.amount, 0);
        const docTotal =
          context?.remainingDue != null
            ? prevPaid + context.remainingDue
            : paid;
        const due = Math.max(0, docTotal - paid);
        const paymentStatus = paymentStatusFromPaid(docTotal, paid);

        if (kind === "sale" && recordId) {
          patchEntityInQueries(qc, ["sales"], recordId, {
            totalPaid: paid,
            sellDue: due,
            paymentStatus,
          });
        }
        if (kind === "purchase" && recordId) {
          patchEntityInQueries(qc, ["stock-movements"], recordId, {
            totalPaid: paid,
            paymentDue: due,
            paymentStatus,
          });
        }
      },
    },
  });

  const handleUpdatePayment = () => {
    if (!editing || !tenantId || !recordId) return;
    const valid = parseForm(paymentAmountSchema, { amount: editAmount });
    if (!valid) return;
    if (!editAccountId.trim()) {
      toast.error(
        "Select a Payment Account so this payment stays on the account book",
      );
      return;
    }
    const amount = Number(valid.amount);
    const note =
      [
        editNote.trim(),
        editBankAccountNo.trim()
          ? `Bank Account No: ${editBankAccountNo.trim()}`
          : "",
      ]
        .filter(Boolean)
        .join(" | ") || null;
    // Capture before closing edit pane — mutation must not read live `editing`.
    const vars = {
      paymentId: editing.id,
      amount,
      method: editMethod,
      note,
      paidOn: editPaidOn ? new Date(editPaidOn).toISOString() : null,
      paymentRefNo: editRef.trim() || null,
      accountId: editAccountId,
    };
    setEditing(null);
    saveMutation.mutate(vars);
  };
  const deleteMutation = useAppMutation({
    mutationFn: async (paymentId: string) => {
      if (!tenantId || !recordId) throw new Error("Missing payment");
      if (kind === "sale") {
        await deleteSalePayment(tenantId, recordId, paymentId);
        return paymentId;
      }
      await deleteStockMovementPayment(tenantId, recordId, paymentId);
      return paymentId;
    },
    successMessage: "Payment deleted",
    progressLabel: "Deleting payment",
    optimistic: {
      invalidate: false,
      keys: [
        paymentsQueryKey,
        kind === "sale" ? ["sales"] : ["stock-movements"],
        kind === "sale"
          ? modalKeys.saleView(tenantId, recordId)
          : modalKeys.purchaseView(tenantId, recordId),
        ["payment-accounts", tenantId],
      ],
      update: (qc, paymentId) => {
        const prevRows =
          qc.getQueryData<SalePaymentRow[]>(paymentsQueryKey) ?? payments;
        const nextRows = prevRows.filter((row) => row.id !== paymentId);
        qc.setQueryData(paymentsQueryKey, nextRows);
        const paid = nextRows.reduce((sum, row) => sum + row.amount, 0);
        const prevPaid = prevRows.reduce((sum, row) => sum + row.amount, 0);
        const docTotal =
          context?.remainingDue != null
            ? prevPaid + context.remainingDue
            : paid;
        const due = Math.max(0, docTotal - paid);
        const paymentStatus = paymentStatusFromPaid(docTotal, paid);

        if (kind === "sale" && recordId) {
          patchEntityInQueries(qc, ["sales"], recordId, {
            totalPaid: paid,
            sellDue: due,
            paymentStatus,
          });
        }
        if (kind === "purchase" && recordId) {
          patchEntityInQueries(qc, ["stock-movements"], recordId, {
            totalPaid: paid,
            paymentDue: due,
            paymentStatus,
          });
        }
        setDeleting(null);
      },
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
          <div className="hq6-view-payments-meta mb-4 grid gap-4 sm:grid-cols-3">
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
                  <span className="font-semibold">
                    {kind === "sale" ? "Invoice No:" : "Reference No:"}
                  </span>{" "}
                  #{context.invoiceNo}
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
              <div className="mt-2 flex flex-wrap gap-2">
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
                ) : (
                  <button
                    type="button"
                    className="hq6-modal-btn hq6-modal-btn-notify inline-flex items-center"
                    onClick={() =>
                      toast.info("Payment paid notification queued")
                    }
                  >
                    <Mail className="mr-1.5 h-4 w-4" />
                    Payment Paid Notification
                  </button>
                )}
                {canAddPayment && kind === "sale" ? (
                  <button
                    type="button"
                    className="hq6-modal-btn hq6-modal-btn-reminder inline-flex items-center"
                    onClick={() =>
                      toast.info("Payment reminder queued")
                    }
                  >
                    <Mail className="mr-1.5 h-4 w-4" />
                    Send Payment Reminder
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {canAddPayment ? (
          <div className="hq6-view-payments-toolbar no-print">
            <button
              type="button"
              className="hq6-modal-btn hq6-modal-btn-add-payment"
              onClick={() => {
                // Parent closes this modal and opens Add Payment in one handoff.
                onAddPayment?.();
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Payment
            </button>
          </div>
        ) : null}

        <div className="hq6-view-payments-table-wrap">
          <table className="hq6-view-payments-table">
            <colgroup>
              <col className="hq6-vp-col-date" />
              <col className="hq6-vp-col-ref" />
              <col className="hq6-vp-col-amount" />
              <col className="hq6-vp-col-method" />
              <col className="hq6-vp-col-note" />
              <col className="hq6-vp-col-account" />
              <col className="hq6-vp-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference No</th>
                <th className="hq6-vp-num">Amount</th>
                <th>Payment Method</th>
                <th>Payment Note</th>
                <th>Payment Account</th>
                <th className="hq6-view-payments-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {showLoading ? (
                <tr>
                  <td colSpan={7} className="hq6-vp-empty">
                    Loading payments…
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="hq6-vp-empty">
                    No payments recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((row) => (
                  <tr key={row.id}>
                    <td className="hq6-vp-nowrap">
                      {row.paidOn ? formatHq6DateTime(row.paidOn) : "—"}
                    </td>
                    <td className="hq6-vp-nowrap">
                      {row.paymentRefNo ?? "—"}
                    </td>
                    <td className="hq6-vp-num">
                      {formatHq6Currency(row.amount, row.currency)}
                    </td>
                    <td className="hq6-vp-nowrap">
                      {formatHq6PaymentMethod(row.method)}
                    </td>
                    <td className="hq6-vp-note" title={row.note ?? undefined}>
                      {row.note?.trim() ? row.note : "—"}
                    </td>
                    <td className="hq6-vp-note" title={row.accountName ?? undefined}>
                      {row.accountName ?? "—"}
                    </td>
                    <td className="hq6-view-payments-actions">
                      <div className="hq6-payment-row-actions">
                        <button
                          type="button"
                          className="hq6-payment-action-btn hq6-payment-action-edit"
                          title="Edit"
                          aria-label="Edit payment"
                          onClick={() => setEditing(row)}
                        >
                          <Pencil
                            className="hq6-inline-action-icon"
                            aria-hidden
                          />
                        </button>
                        <button
                          type="button"
                          className="hq6-payment-action-btn hq6-payment-action-delete"
                          title="Delete"
                          aria-label="Delete payment"
                          disabled={deleteMutation.isPending}
                          onClick={() => setDeleting(row)}
                        >
                          <Trash2
                            className="hq6-inline-action-icon"
                            aria-hidden
                          />
                        </button>
                        <button
                          type="button"
                          className="hq6-payment-action-btn hq6-payment-action-view"
                          title="View"
                          aria-label="View payment"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(null);
                            setDeleting(null);
                            setViewing(row);
                          }}
                        >
                          <Eye className="hq6-inline-action-icon" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
        <Hq6AuditTrail
          entityType={kind === "sale" ? "sale" : "stockMovement"}
          entityId={recordId}
          title="Record activity"
          enabled={open}
          className="print:hidden"
        />
      </Hq6Modal>

      <Hq6Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit payment"
        size="lg"
        footer={
          <>
            <Hq6BusyButton
              className="hq6-modal-btn hq6-modal-btn-print"
              busy={saveMutation.isPending}
              busyLabel="Updating…"
              onClick={handleUpdatePayment}
            >
              Update
            </Hq6BusyButton>
            <button
              type="button"
              className="hq6-modal-btn hq6-modal-btn-close"
              disabled={saveMutation.isPending}
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
                <Hq6DateTimeInput
                  className="hq6-modal-input"
                value={editPaidOn}
                onChange={(v) => setEditPaidOn(v)}
              />
            </Hq6Field>
            <Hq6Field label="Amount" required>
              <input
                className="hq6-modal-input"
                type="text"
                inputMode="decimal"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </Hq6Field>
          </div>

          <Hq6Field label="Attach Document">
            <input
              className="hq6-modal-input"
              type="file"
              accept=".pdf,.csv,.zip,.doc,.docx,.jpeg,.jpg,.png,.avif"
              onChange={(e) =>
                setEditDocName(e.target.files?.[0]?.name ?? "")
              }
            />
            <p className="mt-1 text-xs text-[#6b7280]">
              {editDocName
                ? `Selected: ${editDocName}`
                : "Previously uploaded file will be replaced. Allowed File: .pdf, .csv, .zip, .doc, .docx, .jpeg, .jpg, .png, .avif"}
            </p>
          </Hq6Field>

          <Hq6Field label="Payment Account" required>
            <select
              className="hq6-modal-input"
              value={editAccountId}
              onChange={(e) => setEditAccountId(e.target.value)}
            >
              <option value="">Please Select</option>
              {paymentAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {paymentAccountPickerLabel(acc)}
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
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1">
                <p>
                  {kind === "purchase" || context?.supplierName
                    ? "Supplier:"
                    : "Customer:"}
                </p>
                <p className="font-semibold">
                  {context?.supplierName ?? context?.customerName ?? "—"}
                </p>
                {context?.customerPhone ? (
                  <p>Mobile: {context.customerPhone}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <p>Business:</p>
                <p className="font-semibold">
                  {[context?.businessName, context?.businessLocation]
                    .filter(Boolean)
                    .join(" ") || "—"}
                </p>
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
                  <span className="font-semibold">Amount :</span>{" "}
                  {formatHq6Currency(viewing.amount, viewing.currency)}
                </p>
                <p>
                  <span className="font-semibold">Payment Method :</span>{" "}
                  {formatHq6PaymentMethod(viewing.method)}
                </p>
                <p>
                  <span className="font-semibold">Payment Note :</span>{" "}
                  {viewing.note || ""}
                </p>
              </div>
              <div className="space-y-2">
                <p>
                  <span className="font-semibold">Reference No:</span>{" "}
                  {viewing.paymentRefNo ?? context?.invoiceNo ?? "—"}
                </p>
                <p>
                  <span className="font-semibold">Paid on:</span>{" "}
                  {viewing.paidOn ? formatHq6DateTime(viewing.paidOn) : "—"}
                </p>
                {viewing.accountName ? (
                  <p>
                    <span className="font-semibold">Payment Account:</span>{" "}
                    {viewing.accountName}
                  </p>
                ) : null}
              </div>
            </div>
            <Hq6AuditTrail
              entityType="payment"
              entityId={viewing.id}
              title="Payment activity"
              enabled={Boolean(viewing)}
            />
          </div>
        ) : null}
      </Hq6Modal>

      <Hq6ConfirmModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        alertStyle
        title="Are you sure ?"
        message="This payment will be deleted."
        confirmLabel="OK"
        cancelLabel="Cancel"
        danger
        confirming={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteMutation.mutate(deleting.id);
        }}
      />
    </>
  );
}
