"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Hq6Field,
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import { getPaymentAccounts } from "@/lib/api/paymentAccounts";
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
import { formatHq6Currency, formatHq6DateTime } from "@/lib/utils/hq6Format";
import { toast } from "@/stores/toastStore";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
  { value: "custom_pay_1", label: "POS 1" },
  { value: "custom_pay_2", label: "FCMB (Bank Transfer)" },
  { value: "custom_pay_3", label: "GTB (Bank Transfer)" },
  { value: "custom_pay_4", label: "Zenith (Bank Transfer)" },
  { value: "custom_pay_5", label: "POS 2" },
  { value: "custom_pay_6", label: "Discount" },
  { value: "custom_pay_7", label: "Exchange" },
] as const;

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
  const [amount, setAmount] = useState("0.00");
  const [method, setMethod] = useState("cash");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [paidOn, setPaidOn] = useState(nowPaidOnLocal);
  const [saving, setSaving] = useState(false);

  const accountsQuery = useQuery({
    queryKey: modalKeys.paymentAccounts(tenantId),
    queryFn: () => getPaymentAccounts(tenantId!),
    enabled: Boolean(open && tenantId),
    staleTime: MODAL_REF_STALE_MS,
  });
  const accounts = accountsQuery.data ?? [];

  const { data: summary } = useQuery({
    queryKey: ["supplier-summary", tenantId, supplier?.id, "pay-modal"],
    queryFn: () => getSupplierSummary(tenantId!, supplier!.id),
    enabled: Boolean(
      open && tenantId && supplier?.id && accountsQuery.isFetched,
    ),
    staleTime: MODAL_RECORD_STALE_MS,
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
    setAmount(totals.totalDue > 0 ? totals.totalDue.toFixed(2) : "0.00");
    setMethod("cash");
    setAccountId("");
    setNote("");
    setPaidOn(nowPaidOnLocal());
  }, [open, supplier, totals.totalDue]);

  const handleSave = async () => {
    if (!tenantId || !supplier) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a payment amount greater than zero");
      return;
    }
    setSaving(true);
    try {
      const result = await paySupplierDue(tenantId, supplier.id, {
        amount: value,
        method,
        accountId: accountId || undefined,
        note: note.trim() || undefined,
        paidOn: paidOnToIso(paidOn),
      });
      toast.success(
        `Applied ${formatHq6Currency(result.amountApplied, result.currency)} — remaining due ${formatHq6Currency(result.remainingDue, result.currency)}`,
      );
      onPaid?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setSaving(false);
    }
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
          saving={saving}
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
          <input
            className="hq6-modal-input"
            type="datetime-local"
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
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
        <Hq6Field label="Payment Account">
          <select
            className="hq6-modal-input"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">None</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
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
