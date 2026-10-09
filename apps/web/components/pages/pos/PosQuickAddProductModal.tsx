"use client";

import { useState } from "react";
import { createItem } from "@/lib/api/items";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { PosModal } from "./PosModal";

export function PosQuickAddProductModal({
  open,
  tenantId,
  locationCode,
  onClose,
  onCreated,
}: {
  open: boolean;
  tenantId: string;
  locationCode: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");

  const create = useAppMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error("Product name is required");
      if (!sku.trim()) throw new Error("SKU is required");
      const sell = Number(sellPrice);
      if (!Number.isFinite(sell) || sell < 0) throw new Error("Enter a valid selling price");
      return createItem(tenantId, {
        name: name.trim(),
        sku: sku.trim(),
        category: category.trim() || undefined,
        unit: unit.trim() || undefined,
        costPrice: Number.isFinite(Number(costPrice)) ? Number(costPrice) : 0,
        sellPrice: sell,
        locationCode: locationCode || undefined,
      });
    },
    successMessage: (item) => `Added ${item.name}`,
    invalidateKeys: [["pos-grid", tenantId], ["items"], ["catalog"]],
    onSuccess: () => {
      setName("");
      setSku("");
      setCategory("");
      setUnit("");
      setSellPrice("");
      setCostPrice("");
      onCreated();
    },
  });

  const field = (
    label: string,
    value: string,
    setValue: (v: string) => void,
    opts?: { placeholder?: string; type?: string; required?: boolean },
  ) => (
    <label className="cafe-pos-field">
      <span className="cafe-pos-label">
        {label}
        {opts?.required ? <span className="text-red-600"> *</span> : null}
      </span>
      <input
        className="cafe-pos-number"
        type={opts?.type ?? "text"}
        placeholder={opts?.placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </label>
  );

  return (
    <PosModal
      open={open}
      title="Add new product"
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
            {create.isPending ? "Saving…" : "Save Product"}
          </button>
        </>
      }
    >
      <div className="cafe-pos-fields-2">
        {field("Product Name", name, setName, { required: true })}
        {field("SKU", sku, setSku, { required: true })}
        {field("Category", category, setCategory, { placeholder: "e.g. Soft drinks" })}
        {field("Unit", unit, setUnit, { placeholder: "e.g. Single" })}
        {field("Selling Price", sellPrice, setSellPrice, { type: "number", required: true })}
        {field("Cost Price", costPrice, setCostPrice, { type: "number" })}
      </div>
      <p className="cafe-pos-muted mt-3 text-xs">
        Price shown on the till: {formatCurrency(Number(sellPrice) || 0, "NGN")}
      </p>
    </PosModal>
  );
}
