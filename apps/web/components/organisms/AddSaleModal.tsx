"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import type { Item } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Modal, ModalFooter, ModalHeader } from "@/components/atoms/Modal";
import { Select } from "@/components/atoms/Select";
import { ProductItemSearch } from "@/components/molecules/ProductItemSearch";
import { createSale } from "@/lib/api/sales";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import {
  assertBusinessLocationSelected,
  useBusinessLocationOptions,
} from "@/lib/hooks/useBusinessLocationOptions";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { getTenantConfigById } from "@/lib/registries/tenantConfigs";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { useUiStore } from "@/stores/uiStore";

interface SaleLineDraft {
  key: string;
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

function lineSubtotal(line: SaleLineDraft): number {
  return Math.max(0, line.quantity * line.unitPrice - line.discount);
}

function emptySaleForm() {
  return {
    reference: "",
    customerName: "",
    locationCode: "",
    saleDate: new Date().toISOString().slice(0, 16),
    status: "final",
    invoiceNo: "",
    discountType: "fixed",
    discountAmount: "0",
    orderTax: "0",
    sellNote: "",
    paymentAmount: "",
    paymentMethod: "cash",
    paymentNote: "",
  };
}

export function AddSaleModal() {
  const activeModal = useUiStore((state) => state.activeModal);
  const closeModal = useUiStore((state) => state.closeModal);
  const financeActionTenantId = useUiStore((state) => state.financeActionTenantId);
  const routeTenantId = useTenantId();
  const tenantId = financeActionTenantId ?? routeTenantId;
  const { config: routeConfig } = useRouteTenant();
  const tenantConfig =
    financeActionTenantId && financeActionTenantId !== routeTenantId
      ? getTenantConfigById(financeActionTenantId)
      : routeConfig;
  const { options: businessLocationOptions, required: locationRequired } =
    useBusinessLocationOptions(tenantConfig);
  const queryClient = useQueryClient();
  const open = activeModal === "addSale";

  const [form, setForm] = useState(emptySaleForm);
  const [lines, setLines] = useState<SaleLineDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  const showLocationField = (tenantConfig?.businessLocations?.length ?? 0) > 0;

  const lineTotal = useMemo(
    () => lines.reduce((sum, line) => sum + lineSubtotal(line), 0),
    [lines],
  );

  const orderDiscount = useMemo(() => {
    const raw = Number(form.discountAmount) || 0;
    if (form.discountType === "percentage") {
      return Math.min(lineTotal, (lineTotal * raw) / 100);
    }
    return Math.min(lineTotal, raw);
  }, [form.discountAmount, form.discountType, lineTotal]);

  const orderTax = Number(form.orderTax) || 0;
  const totalPayable = Math.max(0, lineTotal - orderDiscount + orderTax);

  const addLineFromItem = (item: Item) => {
    setLines((prev) => {
      const existing = prev.find((row) => row.itemId === item.id);
      if (existing) {
        return prev.map((row) =>
          row.itemId === item.id ? { ...row, quantity: row.quantity + 1 } : row,
        );
      }
      return [
        ...prev,
        {
          key: item.id,
          itemId: item.id,
          sku: item.sku,
          name: item.name,
          quantity: 1,
          unitPrice: item.costPrice,
          discount: 0,
        },
      ];
    });
  };

  const updateLine = (key: string, patch: Partial<SaleLineDraft>) => {
    setLines((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((row) => row.key !== key));
  };

  const reset = () => {
    setForm(emptySaleForm());
    setLines([]);
    setError(null);
  };

  const handleClose = () => {
    reset();
    closeModal();
  };

  const mutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant selected");
      assertBusinessLocationSelected(locationRequired, form.locationCode);
      if (lines.length === 0) throw new Error("Add at least one product");
      const reference =
        form.reference.trim() ||
        form.invoiceNo.trim() ||
        `SALE-${Date.now().toString(36).toUpperCase()}`;
      return createSale(tenantId, {
        reference,
        customerName: form.customerName.trim() || undefined,
        locationCode: form.locationCode.trim() || undefined,
        date: form.saleDate ? new Date(form.saleDate).toISOString() : undefined,
        lines: lines.map((line) => ({
          itemId: line.itemId,
          sku: line.sku,
          name: line.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
        payments: [
          {
            amount: Number(form.paymentAmount) || totalPayable,
            method: form.paymentMethod,
            note: form.paymentNote.trim() || undefined,
          },
        ],
      });
    },
    successMessage: "Sale recorded",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
      await queryClient.invalidateQueries({ queryKey: ["ledgerTablePage"] });
      await queryClient.invalidateQueries({ queryKey: ["ledgerSummary"] });
      await queryClient.invalidateQueries({ queryKey: ["adminFinanceSummary"] });
      await queryClient.invalidateQueries({ queryKey: ["ledgerChartEntries"] });
      handleClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!open) return null;

  return (
    <Modal open={open} onClose={handleClose} panelClassName="max-w-5xl max-h-[92vh] flex flex-col">
      <ModalHeader title="Add Sale" subtitle="Record a sale with line items" onClose={handleClose} />
      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-2">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {showLocationField ? (
            <Select
              label="Business location"
              value={form.locationCode}
              onChange={(e) => setForm((prev) => ({ ...prev, locationCode: e.target.value }))}
              options={businessLocationOptions}
            />
          ) : null}
          <Input
            label="Customer"
            value={form.customerName}
            onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
            placeholder="Walk-in customer"
          />
          <Input
            label="Sale date"
            type="datetime-local"
            value={form.saleDate}
            onChange={(e) => setForm((prev) => ({ ...prev, saleDate: e.target.value }))}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            options={[
              { value: "final", label: "Final" },
              { value: "draft", label: "Draft" },
              { value: "quotation", label: "Quotation" },
            ]}
          />
          <Input
            label="Invoice no."
            value={form.invoiceNo}
            onChange={(e) => setForm((prev) => ({ ...prev, invoiceNo: e.target.value }))}
            placeholder="Auto-generated if blank"
          />
          <Input
            label="Reference"
            value={form.reference}
            onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))}
            placeholder="Optional internal ref"
          />
        </div>

        <div className="rounded-lg border border-border">
          <div className="border-b border-border bg-[var(--color-surface-muted)] px-3 py-2">
            <ProductItemSearch
              tenantId={tenantId}
              retailOnly
              onSelect={addLineFromItem}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Unit price</th>
                  <th className="px-3 py-2 font-medium">Discount</th>
                  <th className="px-3 py-2 font-medium text-right">Subtotal</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted">
                      Search and add products above
                    </td>
                  </tr>
                ) : (
                  lines.map((line, index) => (
                    <tr key={line.key} className="border-b border-[var(--color-border-subtle)]">
                      <td className="px-3 py-2 text-muted">{index + 1}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-foreground">{line.name}</div>
                        <div className="text-xs text-muted">{line.sku}</div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.key, { quantity: Math.max(1, Number(e.target.value) || 1) })
                          }
                          className="w-16 rounded border border-border px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) =>
                            updateLine(line.key, {
                              unitPrice: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-24 rounded border border-border px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.discount}
                          onChange={(e) =>
                            updateLine(line.key, {
                              discount: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-20 rounded border border-border px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(lineSubtotal(line))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="text-muted hover:text-error"
                          aria-label="Remove line"
                          onClick={() => removeLine(line.key)}
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
          <div className="flex justify-end gap-6 border-t border-border px-4 py-2 text-sm">
            <span className="text-muted">
              Items: <strong className="text-foreground">{lines.length}</strong>
            </span>
            <span className="text-muted">
              Total: <strong className="text-foreground">{formatCurrency(lineTotal)}</strong>
            </span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm font-medium text-foreground">Discount & tax</p>
            <div className="grid grid-cols-2 gap-2">
              <Select
                label="Discount type"
                value={form.discountType}
                onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value }))}
                options={[
                  { value: "fixed", label: "Fixed" },
                  { value: "percentage", label: "Percentage" },
                ]}
              />
              <Input
                label="Discount amount"
                type="number"
                min="0"
                value={form.discountAmount}
                onChange={(e) => setForm((prev) => ({ ...prev, discountAmount: e.target.value }))}
              />
            </div>
            <Input
              label="Order tax"
              type="number"
              min="0"
              value={form.orderTax}
              onChange={(e) => setForm((prev) => ({ ...prev, orderTax: e.target.value }))}
            />
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Sell note</span>
              <textarea
                value={form.sellNote}
                onChange={(e) => setForm((prev) => ({ ...prev, sellNote: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm font-medium text-foreground">Payment</p>
            <Input
              label="Amount"
              type="number"
              min="0"
              value={form.paymentAmount || String(totalPayable)}
              onChange={(e) => setForm((prev) => ({ ...prev, paymentAmount: e.target.value }))}
            />
            <Select
              label="Payment method"
              value={form.paymentMethod}
              onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
              options={[
                { value: "cash", label: "Cash" },
                { value: "card", label: "Card" },
                { value: "transfer", label: "Bank transfer" },
              ]}
            />
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Payment note</span>
              <textarea
                value={form.paymentNote}
                onChange={(e) => setForm((prev) => ({ ...prev, paymentNote: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <div className="rounded-md bg-[var(--color-surface-muted)] px-3 py-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Total payable</span>
                <span className="font-semibold text-foreground">{formatCurrency(totalPayable)}</span>
              </div>
            </div>
          </div>
        </div>

        {error ? <p className="text-sm text-error">{error}</p> : null}
      </div>
      <ModalFooter>
        <Button variant="secondary" size="sm" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={mutation.isPending || lines.length === 0}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={mutation.isPending || lines.length === 0}
          onClick={() => mutation.mutate()}
        >
          Save & print
        </Button>
      </ModalFooter>
    </Modal>
  );
}
