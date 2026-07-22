"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Plus, Trash2 } from "lucide-react";
import type { MovementStatus } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { MenuSelect } from "@/components/molecules/MenuSelect";
import { ProductItemSearch, type CatalogPartPick } from "@/components/molecules/ProductItemSearch";
import { Hq6FormShell } from "@/components/hq6/Hq6Chrome";
import {
  createStockMovement,
  deleteStockMovement,
  getStockMovement,
} from "@/lib/api/stockMovements";
import { getSuppliers } from "@/lib/api/suppliers";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { hq6CopyForSlug } from "@/lib/registries/hq6PageCopy";
import { cn } from "@/lib/utils/cn";
import { formatHq6Currency } from "@/lib/utils/hq6Format";

interface PurchaseLine {
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  unitCost: number;
  discountPercent: number;
  unitSellingPrice: number;
}

type PurchaseStatusOption = "Received" | "Pending" | "Ordered";

interface PurchaseFormState {
  reference: string;
  supplierId: string;
  locationCode: string;
  date: string;
  status: PurchaseStatusOption;
  payTermValue: string;
  payTermUnit: "days" | "months";
  purchaseOrder: string;
  discountType: "none" | "fixed" | "percentage";
  discountAmount: string;
  purchaseTax: string;
  additionalNotes: string;
  shippingDetails: string;
  shippingCharges: string;
  extraExpenses: Array<{ name: string; amount: string }>;
  paymentAmount: string;
  paidOn: string;
  paymentMethod: string;
  paymentAccount: string;
  paymentNote: string;
}

function emptyForm(): PurchaseFormState {
  return {
    reference: "",
    supplierId: "",
    locationCode: "",
    date: new Date().toISOString().slice(0, 16),
    status: "Received",
    payTermValue: "",
    payTermUnit: "days",
    purchaseOrder: "",
    discountType: "none",
    discountAmount: "0",
    purchaseTax: "0",
    additionalNotes: "",
    shippingDetails: "",
    shippingCharges: "0",
    extraExpenses: [],
    paymentAmount: "0",
    paidOn: new Date().toISOString().slice(0, 16),
    paymentMethod: "cash",
    paymentAccount: "",
    paymentNote: "",
  };
}

function lineUnitCostBeforeTax(line: PurchaseLine): number {
  const disc = Math.min(100, Math.max(0, line.discountPercent || 0));
  return Math.max(0, line.unitCost * (1 - disc / 100));
}

function lineTotal(line: PurchaseLine): number {
  return line.quantity * lineUnitCostBeforeTax(line);
}

function lineProfitMargin(line: PurchaseLine): number {
  const cost = lineUnitCostBeforeTax(line);
  const sell = line.unitSellingPrice;
  if (sell <= 0) return 0;
  return ((sell - cost) / sell) * 100;
}

