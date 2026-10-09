"use client";

import { useState } from "react";
import type { PosPercentOrFixed } from "@/lib/pos/posTotals";
import { PosModal } from "./PosModal";

export function PosAdjustmentModal({
  open,
  title,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  initial: PosPercentOrFixed;
  onClose: () => void;
  onSave: (value: PosPercentOrFixed) => void;
}) {
  const [kind, setKind] = useState<PosPercentOrFixed["kind"]>(initial.kind);
  const [amount, setAmount] = useState<string>(String(initial.amount || ""));

  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed >= 0;

  return (
    <PosModal
      open={open}
      title={title}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="cafe-pos-btn cafe-pos-btn--dark" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="cafe-pos-btn cafe-pos-btn--primary"
            disabled={!valid}
            onClick={() => onSave({ kind, amount: valid ? parsed : 0 })}
          >
            Update
          </button>
        </>
      }
    >
      <div className="cafe-pos-fields-2">
        <label className="cafe-pos-field">
          <span className="cafe-pos-label">Type</span>
          <select
            className="cafe-pos-select"
            value={kind}
            onChange={(e) => setKind(e.target.value as PosPercentOrFixed["kind"])}
          >
            <option value="fixed">Fixed</option>
            <option value="percent">Percentage</option>
          </select>
        </label>
        <label className="cafe-pos-field">
          <span className="cafe-pos-label">
            {kind === "percent" ? "Percentage (%)" : "Amount"}
          </span>
          <input
            type="number"
            min={0}
            step="any"
            autoFocus
            className="cafe-pos-number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
      </div>
    </PosModal>
  );
}
