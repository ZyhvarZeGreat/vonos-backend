"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CreatePaymentAccountRequest,
  PaymentAccount,
  PaymentAccountDepositRequest,
  PaymentAccountTransferRequest,
  UpdatePaymentAccountRequest,
} from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { Modal } from "@/components/atoms/Modal";
import { MenuSelect } from "@/components/molecules/MenuSelect";
import { parseForm } from "@/lib/validation/parseForm";
import {
  depositTransferSchema,
  paymentAccountFormSchema,
} from "@/lib/validation/schemas";

const ACCOUNT_TYPE_OPTIONS = [
  { value: "", label: "Please Select" },
  { value: "IN HOUSE", label: "IN HOUSE" },
  { value: "BANK", label: "BANK" },
  { value: "CASH", label: "CASH" },
  { value: "OTHER", label: "OTHER" },
];

type DetailRow = { label: string; value: string };

function emptyDetails(n = 6): DetailRow[] {
  return Array.from({ length: n }, () => ({ label: "", value: "" }));
}

function parseDetails(raw: string | null | undefined): DetailRow[] {
  if (!raw?.trim()) return emptyDetails();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const rows = parsed
        .map((row) => {
          if (
            row &&
            typeof row === "object" &&
            "label" in row &&
            "value" in row
          ) {
            return {
              label: String((row as DetailRow).label ?? ""),
              value: String((row as DetailRow).value ?? ""),
            };
          }
          return null;
        })
        .filter((r): r is DetailRow => r != null);
      if (rows.length > 0) {
        while (rows.length < 6) rows.push({ label: "", value: "" });
        return rows.slice(0, 8);
      }
    }
  } catch {
    // plain text → first label
  }
  const rows = emptyDetails();
  rows[0] = { label: "Details", value: raw };
  return rows;
}

