"use client";

import { Hq6DateTimeInput } from "@/components/hq6/Hq6DateTimeInput";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import type { MovementStatus } from "@vonos/types";
import { isGroupStockConsumerTenant } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { ClearableNumberInput } from "@/components/atoms/ClearableNumberInput";
import { AsyncMenuSelect } from "@/components/molecules/AsyncMenuSelect";
import { ProductItemSearch, type CatalogPartPick } from "@/components/molecules/ProductItemSearch";
import { Hq6BusyButton } from "@/components/hq6/Hq6BusyButton";
import { Hq6LoadProgress } from "@/components/hq6/Hq6LoadProgress";
import { Hq6FormShell } from "@/components/hq6/Hq6Chrome";
import {
  createStockMovement,
  getStockMovement,
  getStockMovementPayments,
  payStockMovement,
  updateStockMovement,
} from "@/lib/api/stockMovements";
import { getItem, updateItem } from "@/lib/api/items";
import { itemSellPrice } from "@/lib/utils/itemPricing";
import { isTransientWriteError } from "@/lib/utils/withWriteRetries";
import {
  newIdempotencyKey,
  withIdempotencyKey,
} from "@/lib/utils/idempotency";
import { getPaymentAccountsForPicker } from "@/lib/api/paymentAccounts";
import { getSuppliersForPicker, loadMoreSuppliersForPicker, suppliersPickerHasMore } from "@/lib/api/suppliers";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { goToList } from "@/lib/utils/goToList";
import { paymentAccountPickerLabel } from "@/lib/utils/pickerLabels";
import { toast } from "@/stores/toastStore";
import {
  defaultEntityLocationCode,
  entitySaleLocations,
} from "@/lib/hooks/useBusinessLocationOptions";
import { parsePurchaseNotes } from "@/lib/utils/purchaseNotes";
import { canAddPaymentForStatus } from "@/lib/utils/hq6PaymentBadge";
import { hq6CopyForSlug } from "@/lib/registries/hq6PageCopy";
import {
  MODAL_REF_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import { cn } from "@/lib/utils/cn";
import { formatHq6Currency } from "@/lib/utils/hq6Format";
import { tenantBasePath } from "@/lib/utils/tenantMount";
import {
  purchaseAdditionalPaymentAmount,
  purchaseAlreadyPaid,
  purchaseSaveReference,
} from "@/lib/utils/purchaseEditPayment";
import { sellPriceChanges } from "@/lib/utils/purchaseSellPriceDiff";

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
  paymentAccountId: string;
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
    discountAmount: "",
    purchaseTax: "",
    additionalNotes: "",
    shippingDetails: "",
    shippingCharges: "0",
    extraExpenses: [],
    paymentAmount: "0",
    paidOn: new Date().toISOString().slice(0, 16),
    paymentMethod: "cash",
    paymentAccountId: "",
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
  if (form.paymentAccountId.trim()) {
    parts.push(`Payment account id: ${form.paymentAccountId.trim()}`);
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

  const businessLocations = entitySaleLocations(config);
  const groupStockConsumer = isGroupStockConsumerTenant(config?.code ?? tenantCode);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", tenantId],
    queryFn: () => getSuppliersForPicker(tenantId!),
    enabled: Boolean(tenantId),
  });

  const loadSupplierOptions = useCallback(
    async (query: string) => {
      if (!tenantId) return { options: [{ value: "", label: "Please Select" }], hasMore: false };
      const rows = await getSuppliersForPicker(tenantId, query || undefined);
      return {
        options: [
          { value: "", label: "Please Select" },
          ...rows.map((s) => ({
            value: s.id,
            label: s.businessName ?? s.name,
          })),
        ],
        hasMore: !query.trim() && suppliersPickerHasMore(tenantId),
      };
    },
    [tenantId],
  );

  const loadMoreSupplierOptions = useCallback(async () => {
    if (!tenantId) return { options: [], hasMore: false, append: true };
    const page = await loadMoreSuppliersForPicker(tenantId);
    return {
      options: page.appended.map((s) => ({
        value: s.id,
        label: s.businessName ?? s.name,
      })),
      hasMore: page.hasMore,
      append: true,
    };
  }, [tenantId]);

  const { data: paymentAccounts = [] } = useQuery({
    queryKey: modalKeys.paymentAccounts(tenantId),
    queryFn: () => getPaymentAccountsForPicker(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: MODAL_REF_STALE_MS,
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["stock-movement", editId],
    queryFn: () => getStockMovement(editId!),
    enabled: Boolean(editId),
  });

  const { data: existingPayments = [], isFetched: paymentsFetched } = useQuery({
    queryKey: ["stock-movement-payments", tenantId, editId],
    queryFn: () => getStockMovementPayments(tenantId!, editId!),
    enabled: Boolean(tenantId && editId),
  });

  const [form, setForm] = useState<PurchaseFormState>(emptyForm);
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [prefillDone, setPrefillDone] = useState(false);
  const baselineSellPricesRef = useRef<
    Array<{ itemId: string; unitSellingPrice: number }>
  >([]);
  const purchaseIdempotencyKeyRef = useRef<string | null>(null);

  // Same route for add vs edit — reset when ?edit= changes or is cleared.
  useEffect(() => {
    setPrefillDone(false);
    setForm(emptyForm());
    setLines([]);
    baselineSellPricesRef.current = [];
    purchaseIdempotencyKeyRef.current = null;
  }, [editId]);

  const selectedSupplierLabel = useMemo(() => {
    const match = suppliers.find((s) => s.id === form.supplierId);
    if (match) return match.businessName ?? match.name;
    return undefined;
  }, [form.supplierId, suppliers]);

  const supplierAdvanceBalance = useMemo(() => {
    const match = suppliers.find((s) => s.id === form.supplierId);
    return Math.max(0, match?.totalAdvance ?? 0);
  }, [form.supplierId, suppliers]);

  const patchForm = (patch: Partial<PurchaseFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    if (!existing || prefillDone) return;
    // Wait for payments so we can show the account that was used before.
    if (editId && !paymentsFetched) return;
    let cancelled = false;
    const status: PurchaseStatusOption =
      existing.status === "Ordered" || existing.status === "Pending"
        ? existing.status
        : "Received";
    const parsedNotes = parsePurchaseNotes(existing.notes);
    const alreadyPaid = purchaseAlreadyPaid(
      editId,
      existing.totalPaid,
      existingPayments,
    );
    const latestPayment =
      existingPayments.find((p) => p.accountId?.trim()) ??
      existingPayments[0];
    const paidOnIso = latestPayment?.paidOn
      ? new Date(latestPayment.paidOn).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16);
    setForm({
      ...emptyForm(),
      reference: existing.reference,
      supplierId: existing.supplierId ?? "",
      locationCode: existing.locationCode ?? "",
      date: existing.date.slice(0, 16),
      status,
      additionalNotes: parsedNotes.additionalNotes,
      payTermValue: parsedNotes.payTermValue,
      payTermUnit: parsedNotes.payTermUnit || "days",
      purchaseOrder: parsedNotes.purchaseOrder,
      discountType: parsedNotes.discountType,
      discountAmount: parsedNotes.discountAmount,
      purchaseTax: parsedNotes.purchaseTax,
      shippingDetails: parsedNotes.shippingDetails,
      shippingCharges: parsedNotes.shippingCharges || "0",
      extraExpenses: parsedNotes.extraExpenses,
      // Show what was already paid + the account used — Update only posts a
      // new payment when the amount is increased above totalPaid.
      paymentAmount: alreadyPaid > 0 ? String(alreadyPaid) : "0",
      paidOn: paidOnIso,
      paymentMethod:
        latestPayment?.method?.trim() ||
        existing.paymentMethod ||
        "cash",
      paymentAccountId: latestPayment?.accountId?.trim() || "",
      paymentNote: latestPayment?.note?.trim() || "",
    });
    void (async () => {
      const catalog = await Promise.all(
        existing.lines.map(async (line) => {
          try {
            return [line.itemId, await getItem(line.itemId)] as const;
          } catch {
            return [line.itemId, null] as const;
          }
        }),
      );
      if (cancelled) return;
      const byId = new Map(catalog);
      setLines(
        existing.lines.map((line) => ({
          itemId: line.itemId,
          sku: line.sku,
          name: line.name,
          quantity: line.quantity,
          unitCost: line.unitCost ?? 0,
          discountPercent: line.discountPercent ?? 0,
          unitSellingPrice:
            line.unitSellingPrice ??
            itemSellPrice(byId.get(line.itemId) ?? {}),
        })),
      );
      baselineSellPricesRef.current = existing.lines.map((line) => ({
        itemId: line.itemId,
        unitSellingPrice:
          line.unitSellingPrice ??
          itemSellPrice(byId.get(line.itemId) ?? {}),
      }));
      setPrefillDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, existing, existingPayments, paymentsFetched, prefillDone]);

  useEffect(() => {
    if (prefillDone || form.locationCode) return;
    const first = defaultEntityLocationCode(
      businessLocations,
      config?.code ?? tenantCode,
    );
    if (first) patchForm({ locationCode: first });
  }, [businessLocations, config?.code, form.locationCode, prefillDone, tenantCode]);

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
  const alreadyPaid = purchaseAlreadyPaid(
    editId,
    existing?.totalPaid,
    existingPayments,
  );
  /** On edit, Amount shows total already paid — only the increase is a new payment. */
  const additionalPaymentAmount = purchaseAdditionalPaymentAmount(
    editId,
    paymentAmount,
    alreadyPaid,
  );
  const paymentDue = Math.max(
    0,
    purchaseTotal - (editId ? Math.max(alreadyPaid, paymentAmount) : paymentAmount),
  );
  const existingRemainingDue = Math.max(0, existing?.paymentDue ?? 0);
  const showAddPaymentOnEdit =
    Boolean(editId) &&
    canAddPaymentForStatus(existing?.paymentStatus, existingRemainingDue);
  const collectingPayment =
    additionalPaymentAmount > 0.009 && (!editId || showAddPaymentOnEdit);

  const mutation = useMutation({
    meta: {
      progressLabel: editId ? "Updating purchase" : "Saving purchase",
      suppressErrorToast: true,
    },
    // Leave-first: keep trying in the background after we hit the list.
    retry: (failureCount, error) =>
      failureCount < 2 && isTransientWriteError(error),
    mutationFn: async () => {
      const key =
        purchaseIdempotencyKeyRef.current ?? newIdempotencyKey();
      purchaseIdempotencyKeyRef.current = key;
      if (!tenantId) throw new Error("No tenant");
      if (collectingPayment && !form.paymentAccountId.trim()) {
        throw new Error(
          "Select a Payment Account so this purchase payment posts to the account book",
        );
      }
      const status: MovementStatus = form.status;
      const reference = purchaseSaveReference(
        form.reference,
        editId,
        existing?.reference,
      );
      const payload = {
        type: "inbound" as const,
        reference,
        status,
        supplierId: form.supplierId || undefined,
        locationCode: form.locationCode || undefined,
        date: form.date,
        notes: buildNotes(form),
        paymentMethod: form.paymentMethod || undefined,
        ...(editId
          ? {}
          : {
              paymentStatus:
                paymentAmount <= 0
                  ? ("due" as const)
                  : paymentDue <= 0
                    ? ("paid" as const)
                    : ("partial" as const),
            }),
        lines: lines.map((line) => ({
          itemId: line.itemId,
          sku: line.sku,
          name: line.name,
          quantity: line.quantity,
          unitCost: line.unitCost,
          discountPercent: line.discountPercent || 0,
          unitSellingPrice: line.unitSellingPrice,
        })),
      };
      const saved = editId
        ? await withIdempotencyKey(`${key}:write`, () =>
            updateStockMovement(tenantId, editId, payload),
          )
        : await withIdempotencyKey(`${key}:write`, () =>
            createStockMovement(tenantId, payload),
          );
      // Only sync sell prices that actually changed on this edit.
      const priceUpdates = sellPriceChanges(
        baselineSellPricesRef.current,
        lines.map((line) => ({
          itemId: line.itemId,
          unitSellingPrice: line.unitSellingPrice,
        })),
      );
      void Promise.allSettled(
        priceUpdates.map((row) =>
          updateItem(row.itemId, { sellPrice: row.sellPrice }),
        ),
      );
      if (collectingPayment) {
        await withIdempotencyKey(`${key}:pay`, () =>
          payStockMovement(tenantId, saved.id, {
            amount: additionalPaymentAmount,
            method: form.paymentMethod || "cash",
            accountId: form.paymentAccountId || undefined,
            note: form.paymentNote.trim() || undefined,
            paidOn: form.paidOn
              ? new Date(form.paidOn).toISOString()
              : undefined,
          }),
        );
      }
      return saved;
    },
    onSuccess: () => {
      toast.success(editId ? "Purchase updated" : "Purchase saved");
      void qc.invalidateQueries({ queryKey: ["stock-movements", tenantId] });
      void qc.invalidateQueries({ queryKey: ["payment-accounts", tenantId] });
      void qc.invalidateQueries({ queryKey: ["items", tenantId] });
      void qc.invalidateQueries({ queryKey: ["catalog"] });
      if (tenantCode) {
        goToList(`${tenantBasePath(tenantCode)}/purchases`);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save purchase");
    },
    onSettled: () => {
      purchaseIdempotencyKeyRef.current = null;
    },
  });

  const canSave =
    lines.length > 0 && Boolean(form.supplierId) && Boolean(form.date);

  const handleSave = () => {
    if (!canSave || mutation.isPending) return;
    if (collectingPayment && !form.paymentAccountId.trim()) {
      toast.error(
        "Select a Payment Account so this purchase payment posts to the account book",
      );
      return;
    }
    mutation.mutate();
  };
  const addItem = (pick: CatalogPartPick) => {
    if (!pick.itemId) return;
    const itemId = pick.itemId;
    setLines((prev) => {
      const existingLine = prev.find((l) => l.itemId === itemId);
      if (existingLine) {
        // Do not auto +1 — workers often set qty (e.g. 2) then re-pick the
        // same SKU from search, which used to turn 2 into 3.
        toast.info(
          `${existingLine.name} is already on this purchase — change Purchase Quantity on the line`,
        );
        return prev;
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
          unitSellingPrice: pick.sellPrice || 0,
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

  if (isHq6) {
    return (
      <Hq6FormShell
        multiCard
        className="hq6-add-purchase-page"
        title={editId ? "Edit Purchase" : copy.title}
      >
        {editId && existing ? (
          <div className="hq6-form-card text-sm text-[#555]">
            Editing purchase <strong>{existing.reference}</strong> ({existing.status}).
            Changes update this record in place. Payment fields show what was
            already paid and which account was used — raise the amount only if
            you are collecting more now.
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
              <div className="hq6-form-inline-control">
                <AsyncMenuSelect
                  className="hq6-form-input hq6-input-group-select-field tw-min-w-0 tw-flex-1"
                  value={form.supplierId}
                  selectedLabel={selectedSupplierLabel}
                  placeholder="Please Select"
                  loadOptions={loadSupplierOptions}
                  loadMoreOptions={loadMoreSupplierOptions}
                  debounceMs={0}
                  onChange={(supplierId) => patchForm({ supplierId })}
                />
                <button
                  type="button"
                  className="hq6-btn hq6-btn-blue shrink-0"
                  title="Add supplier"
                  onClick={() => router.push(`${tenantBasePath(tenantCode)}/suppliers`)}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
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
                <Hq6DateTimeInput
                  className="hq6-form-input"
                  value={form.date}
                  onChange={(v) => patchForm({ date: v })}
                />
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
                      accept=".pdf,.csv,.zip,.doc,.docx,.jpeg,.jpg,.png,.avif"
                />
              </div>
              <p className="hq6-form-hint">
                    Max File size: 5MB · Allowed: .pdf, .csv, .zip, .doc, .docx, .jpeg, .jpg, .png, .avif
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
              href={`${tenantBasePath(tenantCode)}/import-products`}
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
                  includeWarehouse={false}
                  ownCatalog
                  showStockQty={!groupStockConsumer}
                  onSelect={addItem}
                  placeholder={
                    groupStockConsumer
                      ? "Search product catalog by name or SKU"
                      : "Enter Product name / SKU / Scan bar code"
                  }
                />
              ) : null}
            </div>
            {!groupStockConsumer ? (
            <Link href={`${tenantBasePath(tenantCode)}/add-product`} className="hq6-form-link">
              + Add new product
            </Link>
            ) : null}
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
                        <ClearableNumberInput
                          min={1}
                          showZero
                          value={line.quantity}
                          onChange={(n) =>
                            updateLine(line.itemId, {
                              quantity: Math.max(1, n || 1),
                            })
                          }
                        />
                      </td>
                      <td>
                        <ClearableNumberInput
                          min={0}
                          showZero
                          value={line.unitCost}
                          onChange={(n) =>
                            updateLine(line.itemId, { unitCost: n })
                          }
                        />
                      </td>
                      <td>
                        <ClearableNumberInput
                          min={0}
                          max={100}
                          value={line.discountPercent}
                          onChange={(n) =>
                            updateLine(line.itemId, { discountPercent: n })
                          }
                        />
                      </td>
                      <td>{formatHq6Currency(lineUnitCostBeforeTax(line))}</td>
                      <td>{formatHq6Currency(lineTotal(line))}</td>
                      <td>{lineProfitMargin(line).toFixed(2)}</td>
                      <td>
                        <ClearableNumberInput
                          min={0}
                          showZero
                          value={line.unitSellingPrice}
                          onChange={(n) =>
                            updateLine(line.itemId, { unitSellingPrice: n })
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
          <h2 className="hq6-form-card-title">
            {editId ? "Payment" : "Add payment"}
          </h2>
          {editId ? (
            <p className="mb-3 text-sm text-[#6b7280]">
              Paid so far: {formatHq6Currency(alreadyPaid)}
              {existingPayments[0]?.accountName
                ? ` · ${existingPayments[0].accountName}`
                : ""}
              {existingRemainingDue > 0
                ? ` · Remaining due: ${formatHq6Currency(existingRemainingDue)}`
                : " · Fully paid"}
              {additionalPaymentAmount > 0.009
                ? ` · New payment on Update: ${formatHq6Currency(additionalPaymentAmount)}`
                : ""}
              . Existing payments stay as they are unless you increase Amount.
            </p>
          ) : (
            <p className="mb-3 text-sm text-[#6b7280]">
              Advance Balance: {formatHq6Currency(supplierAdvanceBalance)}
            </p>
          )}
          <>
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
                    onChange={(e) =>
                      patchForm({ paymentAmount: e.target.value })
                    }
                  />
                </label>
                <label className="hq6-form-label">
                  <span>
                    Paid on <span className="req">*</span>
                  </span>
                  <div className="hq6-form-input-wrap">
                    <Hq6DateTimeInput
                      className="hq6-form-input"
                      value={form.paidOn}
                      onChange={(v) => patchForm({ paidOn: v })}
                    />
                  </div>
                </label>
                <label className="hq6-form-label">
                  <span>
                    Payment Method <span className="req">*</span>
                  </span>
                  <select
                    className="hq6-form-input"
                    value={form.paymentMethod}
                    onChange={(e) =>
                      patchForm({ paymentMethod: e.target.value })
                    }
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="hq6-form-label">
                  <span>
                    Payment Account
                    {collectingPayment ? (
                      <span className="req"> *</span>
                    ) : null}
                  </span>
                  <select
                    className="hq6-form-input"
                    value={form.paymentAccountId}
                    onChange={(e) =>
                      patchForm({ paymentAccountId: e.target.value })
                    }
                  >
                    <option value="">None</option>
                    {paymentAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {paymentAccountPickerLabel(acc)}
                      </option>
                    ))}
                  </select>
                </label>
                <label
                  className="hq6-form-label"
                  style={{ gridColumn: "1 / -1" }}
                >
                  <span>Payment note</span>
                  <textarea
                    className="hq6-form-input"
                    rows={2}
                    value={form.paymentNote}
                    onChange={(e) =>
                      patchForm({ paymentNote: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="hq6-form-table-footer">
                <span>
                  Payment due:{" "}
                  <strong>{formatHq6Currency(paymentDue)}</strong>
                </span>
              </div>
            </>
          <div className="hq6-form-save-row">
            {mutation.isPending ? (
              <Hq6LoadProgress
                compact
                label={editId ? "Updating purchase" : "Saving purchase"}
                className="mb-2 w-full"
              />
            ) : null}
            <Hq6BusyButton
              className="hq6-btn-purple"
              busy={mutation.isPending}
              busyLabel={editId ? "Updating…" : "Saving…"}
              disabled={!canSave}
              onClick={handleSave}
            >
              {editId ? "Update" : "Save"}
            </Hq6BusyButton>
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
            ? "Update this purchase and save."
            : "Record a new purchase from a supplier."}
        </p>
      </div>

      {editId && existing ? (
        <div className="rounded border border-[var(--hq6-border,#ddd)] bg-[#f9f9f9] px-3 py-2 text-sm text-[#555]">
          Editing purchase <strong>{existing.reference}</strong> ({existing.status}). Changes
          update this record in place.
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
            <AsyncMenuSelect
              value={form.supplierId}
              selectedLabel={selectedSupplierLabel}
              placeholder="Select supplier…"
              loadOptions={loadSupplierOptions}
                  loadMoreOptions={loadMoreSupplierOptions}
              debounceMs={0}
              onChange={(supplierId) => patchForm({ supplierId })}
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
                      <ClearableNumberInput
                        min={1}
                        showZero
                        className="w-20 rounded border border-border px-2 py-1"
                        value={line.quantity}
                        onChange={(n) =>
                          updateLine(line.itemId, {
                            quantity: Math.max(1, n || 1),
                          })
                        }
                      />
                    </td>
                    <td className="py-2">
                      <ClearableNumberInput
                        min={0}
                        showZero
                        className="w-28 rounded border border-border px-2 py-1"
                        value={line.unitCost}
                        onChange={(n) =>
                          updateLine(line.itemId, { unitCost: n })
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

        <div className="flex flex-col items-end gap-2">
          {mutation.isPending ? (
            <Hq6LoadProgress
              compact
              label={editId ? "Updating purchase" : "Saving purchase"}
              className="w-full max-w-xs"
            />
          ) : null}
          <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => router.back()} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            isLoading={mutation.isPending}
            loadingText={editId ? "Updating…" : "Saving…"}
            onClick={handleSave}
            disabled={!canSave || mutation.isPending}
          >
            {editId ? "Update Purchase" : "Save Purchase"}
          </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
