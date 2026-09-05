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
import { payExpense } from "@/lib/api/expenses";
import type { Expense } from "@vonos/types";
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

/** HQ6 expenses row “Add payment” modal — same layout as sales/purchases. */
export function Hq6PayExpenseModal({
  open,
  expense,
  tenantId,
  onClose,
  onPaid,
}: {
  open: boolean;
  expense: Expense | null;
  tenantId: string | null;
  onClose: () => void;
  onPaid?: (expenseId: string) => void;
}) {
  const queryClient = useQueryClient();
  const due = expense?.paymentDue ?? 0;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [paidOn, setPaidOn] = useState(nowPaidOnLocal);

  const { data: accounts = [] } = useQuery({
    queryKey: modalKeys.paymentAccounts(tenantId),
    queryFn: () => getPaymentAccountsForPicker(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: MODAL_REF_STALE_MS,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (!open || !expense) return;
    const nextDue = expense.paymentDue ?? 0;
    setAmount(nextDue > 0 ? nextDue.toFixed(2) : "");
    setMethod("cash");
    setAccountId(expense.accountId ?? "");
    setNote("");
    setPaidOn(nowPaidOnLocal());
  }, [open, expense?.id]);

  const handleSave = async () => {
    if (!tenantId || !expense) return;
    const valid = parseForm(paymentAmountSchema, { amount });
    if (!valid) return;
    if (!accountId.trim()) {
      toast.error(
        "Select a Payment Account so this payment posts to the account book",
      );
      return;
    }
    const value = Number(valid.amount);
    const expenseId = expense.id;
    const apply = Math.min(value, due > 0 ? due : value);
    const total = expense.totalAmount ?? due;
    const priorPaid = Math.max(0, total - due);
    const nextPaid = priorPaid + apply;
    const remaining = Math.max(0, total - nextPaid);
    const paymentStatus = paymentStatusFromPaid(total, nextPaid);

    patchEntityInQueries(queryClient, ["expenses"], expenseId, {
      paymentDue: remaining,
      paymentStatus,
      paymentMethod: method,
      accountId,
    });

    await dismissFirstWrite({
      dismiss: onClose,
      label: "Recording payment",
      write: () =>
        payExpense(tenantId, expenseId, {
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
        patchEntityInQueries(queryClient, ["expenses"], expenseId, {
          paymentDue: Math.max(0, Number(result.remainingDue ?? 0)),
          paymentStatus:
            result.paymentStatus ??
            paymentStatusFromPaid(
              total,
              Math.max(0, total - Number(result.remainingDue ?? remaining)),
            ),
          paymentMethod: method,
          accountId,
        });
        onPaid?.(expenseId);
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
          onSave={() => void handleSave()}
          onClose={onClose}
          saving={false}
          saveLabel="Save"
        />
      }
    >
      <Hq6AddPaymentWellsRow
        wells={{
          partyLabel: "Expense for",
          partyName:
            expense?.expenseFor || expense?.contactName || "—",
          docLabel: "Reference No",
          docRef: expense?.refNo ?? expense?.id.slice(-8) ?? "—",
          locationName: expense?.locationCode ?? null,
          totalAmount: formatHq6Currency(expense?.totalAmount ?? 0),
          paymentDue: formatHq6Currency(due),
        }}
      />
      <Hq6AddPaymentFormFields
        amount={amount}
        onAmountChange={setAmount}
        method={method}
        onMethodChange={setMethod}
        accountId={accountId}
        onAccountChange={setAccountId}
        accounts={accounts}
        paidOn={paidOn}
        onPaidOnChange={setPaidOn}
        note={note}
        onNoteChange={setNote}
      />
    </Hq6Modal>
  );
}
