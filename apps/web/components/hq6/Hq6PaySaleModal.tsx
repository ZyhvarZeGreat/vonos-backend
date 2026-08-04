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
import { addSalePayment } from "@/lib/api/sales";
import type { PaymentStatus, Sale } from "@vonos/types";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import {
  MODAL_REF_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import {
  optimisticTempId,
  patchEntityInQueries,
} from "@/lib/query/optimistic";
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

function paymentStatusFromPaid(total: number, paid: number): PaymentStatus {
  if (paid <= 0) return "due";
  if (paid + 0.0001 >= total) return "paid";
  return "partial";
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
  const queryClient = useQueryClient();
  const due =
    sale?.sellDue ??
    Math.max(0, (sale?.total ?? 0) - (sale?.totalPaid ?? 0));
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
    if (!open || !sale) return;
    setAmount(due > 0 ? due.toFixed(2) : "");
    setMethod("cash");
    setAccountId("");
    setNote("");
    setPaidOn(nowPaidOnLocal());
  }, [due, open, sale]);

  const payMutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId || !sale) throw new Error("Missing sale");
      const valid = parseForm(paymentAmountSchema, { amount }, { toast: false });
      if (!valid) throw new Error("Enter a valid amount");
      if (!accountId.trim()) {
        throw new Error(
          "Select a Payment Account so this payment posts to the account book",
        );
      }
      const value = Number(valid.amount);
      return addSalePayment(tenantId, sale.id, {
        amount: value,
        method,
        accountId,
        note: note.trim() || undefined,
        paidOn: paidOnToIso(paidOn),
      });
    },
    progressLabel: "Recording payment",
    successMessage: (result) =>
      `Applied ${formatHq6Currency(result.amountApplied, result.currency)} — remaining due ${formatHq6Currency(result.remainingDue, result.currency)}`,
    optimistic: {
      keys: [
        ["sales"],
        modalKeys.salePayments(tenantId, sale?.id ?? null),
        modalKeys.saleView(tenantId, sale?.id ?? null),
        ["payment-accounts", tenantId],
      ],
      update: (qc) => {
        if (!sale) return;
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0) return;
        const apply = Math.min(value, due > 0 ? due : value);
        const nextPaid = (sale.totalPaid ?? 0) + apply;
        const remaining = Math.max(0, sale.total - nextPaid);
        patchEntityInQueries(qc, ["sales"], sale.id, {
          totalPaid: nextPaid,
          sellDue: remaining,
          paymentStatus: paymentStatusFromPaid(sale.total, nextPaid),
          paymentMethod: method,
        });
        const payKey = modalKeys.salePayments(tenantId, sale.id);
        const prev = qc.getQueryData<Array<{ id: string; amount: number }>>(payKey);
        if (prev) {
          qc.setQueryData(payKey, [
            {
              id: optimisticTempId("pay"),
              amount: apply,
              currency: sale.currency,
              method,
              paymentRefNo: null,
              paidOn: paidOnToIso(paidOn),
              note: note.trim() || null,
              accountId,
              accountName:
                accounts.find((a) => a.id === accountId)?.name ?? null,
              createdByName: null,
            },
            ...prev,
          ]);
        }
        // Do NOT invalidate / onPaid here — that refetches before the write
        // lands and stomps Due/Partial back over the optimistic Paid badge.
      },
      commit: (qc, result) => {
        if (!sale) return;
        const nextPaid = Math.max(
          0,
          sale.total - Number(result.remainingDue ?? 0),
        );
        patchEntityInQueries(qc, ["sales"], sale.id, {
          totalPaid: nextPaid,
          sellDue: Math.max(0, Number(result.remainingDue ?? 0)),
          paymentStatus:
            result.paymentStatus ??
            paymentStatusFromPaid(sale.total, nextPaid),
          paymentMethod: method,
        });
        onPaid?.();
      },
    },
  });

  const handleSave = () => {
    if (!tenantId || !sale) return;
    const valid = parseForm(paymentAmountSchema, { amount });
    if (!valid) return;
    if (!accountId.trim()) {
      toast.error(
        "Select a Payment Account so this payment posts to the account book",
      );
      return;
    }
    // Instant dismiss — optimistic patch + background API (slow Neon RTT).
    onClose();
    payMutation.mutate();
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
          partyLabel: "Customer",
          partyName: sale?.customerName ?? "—",
          docLabel: "Invoice No",
          docRef: sale?.reference ?? "—",
          locationName: sale?.locationCode ?? null,
          totalAmount: formatHq6Currency(sale?.total ?? 0, sale?.currency),
          paymentDue: formatHq6Currency(due, sale?.currency),
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