function serializeDetails(rows: DetailRow[]): string | undefined {
  const filled = rows.filter((r) => r.label.trim() || r.value.trim());
  if (filled.length === 0) return undefined;
  return JSON.stringify(
    filled.map((r) => ({
      label: r.label.trim(),
      value: r.value.trim(),
    })),
  );
}

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
  const isEdit = Boolean(account);
  const [form, setForm] = useState({
    name: "",
    accountNumber: "",
    accountType: "",
    openingBalance: "0",
    note: "",
  });
  const [details, setDetails] = useState<DetailRow[]>(emptyDetails);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDismissed(false);
    setForm({
      name: account?.name ?? "",
      accountNumber: account?.accountNumber ?? "",
      accountType: account?.accountType ?? "",
      openingBalance: "0",
      note: account?.note ?? "",
    });
    setDetails(parseDetails(account?.accountDetails));
    setError(null);
  }, [open, account]);

  if (!open || dismissed) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = parseForm(
      paymentAccountFormSchema,
      { name: form.name, accountNumber: form.accountNumber },
      { setError },
    );
    if (!valid) return;
    setSaving(true);
    setError(null);
    setDismissed(true);
    try {
      const accountDetails = serializeDetails(details);
      if (isEdit) {
        await onSave({
          name: valid.name.trim(),
          accountNumber: form.accountNumber.trim() || undefined,
          accountType: form.accountType.trim() || null,
          accountDetails: accountDetails ?? null,
          note: form.note.trim() || null,
        });
      } else {
        const opening = Number(form.openingBalance);
        await onSave({
          name: valid.name.trim(),
          accountNumber: form.accountNumber.trim() || undefined,
          accountType: form.accountType.trim() || undefined,
          accountDetails,
          note: form.note.trim() || undefined,
          openingBalance:
            Number.isFinite(opening) && opening > 0 ? opening : undefined,
        });
      }
      onClose();
    } catch (err) {
      setDismissed(false);
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      panelClassName="max-h-[90vh] max-w-lg overflow-y-auto rounded-xl border border-border p-6"
    >
      <h3 className="text-lg font-semibold text-foreground">
        {isEdit ? "Edit Account" : "Add Account"}
      </h3>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block text-sm">
          <span className="text-muted">
            Name<span className="text-red-600">*</span>
          </span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Name"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">
            Account Number<span className="text-red-600">*</span>
          </span>
          <input
            required={!isEdit}
            value={form.accountNumber}
            onChange={(e) =>
              setForm({ ...form, accountNumber: e.target.value })
            }
            placeholder="Account Number"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Account Type</span>
          <div className="mt-1">
            <MenuSelect
              value={form.accountType}
              placeholder="Please Select"
              onChange={(value) => setForm({ ...form, accountType: value })}
              options={ACCOUNT_TYPE_OPTIONS}
            />
          </div>
        </label>
        {!isEdit ? (
          <label className="block text-sm">
            <span className="text-muted">Opening Balance</span>
            <input
              type="number"
              step="0.01"
              value={form.openingBalance}
              onChange={(e) =>
                setForm({ ...form, openingBalance: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
        ) : null}

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            Account details
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-2 bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <span>Label</span>
              <span>Value</span>
            </div>
            {details.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-2 gap-2 border-t border-border px-2 py-1.5"
              >
                <input
                  value={row.label}
                  onChange={(e) => {
                    const next = [...details];
                    next[idx] = { ...row, label: e.target.value };
                    setDetails(next);
                  }}
                  className="rounded border border-border bg-background px-2 py-1.5 text-sm"
                />
                <input
                  value={row.value}
                  onChange={(e) => {
                    const next = [...details];
                    next[idx] = { ...row, value: e.target.value };
                    setDetails(next);
                  }}
                  className="rounded border border-border bg-background px-2 py-1.5 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <label className="block text-sm">
          <span className="text-muted">Note</span>
          <textarea
            rows={3}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Note"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Close
          </Button>
          <Button type="submit" disabled={saving || !form.name.trim()}>
            {saving ? "Saving…" : isEdit ? "Update" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function PaymentAccountDepositModal({
  account,
  accounts,
  onClose,
  onSave,
}: {
  account: PaymentAccount | null;
  accounts: PaymentAccount[];
  onClose: () => void;
  onSave: (payload: PaymentAccountDepositRequest) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [operationDate, setOperationDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sources = useMemo(
    () =>
      accounts.filter(
        (a) => a.id !== account?.id && !a.isClosed,
      ),
    [accounts, account?.id],
  );

  useEffect(() => {
    if (!account) return;
    setAmount("");
    setNote("");
    setFromAccountId("");
    setOperationDate(new Date().toISOString().slice(0, 10));
    setError(null);
  }, [account]);

  if (!account) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = parseForm(depositTransferSchema, { amount }, { setError });
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        amount: Number(valid.amount),
        note: note.trim() || undefined,
        operationDate,
        fromAccountId: fromAccountId || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} panelClassName="max-w-md rounded-xl border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground">Deposit</h3>
      <p className="mt-1 text-sm text-muted">
        Selected Account: <strong>{account.name}</strong>
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block text-sm">
          <span className="text-muted">Deposit to</span>
          <input
            disabled
            value={account.name}
            className="mt-1 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">
            Amount<span className="text-red-600">*</span>
          </span>
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
          <span className="text-muted">Deposit From</span>
          <div className="mt-1">
            <MenuSelect
              value={fromAccountId}
              placeholder="Please Select"
              searchable
              onChange={setFromAccountId}
              options={[
                { value: "", label: "Please Select (external / cash in)" },
                ...sources.map((a) => ({
                  value: a.id,
                  label: a.name,
                })),
              ]}
            />
          </div>
          <p className="mt-1 text-xs text-muted">
            Choose another payment account to move balances between accounts.
          </p>
        </label>
        <label className="block text-sm">
          <span className="text-muted">
            Date<span className="text-red-600">*</span>
          </span>
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
            placeholder="Note"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Close
          </Button>
          <Button type="submit" disabled={saving || !amount}>
            {saving ? "Saving…" : "Submit"}
          </Button>
        </div>
      </form>
    </Modal>
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
  const openAccounts = useMemo(
    () => accounts.filter((a) => !a.isClosed),
    [accounts],
  );
  const [fromAccountId, setFromAccountId] = useState("");
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
    setFromAccountId(fromAccount.id);
    setToAccountId("");
    setAmount("");
    setNote("");
    setOperationDate(new Date().toISOString().slice(0, 10));
    setError(null);
  }, [fromAccount]);

  if (!fromAccount) return null;

  const toOptions = openAccounts.filter((a) => a.id !== fromAccountId);
  const fromOptions = openAccounts.filter((a) => a.id !== toAccountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAccountId || !toAccountId) {
      setError("Select both Transfer from and Transfer To accounts");
      return;
    }
    if (fromAccountId === toAccountId) {
      setError("Cannot transfer to the same account");
      return;
    }
    const valid = parseForm(depositTransferSchema, { amount }, { setError });
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        fromAccountId,
        toAccountId,
        amount: Number(valid.amount),
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
    <Modal open onClose={onClose} panelClassName="max-w-md rounded-xl border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground">Fund Transfer</h3>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block text-sm">
          <span className="text-muted">
            Transfer from<span className="text-red-600">*</span>
          </span>
          <div className="mt-1">
            <MenuSelect
              value={fromAccountId}
              placeholder="Please Select"
              searchable
              onChange={setFromAccountId}
              options={fromOptions.map((a) => ({
                value: a.id,
                label: a.name,
              }))}
            />
          </div>
        </label>
        <label className="block text-sm">
          <span className="text-muted">
            Transfer To<span className="text-red-600">*</span>
          </span>
          <div className="mt-1">
            <MenuSelect
              value={toAccountId}
              placeholder="Please Select"
              searchable
              onChange={setToAccountId}
              options={[
                { value: "", label: "Please Select" },
                ...toOptions.map((a) => ({
                  value: a.id,
                  label: a.name,
                })),
              ]}
            />
          </div>
        </label>
        <label className="block text-sm">
          <span className="text-muted">
            Amount<span className="text-red-600">*</span>
          </span>
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
          <span className="text-muted">
            Date<span className="text-red-600">*</span>
          </span>
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
            placeholder="Note"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Close
          </Button>
          <Button
            type="submit"
            disabled={saving || !amount || !fromAccountId || !toAccountId}
          >
            {saving ? "Transferring…" : "Submit"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
