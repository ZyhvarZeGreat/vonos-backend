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
import type { Sale } from "@vonos/types";
import {
  MODAL_REF_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import {
  optimisticTempId,
  patchEntityInQueries,
} from "@/lib/query/optimistic";
import { dismissFirstWrite } from "@/lib/utils/dismissFirstWrite";
import { formatHq6Currency } from "@/lib/utils/hq6Format";
import { captureSalePaymentWrite, paymentStatusFromPaid } from "@/lib/utils/salePaymentWrite";
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
  onPaid?: (saleId: string) => void;
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
    const nextDue =
      sale.sellDue ?? Math.max(0, sale.total - (sale.totalPaid ?? 0));
    setAmount(nextDue > 0 ? nextDue.toFixed(2) : "");
    setMethod("cash");
    setAccountId("");
    setNote("");
    setPaidOn(nowPaidOnLocal());
  }, [open, sale?.id]);

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

    let captured;
    try {
      captured = captureSalePaymentWrite({
        tenantId,
        sale,
        amount: Number(valid.amount),
        method,
        accountId,
        note,
        paidOnIso: paidOnToIso(paidOn),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
      return;
    }

    // Snapshot IDs/amounts before dismiss — closing clears `sale` on the parent.
    const {
      saleId,
      apply,
      nextPaid,
      remaining,
      paymentStatus,
      body,
      currency,
    } = captured;
    const saleTotal = sale.total;
    const accountName =
      accounts.find((a) => a.id === body.accountId)?.name ?? null;

    patchEntityInQueries(queryClient, ["sales"], saleId, {
      totalPaid: nextPaid,
      sellDue: remaining,
      paymentStatus,
      paymentMethod: body.method,
    });
    const payKey = modalKeys.salePayments(tenantId, saleId);
    const prev = queryClient.getQueryData<Array<{ id: string; amount: number }>>(
      payKey,
    );
    if (prev) {
      queryClient.setQueryData(payKey, [
        {
          id: optimisticTempId("pay"),
          amount: apply,
          currency,
          method: body.method,
          paymentRefNo: null,
          paidOn: body.paidOn,
          note: body.note ?? null,
          accountId: body.accountId,
          accountName,
          createdByName: null,
        },
        ...prev,
      ]);
    }

    await dismissFirstWrite({
      dismiss: onClose,
      label: "Recording payment",
      write: () => addSalePayment(captured.tenantId, saleId, body),
      successMessage: (result) =>
        `Applied ${formatHq6Currency(result.amountApplied, result.currency)} — remaining due ${formatHq6Currency(result.remainingDue, result.currency)}`,
      onSuccess: (result) => {
        const paidAfter = Math.max(
          0,
          saleTotal - Number(result.remainingDue ?? remaining),
        );
        patchEntityInQueries(queryClient, ["sales"], saleId, {
          totalPaid: paidAfter,
          sellDue: Math.max(0, Number(result.remainingDue ?? 0)),
          paymentStatus:
            result.paymentStatus ??
            paymentStatusFromPaid(saleTotal, paidAfter),
          paymentMethod: body.method,
        });
        onPaid?.(saleId);
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