function buildNotes(form: PurchaseFormState): string | undefined {
  const parts: string[] = [];
  if (form.additionalNotes.trim()) parts.push(form.additionalNotes.trim());
  if (form.payTermValue.trim()) {
    parts.push(`Pay term: ${form.payTermValue.trim()} ${form.payTermUnit}`);
  }
  if (form.purchaseOrder.trim()) {
    parts.push(`Purchase order: ${form.purchaseOrder.trim()}`);
  }
  if (form.discountType !== "none" && Number(form.discountAmount) > 0) {
    parts.push(
      `Discount: ${form.discountAmount} (${form.discountType === "percentage" ? "%" : "fixed"})`,
    );
  }
  if (Number(form.purchaseTax) > 0) {
    parts.push(`Purchase tax: ${form.purchaseTax}`);
  }
  if (form.shippingDetails.trim()) {
    parts.push(`Shipping details: ${form.shippingDetails.trim()}`);
  }
  const shipping = Number(form.shippingCharges) || 0;
  if (shipping > 0) {
    parts.push(`Shipping charges: ${shipping.toFixed(2)}`);
  }
  for (const exp of form.extraExpenses) {
    const amt = Number(exp.amount) || 0;
    if (exp.name.trim() || amt > 0) {
      parts.push(`Extra expense: ${exp.name.trim() || "—"} = ${amt.toFixed(2)}`);
    }
  }
  const payAmt = Number(form.paymentAmount) || 0;
  if (payAmt > 0) {
    parts.push(
      `Payment: ${payAmt.toFixed(2)} via ${form.paymentMethod} on ${form.paidOn || "—"}`,
    );
  }
  if (form.paymentAccount.trim()) {
    parts.push(`Payment account: ${form.paymentAccount.trim()}`);
  }
  if (form.paymentNote.trim()) {
    parts.push(`Payment note: ${form.paymentNote.trim()}`);
  }
  return parts.length > 0 ? parts.join("\n") : undefined;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

export function AddPurchaseView() {
  const tenantId = useTenantId();
  const { tenantCode, config } = useRouteTenant();
  const isHq6 = useIsVaHq6();
  const copy = hq6CopyForSlug("add-purchase");
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const qc = useQueryClient();

  const businessLocations = config?.businessLocations ?? [];

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", tenantId],
    queryFn: () => getSuppliers(tenantId!),
    enabled: Boolean(tenantId),
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["stock-movement", editId],
    queryFn: () => getStockMovement(editId!),
    enabled: Boolean(editId),
  });

  const [form, setForm] = useState<PurchaseFormState>(emptyForm);
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [prefillDone, setPrefillDone] = useState(false);

  const patchForm = (patch: Partial<PurchaseFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    if (!existing || prefillDone) return;
    const status: PurchaseStatusOption =
      existing.status === "Ordered" || existing.status === "Pending"
        ? existing.status
        : "Received";
    setForm({
      ...emptyForm(),
      reference: existing.reference,
      supplierId: existing.supplierId ?? "",
      locationCode: existing.locationCode ?? "",
      date: existing.date.slice(0, 16),
      status,
      additionalNotes: existing.notes ?? "",
      paymentMethod: existing.paymentMethod ?? "cash",
    });
    setLines(
      existing.lines.map((line) => ({
        itemId: line.itemId,
        sku: line.sku,
        name: line.name,
        quantity: line.quantity,
        unitCost: line.unitCost ?? 0,
        discountPercent: 0,
        unitSellingPrice: line.unitCost ?? 0,
      })),
    );
    setPrefillDone(true);
  }, [existing, prefillDone]);

  useEffect(() => {
    if (prefillDone || form.locationCode) return;
    const first = businessLocations[0]?.code;
    if (first) patchForm({ locationCode: first });
  }, [businessLocations, form.locationCode, prefillDone]);

  const netTotal = useMemo(
    () => lines.reduce((sum, line) => sum + lineTotal(line), 0),
    [lines],
  );

  const orderDiscount = useMemo(() => {
    const amount = Number(form.discountAmount) || 0;
    if (form.discountType === "percentage") return (netTotal * amount) / 100;
    if (form.discountType === "fixed") return amount;
    return 0;
  }, [form.discountAmount, form.discountType, netTotal]);

  const purchaseTax = Number(form.purchaseTax) || 0;
  const shippingCharges = Number(form.shippingCharges) || 0;
  const extraExpensesTotal = form.extraExpenses.reduce(
    (sum, exp) => sum + (Number(exp.amount) || 0),
    0,
  );
  const purchaseTotal = Math.max(
    0,
    netTotal - orderDiscount + purchaseTax + shippingCharges + extraExpensesTotal,
  );
  const paymentAmount = Number(form.paymentAmount) || 0;
  const paymentDue = Math.max(0, purchaseTotal - paymentAmount);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      const status: MovementStatus = form.status;
      const created = await createStockMovement(tenantId, {
        type: "inbound",
        reference: form.reference || `PO-${Date.now()}`,
        status,
        supplierId: form.supplierId || undefined,
        locationCode: form.locationCode || undefined,
        date: form.date,
        notes: buildNotes(form),
        paymentMethod: form.paymentMethod || undefined,
        paymentStatus:
          paymentAmount <= 0
            ? "due"
            : paymentDue <= 0
              ? "paid"
              : "partial",
        lines: lines.map((line) => ({
          itemId: line.itemId,
          sku: line.sku,
          name: line.name,
          quantity: line.quantity,
          unitCost: lineUnitCostBeforeTax(line),
        })),
      });
      if (editId) {
        await deleteStockMovement(tenantId, editId);
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-movements", tenantId] });
      router.push(`/${tenantCode}/purchases`);
    },
  });

  const addItem = (pick: CatalogPartPick) => {
    if (!pick.itemId) return;
    const itemId = pick.itemId;
    setLines((prev) => {
      const existingLine = prev.find((l) => l.itemId === itemId);
      if (existingLine) {
        return prev.map((l) =>
          l.itemId === itemId ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          itemId,
          sku: pick.sku,
          name: pick.name,
          quantity: 1,
          unitCost: pick.costPrice,
          discountPercent: 0,
          unitSellingPrice: pick.sellPrice || pick.costPrice,
        },
      ];
    });
  };

  const updateLine = (itemId: string, patch: Partial<PurchaseLine>) => {
    setLines((prev) =>
      prev.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l)),
    );
  };

  const removeLine = (itemId: string) => {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  };

  const selectedSupplier = suppliers.find((s) => s.id === form.supplierId);
  const canSave = lines.length > 0 && Boolean(form.supplierId) && Boolean(form.date);

  if (isHq6) {
    return (
      <Hq6FormShell
        multiCard
        title={editId ? "Edit Purchase" : copy.title}
        subtitle={editId ? `Updating ${existing?.reference ?? "purchase"}` : copy.subtitle}
      >
        {editId && existing ? (
          <div className="hq6-form-card text-sm text-[#555]">
            Editing purchase <strong>{existing.reference}</strong> ({existing.status}).
            Saving replaces this record with your updates.
          </div>
        ) : null}
        {editId && loadingExisting ? (
          <div className="hq6-form-card text-sm text-[#555]">Loading purchase…</div>
        ) : null}

        {/* 1. General */}
        <section className="hq6-form-card">
          <div className="hq6-form-grid hq6-form-grid-4">
            <label className="hq6-form-label">
              <span>
                Supplier <span className="req">*</span>
              </span>
              <select
                className="hq6-form-input"
                value={form.supplierId}
                onChange={(e) => patchForm({ supplierId: e.target.value })}
              >
                <option value="">Please Select</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.businessName ?? s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="hq6-form-label">
              <span>Reference No</span>
              <input
                className="hq6-form-input"
                placeholder="Reference No"
                value={form.reference}
                onChange={(e) => patchForm({ reference: e.target.value })}
              />
            </label>
            <label className="hq6-form-label">
              <span>
                Purchase Date <span className="req">*</span>
              </span>
              <div className="hq6-form-input-wrap">
                <input
                  type="datetime-local"
                  className="hq6-form-input"
                  value={form.date}
                  onChange={(e) => patchForm({ date: e.target.value })}
                />
                <Calendar className="hq6-form-input-icon" aria-hidden />
              </div>
            </label>
            <label className="hq6-form-label">
              <span>
                Purchase Status <span className="req">*</span>
              </span>
              <select
                className="hq6-form-input"
                value={form.status}
                onChange={(e) =>
                  patchForm({ status: e.target.value as PurchaseStatusOption })
                }
              >
                <option value="Received">Received</option>
                <option value="Pending">Pending</option>
                <option value="Ordered">Ordered</option>
              </select>
            </label>
            <label className="hq6-form-label">
              <span>Address</span>
              <div className="hq6-form-static">
                {selectedSupplier?.address?.trim() || "—"}
              </div>
            </label>
            <label className="hq6-form-label">
              <span>
                Business Location <span className="req">*</span>
              </span>
              <select
                className="hq6-form-input"
                value={form.locationCode}
                onChange={(e) => patchForm({ locationCode: e.target.value })}
              >
                <option value="">Please Select</option>
                {businessLocations.map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="hq6-form-label">
              <span>Pay term</span>
              <div className="hq6-form-pay-term">
                <input
                  className="hq6-form-input"
                  type="number"
                  min={0}
                  placeholder="Pay term"
                  value={form.payTermValue}
                  onChange={(e) => patchForm({ payTermValue: e.target.value })}
                />
                <select
                  className="hq6-form-input"
                  value={form.payTermUnit}
                  onChange={(e) =>
                    patchForm({
                      payTermUnit: e.target.value === "months" ? "months" : "days",
                    })
                  }
                >
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </label>
            <label className="hq6-form-label">
              <span>Attach Document</span>
              <div className="hq6-form-file">
                <input
                  type="file"
                  accept=".pdf,.csv,.zip,.doc,.docx,.jpeg,.jpg,.png"
                />
              </div>
              <p className="hq6-form-hint">
                Max File size: 5MB · Allowed: .pdf, .csv, .zip, .doc, .docx, .jpeg, .jpg, .png
              </p>
            </label>
            <label className="hq6-form-label" style={{ gridColumn: "1 / -1" }}>
              <span>Purchase Order</span>
              <input
                className="hq6-form-input"
                placeholder="Purchase Order"
                value={form.purchaseOrder}
                onChange={(e) => patchForm({ purchaseOrder: e.target.value })}
              />
            </label>
          </div>
        </section>

        {/* 2. Products */}
        <section className="hq6-form-card">
          <div className="hq6-form-products-toolbar">
            <Link
              href={`/${tenantCode}/import-products`}
              className="hq6-btn-purple inline-flex items-center justify-center no-underline"
            >
              Import Products
            </Link>
            <div className="hq6-form-products-search">
              {tenantId ? (
                <ProductItemSearch
                  tenantId={tenantId}
                  tenantCode={tenantCode}
                  businessLocations={businessLocations}
                  onSelect={addItem}
                  placeholder="Enter Product name / SKU / Scan bar code"
                />
              ) : null}
            </div>
            <Link href={`/${tenantCode}/add-product`} className="hq6-form-link">
              + Add new product
            </Link>
          </div>

          <div className="hq6-product-view-table-wrap">
            <table className="hq6-product-view-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product Name</th>
                  <th>Purchase Quantity</th>
                  <th>Unit Cost (Before Discount)</th>
                  <th>Discount Percent</th>
                  <th>Unit Cost (Before Tax)</th>
                  <th>Line Total</th>
                  <th>Profit Margin %</th>
                  <th>Unit Selling Price (Inc. tax)</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center text-[#9ca3af]">
                      No products added
                    </td>
                  </tr>
                ) : (
                  lines.map((line, index) => (
                    <tr key={line.itemId}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="font-medium">{line.name}</div>
                        <div className="text-xs text-[#6b7280]">{line.sku}</div>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.itemId, {
                              quantity: Number(e.target.value) || 1,
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.unitCost}
                          onChange={(e) =>
                            updateLine(line.itemId, {
                              unitCost: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={line.discountPercent}
                          onChange={(e) =>
                            updateLine(line.itemId, {
                              discountPercent: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                      <td>{formatHq6Currency(lineUnitCostBeforeTax(line))}</td>
                      <td>{formatHq6Currency(lineTotal(line))}</td>
                      <td>{lineProfitMargin(line).toFixed(2)}</td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.unitSellingPrice}
                          onChange={(e) =>
                            updateLine(line.itemId, {
                              unitSellingPrice: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="text-[#dc2626]"
                          aria-label={`Remove ${line.name}`}
                          onClick={() => removeLine(line.itemId)}
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
          <div className="hq6-form-table-footer">
            <span>
              Total Items: <strong>{lines.length}</strong>
            </span>
            <span>
              Net Total Amount: <strong>{formatHq6Currency(netTotal)}</strong>
            </span>
          </div>
        </section>

        {/* 3. Discount / tax / notes */}
        <section className="hq6-form-card">
          <div className="hq6-form-grid hq6-form-grid-3">
            <label className="hq6-form-label">
              <span>Discount Type</span>
              <select
                className="hq6-form-input"
                value={form.discountType}
                onChange={(e) =>
                  patchForm({
                    discountType: e.target.value as PurchaseFormState["discountType"],
                  })
                }
              >
                <option value="none">None</option>
                <option value="fixed">Fixed</option>
                <option value="percentage">Percentage</option>
              </select>
            </label>
            <label className="hq6-form-label">
              <span>Discount Amount</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="hq6-form-input"
                value={form.discountAmount}
                onChange={(e) => patchForm({ discountAmount: e.target.value })}
              />
            </label>
            <div className="hq6-form-summary-line">
              Discount:(-) {formatHq6Currency(orderDiscount)}
            </div>
            <label className="hq6-form-label">
              <span>Purchase Tax</span>
              <select
                className="hq6-form-input"
                value={form.purchaseTax === "0" || !form.purchaseTax ? "none" : "custom"}
                onChange={(e) =>
                  patchForm({
                    purchaseTax: e.target.value === "none" ? "0" : form.purchaseTax || "0",
                  })
                }
              >
                <option value="none">None</option>
                <option value="custom">Custom amount</option>
              </select>
            </label>
            {form.purchaseTax !== "0" && form.purchaseTax !== "" ? (
              <label className="hq6-form-label">
                <span>Tax Amount</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="hq6-form-input"
                  value={form.purchaseTax}
                  onChange={(e) => patchForm({ purchaseTax: e.target.value })}
                />
              </label>
            ) : (
              <div />
            )}
            <div className="hq6-form-summary-line">
              Purchase Tax:(+) {formatHq6Currency(purchaseTax)}
            </div>
            <label className="hq6-form-label" style={{ gridColumn: "1 / -1" }}>
              <span>Additional Notes</span>
              <textarea
                className="hq6-form-input"
                rows={3}
                value={form.additionalNotes}
                onChange={(e) => patchForm({ additionalNotes: e.target.value })}
              />
            </label>
          </div>
        </section>

        {/* 4. Shipping */}
        <section className="hq6-form-card">
          <div className="hq6-form-grid">
            <label className="hq6-form-label">
              <span>Shipping Details</span>
              <textarea
                className="hq6-form-input"
                rows={2}
                placeholder="Shipping Details"
                value={form.shippingDetails}
                onChange={(e) => patchForm({ shippingDetails: e.target.value })}
              />
            </label>
            <label className="hq6-form-label">
              <span>Additional Shipping charges</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="hq6-form-input"
                value={form.shippingCharges}
                onChange={(e) => patchForm({ shippingCharges: e.target.value })}
              />
            </label>
          </div>
          {form.extraExpenses.map((exp, idx) => (
            <div key={idx} className="hq6-form-grid mt-3" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
              <label className="hq6-form-label">
                <span>Expense name</span>
                <input
                  className="hq6-form-input"
                  value={exp.name}
                  onChange={(e) => {
                    const next = [...form.extraExpenses];
                    next[idx] = { ...exp, name: e.target.value };
                    patchForm({ extraExpenses: next });
                  }}
                />
              </label>
              <label className="hq6-form-label">
                <span>Amount</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="hq6-form-input"
                  value={exp.amount}
                  onChange={(e) => {
                    const next = [...form.extraExpenses];
                    next[idx] = { ...exp, amount: e.target.value };
                    patchForm({ extraExpenses: next });
                  }}
                />
              </label>
              <button
                type="button"
                className="mt-6 text-[#dc2626]"
                aria-label="Remove expense"
                onClick={() =>
                  patchForm({
                    extraExpenses: form.extraExpenses.filter((_, i) => i !== idx),
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="hq6-form-expenses-link"
            onClick={() =>
              patchForm({
                extraExpenses: [...form.extraExpenses, { name: "", amount: "0" }],
              })
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add additional expenses
          </button>
          <div className="hq6-form-total-row">
            Purchase Total: {formatHq6Currency(purchaseTotal)}
          </div>
        </section>

        {/* 5. Payment */}
        <section className="hq6-form-card">
          <h2 className="hq6-form-card-title">Add payment</h2>
          <p className="mb-3 text-sm text-[#6b7280]">
            Advance Balance: {formatHq6Currency(0)}
          </p>
          <div className="hq6-form-grid hq6-form-grid-3">
            <label className="hq6-form-label">
              <span>
                Amount <span className="req">*</span>
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="hq6-form-input"
                value={form.paymentAmount}
                onChange={(e) => patchForm({ paymentAmount: e.target.value })}
              />
            </label>
            <label className="hq6-form-label">
              <span>
                Paid on <span className="req">*</span>
              </span>
              <div className="hq6-form-input-wrap">
                <input
                  type="datetime-local"
                  className="hq6-form-input"
                  value={form.paidOn}
                  onChange={(e) => patchForm({ paidOn: e.target.value })}
                />
                <Calendar className="hq6-form-input-icon" aria-hidden />
              </div>
            </label>
            <label className="hq6-form-label">
              <span>
                Payment Method <span className="req">*</span>
              </span>
              <select
                className="hq6-form-input"
                value={form.paymentMethod}
                onChange={(e) => patchForm({ paymentMethod: e.target.value })}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="hq6-form-label">
              <span>Payment Account</span>
              <input
                className="hq6-form-input"
                placeholder="None"
                value={form.paymentAccount}
                onChange={(e) => patchForm({ paymentAccount: e.target.value })}
              />
            </label>
            <label className="hq6-form-label" style={{ gridColumn: "1 / -1" }}>
              <span>Payment note</span>
              <textarea
                className="hq6-form-input"
                rows={2}
                value={form.paymentNote}
                onChange={(e) => patchForm({ paymentNote: e.target.value })}
              />
            </label>
          </div>
          <div className="hq6-form-table-footer">
            <span>
              Payment due: <strong>{formatHq6Currency(paymentDue)}</strong>
            </span>
          </div>
          <div className="hq6-form-save-row">
            <button
              type="button"
              className="hq6-btn-purple"
              disabled={!canSave || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </button>
          </div>
          {mutation.isError ? (
            <p className="mt-2 text-center text-sm text-[#dc2626]">
              {(mutation.error as Error).message || "Failed to save purchase"}
            </p>
          ) : null}
        </section>
      </Hq6FormShell>
    );
  }

  const grandTotal = lines.reduce(
    (sum, line) => sum + line.quantity * line.unitCost,
    0,
  );

  return (
    <div className={cn("mx-auto max-w-4xl space-y-6 py-8")}>
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {editId ? "Edit Purchase" : "Add Purchase"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {editId
            ? "Update this purchase and save to replace the previous draft."
            : "Record a new purchase from a supplier."}
        </p>
      </div>

      {editId && existing ? (
        <div className="rounded border border-[var(--hq6-border,#ddd)] bg-[#f9f9f9] px-3 py-2 text-sm text-[#555]">
          Editing purchase <strong>{existing.reference}</strong> ({existing.status}). Saving
          replaces this record with your updates.
        </div>
      ) : null}
      {editId && loadingExisting ? (
        <p className="text-sm text-muted">Loading purchase…</p>
      ) : null}

      <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Reference No</label>
            <input
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              placeholder="Auto-generated if empty"
              value={form.reference}
              onChange={(e) => patchForm({ reference: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Supplier *</label>
            <MenuSelect
              value={form.supplierId}
              placeholder="Select supplier…"
              onChange={(supplierId) => patchForm({ supplierId })}
              options={[
                { value: "", label: "Select supplier…" },
                ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Location</label>
            <input
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={form.locationCode}
              onChange={(e) => patchForm({ locationCode: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Purchase Date</label>
            <input
              type="date"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={form.date}
              onChange={(e) => patchForm({ date: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Add products</label>
          {tenantId ? <ProductItemSearch tenantId={tenantId} onSelect={addItem} /> : null}
        </div>

        {lines.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-2">Product</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Unit cost</th>
                  <th className="py-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.itemId} className="border-b border-border">
                    <td className="py-2">{line.name}</td>
                    <td className="py-2">
                      <input
                        type="number"
                        min={1}
                        className="w-20 rounded border border-border px-2 py-1"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(line.itemId, {
                            quantity: Number(e.target.value) || 1,
                          })
                        }
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        min={0}
                        className="w-28 rounded border border-border px-2 py-1"
                        value={line.unitCost}
                        onChange={(e) =>
                          updateLine(line.itemId, {
                            unitCost: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </td>
                    <td className="py-2">
                      ₦{(line.quantity * line.unitCost).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-right text-sm font-medium">
              Grand total: ₦{grandTotal.toLocaleString()}
            </p>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            isLoading={mutation.isPending}
            loadingText="Saving…"
            onClick={() => mutation.mutate()}
            disabled={!canSave}
          >
            {editId ? "Update Purchase" : "Save Purchase"}
          </Button>
        </div>
      </div>
    </div>
  );
}
