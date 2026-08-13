"use client";

import { paymentAmountSchema } from "@/lib/validation/schemas";
import { parseForm } from "@/lib/validation/parseForm";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import {
  Hq6AddPaymentFormFields,
  Hq6AddPaymentWellsRow,
} from "@/components/hq6/Hq6AddPaymentForm";
import { getPaymentAccountsForPicker } from "@/lib/api/paymentAccounts";
import { payStockMovement } from "@/lib/api/stockMovements";
import type { StockMovementListRow } from "@/lib/api/stockMovements";
import {
  MODAL_REF_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import { patchEntityInQueries } from "@/lib/query/optimistic";
import { dismissFirstWrite } from "@/lib/utils/dismissFirstWrite";
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

function paymentStatusFromPaid(total: number, paid: number): string {
  if (paid <= 0) return "due";
  if (paid + 0.0001 >= total) return "paid";
  return "partial";
}

/** HQ6 purchases row “Add payment” modal (UPOS layout). */
export function Hq6PayPurchaseModal({
  open,
  purchase,
  tenantId,
  onClose,
  onPaid,
}: {
  open: boolean;
  purchase: StockMovementListRow | null;
  tenantId: string | null;
  onClose: () => void;
  onPaid?: () => void;
}) {
  const queryClient = useQueryClient();
  const due = purchase?.paymentDue ?? 0;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [paidOn, setPaidOn] = useState(nowPaidOnLocal);

  const { data: accounts = [] } = useQuery({
    queryKey: modalKeys.paymentAccounts(tenantId),
    queryFn: () => getPaymentAccountsForPicker(tenantId!),
    // Load with the page (modal stays mounted) so Add Payment opens ready.
    enabled: Boolean(tenantId),
    staleTime: MODAL_REF_STALE_MS,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (!open || !purchase) return;
    const nextDue = purchase.paymentDue ?? 0;
    setAmount(nextDue > 0 ? nextDue.toFixed(2) : "");
    setMethod("cash");
    setAccountId("");
    setNote("");
    setPaidOn(nowPaidOnLocal());
  }, [open, purchase?.id]);

  const handleSave = async () => {
    if (!tenantId || !purchase) return;
    const valid = parseForm(paymentAmountSchema, { amount });
    if (!valid) return;
    if (!accountId.trim()) {
      toast.error(
        "Select a Payment Account so this payment posts to the account book",
      );
      return;
    }
    const value = Number(valid.amount);
    const purchaseId = purchase.id;
    const apply = Math.min(value, due > 0 ? due : value);
    // Derive from grandTotal/due so we don't require totalPaid on the list row type.
    const total = purchase.grandTotal ?? due;
    const priorPaid = Math.max(0, total - due);
    const nextPaid = priorPaid + apply;
    const remaining = Math.max(0, total - nextPaid);
    // Instant list badge update (due → partial/paid) before the API returns.
    patchEntityInQueries(queryClient, ["stock-movements"], purchaseId, {
      totalPaid: nextPaid,
      paymentDue: remaining,
      paymentStatus: paymentStatusFromPaid(total, nextPaid),
    });
    await dismissFirstWrite({
      dismiss: onClose,
      label: "Recording payment",
      write: () =>
        payStockMovement(tenantId, purchaseId, {
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
        const paidAfter = Math.max(
          0,
          total - Number(result.remainingDue ?? remaining),
        );
        patchEntityInQueries(queryClient, ["stock-movements"], purchaseId, {
          totalPaid: paidAfter,
          paymentDue: Math.max(0, Number(result.remainingDue ?? 0)),
          paymentStatus:
            result.paymentStatus ??
            paymentStatusFromPaid(total, paidAfter),
        });
        onPaid?.();
      },
    });
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
          saving={false}
          saveLabel="Save"
        />
      }
    >
      <Hq6AddPaymentWellsRow
        wells={{
          partyLabel: "Supplier",
          partyName: purchase?.supplierOrDest ?? "—",
          docLabel: "Reference No",
          docRef: purchase?.reference ?? "—",
          locationName: purchase?.locationCode ?? null,
          totalAmount: formatHq6Currency(purchase?.grandTotal ?? 0),
          paymentDue: formatHq6Currency(due),
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
