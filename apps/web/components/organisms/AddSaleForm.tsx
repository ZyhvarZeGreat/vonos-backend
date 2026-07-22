"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Info, Minus, Plus, Trash2, X } from "lucide-react";
import type { Customer, Sale, TenantConfig } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { AsyncMenuSelect } from "@/components/molecules/AsyncMenuSelect";
import {
  ProductItemSearch,
  type CatalogPartPick,
} from "@/components/molecules/ProductItemSearch";
import { createCustomer, getCustomerContact, getCustomers } from "@/lib/api/customers";
import { getJob, getJobs } from "@/lib/api/jobs";
import { createSale, deleteSale, getSale } from "@/lib/api/sales";
import { getPaymentAccountsPage } from "@/lib/api/paymentAccounts";
import { getServiceStaff } from "@/lib/api/hrm";
import { TYPEAHEAD_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import {
  assertBusinessLocationSelected,
  useBusinessLocationOptions,
} from "@/lib/hooks/useBusinessLocationOptions";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatHq6Currency } from "@/lib/utils/hq6Format";
import type { SaleFormPresetStatus } from "@/stores/uiStore";
import { useQuery } from "@tanstack/react-query";

export interface SaleLineDraft {
  key: string;
  itemId?: string;
  sku: string;
  name: string;
  /** Line-level product description (HQ6 sell form). */
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  /** Line tax percent for display (HQ6). */
  taxPercent?: number;
  availableQty?: number;
  sourceLabel?: string;
  sourceTenantCode?: string;
  createPurchase?: boolean;
}

function lineSubtotal(line: SaleLineDraft): number {
  return Math.max(0, line.quantity * line.unitPrice - line.discount);
}

function emptyForm(presetStatus: SaleFormPresetStatus = "final") {
  return {
    locationCode: "",
    jobId: "",
    jobReference: "",
    customerId: "",
    customerName: "",
    customerLocation: "",
    billingAddress: "",
    shippingAddressDisplay: "",
    serviceStaffId: "",
    serviceStaffUserId: "",
    serviceStaffName: "",
    payTermValue: "",
    payTermUnit: "days",
    registerId: "",
    saleDate: new Date().toISOString().slice(0, 16),
    status: presetStatus,
    invoiceScheme: "default",
    invoiceNo: "",
    vehicleTimeIn: "",
    vehicleReleaseDate: "",
    discountType: "percentage",
    discountAmount: "0",
    redeemedPoints: "0",
    orderTax: "0",
    sellNote: "",
    shippingDetails: "",
    shippingAddress: "",
    shippingCharges: "0",
    shippingStatus: "pending",
    deliveredTo: "",
    deliveryPerson: "",
    paymentAmount: "",
    paidOn: new Date().toISOString().slice(0, 16),
    paymentMethod: "cash",
    paymentAccountId: "",
    paymentNote: "",
  };
}

function buildNotes(form: ReturnType<typeof emptyForm>): string | undefined {
  const parts: string[] = [];
  if (form.sellNote.trim()) parts.push(form.sellNote.trim());
  if (form.customerLocation.trim()) {
    parts.push(`Customer location: ${form.customerLocation.trim()}`);
  }
  if (form.payTermValue.trim()) {
    parts.push(`Pay term: ${form.payTermValue.trim()} ${form.payTermUnit}`);
  }
  if (form.vehicleTimeIn) {
    parts.push(`Vehicle time in: ${form.vehicleTimeIn}`);
  }
  if (form.vehicleReleaseDate) {
    parts.push(`Vehicle release: ${form.vehicleReleaseDate}`);
  }
  if (form.shippingDetails.trim()) {
    parts.push(`Shipping details: ${form.shippingDetails.trim()}`);
  }
  if (form.deliveredTo.trim()) {
    parts.push(`Delivered to: ${form.deliveredTo.trim()}`);
  }
  if (form.deliveryPerson.trim()) {
    parts.push(`Delivery person: ${form.deliveryPerson.trim()}`);
  }
  const charges = Number(form.shippingCharges) || 0;
  if (charges > 0) {
    parts.push(`Shipping charges: ${charges.toFixed(2)}`);
  }
  const redeemed = Number(form.redeemedPoints) || 0;
  if (redeemed > 0) {
    parts.push(`Redeemed points: ${redeemed}`);
  }
  if (form.invoiceScheme && form.invoiceScheme !== "default") {
    parts.push(`Invoice scheme: ${form.invoiceScheme}`);
  }
  return parts.length > 0 ? parts.join("\n") : undefined;
}

export interface AddSaleFormProps {
  tenantId: string;
  tenantConfig: TenantConfig | null | undefined;
  presetStatus?: SaleFormPresetStatus;
  /** Pre-select a job (VA: sale is the job's commercial record). */
  initialJobId?: string | null;
  /** Load an existing sale/draft/quotation for edit (create-replace). */
  editSaleId?: string | null;
  /** `page` = full Add Sale screen; `modal` = compact dialog body */
  variant?: "page" | "modal";
  onSuccess?: (sale: Sale) => void;
  onCancel?: () => void;
}

