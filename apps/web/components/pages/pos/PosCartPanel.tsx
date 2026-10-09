"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Select } from "@/components/atoms/Select";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import {
  computePosTotals,
  type PosTotals,
} from "@/lib/pos/posTotals";
import { usePosCartStore } from "@/stores/posCartStore";

export interface PosCustomerOption {
  id: string;
  name: string;
}

function TotalsRow({
  label,
  value,
  onEdit,
  editTitle,
}: {
  label: string;
  value: number;
  onEdit?: () => void;
  editTitle?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="font-medium text-foreground">
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 hover:text-[var(--color-brand-primary)]"
            title={editTitle}
          >
            {label}
            <span aria-hidden>✎</span>
          </button>
        ) : (
          <>
            {label}
            <span aria-hidden title={editTitle} className="ml-1 cursor-not-allowed text-xs text-muted">
              ✎
            </span>
          </>
        )}
      </span>
      <span className="font-medium tabular-nums text-foreground">
        {formatCurrency(value, "NGN")}
      </span>
    </div>
  );
}

export function PosCartPanel({
  search,
  onSearchChange,
  customers,
  totals,
  onEditDiscount,
  onEditTax,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  customers: PosCustomerOption[];
  totals: PosTotals;
  onEditDiscount: () => void;
  onEditTax: () => void;
}) {
  const lines = usePosCartStore((s) => s.lines);
  const customerId = usePosCartStore((s) => s.customerId);
  const setCustomer = usePosCartStore((s) => s.setCustomer);
  const setQuantity = usePosCartStore((s) => s.setQuantity);
  const removeLine = usePosCartStore((s) => s.removeLine);

  return (
    <div className="cafe-pos-panel flex min-h-0 flex-col gap-3 rounded-lg border border-border bg-card">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Select
            aria-label="Customer"
            value={customerId ?? ""}
            onChange={(e) => setCustomer(e.target.value || null)}
            options={[
              { value: "", label: "Walk-In Customer" },
              ...customers.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
        <button
          type="button"
          disabled
          title="Add customer — available in Phase 2"
          aria-label="Add customer"
          className="cafe-pos-icon-btn h-10 w-10 shrink-0 text-lg leading-none"
        >
          +
        </button>
      </div>

      <div className="cafe-pos-search">
        <span aria-hidden className="cafe-pos-search-icon">
          🔍
        </span>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Enter Product name / SKU / Scan bar code"
          aria-label="Search products"
          className="cafe-pos-input"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2 pr-2 font-medium">Product</th>
              <th className="px-2 py-2 font-medium">Quantity</th>
              <th className="px-2 py-2 font-medium">Subtotal</th>
              <th className="w-8 py-2" aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-muted">
                  Click a product to add it to the ticket
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr
                  key={line.key}
                  className="border-b border-[var(--color-border-subtle)] align-top"
                >
                  <td className="py-2 pr-2">
                    <p className="font-medium text-foreground">{line.name}</p>
                    <p className="text-xs text-muted">
                      {line.sku}
                      {line.unit ? ` · ${line.unit}` : ""}
                    </p>
                    {line.stockQty <= 0 ? (
                      <p className="text-xs font-medium text-amber-600" title="Out of stock">
                        ⚠ Out of stock
                      </p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${line.name}`}
                        onClick={() => setQuantity(line.key, line.quantity - 1)}
                        className="cafe-pos-icon-btn h-6 w-6"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        aria-label={`Quantity of ${line.name}`}
                        value={line.quantity}
                        onChange={(e) => setQuantity(line.key, Number(e.target.value))}
                        className="w-14 rounded border border-border px-1 py-0.5 text-center tabular-nums"
                      />
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${line.name}`}
                        onClick={() => setQuantity(line.key, line.quantity + 1)}
                        className="cafe-pos-icon-btn h-6 w-6"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-2 font-medium tabular-nums text-foreground">
                    {formatCurrency(line.quantity * line.unitPrice, "NGN")}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      aria-label={`Remove ${line.name}`}
                      onClick={() => removeLine(line.key)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-1.5 border-t border-border pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Items: {totals.itemCount}</span>
          <span className="font-medium text-foreground">
            Total:{" "}
            <span className="tabular-nums">{formatCurrency(totals.subtotal, "NGN")}</span>
          </span>
        </div>
        <TotalsRow
          label="Discount(−):"
          value={totals.discount}
          onEdit={onEditDiscount}
          editTitle="Edit discount"
        />
        <TotalsRow
          label="Order Tax(+):"
          value={totals.tax}
          onEdit={onEditTax}
          editTitle="Edit order tax"
        />
        <TotalsRow
          label="Shipping(+):"
          value={totals.shipping}
          editTitle="Shipping charges are not persisted yet (Phase 3b)"
        />
      </div>
    </div>
  );
}

export function usePosTotals(): PosTotals {
  const lines = usePosCartStore((s) => s.lines);
  const discount = usePosCartStore((s) => s.discount);
  const orderTax = usePosCartStore((s) => s.orderTax);
  const shipping = usePosCartStore((s) => s.shipping);
  return computePosTotals({ lines, discount, orderTax, shipping });
}
