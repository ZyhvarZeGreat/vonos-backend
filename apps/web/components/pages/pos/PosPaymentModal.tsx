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
  cardNumber?: string;
  cardHolder?: string;
  cardExpiry?: string;
  cardCvv?: string;
}

/** Card details captured at the till are folded into the payment note. */
function withCardNote(row: PosPaymentRow): PosPaymentRow {
  if (row.method !== "card") return row;
  const last4 = (row.cardNumber ?? "").replace(/\D/g, "").slice(-4);
  const parts = [
    last4 ? `Card ****${last4}` : null,
    row.cardHolder?.trim() ? `Holder: ${row.cardHolder.trim()}` : null,
    row.cardExpiry?.trim() ? `Exp: ${row.cardExpiry.trim()}` : null,
    row.cardCvv ? "CVV: ***" : null,
  ].filter(Boolean);
  const note = [row.note?.trim(), parts.join(", ")].filter(Boolean).join(" · ");
  return { ...row, note };
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
  // Raw text per row so the amount field can be cleared / partially typed
  // without snapping back to "0" (Number("") === 0 on every keystroke).
  const [amountText, setAmountText] = useState<Record<number, string>>({});

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
          <button type="button" className="tw-dw-btn" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="tw-dw-btn tw-dw-btn-primary tw-text-white"
            disabled={!canConfirm || busy}
            onClick={() => onConfirm(rows.map(withCardNote), saleNote)}
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
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    className="form-control"
                    value={amountText[index] ?? String(row.amount)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAmountText((prev) => ({ ...prev, [index]: v }));
                      patchRow(index, { amount: Number(v) || 0 });
                    }}
                  />
                </label>
                <label className="cafe-pos-field">
                  <span className="cafe-pos-label">Payment Method*</span>
                  <select
                    className="form-control"
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
                  className="form-control"
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

              {row.method === "card" ? (
                <div className="cafe-pos-fields-2">
                  <label className="cafe-pos-field">
                    <span className="cafe-pos-label">Card number</span>
                    <input
                      className="form-control"
                      inputMode="numeric"
                      placeholder="•••• •••• •••• ••••"
                      value={row.cardNumber ?? ""}
                      onChange={(e) => patchRow(index, { cardNumber: e.target.value })}
                    />
                  </label>
                  <label className="cafe-pos-field">
                    <span className="cafe-pos-label">Card holder</span>
                    <input
                      className="form-control"
                      value={row.cardHolder ?? ""}
                      onChange={(e) => patchRow(index, { cardHolder: e.target.value })}
                    />
                  </label>
                  <label className="cafe-pos-field">
                    <span className="cafe-pos-label">Expiry</span>
                    <input
                      className="form-control"
                      placeholder="MM/YY"
                      value={row.cardExpiry ?? ""}
                      onChange={(e) => patchRow(index, { cardExpiry: e.target.value })}
                    />
                  </label>
                  <label className="cafe-pos-field">
                    <span className="cafe-pos-label">CVV</span>
                    <input
                      className="form-control"
                      inputMode="numeric"
                      value={row.cardCvv ?? ""}
                      onChange={(e) => patchRow(index, { cardCvv: e.target.value })}
                    />
                  </label>
                </div>
              ) : null}

              <div className="cafe-pos-fields-2">
                <label className="cafe-pos-field">
                  <span className="cafe-pos-label">Payment note</span>
                  <input
                    className="form-control"
                    value={row.note}
                    onChange={(e) => patchRow(index, { note: e.target.value })}
                  />
                </label>
                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    aria-label={`Remove payment row ${index + 1}`}
                    className="tw-dw-btn h-9 w-9 text-red-600"
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
            className="tw-dw-btn tw-dw-btn-info tw-text-white tw-rounded-full mt-3 w-full"
            onClick={() => setRows((prev) => [...prev, newPaymentRow(balance, prev[0]?.accountId ?? "")])}
          >
            <Plus className="h-4 w-4" /> Add Payment Row
          </button>

          <div className="cafe-pos-fields-2 mt-4">
            <label className="cafe-pos-field">
              <span className="cafe-pos-label">Sell note</span>
              <textarea
                className="form-control"
                rows={3}
                value={saleNote}
                onChange={(e) => setSaleNote(e.target.value)}
              />
            </label>
            <label className="cafe-pos-field">
              <span className="cafe-pos-label">Staff note</span>
              <textarea className="form-control" rows={3} disabled />
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
