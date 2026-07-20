"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { createSale } from "@/lib/api/sales";
import { getPaymentAccountsPage } from "@/lib/api/paymentAccounts";
import { getServiceStaff } from "@/lib/api/hrm";
import { TYPEAHEAD_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import {
  assertBusinessLocationSelected,
  useBusinessLocationOptions,
} from "@/lib/hooks/useBusinessLocationOptions";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { SaleFormPresetStatus } from "@/stores/uiStore";

export interface SaleLineDraft {
  key: string;
  itemId?: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
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
  const jobPrefillDone = useRef(false);

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
      });
    },
    successMessage:
      presetStatus === "draft"
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

  const shellClass =
    variant === "page"
      ? "space-y-4"
      : "flex-1 space-y-4 overflow-y-auto px-1 pb-2";

  return (
    <div className={shellClass} aria-busy={mutation.isPending || undefined}>
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
