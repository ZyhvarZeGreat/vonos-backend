"use client";

import { useState } from "react";
import type { SaleDetail, SaleReturnDisposition } from "@vonos/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { createSaleReturn, getSale, getSales } from "@/lib/api/sales";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { PosModal } from "./PosModal";

const DISPOSITIONS: { value: SaleReturnDisposition; label: string }[] = [
  { value: "restocked", label: "Restock (back to stock)" },
  { value: "refunded", label: "Refund" },
  { value: "written_off", label: "Write off" },
];

export function PosReturnModal({
  open,
  tenantId,
  onClose,
  onDone,
}: {
  open: boolean;
  tenantId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reference, setReference] = useState("");
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [disposition, setDisposition] = useState<SaleReturnDisposition>("restocked");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const findMutation = useAppMutation({
    mutationFn: async () => {
      const ref = reference.trim();
      if (!ref) throw new Error("Enter an invoice no.");
      const matches = await getSales(tenantId, { search: ref, limit: 10 });
      const exact =
        matches.find((s) => s.reference.toLowerCase() === ref.toLowerCase()) ??
        matches[0];
      if (!exact) throw new Error(`No sale found for "${ref}"`);
      const detail = await getSale(exact.id, tenantId);
      if (detail.lines.length === 0) throw new Error("That sale has no lines");
      return detail;
    },
    onSuccess: (detail) => {
      setSale(detail);
      setError(null);
      setQtys(Object.fromEntries(detail.lines.map((line) => [line.id, line.quantity])));
    },
    onError: (err: Error) => {
      setSale(null);
      setError(err.message);
    },
  });

  const returnTotal = sale
    ? sale.lines.reduce(
        (sum, line) => sum + (qtys[line.id] ?? 0) * line.unitPrice,
        0,
      )
    : 0;

  const submitReturn = useAppMutation({
    mutationFn: () => {
      if (!sale) throw new Error("Find a sale first");
      const lines = sale.lines
        .map((line) => ({ saleLineId: line.id, quantity: qtys[line.id] ?? 0 }))
        .filter((line) => line.quantity > 0);
      if (lines.length === 0) throw new Error("Set a return quantity");
      return createSaleReturn(tenantId, sale.id, {
        disposition,
        notes: notes.trim() || undefined,
        lines,
      });
    },
    successMessage: (ret) => `Return ${ret.reference} recorded`,
    invalidateKeys: [["pos-recent-sales", tenantId], ["sales"], ["items"], ["catalog"]],
    onSuccess: () => {
      setReference("");
      setSale(null);
      setQtys({});
      setNotes("");
      onDone();
    },
  });

  return (
    <PosModal
      open={open}
      title="Sell Return"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="cafe-pos-btn cafe-pos-btn--dark" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="cafe-pos-btn cafe-pos-btn--primary"
            disabled={!sale || submitReturn.isPending}
            onClick={() => submitReturn.mutate()}
          >
            {submitReturn.isPending ? "Returning…" : "Process Return"}
          </button>
        </>
      }
    >
      <div className="cafe-pos-fields-2">
        <label className="cafe-pos-field">
          <span className="cafe-pos-label">Invoice No.</span>
          <input
            className="cafe-pos-number"
            placeholder="e.g. 2026/4842"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") findMutation.mutate();
            }}
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            className="cafe-pos-btn cafe-pos-btn--dark"
            disabled={findMutation.isPending}
            onClick={() => findMutation.mutate()}
          >
            {findMutation.isPending ? "Searching…" : "Find Sale"}
          </button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-[var(--color-error-text)]">{error}</p> : null}

      {sale ? (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-foreground">
            {sale.reference} · {sale.customerName || "Walk-in"} ·{" "}
            {formatCurrency(sale.total, sale.currency || "NGN")}
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2 pr-2 font-medium">Item</th>
                <th className="px-2 py-2 font-medium">Sold</th>
                <th className="px-2 py-2 font-medium">Unit</th>
                <th className="px-2 py-2 font-medium">Return qty</th>
              </tr>
            </thead>
            <tbody>
              {sale.lines.map((line) => (
                <tr key={line.id} className="border-b border-[var(--color-border-subtle)]">
                  <td className="py-2 pr-2 text-foreground">{line.name}</td>
                  <td className="px-2 py-2 tabular-nums text-muted">{line.quantity}</td>
                  <td className="px-2 py-2 tabular-nums text-muted">
                    {formatCurrency(line.unitPrice, sale.currency || "NGN")}
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      max={line.quantity}
                      step="any"
                      className="cafe-pos-number w-24"
                      value={qtys[line.id] ?? 0}
                      onChange={(e) =>
                        setQtys((prev) => ({
                          ...prev,
                          [line.id]: Math.min(line.quantity, Math.max(0, Number(e.target.value))),
                        }))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="cafe-pos-fields-2 mt-4">
            <label className="cafe-pos-field">
              <span className="cafe-pos-label">Disposition</span>
              <select
                className="cafe-pos-select"
                value={disposition}
                onChange={(e) => setDisposition(e.target.value as SaleReturnDisposition)}
              >
                {DISPOSITIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="cafe-pos-field">
              <span className="cafe-pos-label">Return value</span>
              <input
                className="cafe-pos-number"
                value={formatCurrency(returnTotal, sale.currency || "NGN")}
                readOnly
              />
            </label>
          </div>

          <label className="cafe-pos-field mt-3">
            <span className="cafe-pos-label">Notes</span>
            <textarea
              className="cafe-pos-textarea"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>
      ) : null}
    </PosModal>
  );
}
