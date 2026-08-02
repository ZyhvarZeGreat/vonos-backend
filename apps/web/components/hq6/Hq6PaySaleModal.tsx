"use client";

import { paymentAmountSchema } from "@/lib/validation/schemas";
import { parseForm } from "@/lib/validation/parseForm";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import {
  Hq6AddPaymentFormFields,
  Hq6AddPaymentWellsRow,
} from "@/components/hq6/Hq6AddPaymentForm";
import { getPaymentAccountsForPicker } from "@/lib/api/paymentAccounts";
import { addSalePayment } from "@/lib/api/sales";
import type { Sale } from "@vonos/types";
import {
  MODAL_REF_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import { formatHq6Currency } from "@/lib/utils/hq6Format";
import { toast } from "@/stores/toastStore";

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

/** HQ6 sales row “Add payment” modal (UPOS layout). */
export function Hq6PaySaleModal({
  open,
  sale,
  tenantId,
  onClose,
  onPaid,
}: {
  open: boolean;
  sale: Sale | null;
  tenantId: string | null;
  onClose: () => void;
  onPaid?: () => void;
}) {
  const due =
    sale?.sellDue ??
    Math.max(0, (sale?.total ?? 0) - (sale?.totalPaid ?? 0));
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [paidOn, setPaidOn] = useState(nowPaidOnLocal);
  const [saving, setSaving] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: modalKeys.paymentAccounts(tenantId),
    queryFn: () => getPaymentAccountsForPicker(tenantId!),
    enabled: Boolean(open && tenantId),
    staleTime: MODAL_REF_STALE_MS,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (!open || !sale) return;
    setAmount(due > 0 ? due.toFixed(2) : "");
    setMethod("cash");
    setAccountId("");
    setNote("");
    setPaidOn(nowPaidOnLocal());
  }, [due, open, sale]);

  const handleSave = async () => {
    if (!tenantId || !sale) return;
    const valid = parseForm(paymentAmountSchema, { amount });
    if (!valid) return;
    if (!accountId.trim()) {
      toast.error(
        "Select a Payment Account so this payment posts to the account book",
      );
      return;
    }
    const value = Number(valid.amount);
    setSaving(true);
    try {
      const result = await addSalePayment(tenantId, sale.id, {
        amount: value,
        method,
        accountId,
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

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title="Add Payment"
      size="lg"
      bodyClassName="hq6-add-payment-body"
      footer={
        <Hq6ModalSaveClose
          onSave={handleSave}
          onClose={onClose}
          saving={saving}
          saveLabel="Save"
        />
      }
    >
      <Hq6AddPaymentWellsRow
        wells={{
          partyLabel: "Customer",
          partyName: sale?.customerName ?? "—",
          docLabel: "Invoice No",
          docRef: sale?.reference ?? "—",
          locationName: sale?.locationCode ?? null,
          totalAmount: formatHq6Currency(sale?.total ?? 0, sale?.currency),
          paymentDue: formatHq6Currency(due, sale?.currency),
          paymentNotePreview: sale?.notes ?? null,
        }}
      />
      <Hq6AddPaymentFormFields
        method={method}
        onMethodChange={setMethod}
        paidOn={paidOn}
        onPaidOnChange={setPaidOn}
        amount={amount}
        onAmountChange={setAmount}
        accountId={accountId}
        onAccountChange={setAccountId}
        accounts={accounts}
        note={note}
        onNoteChange={setNote}
      />
    </Hq6Modal>
  );
}
