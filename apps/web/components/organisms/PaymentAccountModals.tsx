"use client";

import { useEffect, useState } from "react";
import type {
  CreatePaymentAccountRequest,
  PaymentAccount,
  PaymentAccountDepositRequest,
  PaymentAccountTransferRequest,
  UpdatePaymentAccountRequest,
} from "@vonos/types";
import { Button } from "@/components/atoms/Button";

export function PaymentAccountFormModal({
  open,
  account,
  onClose,
  onSave,
}: {
  open: boolean;
  account: PaymentAccount | null;
  onClose: () => void;
  onSave: (
    payload: CreatePaymentAccountRequest | UpdatePaymentAccountRequest,
  ) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: "",
    accountNumber: "",
    accountType: "",
    accountSubType: "",
    accountDetails: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: account?.name ?? "",
      accountNumber: account?.accountNumber ?? "",
      accountType: account?.accountType ?? "",
      accountSubType: account?.accountSubType ?? "",
      accountDetails: account?.accountDetails ?? "",
      note: account?.note ?? "",
    });
    setError(null);
  }, [open, account]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: form.name.trim(),
        accountNumber: form.accountNumber.trim() || undefined,
        accountType: form.accountType.trim() || undefined,
        accountSubType: form.accountSubType.trim() || undefined,
        accountDetails: form.accountDetails.trim() || undefined,
        note: form.note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-foreground">
          {account ? "Edit payment account" : "Add payment account"}
        </h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="text-muted">Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Account number</span>
            <input
              value={form.accountNumber}
              onChange={(e) =>
                setForm({ ...form, accountNumber: e.target.value })
              }
              placeholder="Auto-generated if empty"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-muted">Account type</span>
              <input
                value={form.accountType}
                onChange={(e) =>
                  setForm({ ...form, accountType: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Sub type</span>
              <input
                value={form.accountSubType}
                onChange={(e) =>
                  setForm({ ...form, accountSubType: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-muted">Account details</span>
            <input
              value={form.accountDetails}
              onChange={(e) =>
                setForm({ ...form, accountDetails: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Note</span>
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? "Saving…" : account ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PaymentAccountDepositModal({
  account,
  onClose,
  onSave,
}: {
  account: PaymentAccount | null;
  onClose: () => void;
  onSave: (payload: PaymentAccountDepositRequest) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [operationDate, setOperationDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!account) return;
    setAmount("");
    setNote("");
    setPaymentMethod("");
    setOperationDate(new Date().toISOString().slice(0, 10));
    setError(null);
  }, [account]);

  if (!account) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        amount: Number(amount),
        note: note.trim() || undefined,
        paymentMethod: paymentMethod.trim() || undefined,
        operationDate,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-foreground">Deposit</h3>
        <p className="mt-1 text-sm text-muted">{account.name}</p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="text-muted">Amount</span>
            <input
              type="number"
              min={0.01}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Date</span>
            <input
              type="date"
              required
              value={operationDate}
              onChange={(e) => setOperationDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Payment method</span>
            <input
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Note</span>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !amount}>
              {saving ? "Saving…" : "Deposit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PaymentAccountTransferModal({
  fromAccount,
  accounts,
  onClose,
  onSave,
}: {
  fromAccount: PaymentAccount | null;
  accounts: PaymentAccount[];
  onClose: () => void;
  onSave: (payload: PaymentAccountTransferRequest) => Promise<void>;
}) {
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [operationDate, setOperationDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fromAccount) return;
    setToAccountId("");
    setAmount("");
    setNote("");
    setOperationDate(new Date().toISOString().slice(0, 10));
    setError(null);
  }, [fromAccount]);

  if (!fromAccount) return null;

  const targets = accounts.filter(
    (a) => a.id !== fromAccount.id && !a.isClosed,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        fromAccountId: fromAccount.id,
        toAccountId,
        amount: Number(amount),
        note: note.trim() || undefined,
        operationDate,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-foreground">Fund transfer</h3>
        <p className="mt-1 text-sm text-muted">From {fromAccount.name}</p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="text-muted">To account</span>
            <select
              required
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select account…</option>
              {targets.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted">Amount</span>
            <input
              type="number"
              min={0.01}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Date</span>
            <input
              type="date"
              required
              value={operationDate}
              onChange={(e) => setOperationDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Note</span>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !amount || !toAccountId}
            >
              {saving ? "Transferring…" : "Transfer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