export function AddSaleForm({
  tenantId,
  tenantConfig,
  presetStatus = "final",
  initialJobId = null,
  editSaleId = null,
  variant = "page",
  onSuccess,
  onCancel,
}: AddSaleFormProps) {
  const { options: businessLocationOptions, required: locationRequired } =
    useBusinessLocationOptions(tenantConfig);
  const isProvisional = presetStatus === "draft" || presetStatus === "quotation";
  const showLocationField = (tenantConfig?.businessLocations?.length ?? 0) > 0;
  const requiresJob = tenantConfig?.archetype === "job";

  const [form, setForm] = useState(() => emptyForm(presetStatus));
  const [lines, setLines] = useState<SaleLineDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const printAfterSaveRef = useRef(false);
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [customerInfoOpen, setCustomerInfoOpen] = useState(false);
  const jobPrefillDone = useRef(false);
  const editPrefillDone = useRef(false);

  const { data: editSale } = useQuery({
    queryKey: ["sale", "edit", editSaleId],
    queryFn: () => getSale(editSaleId!, tenantId),
    enabled: Boolean(editSaleId),
  });

  useEffect(() => {
    if (!editSale || editPrefillDone.current) return;
    editPrefillDone.current = true;
    setForm((prev) => ({
      ...prev,
      locationCode: editSale.locationCode ?? "",
      jobId: editSale.jobId ?? "",
      jobReference: editSale.jobReference ?? "",
      customerId: editSale.customerId ?? "",
      customerName: editSale.customerName ?? "",
      invoiceNo: editSale.reference,
      saleDate: editSale.date
        ? new Date(editSale.date).toISOString().slice(0, 16)
        : prev.saleDate,
      sellNote: editSale.notes ?? "",
      shippingAddress: editSale.shippingAddress ?? "",
      shippingStatus: editSale.shippingStatus ?? "pending",
      discountAmount: String(editSale.discountAmount ?? 0),
      orderTax: String(editSale.taxAmount ?? 0),
      status:
        editSale.recordStatus === "draft" || editSale.recordStatus === "quotation"
          ? editSale.recordStatus
          : prev.status,
    }));
    setLines(
      editSale.lines.map((line, index) => ({
        key: `edit-${line.id}-${index}`,
        itemId: line.itemId ?? undefined,
        sku: line.sku,
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.discountAmount ?? 0,
      })),
    );
  }, [editSale]);

  const patchForm = useCallback(
    (patch: Partial<ReturnType<typeof emptyForm>>) => {
      setForm((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

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
  const shippingCharges = Number(form.shippingCharges) || 0;
  const totalPayable = Math.max(
    0,
    lineTotal - orderDiscount + orderTax + shippingCharges,
  );
  const paidAmount = Number(form.paymentAmount) || (isProvisional ? 0 : totalPayable);
  const balance = Math.max(0, totalPayable - paidAmount);
  const changeReturn = Math.max(0, paidAmount - totalPayable);

  const loadCustomerOptions = useCallback(
    async (query: string) => {
      const rows = await getCustomers(tenantId, {
        search: query || undefined,
        limit: TYPEAHEAD_PAGE_SIZE,
      });
      return [
        { value: "", label: "Walk-in customer" },
        ...rows.map((row) => ({
          value: row.id,
          label: row.businessName
            ? `${row.name} (${row.businessName})`
            : row.name,
        })),
      ];
    },
    [tenantId],
  );

  const loadStaffOptions = useCallback(
    async (query: string) => {
      const rows = await getServiceStaff(tenantId, query || undefined);
      return [
        { value: "", label: "Select service staff" },
        ...rows.map((row) => ({
          value: row.id,
          label: row.designationName
            ? `${row.name} · ${row.designationName}`
            : row.name,
        })),
      ];
    },
    [tenantId],
  );

  const loadPaymentAccountOptions = useCallback(
    async (query: string) => {
      const q = query.trim();
      const page = await getPaymentAccountsPage(
        tenantId,
        undefined,
        TYPEAHEAD_PAGE_SIZE,
        q ? { search: q } : undefined,
      );
      const rows = page.items;
      return [
        { value: "", label: "Select payment account" },
        ...rows.map((row) => ({
          value: row.id,
          label: row.name,
        })),
      ];
    },
    [tenantId],
  );

  const loadJobOptions = useCallback(
    async (query: string) => {
      const rows = await getJobs(tenantId, {
        search: query || undefined,
        limit: TYPEAHEAD_PAGE_SIZE,
      });
      return rows.map((row) => ({
        value: row.id,
        label: `${row.reference} · ${row.customerName ?? "No customer"} · ${row.status}`,
      }));
    },
    [tenantId],
  );

  const applyJob = useCallback(
    async (jobId: string | null) => {
      if (!jobId) {
        patchForm({ jobId: "", jobReference: "" });
        return;
      }
      const job = await getJob(jobId);
      setForm((prev) => ({
        ...prev,
        jobId: job.id,
        jobReference: job.reference,
        invoiceNo: prev.invoiceNo.trim() || job.reference,
        customerId: job.customerId ?? job.customer?.id ?? "",
        customerName: job.customer?.name ?? job.customerName ?? "",
        locationCode: job.locationCode ?? prev.locationCode,
      }));
      const materialLines: SaleLineDraft[] = job.materials.map((row) => ({
        key: `mat-${row.id}`,
        itemId: row.itemId ?? undefined,
        sku: row.itemId ?? `JOB-MAT`,
        name: row.name,
        quantity: row.quantity,
        unitPrice: row.unitCost,
        discount: 0,
      }));
      const labourLines: SaleLineDraft[] = job.labourEntries.map((row) => ({
        key: `lab-${row.id}`,
        sku: `LABOUR`,
        name: row.staffName ? `Labour · ${row.staffName}` : "Labour",
        quantity: row.hours,
        unitPrice: row.rate,
        discount: 0,
      }));
      const nextLines = [...materialLines, ...labourLines];
      if (nextLines.length > 0) {
        setLines(nextLines);
      } else if (job.invoiceAmount != null && job.invoiceAmount > 0) {
        setLines([
          {
            key: `job-${job.id}`,
            sku: `JOB-${job.reference}`,
            name: job.description || `Job ${job.reference}`,
            quantity: 1,
            unitPrice: job.invoiceAmount,
            discount: 0,
          },
        ]);
      }
    },
    [patchForm],
  );

  useEffect(() => {
    if (!initialJobId || jobPrefillDone.current) return;
    jobPrefillDone.current = true;
    void applyJob(initialJobId).catch(() => {
      patchForm({ jobId: initialJobId, jobReference: "" });
    });
  }, [applyJob, initialJobId, patchForm]);

  const addLineFromPick = (pick: CatalogPartPick) => {
    setLines((prev) => {
      const matchKey = pick.isCustom
        ? `custom:${pick.name.toLowerCase()}`
        : pick.itemId
          ? `item:${pick.itemId}`
          : `sku:${pick.sku}`;
      const existing = prev.find((row) => row.key === matchKey);
      if (existing) {
        return prev.map((row) =>
          row.key === matchKey ? { ...row, quantity: row.quantity + 1 } : row,
        );
      }
      return [
        ...prev,
        {
          key: matchKey,
          itemId: pick.isCustom ? undefined : pick.itemId,
          sku: pick.sku,
          name: pick.name,
          quantity: 1,
          unitPrice: pick.sellPrice || pick.costPrice || 0,
          discount: 0,
          availableQty: pick.availableQty,
          sourceLabel: pick.sourceLabel,
          sourceTenantCode: pick.sourceTenantCode,
          createPurchase: pick.isCustom || !pick.itemId,
        },
      ];
    });
  };

  const updateLine = (key: string, patch: Partial<SaleLineDraft>) => {
    setLines((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((row) => row.key !== key));
  };

  const applyCustomer = (customer: Customer | null) => {
    if (!customer) {
      patchForm({
        customerId: "",
        customerName: "",
        billingAddress: "",
        shippingAddressDisplay: "",
      });
      return;
    }
    const addressBits = [customer.phone, customer.email].filter(Boolean).join(" · ");
    patchForm({
      customerId: customer.id,
      customerName: customer.name,
      billingAddress: addressBits,
      shippingAddressDisplay: addressBits,
    });
  };

  const mutation = useAppMutation({
    mutationFn: async () => {
      assertBusinessLocationSelected(locationRequired, form.locationCode);
      if (requiresJob && !form.jobId.trim()) {
        throw new Error("Select a job — sales are linked to jobs for this entity");
      }
      if (lines.length === 0) throw new Error("Add at least one product");
      const reference =
        form.invoiceNo.trim() ||
        form.jobReference.trim() ||
        `SALE-${Date.now().toString(36).toUpperCase()}`;
      const shippingAddress =
        form.shippingAddress.trim() ||
        form.shippingAddressDisplay.trim() ||
        undefined;
      return createSale(tenantId, {
        reference,
        jobId: form.jobId.trim() || undefined,
        customerId: form.customerId || undefined,
        customerName: form.customerName.trim() || undefined,
        locationCode: form.locationCode.trim() || undefined,
        date: form.saleDate ? new Date(form.saleDate).toISOString() : undefined,
        status: form.status as "final" | "draft" | "quotation",
        discountAmount: orderDiscount,
        taxAmount: orderTax,
        notes: buildNotes(form),
        serviceStaffEmployeeId: form.serviceStaffId || undefined,
        cleanerUserId: form.serviceStaffUserId || undefined,
        cleanerName: form.serviceStaffName.trim() || undefined,
        shippingStatus: (form.shippingStatus || undefined) as
          | "pending"
          | "packed"
          | "shipped"
          | "delivered"
          | "cancelled"
          | undefined,
        shippingAddress,
        lines: lines.map((line) => ({
          itemId: line.createPurchase ? undefined : line.itemId,
          sku: line.sku,
          name: line.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountAmount: line.discount > 0 ? line.discount : undefined,
          createPurchase: line.createPurchase || undefined,
          sourceTenantCode: line.sourceTenantCode,
        })),
        payments: isProvisional
          ? []
          : [
              {
                amount: paidAmount,
                method: form.paymentMethod,
                note: form.paymentNote.trim() || undefined,
                accountId: form.paymentAccountId || undefined,
              },
            ],
      }).then(async (sale) => {
        if (editSaleId) {
          try {
            await deleteSale(tenantId, editSaleId);
          } catch {
            // Keep the new document even if archive of the previous fails.
          }
        }
        return sale;
      });
    },
    successMessage:
      editSaleId
        ? "Document updated"
        : presetStatus === "draft"
          ? "Draft saved"
          : presetStatus === "quotation"
            ? "Quotation saved"
            : "Sale recorded",
    onSuccess: (sale) => {
      if (printAfterSaveRef.current) {
        window.print();
      }
      printAfterSaveRef.current = false;
      setForm(emptyForm(presetStatus));
      setLines([]);
      setError(null);
      onSuccess?.(sale);
    },
    onError: (err: Error) => setError(err.message),
  });

  const quickCustomerMutation = useAppMutation({
    mutationFn: async () => {
      const name = quickCustomerName.trim();
      if (!name) throw new Error("Enter a customer name");
      return createCustomer(tenantId, { name });
    },
    successMessage: "Customer created",
    onSuccess: (customer) => {
      applyCustomer(customer);
      setQuickCustomerOpen(false);
      setQuickCustomerName("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const isHq6Page = useIsVaHq6() && variant === "page";

  const shellClass =
    variant === "page"
      ? "space-y-4"
      : "flex-1 space-y-4 overflow-y-auto px-1 pb-2";

  if (isHq6Page) {
    const isEditing = Boolean(editSaleId);
    const primaryLabel = isEditing
      ? mutation.isPending
        ? "Updating…"
        : "Update"
      : mutation.isPending
        ? "Saving…"
        : "Save";
    const printLabel = isEditing ? "Update and print" : "Save and print";

    return (
      <div className="space-y-4" aria-busy={mutation.isPending || undefined}>
        {showLocationField ? (
          <div className="hq6-form-location-bar">
            <select
              className="hq6-form-input"
              value={form.locationCode}
              onChange={(e) => patchForm({ locationCode: e.target.value })}
              aria-label="Business location"
            >
              {businessLocationOptions.map((opt) => (
                <option key={opt.value || "none"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {requiresJob ? (
          <section className="hq6-form-card">
            <label className="hq6-form-label">
              <span>
                Job <span className="req">*</span>
              </span>
              <AsyncMenuSelect
                value={form.jobId}
                selectedLabel={
                  form.jobReference
                    ? `${form.jobReference}${form.customerName ? ` · ${form.customerName}` : ""}`
                    : "Select job…"
                }
                placeholder="Search job reference or customer…"
                loadOptions={loadJobOptions}
                onChange={(id) => {
                  void applyJob(id || null).catch((err: Error) => setError(err.message));
                }}
              />
            </label>
          </section>
        ) : null}

        <section className="hq6-form-card">
          <div className="hq6-form-grid hq6-form-grid-3">
            <div className="space-y-3">
              <label className="hq6-form-label">
                <span>
                  Customer <span className="req">*</span>:
                </span>
                <div className="flex gap-1.5">
                  <div className="min-w-0 flex-1">
                    <AsyncMenuSelect
                      value={form.customerId}
                      selectedLabel={form.customerName || "Walk-In Customer"}
                      placeholder="Walk-In Customer"
                      loadOptions={loadCustomerOptions}
                      onChange={async (id) => {
                        if (!id) {
                          applyCustomer(null);
                          return;
                        }
                        try {
                          const contact = await getCustomerContact(id);
                          applyCustomer({
                            id: contact.id,
                            tenantId,
                            name: contact.name,
                            email: contact.email,
                            phone: contact.phone,
                            totalSpend: 0,
                            visitCount: contact.visitCount,
                            createdAt: contact.createdAt,
                            updatedAt: contact.createdAt,
                            totalSellDue: contact.totalSellDue,
                            status: contact.status,
                          });
                        } catch {
                          patchForm({ customerId: id, customerName: id });
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="hq6-btn hq6-btn-blue shrink-0"
                    title="Customer info"
                    onClick={() => setCustomerInfoOpen((open) => !open)}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="hq6-btn hq6-btn-blue shrink-0"
                    title="Add customer"
                    onClick={() => setQuickCustomerOpen((open) => !open)}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </label>
              {customerInfoOpen && form.customerId ? (
                <div className="rounded border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-xs text-[#374151]">
                  <div>
                    <strong>Customer:</strong> {form.customerName || "—"}
                  </div>
                  <div>
                    <strong>Billing:</strong> {form.billingAddress || "—"}
                  </div>
                </div>
              ) : null}
              {quickCustomerOpen ? (
                <div className="flex gap-2">
                  <input
                    className="hq6-form-input"
                    placeholder="New customer name"
                    value={quickCustomerName}
                    onChange={(e) => setQuickCustomerName(e.target.value)}
                  />
                  <button
                    type="button"
                    className="hq6-btn-purple shrink-0"
                    disabled={quickCustomerMutation.isPending}
                    onClick={() => quickCustomerMutation.mutate()}
                  >
                    Save
                  </button>
                </div>
              ) : null}
              <div className="hq6-form-grid hq6-form-grid-2">
                <div>
                  <div className="text-xs font-semibold text-[#374151]">
                    Billing Address:
                  </div>
                  <div className="hq6-form-static">
                    {form.billingAddress || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#374151]">
                    Shipping Address:
                  </div>
                  <div className="hq6-form-static">
                    {form.shippingAddressDisplay || "—"}
                  </div>
                </div>
              </div>
            </div>

            <label className="hq6-form-label">
              <span>Pay term:</span>
              <div className="hq6-form-pay-term">
                <input
                  className="hq6-form-input"
                  type="number"
                  min={0}
                  value={form.payTermValue}
                  onChange={(e) => patchForm({ payTermValue: e.target.value })}
                />
                <select
                  className="hq6-form-input"
                  value={form.payTermUnit}
                  onChange={(e) => patchForm({ payTermUnit: e.target.value })}
                >
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </label>

            <label className="hq6-form-label">
              <span>
                Sale Date <span className="req">*</span>:
              </span>
              <div className="hq6-form-input-wrap">
                <input
                  type="datetime-local"
                  className="hq6-form-input"
                  value={form.saleDate}
                  onChange={(e) => patchForm({ saleDate: e.target.value })}
                />
                <Calendar className="hq6-form-input-icon" aria-hidden />
              </div>
            </label>

            <label className="hq6-form-label">
              <span>
                Status <span className="req">*</span>:
              </span>
              <select
                className="hq6-form-input"
                value={form.status}
                onChange={(e) =>
                  patchForm({ status: e.target.value as SaleFormPresetStatus })
                }
              >
                <option value="final">Final</option>
                <option value="draft">Draft</option>
                <option value="quotation">Quotation</option>
              </select>
            </label>

            <label className="hq6-form-label">
              <span>Invoice scheme:*</span>
              <select
                className="hq6-form-input"
                value={form.invoiceScheme}
                onChange={(e) => patchForm({ invoiceScheme: e.target.value })}
              >
                <option value="default">Default</option>
              </select>
            </label>

            <label className="hq6-form-label">
              <span>Invoice No.:</span>
              <input
                className="hq6-form-input"
                value={form.invoiceNo}
                onChange={(e) => patchForm({ invoiceNo: e.target.value })}
                placeholder="Keep blank to auto generate"
              />
              <p className="hq6-form-hint">Keep blank to auto generate</p>
            </label>

            <label className="hq6-form-label">
              <span>
                Vehicle Time In (Date entered) <span className="req">*</span>
              </span>
              <div className="hq6-form-input-wrap">
                <input
                  type="datetime-local"
                  className="hq6-form-input"
                  value={form.vehicleTimeIn}
                  onChange={(e) => patchForm({ vehicleTimeIn: e.target.value })}
                />
                <Calendar className="hq6-form-input-icon" aria-hidden />
              </div>
            </label>

            <label className="hq6-form-label">
              <span>Vehicle Release Date:</span>
              <div className="hq6-form-input-wrap">
                <input
                  type="datetime-local"
                  className="hq6-form-input"
                  value={form.vehicleReleaseDate}
                  onChange={(e) =>
                    patchForm({ vehicleReleaseDate: e.target.value })
                  }
                />
                <Calendar className="hq6-form-input-icon" aria-hidden />
              </div>
            </label>

            <label className="hq6-form-label">
              <span>Customer location:</span>
              <input
                className="hq6-form-input"
                value={form.customerLocation}
                onChange={(e) => patchForm({ customerLocation: e.target.value })}
              />
            </label>

            <label className="hq6-form-label">
              <span>Attach Document:</span>
              <div className="hq6-form-file">
                <input
                  type="file"
                  accept=".pdf,.csv,.zip,.doc,.docx,.jpeg,.jpg,.png"
                />
              </div>
              <p className="hq6-form-hint">
                Max File size: 5MB
                <br />
                Allowed File: .pdf, .csv, .zip, .doc, .docx, .jpeg, .jpg, .png
              </p>
            </label>

            <label className="hq6-form-label">
              <span>Select service staff:</span>
              <AsyncMenuSelect
                value={form.serviceStaffId}
                selectedLabel={form.serviceStaffName || "Select service staff"}
                placeholder="Select service staff"
                loadOptions={loadStaffOptions}
                onChange={async (id) => {
                  if (!id) {
                    patchForm({
                      serviceStaffId: "",
                      serviceStaffUserId: "",
                      serviceStaffName: "",
                    });
                    return;
                  }
                  const rows = await getServiceStaff(tenantId);
                  const match = rows.find((row) => row.id === id);
                  patchForm({
                    serviceStaffId: id,
                    serviceStaffUserId: match?.userId ?? "",
                    serviceStaffName: match?.name ?? "",
                  });
                }}
              />
            </label>
          </div>
        </section>

        <section className="hq6-form-card">
          <div className="hq6-product-view-table-wrap">
            <table className="hq6-product-view-table hq6-sale-lines-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Discount</th>
                  <th>Tax</th>
                  <th className="text-right">Price inc. tax</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-[#9ca3af]">
                      Search and add products below
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => {
                    const taxPct = line.taxPercent ?? 0;
                    const pretax = lineSubtotal(line);
                    const taxAmt = (pretax * taxPct) / 100;
                    return (
                      <tr key={line.key}>
                        <td className="hq6-sale-line-product">
                          <div className="font-medium">{line.name}</div>
                          <div className="text-xs text-[#6b7280]">{line.sku}</div>
                          <textarea
                            className="hq6-form-input mt-1"
                            rows={2}
                            placeholder="Product Description"
                            value={line.description ?? ""}
                            onChange={(e) =>
                              updateLine(line.key, {
                                description: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td>
                          <div className="hq6-form-qty">
                            <button
                              type="button"
                              className="hq6-form-qty-btn plus"
                              aria-label="Increase quantity"
                              onClick={() =>
                                updateLine(line.key, {
                                  quantity: line.quantity + 1,
                                })
                              }
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={line.quantity}
                              onChange={(e) =>
                                updateLine(line.key, {
                                  quantity: Math.max(
                                    1,
                                    Number(e.target.value) || 1,
                                  ),
                                })
                              }
                            />
                            <button
                              type="button"
                              className="hq6-form-qty-btn minus"
                              aria-label="Decrease quantity"
                              onClick={() =>
                                updateLine(line.key, {
                                  quantity: Math.max(1, line.quantity - 1),
                                })
                              }
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) =>
                              updateLine(line.key, {
                                unitPrice: Math.max(
                                  0,
                                  Number(e.target.value) || 0,
                                ),
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.discount}
                            onChange={(e) =>
                              updateLine(line.key, {
                                discount: Math.max(
                                  0,
                                  Number(e.target.value) || 0,
                                ),
                              })
                            }
                          />
                        </td>
                        <td>
                          <select
                            value={String(taxPct)}
                            onChange={(e) =>
                              updateLine(line.key, {
                                taxPercent: Number(e.target.value) || 0,
                              })
                            }
                          >
                            <option value="0">None</option>
                            <option value="7.5">VAT@7.5%</option>
                          </select>
                          <div className="mt-1 text-xs tabular-nums text-[#6b7280]">
                            {formatHq6Currency(taxAmt)}
                          </div>
                        </td>
                        <td className="text-right tabular-nums">
                          {formatHq6Currency(pretax + taxAmt)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="hq6-form-row-remove"
                            aria-label="Remove line"
                            onClick={() => removeLine(line.key)}
                          >
                            <X className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="hq6-form-products-toolbar mt-3">
            <div className="hq6-form-products-search">
              <ProductItemSearch
                tenantId={tenantId}
                tenantCode={tenantConfig?.code}
                retailOnly={false}
                includeWarehouse
                allowCustom
                businessLocations={tenantConfig?.businessLocations}
                onSelect={addLineFromPick}
                placeholder="Enter Product name / SKU / Scan bar code"
              />
            </div>
            <div className="hq6-form-table-footer !border-0 !mt-0 !pt-0 shrink-0">
              <span>
                Items: <strong>{lines.length.toFixed(2)}</strong>
              </span>
              <span>
                Total: <strong>{formatHq6Currency(lineTotal)}</strong>
              </span>
            </div>
          </div>
        </section>

        <section className="hq6-form-card">
          <div className="hq6-sale-discount-layout">
            <div className="hq6-form-grid hq6-form-grid-2">
              <label className="hq6-form-label">
                <span>
                  Discount Type <span className="req">*</span>
                </span>
                <select
                  className="hq6-form-input"
                  value={form.discountType}
                  onChange={(e) => patchForm({ discountType: e.target.value })}
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                </select>
              </label>
              <label className="hq6-form-label">
                <span>
                  Discount Amount <span className="req">*</span>
                </span>
                <input
                  type="number"
                  min={0}
                  className="hq6-form-input"
                  value={form.discountAmount}
                  onChange={(e) =>
                    patchForm({ discountAmount: e.target.value })
                  }
                />
              </label>
              <label className="hq6-form-label">
                <span>Redeemed:</span>
                <input
                  type="number"
                  min={0}
                  className="hq6-form-input"
                  value={form.redeemedPoints}
                  onChange={(e) =>
                    patchForm({ redeemedPoints: e.target.value })
                  }
                />
              </label>
              <div className="hq6-form-summary-line self-end">
                Available: 0.00
              </div>
              <label className="hq6-form-label">
                <span>
                  Order Tax <span className="req">*</span>
                </span>
                <input
                  type="number"
                  min={0}
                  className="hq6-form-input"
                  value={form.orderTax}
                  onChange={(e) => patchForm({ orderTax: e.target.value })}
                />
              </label>
              <label className="hq6-form-label" style={{ gridColumn: "1 / -1" }}>
                <span>Sell note:</span>
                <textarea
                  className="hq6-form-input"
                  rows={3}
                  value={form.sellNote}
                  onChange={(e) => patchForm({ sellNote: e.target.value })}
                />
              </label>
            </div>
            <aside className="hq6-sale-totals-panel">
              <div className="hq6-form-summary-line">
                <span>Items:</span>
                <strong>{lines.length.toFixed(2)}</strong>
              </div>
              <div className="hq6-form-summary-line">
                <span>Total:</span>
                <strong>{formatHq6Currency(lineTotal)}</strong>
              </div>
              <div className="hq6-form-summary-line">
                <span>Discount:(-)</span>
                <strong>{formatHq6Currency(orderDiscount)}</strong>
              </div>
              <div className="hq6-form-summary-line">
                <span>Order Tax:(+)</span>
                <strong>{formatHq6Currency(orderTax)}</strong>
              </div>
            </aside>
          </div>
        </section>

        <section className="hq6-form-card">
          <div className="hq6-form-grid hq6-form-grid-2">
            <label className="hq6-form-label">
              <span>Shipping Details:</span>
              <textarea
                className="hq6-form-input"
                rows={2}
                value={form.shippingDetails}
                onChange={(e) => patchForm({ shippingDetails: e.target.value })}
              />
            </label>
            <label className="hq6-form-label">
              <span>Shipping Address:</span>
              <textarea
                className="hq6-form-input"
                rows={2}
                value={form.shippingAddress}
                onChange={(e) => patchForm({ shippingAddress: e.target.value })}
              />
            </label>
            <label className="hq6-form-label">
              <span>Shipping Charges:</span>
              <input
                type="number"
                min={0}
                className="hq6-form-input"
                value={form.shippingCharges}
                onChange={(e) => patchForm({ shippingCharges: e.target.value })}
              />
            </label>
            <label className="hq6-form-label">
              <span>Shipping Status:</span>
              <select
                className="hq6-form-input"
                value={form.shippingStatus}
                onChange={(e) => patchForm({ shippingStatus: e.target.value })}
              >
                <option value="pending">Ordered</option>
                <option value="packed">Packed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label className="hq6-form-label">
              <span>Delivered To:</span>
              <input
                className="hq6-form-input"
                value={form.deliveredTo}
                onChange={(e) => patchForm({ deliveredTo: e.target.value })}
              />
            </label>
            <label className="hq6-form-label">
              <span>Delivery Person:</span>
              <input
                className="hq6-form-input"
                value={form.deliveryPerson}
                onChange={(e) => patchForm({ deliveryPerson: e.target.value })}
              />
            </label>
            <label className="hq6-form-label">
              <span>Attach Document:</span>
              <div className="hq6-form-file">
                <input
                  type="file"
                  accept=".pdf,.csv,.zip,.doc,.docx,.jpeg,.jpg,.png"
                />
              </div>
            </label>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <button type="button" className="hq6-form-expenses-link self-start">
              <Plus className="h-3.5 w-3.5" />
              Add additional expenses
            </button>
            <div className="hq6-product-view-table-wrap">
              <table className="hq6-product-view-table">
                <thead>
                  <tr>
                    <th>Additional expense name</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2].map((index) => (
                    <tr key={index}>
                      <td>
                        <input
                          className="hq6-form-input"
                          placeholder="Additional expense name"
                          aria-label={`Additional expense name ${index + 1}`}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="hq6-form-input"
                          placeholder="0.00"
                          aria-label={`Additional expense amount ${index + 1}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="hq6-form-total-row">
            Total Payable: {formatHq6Currency(totalPayable)}
          </div>
        </section>

        {!isProvisional ? (
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
                  className="hq6-form-input"
                  value={form.paymentAmount || String(totalPayable)}
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
                  onChange={(e) =>
                    patchForm({ paymentMethod: e.target.value })
                  }
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="hq6-form-label">
                <span>Payment Account:</span>
                <AsyncMenuSelect
                  value={form.paymentAccountId}
                  placeholder="None"
                  loadOptions={loadPaymentAccountOptions}
                  onChange={(id) => patchForm({ paymentAccountId: id })}
                />
              </label>
              <label className="hq6-form-label" style={{ gridColumn: "1 / -1" }}>
                <span>Payment note:</span>
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
                Change Return: <strong>{formatHq6Currency(changeReturn)}</strong>
              </span>
              <span>
                Balance: <strong>{formatHq6Currency(balance)}</strong>
              </span>
            </div>
          </section>
        ) : (
          <section className="hq6-form-card text-sm text-[#6b7280]">
            Payment is recorded when the{" "}
            {presetStatus === "draft" ? "draft" : "quotation"} is converted to a
            final sale.
          </section>
        )}

        {error ? <p className="text-sm text-[#dc2626]">{error}</p> : null}

        <div className="hq6-form-save-row">
          {onCancel ? (
            <button
              type="button"
              className="hq6-modal-btn hq6-modal-btn-close"
              onClick={onCancel}
            >
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            className="hq6-btn-purple"
            disabled={lines.length === 0 || mutation.isPending}
            onClick={() => {
              printAfterSaveRef.current = false;
              mutation.mutate();
            }}
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            className="hq6-btn-green"
            disabled={lines.length === 0 || mutation.isPending}
            onClick={() => {
              printAfterSaveRef.current = true;
              mutation.mutate();
            }}
          >
            {printLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass} aria-busy={mutation.isPending || undefined}>
      {editSaleId && editSale ? (
        <p className="rounded-md border border-[var(--hq6-border,#ddd)] bg-[#f9f9f9] px-3 py-2 text-sm text-[#555]">
          Editing <strong>{editSale.reference}</strong>
          {editSale.recordStatus ? ` (${editSale.recordStatus})` : ""}. Saving replaces
          this document with your updates.
        </p>
      ) : null}
      {mutation.isPending ? (
        <p className="rounded-md border border-border bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-muted">
          Saving sale…
        </p>
      ) : null}
      {showLocationField ? (
        <div className="max-w-md">
          <Select
            label="Business location"
            value={form.locationCode}
            onChange={(e) => patchForm({ locationCode: e.target.value })}
            options={businessLocationOptions}
          />
        </div>
      ) : null}

      {requiresJob ? (
        <div className="max-w-xl rounded-lg border border-border bg-card p-4">
          <label className="mb-1 block text-xs font-medium text-muted">
            Job <span className="text-red-600">*</span>
          </label>
          <AsyncMenuSelect
            value={form.jobId}
            selectedLabel={
              form.jobReference
                ? `${form.jobReference}${form.customerName ? ` · ${form.customerName}` : ""}`
                : "Select job…"
            }
            placeholder="Search job reference or customer…"
            loadOptions={loadJobOptions}
            onChange={(id) => {
              void applyJob(id || null).catch((err: Error) =>
                setError(err.message),
              );
            }}
          />
          <p className="mt-2 text-xs text-muted">
            For Automotive, the sale is the job&apos;s commercial record. Parts
            already issued on the job are not deducted again.
          </p>
        </div>
      ) : null}

      <section className="grid gap-4 rounded-lg border border-border bg-card p-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-xs font-medium text-muted">
                Customer
              </label>
              <AsyncMenuSelect
                value={form.customerId}
                selectedLabel={form.customerName || "Walk-in customer"}
                placeholder="Search customer…"
                loadOptions={loadCustomerOptions}
                onChange={async (id) => {
                  if (!id) {
                    applyCustomer(null);
                    return;
                  }
                  try {
                    const contact = await getCustomerContact(id);
                    applyCustomer({
                      id: contact.id,
                      tenantId,
                      name: contact.name,
                      email: contact.email,
                      phone: contact.phone,
                      totalSpend: 0,
                      visitCount: contact.visitCount,
                      createdAt: contact.createdAt,
                      updatedAt: contact.createdAt,
                      totalSellDue: contact.totalSellDue,
                      status: contact.status,
                    });
                  } catch {
                    patchForm({ customerId: id, customerName: id });
                  }
                }}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0"
              onClick={() => setQuickCustomerOpen((open) => !open)}
              title="Add customer"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {quickCustomerOpen ? (
            <div className="flex gap-2 rounded-md border border-border p-2">
              <Input
                label="New customer name"
                value={quickCustomerName}
                onChange={(e) => setQuickCustomerName(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                className="mt-6"
                disabled={quickCustomerMutation.isPending}
                onClick={() => quickCustomerMutation.mutate()}
              >
                Save
              </Button>
            </div>
          ) : null}
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-md border border-border bg-[var(--color-surface-muted)] px-3 py-2">
              <p className="text-xs font-medium text-muted">Billing Address:</p>
              <p className="mt-1 min-h-[2.5rem] text-foreground">
                {form.billingAddress || "—"}
              </p>
            </div>
            <div className="rounded-md border border-border bg-[var(--color-surface-muted)] px-3 py-2">
              <p className="text-xs font-medium text-muted">Shipping Address:</p>
              <p className="mt-1 min-h-[2.5rem] text-foreground">
                {form.shippingAddressDisplay || "—"}
              </p>
            </div>
          </div>
          <Input
            label="Customer location"
            value={form.customerLocation}
            onChange={(e) => patchForm({ customerLocation: e.target.value })}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Service Staff
            </label>
            <AsyncMenuSelect
              value={form.serviceStaffId}
              selectedLabel={form.serviceStaffName || "Select service staff"}
              placeholder="Select service staff"
              loadOptions={loadStaffOptions}
              onChange={async (id) => {
                if (!id) {
                  patchForm({
                    serviceStaffId: "",
                    serviceStaffUserId: "",
                    serviceStaffName: "",
                  });
                  return;
                }
                const rows = await getServiceStaff(tenantId);
                const match = rows.find((row) => row.id === id);
                patchForm({
                  serviceStaffId: id,
                  serviceStaffUserId: match?.userId ?? "",
                  serviceStaffName: match?.name ?? "",
                });
              }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_8rem] gap-2">
            <Input
              label="Pay term"
              type="number"
              min="0"
              value={form.payTermValue}
              onChange={(e) => patchForm({ payTermValue: e.target.value })}
              placeholder="e.g. 30"
            />
            <Select
              label=" "
              value={form.payTermUnit}
              onChange={(e) => patchForm({ payTermUnit: e.target.value })}
              options={[
                { value: "days", label: "Days" },
                { value: "months", label: "Months" },
              ]}
            />
          </div>
          <Input
            label="Sale Date"
            type="datetime-local"
            value={form.saleDate}
            onChange={(e) => patchForm({ saleDate: e.target.value })}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) =>
              patchForm({
                status: e.target.value as SaleFormPresetStatus,
              })
            }
            options={[
              { value: "final", label: "Final" },
              { value: "draft", label: "Draft" },
              { value: "quotation", label: "Quotation" },
            ]}
          />
          <Select
            label="Invoice scheme"
            value={form.invoiceScheme}
            onChange={(e) => patchForm({ invoiceScheme: e.target.value })}
            options={[{ value: "default", label: "Default" }]}
          />
          <Input
            label="Invoice No."
            value={form.invoiceNo}
            onChange={(e) => patchForm({ invoiceNo: e.target.value })}
            placeholder="Keep blank to auto generate"
          />
          <Input
            label="Vehicle Time In (Date entered)"
            type="datetime-local"
            value={form.vehicleTimeIn}
            onChange={(e) => patchForm({ vehicleTimeIn: e.target.value })}
          />
          <Input
            label="Vehicle Release Date"
            type="datetime-local"
            value={form.vehicleReleaseDate}
            onChange={(e) => patchForm({ vehicleReleaseDate: e.target.value })}
          />
          <p className="text-xs text-muted">
            Attach document: not wired yet (max 5MB — pdf, csv, zip, doc, images).
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Quantity</th>
                <th className="px-3 py-2 font-medium">Unit Price</th>
                <th className="px-3 py-2 font-medium">Discount</th>
                <th className="px-3 py-2 font-medium text-right">Subtotal</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted">
                    Search and add products below
                  </td>
                </tr>
              ) : (
                lines.map((line, index) => (
                  <tr
                    key={line.key}
                    className="border-b border-[var(--color-border-subtle)]"
                  >
                    <td className="px-3 py-2 text-muted">{index + 1}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-foreground">{line.name}</div>
                        <div className="text-xs text-muted">{line.sku}</div>
                        {line.sourceLabel ? (
                          <div className="text-xs text-muted">{line.sourceLabel}</div>
                        ) : null}
                        {line.availableQty != null && !line.createPurchase ? (
                          <div
                            className={
                              line.availableQty <= 5
                                ? "text-xs font-medium text-amber-600"
                                : "text-xs text-muted"
                            }
                          >
                            {line.availableQty} in stock
                          </div>
                        ) : null}
                        {line.createPurchase ? (
                          <div className="text-xs text-amber-600">
                            Will add to Purchases
                          </div>
                        ) : null}
                      </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(line.key, {
                            quantity: Math.max(1, Number(e.target.value) || 1),
                          })
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
            Total:{" "}
            <strong className="text-foreground">{formatCurrency(lineTotal)}</strong>
          </span>
        </div>
        <div className="border-t border-border px-3 py-2">
          <ProductItemSearch
            tenantId={tenantId}
            tenantCode={tenantConfig?.code}
            retailOnly={false}
            includeWarehouse
            allowCustom
            businessLocations={tenantConfig?.businessLocations}
            onSelect={addLineFromPick}
            placeholder="Search own products or warehouse parts…"
          />
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-border bg-card p-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Discount Type"
              value={form.discountType}
              onChange={(e) => patchForm({ discountType: e.target.value })}
              options={[
                { value: "percentage", label: "Percentage" },
                { value: "fixed", label: "Fixed" },
              ]}
            />
            <Input
              label="Discount Amount"
              type="number"
              min="0"
              value={form.discountAmount}
              onChange={(e) => patchForm({ discountAmount: e.target.value })}
            />
          </div>
          <p className="text-sm text-muted">
            Discount Amount:(-) {formatCurrency(orderDiscount)}
          </p>
          <Input
            label="Redeemed"
            type="number"
            min="0"
            value={form.redeemedPoints}
            onChange={(e) => patchForm({ redeemedPoints: e.target.value })}
          />
          <Input
            label="Order Tax"
            type="number"
            min="0"
            value={form.orderTax}
            onChange={(e) => patchForm({ orderTax: e.target.value })}
          />
          <p className="text-sm text-muted">
            Order Tax:(+) {formatCurrency(orderTax)}
          </p>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Sell note</span>
            <textarea
              value={form.sellNote}
              onChange={(e) => patchForm({ sellNote: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Shipping Details</span>
            <textarea
              value={form.shippingDetails}
              onChange={(e) => patchForm({ shippingDetails: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Shipping Address</span>
            <textarea
              value={form.shippingAddress}
              onChange={(e) => patchForm({ shippingAddress: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </label>
          <Input
            label="Shipping Charges"
            type="number"
            min="0"
            value={form.shippingCharges}
            onChange={(e) => patchForm({ shippingCharges: e.target.value })}
          />
          <Select
            label="Shipping Status"
            value={form.shippingStatus}
            onChange={(e) => patchForm({ shippingStatus: e.target.value })}
            options={[
              { value: "pending", label: "Pending" },
              { value: "packed", label: "Packed" },
              { value: "shipped", label: "Shipped" },
              { value: "delivered", label: "Delivered" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
          <Input
            label="Delivered To"
            value={form.deliveredTo}
            onChange={(e) => patchForm({ deliveredTo: e.target.value })}
          />
          <Input
            label="Delivery Person"
            value={form.deliveryPerson}
            onChange={(e) => patchForm({ deliveryPerson: e.target.value })}
          />
          <div className="flex justify-end border-t border-border pt-3 text-base font-semibold">
            Total Payable: {formatCurrency(totalPayable)}
          </div>
        </div>
      </section>

      {!isProvisional ? (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">Add payment</p>
          <p className="text-sm text-muted">
            Advance Balance: {formatCurrency(0)}
          </p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Amount"
              type="number"
              min="0"
              value={form.paymentAmount || String(totalPayable)}
              onChange={(e) => patchForm({ paymentAmount: e.target.value })}
            />
            <Input
              label="Paid on"
              type="datetime-local"
              value={form.paidOn}
              onChange={(e) => patchForm({ paidOn: e.target.value })}
            />
            <Select
              label="Payment Method"
              value={form.paymentMethod}
              onChange={(e) => patchForm({ paymentMethod: e.target.value })}
              options={[
                { value: "cash", label: "Cash" },
                { value: "card", label: "Card" },
                { value: "transfer", label: "Bank Transfer" },
                { value: "cheque", label: "Cheque" },
                { value: "other", label: "Other" },
              ]}
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Payment Account
              </label>
              <AsyncMenuSelect
                value={form.paymentAccountId}
                placeholder="Select payment account"
                loadOptions={loadPaymentAccountOptions}
                onChange={(id) => patchForm({ paymentAccountId: id })}
              />
            </div>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Payment note</span>
            <textarea
              value={form.paymentNote}
              onChange={(e) => patchForm({ paymentNote: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap justify-between gap-4 text-sm font-semibold">
            <span>Change Return: {formatCurrency(changeReturn)}</span>
            <span>Balance: {formatCurrency(balance)}</span>
          </div>
        </section>
      ) : (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted">
          Payment is recorded when the{" "}
          {presetStatus === "draft" ? "draft" : "quotation"} is converted to a
          final sale.
        </p>
      )}

      {error ? <p className="text-sm text-error">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-center gap-3 pb-2">
        {onCancel ? (
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button
          size="sm"
          isLoading={mutation.isPending}
          loadingText="Saving…"
          disabled={lines.length === 0}
          onClick={() => {
            printAfterSaveRef.current = false;
            mutation.mutate();
          }}
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="secondary"
          isLoading={mutation.isPending}
          loadingText="Saving…"
          disabled={lines.length === 0}
          onClick={() => {
            printAfterSaveRef.current = true;
            mutation.mutate();
          }}
        >
          Save and print
        </Button>
      </div>
    </div>
  );
}
