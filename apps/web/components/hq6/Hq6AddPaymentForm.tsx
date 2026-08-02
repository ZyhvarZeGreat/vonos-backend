"use client";

import { Hq6DateTimeInput } from "@/components/hq6/Hq6DateTimeInput";
import { Hq6Field } from "@/components/hq6/Hq6Modal";
import { PaymentAccountSelect } from "@/components/hq6/PaymentAccountSelect";
import { HQ6_PAYMENT_METHOD_OPTIONS } from "@/lib/utils/hq6PaymentMethods";
import type { ReactNode } from "react";

export type Hq6AddPaymentWells = {
  /** Left well — customer or supplier */
  partyLabel: string;
  partyName: string;
  partyExtra?: string | null;
  /** Middle well — invoice / ref + location */
  docLabel: string;
  docRef: string;
  locationName?: string | null;
  /** Right well — totals */
  totalAmount: string;
  paymentDue: string;
  paymentNotePreview?: string | null;
  advanceBalance?: string | null;
};

export type Hq6AddPaymentFormFieldsProps = {
  method: string;
  onMethodChange: (value: string) => void;
  paidOn: string;
  onPaidOnChange: (value: string) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  accountId: string;
  onAccountChange: (value: string) => void;
  /** @deprecated Prefer searchable PaymentAccountSelect — ignored when present. */
  accounts?: Array<{ id: string; name: string }>;
  note: string;
  onNoteChange: (value: string) => void;
  accountRequired?: boolean;
};

/** UPOS-style wells + payment row used by Add Payment modals. */
export function Hq6AddPaymentWellsRow({ wells }: { wells: Hq6AddPaymentWells }) {
  return (
    <div className="hq6-add-payment-wells">
      <div className="hq6-add-payment-well">
        <div>
          <strong>{wells.partyLabel}:</strong> {wells.partyName || "—"}
        </div>
        {wells.partyExtra ? (
          <div>
            <strong>Business:</strong> {wells.partyExtra}
          </div>
        ) : null}
      </div>
      <div className="hq6-add-payment-well">
        <div>
          <strong>{wells.docLabel}:</strong> {wells.docRef || "—"}
        </div>
        {wells.locationName ? (
          <div>
            <strong>Location:</strong> {wells.locationName}
          </div>
        ) : null}
      </div>
      <div className="hq6-add-payment-well">
        <div>
          <strong>Total amount:</strong> {wells.totalAmount}
        </div>
        <div>
          <strong>Payment due:</strong> {wells.paymentDue}
        </div>
        <div>
          <strong>Payment note:</strong>{" "}
          {wells.paymentNotePreview?.trim() ? wells.paymentNotePreview : "—"}
        </div>
      </div>
    </div>
  );
}

export function Hq6AddPaymentFormFields({
  method,
  onMethodChange,
  paidOn,
  onPaidOnChange,
  amount,
  onAmountChange,
  accountId,
  onAccountChange,
  accounts: _accounts,
  note,
  onNoteChange,
  accountRequired = true,
}: Hq6AddPaymentFormFieldsProps) {
  void _accounts;
  return (
    <div className="hq6-add-payment-fields">
      <div className="hq6-add-payment-field">
        <label className="hq6-add-payment-label">
          Payment Method: <span className="req">*</span>
        </label>
        <div className="input-group hq6-add-payment-input-group">
          <span className="input-group-addon" aria-hidden>
            <i className="fas fa-money-bill-alt" />
          </span>
          <select
            className="form-control hq6-modal-input"
            value={method}
            onChange={(e) => onMethodChange(e.target.value)}
            required
          >
            {HQ6_PAYMENT_METHOD_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="hq6-add-payment-field">
        <label className="hq6-add-payment-label">
          Paid on: <span className="req">*</span>
        </label>
        <div className="input-group hq6-add-payment-input-group">
          <span className="input-group-addon" aria-hidden>
            <i className="fa fa-calendar" />
          </span>
          <Hq6DateTimeInput
            className="form-control hq6-modal-input"
            value={paidOn}
            onChange={onPaidOnChange}
          />
        </div>
      </div>

      <div className="hq6-add-payment-field">
        <label className="hq6-add-payment-label">
          Amount: <span className="req">*</span>
        </label>
        <div className="input-group hq6-add-payment-input-group">
          <span className="input-group-addon" aria-hidden>
            <i className="fas fa-money-bill-alt" />
          </span>
          <input
            className="form-control hq6-modal-input"
            type="text"
            inputMode="decimal"
            placeholder="Amount"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="hq6-add-payment-field hq6-add-payment-field-account">
        <label className="hq6-add-payment-label">
          Payment Account:
          {accountRequired ? (
            <>
              {" "}
              <span className="req">*</span>
            </>
          ) : null}
        </label>
        <div className="input-group hq6-add-payment-input-group">
          <span className="input-group-addon" aria-hidden>
            <i className="fas fa-money-bill-alt" />
          </span>
          <PaymentAccountSelect
            value={accountId}
            onChange={onAccountChange}
            emptyLabel="Please Select"
          />
        </div>
      </div>

      <div className="hq6-add-payment-field hq6-add-payment-field-note">
        <Hq6Field label="Payment Note">
          <textarea
            className="form-control hq6-modal-input min-h-[88px]"
            rows={3}
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
          />
        </Hq6Field>
      </div>
    </div>
  );
}

export function Hq6AddPaymentAdvanceLine({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="hq6-add-payment-advance">{children}</div>;
}
