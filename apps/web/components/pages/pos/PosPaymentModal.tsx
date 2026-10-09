"use client";

import { useMemo, useState } from "react";
import type { PaymentAccount } from "@vonos/types";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { PosTotals } from "@/lib/pos/posTotals";
import { PosModal } from "./PosModal";

export interface PosPaymentRow {
  amount: number;
  method: string;
  accountId: string;
  note: string;
}

const METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

export function newPaymentRow(amount: number, accountId = ""): PosPaymentRow {
  return { amount, method: "cash", accountId, note: "" };
}

export function PosPaymentModal({
  open,
  totals,
  accounts,
  initialRows,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  totals: PosTotals;
  accounts: PaymentAccount[];
  initialRows: PosPaymentRow[];
  busy: boolean;
  onClose: () => void;
  onConfirm: (rows: PosPaymentRow[], saleNote: string) => void;
}) {
  const [rows, setRows] = useState<PosPaymentRow[]>(initialRows);
  const [saleNote, setSaleNote] = useState("");

  const totalPaying = useMemo(
    () => rows.reduce((sum, row) => sum + (Number.isFinite(row.amount) ? row.amount : 0), 0),
    [rows],
  );
  const changeReturn = Math.max(0, totalPaying - totals.totalPayable);
  const balance = Math.max(0, totals.totalPayable - totalPaying);
  const canConfirm = rows.length > 0 && rows.every((r) => r.method) && totalPaying > 0;

  const patchRow = (index: number, patch: Partial<PosPaymentRow>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <PosModal
      open={open}
      title="Payment"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="cafe-pos-btn cafe-pos-btn--dark" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="cafe-pos-btn cafe-pos-btn--primary"
            disabled={!canConfirm || busy}
            onClick={() => onConfirm(rows, saleNote)}
          >
            {busy ? "Processing…" : "Finalize Payment"}
          </button>
        </>
      }
    >
      <div className="cafe-pos-pay-grid">
        <div>
          <p className="cafe-pos-muted mb-3 text-xs">
            Advance Balance: {formatCurrency(0, "NGN")}
          </p>

          {rows.map((row, index) => (
            <div key={index} className="cafe-pos-pay-row">
              <div className="cafe-pos-fields-2">
                <label className="cafe-pos-field">
                  <span className="cafe-pos-label">Amount*</span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className="cafe-pos-number"
                    value={row.amount}
                    onChange={(e) => patchRow(index, { amount: Number(e.target.value) })}
                  />
                </label>
                <label className="cafe-pos-field">
                  <span className="cafe-pos-label">Payment Method*</span>
                  <select
                    className="cafe-pos-select"
                    value={row.method}
                    onChange={(e) => patchRow(index, { method: e.target.value })}
                  >
                    {METHOD_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="cafe-pos-field">
                <span className="cafe-pos-label">Payment Account</span>
                <select
                  className="cafe-pos-select"
                  value={row.accountId}
                  onChange={(e) => patchRow(index, { accountId: e.target.value })}
                >
                  <option value="">None</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (Balance: {formatCurrency(a.balance, a.currency || "NGN")})
                    </option>
                  ))}
                </select>
              </label>

              <div className="cafe-pos-fields-2">
                <label className="cafe-pos-field">
                  <span className="cafe-pos-label">Payment note</span>
                  <input
                    className="cafe-pos-number"
                    value={row.note}
                    onChange={(e) => patchRow(index, { note: e.target.value })}
                  />
                </label>
                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    aria-label={`Remove payment row ${index + 1}`}
                    className="cafe-pos-icon-btn h-9 w-9 text-red-600"
                    disabled={rows.length === 1}
                    onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="cafe-pos-btn cafe-pos-btn--pill mt-3 w-full"
            onClick={() => setRows((prev) => [...prev, newPaymentRow(balance, prev[0]?.accountId ?? "")])}
          >
            <Plus className="h-4 w-4" /> Add Payment Row
          </button>

          <div className="cafe-pos-fields-2 mt-4">
            <label className="cafe-pos-field">
              <span className="cafe-pos-label">Sell note</span>
              <textarea
                className="cafe-pos-textarea"
                rows={3}
                value={saleNote}
                onChange={(e) => setSaleNote(e.target.value)}
              />
            </label>
            <label className="cafe-pos-field">
              <span className="cafe-pos-label">Staff note</span>
              <textarea className="cafe-pos-textarea" rows={3} disabled />
            </label>
          </div>
        </div>

        <aside className="cafe-pos-pay-summary">
          {[
            { label: "Total Items", value: String(totals.itemCount) },
            { label: "Total Payable", value: formatCurrency(totals.totalPayable, "NGN") },
            { label: "Total Paying", value: formatCurrency(totalPaying, "NGN") },
            { label: "Change Return", value: formatCurrency(changeReturn, "NGN") },
            { label: "Balance", value: formatCurrency(balance, "NGN") },
          ].map((row) => (
            <div key={row.label} className="cafe-pos-pay-summary-row">
              <span>{row.label}:</span>
              <span className="cafe-pos-pay-summary-value">{row.value}</span>
            </div>
          ))}
        </aside>
      </div>
    </PosModal>
  );
}
