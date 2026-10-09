"use client";

import { useState } from "react";
import type { PaymentAccount } from "@vonos/types";
import { createExpense } from "@/lib/api/expenses";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { PosModal } from "./PosModal";

export interface PosExpenseCategory {
  id: string;
  name: string;
}

const METHOD_OPTIONS = ["cash", "card", "transfer", "cheque"];

export function PosExpenseModal({
  open,
  tenantId,
  locationCode,
  accounts,
  categories,
  onClose,
  onCreated,
}: {
  open: boolean;
  tenantId: string;
  locationCode: string;
  accounts: PaymentAccount[];
  categories: PosExpenseCategory[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [refNo, setRefNo] = useState("");
  const [note, setNote] = useState("");

  const create = useAppMutation({
    mutationFn: () => {
      const total = Number(amount);
      if (!Number.isFinite(total) || total <= 0) throw new Error("Enter an expense amount");
      return createExpense(tenantId, {
        categoryId: categoryId || undefined,
        totalAmount: total,
        locationCode: locationCode || undefined,
        refNo: refNo.trim() || undefined,
        note: note.trim() || undefined,
        paymentStatus: "paid",
        paymentDue: 0,
        accountId: accountId || undefined,
        paymentMethod: method,
      });
    },
    successMessage: "Expense recorded",
    invalidateKeys: [["pos-expenses", tenantId], ["expenses"], ["paymentAccounts"]],
    onSuccess: () => {
      setAmount("");
      setRefNo("");
      setNote("");
      onCreated();
    },
  });

  return (
    <PosModal
      open={open}
      title="Add Expense"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="cafe-pos-btn cafe-pos-btn--dark" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="cafe-pos-btn cafe-pos-btn--primary"
            disabled={create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Saving…" : "Save Expense"}
          </button>
        </>
      }
    >
      <div className="cafe-pos-fields-2">
        <label className="cafe-pos-field">
          <span className="cafe-pos-label">Category</span>
          <select className="cafe-pos-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="cafe-pos-field">
          <span className="cafe-pos-label">
            Amount<span className="text-red-600"> *</span>
          </span>
          <input
            type="number"
            min={0}
            step="any"
            className="cafe-pos-number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="cafe-pos-field">
          <span className="cafe-pos-label">Payment Method</span>
          <select className="cafe-pos-select" value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHOD_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="cafe-pos-field">
          <span className="cafe-pos-label">Payment Account</span>
          <select className="cafe-pos-select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">None</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({formatCurrency(a.balance, a.currency || "NGN")})
              </option>
            ))}
          </select>
        </label>
        <label className="cafe-pos-field">
          <span className="cafe-pos-label">Reference No.</span>
          <input className="cafe-pos-number" value={refNo} onChange={(e) => setRefNo(e.target.value)} />
        </label>
      </div>
      <label className="cafe-pos-field mt-3">
        <span className="cafe-pos-label">Note</span>
        <textarea className="cafe-pos-textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
    </PosModal>
  );
}
