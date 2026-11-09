"use client";

import { useState } from "react";
import { createCustomer } from "@/lib/api/customers";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { PosModal } from "./PosModal";

export function PosCustomerModal({
  open,
  tenantId,
  onClose,
  onCreated,
}: {
  open: boolean;
  tenantId: string;
  onClose: () => void;
  onCreated: (customer: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const create = useAppMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error("Customer name is required");
      return createCustomer(tenantId, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
    },
    successMessage: (customer) => `Added ${customer.name}`,
    invalidateKeys: [["pos-customers", tenantId], ["customers"]],
    onSuccess: (customer) => {
      onCreated({ id: customer.id, name: customer.name });
      setName("");
      setPhone("");
      setEmail("");
    },
  });

  return (
    <PosModal
      open={open}
      title="Add a new contact"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="tw-dw-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="tw-dw-btn tw-dw-btn-primary tw-text-white"
            disabled={create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Saving…" : "Save Customer"}
          </button>
        </>
      }
    >
      <div className="cafe-pos-fields-2">
        <label className="cafe-pos-field">
          <span className="cafe-pos-label">
            Name<span className="text-red-600"> *</span>
          </span>
          <input
            className="form-control"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="cafe-pos-field">
          <span className="cafe-pos-label">Phone</span>
          <input
            className="form-control"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
      </div>
      <label className="cafe-pos-field mt-3">
        <span className="cafe-pos-label">Email</span>
        <input
          className="form-control"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
    </PosModal>
  );
}
