"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import {
  closeRegister,
  openRegister,
  type CashRegisterView,
} from "@/lib/api/cashRegister";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { PosModal } from "./PosModal";

export function PosRegisterModal({
  open,
  tenantId,
  locationCode,
  register,
  onClose,
  onChanged,
}: {
  open: boolean;
  tenantId: string;
  locationCode: string;
  register: CashRegisterView | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [cardSlips, setCardSlips] = useState("");
  const [cheques, setCheques] = useState("");
  const [note, setNote] = useState("");

  const openMutation = useAppMutation({
    mutationFn: () => {
      const amount = Number(openingBalance);
      if (!Number.isFinite(amount) || amount < 0) throw new Error("Enter cash in hand");
      return openRegister(tenantId, {
        openingBalance: amount,
        locationCode: locationCode || undefined,
      });
    },
    successMessage: "Cash register opened",
    invalidateKeys: [["pos-register", tenantId]],
    onSuccess: () => {
      setOpeningBalance("");
      onChanged();
    },
  });

  const closeMutation = useAppMutation({
    mutationFn: () => {
      const amount = Number(closingAmount);
      if (!Number.isFinite(amount) || amount < 0) throw new Error("Enter counted cash");
      return closeRegister(tenantId, {
        closingAmount: amount,
        totalCardSlips: Number(cardSlips) || 0,
        totalCheques: Number(cheques) || 0,
        closingNote: note.trim() || undefined,
      });
    },
    successMessage: "Cash register closed",
    invalidateKeys: [["pos-register", tenantId]],
    onSuccess: () => {
      setClosingAmount("");
      setCardSlips("");
      setCheques("");
      setNote("");
      onChanged();
    },
  });

  if (!register) {
    return (
      <PosModal
        open={open}
        title="Open Cash Register"
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
              disabled={openMutation.isPending}
              onClick={() => openMutation.mutate()}
            >
              {openMutation.isPending ? "Opening…" : "Open Register"}
            </button>
          </>
        }
      >
        <label className="cafe-pos-field">
          <span className="cafe-pos-label">
            Cash in hand<span className="text-red-600"> *</span>
          </span>
          <input
            type="number"
            min={0}
            step="any"
            autoFocus
            className="cafe-pos-number"
            placeholder="0.00"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
          />
        </label>
        <p className="cafe-pos-muted mt-2 text-xs">
          {locationCode ? `Business location: ${locationCode}` : "No location set"}
        </p>
      </PosModal>
    );
  }

  const expected = register.openingBalance + register.summary.cash;
  const counted = Number(closingAmount);
  const difference = Number.isFinite(counted) ? counted - expected : 0;

  return (
    <PosModal
      open={open}
      title="Current Register"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="cafe-pos-btn cafe-pos-btn--dark" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="cafe-pos-btn cafe-pos-btn--danger"
            disabled={closeMutation.isPending}
            onClick={() => closeMutation.mutate()}
          >
            {closeMutation.isPending ? "Closing…" : "Close Register"}
          </button>
        </>
      }
    >
      <p className="cafe-pos-muted mb-3 text-xs">
        Opened {new Date(register.openedAt).toLocaleString()}
      </p>

      <div className="cafe-pos-pay-summary mb-4">
        <div className="cafe-pos-pay-summary-row">
          <span>Opening balance:</span>
          <span className="cafe-pos-pay-summary-value">
            {formatCurrency(register.openingBalance, "NGN")}
          </span>
        </div>
        <div className="cafe-pos-pay-summary-row">
          <span>Sales ({register.summary.salesCount}):</span>
          <span className="cafe-pos-pay-summary-value">
            {formatCurrency(register.summary.totalSales, "NGN")}
          </span>
        </div>
        <div className="cafe-pos-pay-summary-row">
          <span>Cash / Card / Other:</span>
          <span className="cafe-pos-pay-summary-value">
            {formatCurrency(register.summary.cash, "NGN")} /{" "}
            {formatCurrency(register.summary.card, "NGN")} /{" "}
            {formatCurrency(register.summary.other, "NGN")}
          </span>
        </div>
        <div className="cafe-pos-pay-summary-row">
          <span>Expected cash:</span>
          <span className="cafe-pos-pay-summary-value">{formatCurrency(expected, "NGN")}</span>
        </div>
      </div>

      <div className="cafe-pos-fields-2">
        <label className="cafe-pos-field">
          <span className="cafe-pos-label">
            Counted cash<span className="text-red-600"> *</span>
          </span>
          <input
            type="number"
            min={0}
            step="any"
            className="cafe-pos-number"
            value={closingAmount}
            onChange={(e) => setClosingAmount(e.target.value)}
          />
        </label>
        <label className="cafe-pos-field">
          <span className="cafe-pos-label">Difference</span>
          <input
            className="cafe-pos-number"
            readOnly
            value={Number.isFinite(counted) ? formatCurrency(difference, "NGN") : "—"}
          />
        </label>
        <label className="cafe-pos-field">
          <span className="cafe-pos-label">Total card slips</span>
          <input
            type="number"
            min={0}
            step="any"
            className="cafe-pos-number"
            value={cardSlips}
            onChange={(e) => setCardSlips(e.target.value)}
          />
        </label>
        <label className="cafe-pos-field">
          <span className="cafe-pos-label">Total cheques</span>
          <input
            type="number"
            min={0}
            step="any"
            className="cafe-pos-number"
            value={cheques}
            onChange={(e) => setCheques(e.target.value)}
          />
        </label>
      </div>

      <label className="cafe-pos-field mt-3">
        <span className="cafe-pos-label">Closing note</span>
        <textarea
          className="cafe-pos-textarea"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
    </PosModal>
  );
}
