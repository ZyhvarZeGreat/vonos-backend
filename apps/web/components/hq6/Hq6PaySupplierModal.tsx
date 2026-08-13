"use client";

import { Hq6DateTimeInput } from "@/components/hq6/Hq6DateTimeInput";

import { paymentAmountSchema } from "@/lib/validation/schemas";
import { parseForm } from "@/lib/validation/parseForm";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Hq6Field,
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import { getPaymentAccountsForPicker } from "@/lib/api/paymentAccounts";
import { paymentAccountPickerLabel } from "@/lib/utils/pickerLabels";
import {
  getSupplierSummary,
  paySupplierDue,
  type SupplierListRow,
} from "@/lib/api/suppliers";
import {
  MODAL_RECORD_STALE_MS,
  MODAL_REF_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import { patchEntityInQueries } from "@/lib/query/optimistic";
import { dismissFirstWrite } from "@/lib/utils/dismissFirstWrite";
import { formatHq6Currency, formatHq6DateTime } from "@/lib/utils/hq6Format";
import { HQ6_PAYMENT_METHOD_OPTIONS } from "@/lib/utils/hq6PaymentMethods";
import { toast } from "@/stores/toastStore";

const PAYMENT_METHODS = HQ6_PAYMENT_METHOD_OPTIONS;

function nowPaidOnLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function paidOnToIso(value: string): string {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/** HQ6 supplier “Add payment” modal (ui-table-rows/04 …/00_pay). */
export function Hq6PaySupplierModal({
  open,
  supplier,
  tenantId,
  onClose,
  onPaid,
}: {
  open: boolean;
  supplier: SupplierListRow | null;
  tenantId: string | null;
  onClose: () => void;
  onPaid?: () => void;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [paidOn, setPaidOn] = useState(nowPaidOnLocal);

  const accountsQuery = useQuery({
    queryKey: modalKeys.paymentAccounts(tenantId),
    queryFn: () => getPaymentAccountsForPicker(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: MODAL_REF_STALE_MS,
    placeholderData: (prev) => prev,
  });
  const accounts = accountsQuery.data ?? [];

  const { data: summary } = useQuery({
    queryKey: ["supplier-summary", tenantId, supplier?.id, "pay-modal"],
    queryFn: () => getSupplierSummary(tenantId!, supplier!.id),
    enabled: Boolean(
      open && tenantId && supplier?.id && accountsQuery.isFetched,
    ),
    staleTime: MODAL_RECORD_STALE_MS,
    placeholderData: (prev) => prev,
  });

  const totals = useMemo(() => {
    const totalAmount = summary?.totalAmount ?? supplier?.totalPurchase ?? 0;
    const totalPaid = summary?.totalPaid ?? supplier?.totalPurchasePaid ?? 0;
    const totalDue = summary?.totalDue ?? supplier?.totalPurchaseDue ?? 0;
    const opening = supplier?.openingBalance ?? 0;
    return { totalAmount, totalPaid, totalDue, opening };
  }, [supplier, summary]);

  useEffect(() => {
    if (!open || !supplier) return;
    setAmount(totals.totalDue > 0 ? totals.totalDue.toFixed(2) : "");
    setMethod("cash");
    setAccountId("");
    setNote("");
    setPaidOn(nowPaidOnLocal());
    // Reset only when the modal opens for this supplier — not when totals refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- totals snapshotted on open
  }, [open, supplier?.id]);

  const handleSave = async () => {
    if (!tenantId || !supplier) return;
    const valid = parseForm(paymentAmountSchema, { amount });
    if (!valid) return;
    if (!accountId.trim()) {
      toast.error(
        "Select a Payment Account so this payment posts to the account book",
      );
      return;
    }
    const value = Number(valid.amount);
    const supplierId = supplier.id;
    const apply = Math.min(value, totals.totalDue > 0 ? totals.totalDue : value);
    const nextPaid = (totals.totalPaid ?? 0) + apply;
    const remaining = Math.max(0, totals.totalDue - apply);
    patchEntityInQueries(queryClient, ["suppliers"], supplierId, {
      totalPurchasePaid: nextPaid,
      totalPurchaseDue: remaining,
    });
    await dismissFirstWrite({
      dismiss: onClose,
      label: "Recording payment",
      write: () =>
        paySupplierDue(tenantId, supplierId, {
          amount: value,
          method,
          accountId,
          note: note.trim() || undefined,
          paidOn: paidOnToIso(paidOn),
        }),
      successMessage: (result) =>
        `Applied ${formatHq6Currency(result.amountApplied, result.currency)} — remaining due ${formatHq6Currency(result.remainingDue, result.currency)}`,
      errorMessage: "Payment failed",
      onSuccess: (result) => {
        patchEntityInQueries(queryClient, ["suppliers"], supplierId, {
          totalPurchasePaid: Math.max(
            0,
            (totals.totalAmount ?? 0) - Number(result.remainingDue ?? 0),
          ),
          totalPurchaseDue: Math.max(0, Number(result.remainingDue ?? 0)),
        });
        onPaid?.();
      },
    });
  };

  const displayName = `${supplier?.businessName ?? supplier?.name ?? ""} ${supplier?.contactId ?? ""}`.trim();

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title="Add payment"
      size="lg"
      footer={
        <Hq6ModalSaveClose
          onSave={handleSave}
          onClose={onClose}
          saving={false}
          saveLabel="Save"
        />
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-sm text-[#374151]">
          <span className="font-semibold">Supplier name:</span> {displayName || "—"}
        </div>
        <div className="rounded border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-sm text-[#374151]">
          <div>Total Purchase: {formatHq6Currency(totals.totalAmount)}</div>
          <div>Total Paid: {formatHq6Currency(totals.totalPaid)}</div>
          <div>Total Purchase Due: {formatHq6Currency(totals.totalDue)}</div>
          <div>Opening Balance: {formatHq6Currency(totals.opening)}</div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Hq6Field label="Payment Method" required>
          <select
            className="hq6-modal-input"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Hq6Field>
        <Hq6Field label="Paid on" required>
                <Hq6DateTimeInput
                  className="hq6-modal-input"
            value={paidOn}
            onChange={(v) => setPaidOn(v)}
          />
        </Hq6Field>
        <Hq6Field label="Amount" required>
          <input
            className="hq6-modal-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Hq6Field>
        <Hq6Field label="Attach Document">
          <input className="hq6-modal-input" type="file" disabled />
        </Hq6Field>
        <Hq6Field label="Payment Account" required>
          <select
            className="hq6-modal-input"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">Please Select</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {paymentAccountPickerLabel(account)}
              </option>
            ))}
          </select>
        </Hq6Field>
        <div className="sm:col-span-2">
          <Hq6Field label="Payment Note">
            <textarea
              className="hq6-modal-input min-h-[88px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Hq6Field>
        </div>
      </div>
      <p className="mt-2 text-xs text-[#9ca3af]">
        Paying as of {formatHq6DateTime(paidOnToIso(paidOn))}
      </p>
    </Hq6Modal>
  );
}
