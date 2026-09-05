"use client";

import { Hq6DateTimeInput } from "@/components/hq6/Hq6DateTimeInput";

import { saleCustomerSchema } from "@/lib/validation/schemas";
import { parseForm } from "@/lib/validation/parseForm";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Minus, Plus, Trash2, X } from "lucide-react";
import type { Customer, SaleDetail, TenantConfig } from "@vonos/types";
import { isGroupStockConsumerTenant, isOutsideOrServiceCatalogItem } from "@vonos/types";
import { tenantPath } from "@/lib/utils/tenantMount";
import { Button } from "@/components/atoms/Button";
import { ClearableNumberInput } from "@/components/atoms/ClearableNumberInput";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { AsyncMenuSelect } from "@/components/molecules/AsyncMenuSelect";
import {
  ProductItemSearch,
  type CatalogPartPick,
} from "@/components/molecules/ProductItemSearch";
import { Hq6AddSupplierModal } from "@/components/hq6/Hq6AddSupplierModal";
import { Hq6BusyButton } from "@/components/hq6/Hq6BusyButton";
import { createCustomer, getCustomerContact, getCustomersForPicker, loadMoreCustomersForPicker, customersPickerHasMore } from "@/lib/api/customers";
import { getJob, getJobs } from "@/lib/api/jobs";
import { createSale, getSale, updateSale, addSalePayment } from "@/lib/api/sales";
import { getPaymentAccountsForPicker } from "@/lib/api/paymentAccounts";
import { getServiceStaff, loadMoreServiceStaffForPicker, serviceStaffPickerHasMore, getEmployees, loadMoreEmployeesForPicker, employeePickerHasMore } from "@/lib/api/hrm";
import { getSuppliersForPicker, loadMoreSuppliersForPicker, suppliersPickerHasMore } from "@/lib/api/suppliers";
import {
  assertBusinessLocationSelected,
  useEntitySaleLocationOptions,
} from "@/lib/hooks/useBusinessLocationOptions";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatHq6Currency } from "@/lib/utils/hq6Format";
import { canAddPaymentForStatus } from "@/lib/utils/hq6PaymentBadge";
import {
  customerPickerLabel,
  paymentAccountPickerLabel,
} from "@/lib/utils/pickerLabels";
import {
  parseSaleInvoiceNotes,
  withSaleInvoiceNoteFields,
} from "@/lib/utils/saleInvoiceNotes";
import { toast } from "@/stores/toastStore";
import type { SaleFormPresetStatus } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
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
  /** Catalog cost — shown on the line, not used for sale total. */
  costPrice?: number;
  discount: number;
  /** Line tax percent for display (HQ6). */
  taxPercent?: number;
  availableQty?: number;
  sourceLabel?: string;
  sourceTenantCode?: string;
  isOutsideOrService?: boolean;
  createPurchase?: boolean;
  /** Optional supplier for custom / purchase lines. */
  supplierId?: string;
  supplierName?: string;
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
    salesPersonId: "",
    salesPersonName: "",
    plateNumber: "",
    carModelYear: "",
    mileage: "",
    payTermValue: "",
    payTermUnit: "",
    registerId: "",
    saleDate: new Date().toISOString().slice(0, 16),
    status: presetStatus,
    invoiceScheme: "default",
    invoiceNo: "",
    vehicleTimeIn: "",
    vehicleReleaseDate: "",
    discountType: "percentage",
    discountAmount: "",
    redeemedPoints: "",
    orderTax: "",
    sellNote: "",
    shippingDetails: "",
    shippingAddress: "",
    shippingCharges: "",
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

function employeeLabelName(label: string): string {
  const base = label.split(" · ")[0]?.trim() || label.trim();
  if (
    !base ||
    /^select service staff$/i.test(base) ||
    /^select sales person$/i.test(base)
  ) {
    return "";
  }
  return base;
}

function buildNotes(
  form: ReturnType<typeof emptyForm>,
  additionalExpenses: Array<{ name: string; amount: string }> = [],
): string | undefined {
  const parts: string[] = [];
  if (form.sellNote.trim()) parts.push(form.sellNote.trim());
  if (form.customerLocation.trim()) {
    parts.push(`Customer location: ${form.customerLocation.trim()}`);
  }
  if (form.payTermValue.trim()) {
    parts.push(`Pay term: ${form.payTermValue.trim()} ${form.payTermUnit}`);
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
  for (const expense of additionalExpenses) {
    const amount = Number(expense.amount) || 0;
    const name = expense.name.trim();
    if (!name && amount <= 0) continue;
    parts.push(
      `Additional expense: ${name || "Untitled"} (${amount.toFixed(2)})`,
    );
  }
  const redeemed = Number(form.redeemedPoints) || 0;
  if (redeemed > 0) {
    parts.push(`Redeemed points: ${redeemed}`);
  }
  if (form.invoiceScheme && form.invoiceScheme !== "default") {
    parts.push(`Invoice scheme: ${form.invoiceScheme}`);
  }
  return withSaleInvoiceNoteFields(parts.join("\n") || undefined, {
    salesPerson: form.salesPersonName.trim() || null,
    serviceStaff: form.serviceStaffName.trim() || null,
    mileage: form.mileage.trim() || null,
    plateNumber: form.plateNumber.trim() || null,
    carModelYear: form.carModelYear.trim() || null,
    vehicleTimeIn: form.vehicleTimeIn || null,
    vehicleRelease: form.vehicleReleaseDate || null,
  });
}

export interface AddSaleFormProps {
  tenantId: string;
  tenantConfig: TenantConfig | null | undefined;
  presetStatus?: SaleFormPresetStatus;
  /** Optional job to prefill (Automotive). Job link is not required to save. */
  initialJobId?: string | null;
  /** Load an existing sale/draft/quotation for edit (create-replace). */
  editSaleId?: string | null;
  /** `page` = full Add Sale screen; `modal` = compact dialog body */
  variant?: "page" | "modal";
  onSuccess?: (sale: SaleDetail, options?: { print?: boolean }) => void;
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
  const router = useRouter();
  const authUserName = useAuthStore((s) => s.name);
  const {
    options: businessLocationOptions,
    required: locationRequired,
    locations: saleLocations,
    defaultCode: defaultLocationCode,
  } = useEntitySaleLocationOptions(tenantConfig);
  const showLocationField = saleLocations.length > 0;
  const isJobTenant =
    tenantConfig?.archetype === "job" ||
    isGroupStockConsumerTenant(tenantConfig?.code);
  /** VA / VP: price catalog — may pick VW/VISP/VSP lines for pricing; never gate on stock. */
  const groupStockConsumer = isGroupStockConsumerTenant(tenantConfig?.code);
  const allowCrossEntitySource = groupStockConsumer;
  const includeWarehouseSearch =
    groupStockConsumer || (!groupStockConsumer && !isJobTenant);
  const ownCatalogSearch = true;
  /** Job link is optional — only used for stock skip / prefill when chosen. */
  const showJobField = isJobTenant;

  const [form, setForm] = useState(() => {
    const base = emptyForm(presetStatus);
    if (defaultLocationCode) {
      return { ...base, locationCode: defaultLocationCode };
    }
    return base;
  });

  // Default Sales Person to the signed-in user (can be changed via dropdown).
  useEffect(() => {
    if (!authUserName?.trim()) return;
    setForm((prev) => {
      if (prev.salesPersonName.trim()) return prev;
      return { ...prev, salesPersonName: authUserName.trim() };
    });
  }, [authUserName]);
  const isProvisional =
    form.status === "draft" || form.status === "quotation";
  const [lines, setLines] = useState<SaleLineDraft[]>([]);
  const [additionalExpenses, setAdditionalExpenses] = useState<
    Array<{ key: string; name: string; amount: string }>
  >([
    { key: "exp-0", name: "", amount: "" },
    { key: "exp-1", name: "", amount: "" },
    { key: "exp-2", name: "", amount: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const printAfterSaveRef = useRef(false);
  const [saveIntent, setSaveIntent] = useState<"save" | "print" | null>(null);
  const [customerAdvanceBalance, setCustomerAdvanceBalance] = useState(0);
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [customerInfoOpen, setCustomerInfoOpen] = useState(false);
  const [addSupplierForLineKey, setAddSupplierForLineKey] = useState<
    string | null
  >(null);
  const jobPrefillDone = useRef(false);
  const editPrefillDone = useRef<string | false>(false);
  /** Locked at Save click so optimistic leave cannot race form.status. */
  const pendingSaveStatusRef = useRef<SaleFormPresetStatus | null>(null);

  // New quotation/draft/sale pages must keep the route preset (do not drift to Final).
  useEffect(() => {
    if (editSaleId) return;
    setForm((prev) =>
      prev.status === presetStatus ? prev : { ...prev, status: presetStatus },
    );
  }, [editSaleId, presetStatus]);

  // Warm customer / staff / payment-account pickers with the page.
  useEffect(() => {
    if (!tenantId) return;
    void getCustomersForPicker(tenantId);
    void getServiceStaff(tenantId);
    void getPaymentAccountsForPicker(tenantId);
  }, [tenantId]);

  const { data: supplierOptions = [] } = useQuery({
    queryKey: ["suppliers", "sale-line", tenantId],
    queryFn: () => getSuppliersForPicker(tenantId!),
    enabled: Boolean(tenantId) && lines.some((l) => l.createPurchase),
    staleTime: Infinity,
  });

  const loadSupplierOptions = useCallback(
    async (query: string) => {
      if (!tenantId) {
        return { options: [{ value: "", label: "No supplier" }], hasMore: false };
      }
      const rows = await getSuppliersForPicker(tenantId, query || undefined);
      return {
        options: [
          { value: "", label: "No supplier" },
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

  // Default to this entity's location once config loads (or if empty / foreign).
  useEffect(() => {
    if (!defaultLocationCode) return;
    const allowed = new Set(saleLocations.map((l) => l.code));
    setForm((prev) => {
      if (prev.locationCode && allowed.has(prev.locationCode)) return prev;
      return { ...prev, locationCode: defaultLocationCode };
    });
  }, [defaultLocationCode, saleLocations]);

  const { data: editSale } = useQuery({
    queryKey: ["sale", "edit", editSaleId],
    queryFn: () => getSale(editSaleId!, tenantId),
    enabled: Boolean(editSaleId),
    // Always prefer the latest saved bill (including after prior edits).
    staleTime: 0,
    refetchOnMount: "always",
  });
  const loadedAsFinal =
    Boolean(editSaleId) &&
    Boolean(editSale) &&
    editSale?.recordStatus !== "draft" &&
    editSale?.recordStatus !== "quotation";
  /** Form still treating this as a completed invoice (not demoted in the UI). */
  const editingFinalized = loadedAsFinal && form.status === "final";
  const remainingDue = Math.max(
    0,
    editSale?.sellDue ??
      (editSale
        ? Number(editSale.total ?? 0) - Number(editSale.totalPaid ?? 0)
        : 0),
  );
  const showAddPayment =
    !editingFinalized ||
    canAddPaymentForStatus(editSale?.paymentStatus, remainingDue);

  useEffect(() => {
    editPrefillDone.current = false;
  }, [editSaleId]);

  useEffect(() => {
    if (!editSale) return;
    // Re-apply when the server returns a newer saved version (edited bills).
    const stamp = `${editSale.id}:${editSale.updatedAt ?? editSale.date}`;
    if (editPrefillDone.current === stamp) return;
    editPrefillDone.current = stamp;
    const noteFields = parseSaleInvoiceNotes(editSale.notes);
    const structured =
      /^(Sales person|Service staff|Mileage|Vehicle time in|Vehicle release|Customer location|Pay term|Invoice scheme|Shipping details|Delivered to|Delivery person|Shipping charges|Additional expense|Redeemed points):/i;
    const sellNote = (editSale.notes ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !structured.test(line))
      .join("\n");
    const storedDiscount = Number(editSale.discountAmount ?? 0);
    setForm((prev) => ({
      ...prev,
      locationCode: editSale.locationCode ?? "",
      jobId: editSale.jobId ?? "",
      jobReference: editSale.jobReference ?? "",
      customerId: editSale.customerId ?? "",
      customerName: editSale.customerName ?? "",
      customerLocation: noteFields.customerLocation ?? "",
      invoiceNo: editSale.reference,
      saleDate: editSale.date
        ? new Date(editSale.date).toISOString().slice(0, 16)
        : prev.saleDate,
      sellNote,
      shippingDetails: noteFields.shippingDetails ?? "",
      shippingAddress: editSale.shippingAddress ?? "",
      shippingStatus: editSale.shippingStatus ?? "pending",
      shippingCharges: noteFields.shippingCharges ?? "",
      deliveredTo: noteFields.deliveredTo ?? "",
      deliveryPerson: noteFields.deliveryPerson ?? "",
      discountType: storedDiscount > 0 ? "fixed" : prev.discountType,
      discountAmount: storedDiscount > 0 ? String(storedDiscount) : "",
      orderTax: String(editSale.taxAmount ?? 0),
      redeemedPoints: noteFields.redeemedPoints ?? "",
      paymentAmount: "",
      paidOn: new Date().toISOString().slice(0, 16),
      paymentMethod: "cash",
      paymentAccountId: "",
      paymentNote: "",
      payTermValue: noteFields.payTermValue ?? "",
      payTermUnit: noteFields.payTermUnit ?? "",
      invoiceScheme: noteFields.invoiceScheme || prev.invoiceScheme,
      serviceStaffId: editSale.serviceStaffEmployeeId ?? "",
      serviceStaffName:
        editSale.serviceStaffEmployeeName?.trim() ||
        editSale.cleanerName?.trim() ||
        noteFields.serviceStaff ||
        "",
      salesPersonName:
        noteFields.salesPerson ||
        editSale.createdByName?.trim() ||
        prev.salesPersonName,
      mileage: noteFields.mileage ?? "",
      plateNumber: noteFields.plateNumber ?? "",
      carModelYear: noteFields.carModelYear ?? "",
      vehicleTimeIn: noteFields.vehicleTimeIn
        ? noteFields.vehicleTimeIn.slice(0, 16)
        : prev.vehicleTimeIn,
      vehicleReleaseDate: noteFields.vehicleRelease
        ? noteFields.vehicleRelease.slice(0, 16)
        : prev.vehicleReleaseDate,
      status:
        editSale.recordStatus === "draft" || editSale.recordStatus === "quotation"
          ? editSale.recordStatus
          : "final",
    }));
    if (noteFields.additionalExpenses.length > 0) {
      setAdditionalExpenses(
        noteFields.additionalExpenses.map((row, index) => ({
          key: `exp-edit-${index}`,
          name: row.name === "Untitled" ? "" : row.name,
          amount: row.amount,
        })),
      );
    }
    setLines(
      editSale.lines.map((line, index) => ({
        key: `edit-${line.id}-${index}`,
        itemId: line.itemId ?? undefined,
        sku: line.sku,
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.discountAmount ?? 0,
        sourceTenantCode: line.sourceTenantCode ?? undefined,
        supplierId: line.supplierId ?? undefined,
        isOutsideOrService: isOutsideOrServiceCatalogItem({
          name: line.name,
          sku: line.sku,
        }),
      })),
    );
  }, [editSale]);

  // Load customer advance balance when editing an existing sale.
  useEffect(() => {
    const customerId = editSale?.customerId;
    if (!customerId) return;
    let cancelled = false;
    void getCustomerContact(customerId)
      .then((contact) => {
        if (cancelled) return;
        setCustomerAdvanceBalance(Math.max(0, contact.totalAdvance ?? 0));
        const addressBits = [contact.phone, contact.email]
          .filter(Boolean)
          .join(" · ");
        if (!addressBits) return;
        setForm((prev) => ({
          ...prev,
          billingAddress: prev.billingAddress || addressBits,
          shippingAddressDisplay: prev.shippingAddressDisplay || addressBits,
        }));
      })
      .catch(() => {
        if (!cancelled) setCustomerAdvanceBalance(0);
      });
    return () => {
      cancelled = true;
    };
  }, [editSale?.customerId]);

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
  const additionalExpenseTotal = useMemo(
    () =>
      additionalExpenses.reduce(
        (sum, row) => sum + (Number(row.amount) || 0),
        0,
      ),
    [additionalExpenses],
  );
  const totalPayable = Math.max(
    0,
    lineTotal -
      orderDiscount +
      orderTax +
      shippingCharges +
      additionalExpenseTotal,
  );
  const paidAmount =
    Number(form.paymentAmount) ||
    (form.paymentAmount.trim() === "0"
      ? 0
      : // Editing an existing final invoice: empty amount means "no new payment".
        // Converting draft/quotation → final: also empty = due (pay later).
        editSaleId &&
          (loadedAsFinal ||
            editSale?.recordStatus === "draft" ||
            editSale?.recordStatus === "quotation")
        ? 0
        : totalPayable);
  const changeReturn = Math.max(0, paidAmount - totalPayable);

  const loadCustomerOptions = useCallback(
    async (query: string) => {
      const rows = await getCustomersForPicker(tenantId, query || undefined);
      return {
        options: [
          { value: "", label: "Walk-in customer" },
          ...rows.map((row) => ({
            value: row.id,
            label: customerPickerLabel(row),
          })),
        ],
        hasMore: !query.trim() && customersPickerHasMore(tenantId),
      };
    },
    [tenantId],
  );

  const loadMoreCustomerOptions = useCallback(async () => {
    const page = await loadMoreCustomersForPicker(tenantId);
    return {
      options: page.appended.map((row) => ({
        value: row.id,
        label: customerPickerLabel(row),
      })),
      hasMore: page.hasMore,
      append: true,
    };
  }, [tenantId]);

  const loadStaffOptions = useCallback(
    async (query: string) => {
      const rows = await getServiceStaff(tenantId, query || undefined);
      return {
        options: [
          { value: "", label: "Select service staff" },
          ...rows.map((row) => ({
            value: row.id,
            label: row.designationName
              ? `${row.name} · ${row.designationName}`
              : row.name,
          })),
        ],
        hasMore: !query.trim() && serviceStaffPickerHasMore(tenantId),
      };
    },
    [tenantId],
  );

  const loadMoreStaffOptions = useCallback(async () => {
    const page = await loadMoreServiceStaffForPicker(tenantId);
    return {
      options: page.appended.map((row) => ({
        value: row.id,
        label: row.designationName
          ? `${row.name} · ${row.designationName}`
          : row.name,
      })),
      hasMore: page.hasMore,
      append: true,
    };
  }, [tenantId]);

  const loadSalesPersonOptions = useCallback(
    async (query: string) => {
      const rows = await getEmployees(tenantId, query || undefined);
      return {
        options: [
          { value: "", label: "Select sales person" },
          ...rows.map((row) => ({
            value: row.id,
            label: row.designationName
              ? `${row.name} · ${row.designationName}`
              : row.name,
          })),
        ],
        hasMore: !query.trim() && employeePickerHasMore(tenantId),
      };
    },
    [tenantId],
  );

  const loadMoreSalesPersonOptions = useCallback(async () => {
    const page = await loadMoreEmployeesForPicker(tenantId);
    return {
      options: page.appended.map((row) => ({
        value: row.id,
        label: row.designationName
          ? `${row.name} · ${row.designationName}`
          : row.name,
      })),
      hasMore: page.hasMore,
      append: true,
    };
  }, [tenantId]);

  const loadPaymentAccountOptions = useCallback(
    async (query: string) => {
      const rows = await getPaymentAccountsForPicker(tenantId, {
        search: query.trim() || undefined,
      });
      return [
        { value: "", label: "Select payment account" },
        ...rows.map((row) => ({
          value: row.id,
          label: paymentAccountPickerLabel(row),
        })),
      ];
    },
    [tenantId],
  );

  const loadJobOptions = useCallback(
    async (query: string) => {
      const rows = await getJobs(tenantId, {
        search: query || undefined,
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
      const allowed = new Set(saleLocations.map((l) => l.code));
      setForm((prev) => ({
        ...prev,
        jobId: job.id,
        jobReference: job.reference,
        invoiceNo: prev.invoiceNo.trim(),
        customerId: job.customerId ?? job.customer?.id ?? "",
        customerName: job.customer?.name ?? job.customerName ?? "",
        locationCode:
          job.locationCode && allowed.has(job.locationCode)
            ? job.locationCode
            : prev.locationCode || defaultLocationCode,
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
    [patchForm, saleLocations, defaultLocationCode],
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
          : `sku:${pick.sourceTenantCode ?? "local"}:${pick.sku}`;
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
          unitPrice: pick.sellPrice || 0,
          costPrice: pick.costPrice || 0,
          discount: 0,
          availableQty: pick.availableQty,
          sourceLabel: pick.sourceLabel,
          sourceTenantCode: pick.sourceTenantCode,
          isOutsideOrService: pick.isOutsideOrService,
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
      setCustomerAdvanceBalance(0);
      patchForm({
        customerId: "",
        customerName: "",
        billingAddress: "",
        shippingAddressDisplay: "",
        plateNumber: "",
        carModelYear: "",
        mileage: "",
        customerLocation: "",
      });
      return;
    }
    setCustomerAdvanceBalance(Math.max(0, customer.totalAdvance ?? 0));
    const details = customer.details;
    const addressBits = [
      customer.phone,
      customer.email,
      details?.addressLine1,
      details?.city,
    ]
      .filter(Boolean)
      .join(" · ");
    // Automotive contact fields: plate = Contact ID; customField1–4 = UPOS labels.
    const plate =
      customer.contactId?.trim() ||
      details?.contactId?.trim() ||
      "";
    const mileage = details?.customField1?.trim() || "";
    const carModelYear = details?.customField3?.trim() || "";
    const customerLocation = details?.customField4?.trim() || "";
    patchForm({
      customerId: customer.id,
      customerName: customer.name,
      billingAddress: addressBits,
      shippingAddressDisplay:
        details?.shippingAddress?.trim() || addressBits,
      plateNumber: plate,
      carModelYear,
      mileage,
      customerLocation,
    });
  };

  const mutation = useAppMutation({
    mutationFn: async () => {
      const statusToSave =
        pendingSaveStatusRef.current ??
        (editSaleId ? form.status : presetStatus);

      assertBusinessLocationSelected(locationRequired, form.locationCode);
      if (lines.length === 0) throw new Error("Add at least one product");
      const isProvisional =
        statusToSave === "draft" || statusToSave === "quotation";
      const convertingToFinal =
        Boolean(editSaleId) &&
        (editSale?.recordStatus === "draft" ||
          editSale?.recordStatus === "quotation") &&
        statusToSave === "final";
      // Convert quotation/draft → final does not require payment / account (status due).
      // Only brand-new finals or explicit pay-on-edit need a payment payload.
      const needsNewPayment =
        !isProvisional &&
        !convertingToFinal &&
        !editSaleId &&
        paidAmount > 0;
      const addingPaymentOnEdit =
        !isProvisional &&
        loadedAsFinal &&
        statusToSave === "final" &&
        paidAmount > 0 &&
        canAddPaymentForStatus(editSale?.paymentStatus, remainingDue);
      // Empty payment field must not imply "pay full total" on quotations/drafts.
      const amountToCharge = isProvisional
        ? Number(form.paymentAmount) || 0
        : convertingToFinal
          ? Number(form.paymentAmount) || 0
          : paidAmount;
      const paymentAccountId = form.paymentAccountId.trim();
      // Convert quotation/draft → final: no payment account → still convert as due.
      // Account is only required when collecting money on a new/edited final.
      if (
        (needsNewPayment || addingPaymentOnEdit) &&
        amountToCharge > 0 &&
        !paymentAccountId
      ) {
        throw new Error(
          "Select a Payment Account so this money is posted to the account book",
        );
      }
      const tenantCode = (tenantConfig?.code ?? "").trim().toUpperCase();
      const serviceStaffName = form.serviceStaffName.trim();
      const serviceStaffId = form.serviceStaffId.trim();
      if (
        (tenantCode === "VA" || tenantCode === "VP") &&
        !serviceStaffId &&
        !serviceStaffName
      ) {
        throw new Error("Select service staff before saving");
      }
      const reference = form.invoiceNo.trim() || undefined;
      const shippingAddress =
        form.shippingAddress.trim() ||
        form.shippingAddressDisplay.trim() ||
        undefined;
      const payload = {
        ...(reference ? { reference } : {}),
        jobId: form.jobId.trim() || undefined,
        customerId: form.customerId || undefined,
        customerName: form.customerName.trim() || undefined,
        locationCode: form.locationCode.trim() || undefined,
        date: form.saleDate ? new Date(form.saleDate).toISOString() : undefined,
        status: statusToSave as "final" | "draft" | "quotation",
        discountAmount: orderDiscount,
        taxAmount: orderTax,
        notes: buildNotes(form, additionalExpenses),
        serviceStaffEmployeeId: serviceStaffId || undefined,
        cleanerUserId: form.serviceStaffUserId || undefined,
        cleanerName: serviceStaffName || undefined,
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
          supplierId: line.createPurchase ? line.supplierId || undefined : undefined,
        })),
        payments: (() => {
          if (isProvisional) return [];
          // Convert without a payment account → empty payments → sale stays due.
          if (convertingToFinal) {
            if (amountToCharge <= 0 || !paymentAccountId) return [];
            return [
              {
                amount: amountToCharge,
                method: form.paymentMethod,
                note: form.paymentNote.trim() || undefined,
                accountId: paymentAccountId,
              },
            ];
          }
          if (needsNewPayment || addingPaymentOnEdit) {
            return [
              {
                amount: amountToCharge,
                method: form.paymentMethod,
                note: form.paymentNote.trim() || undefined,
                accountId: paymentAccountId || undefined,
              },
            ];
          }
          return undefined;
        })(),
        paymentMethod: isProvisional
          ? undefined
          : form.paymentMethod || undefined,
      };
      if (editSaleId) {
        const updated = await updateSale(tenantId, editSaleId, payload);
        if (addingPaymentOnEdit && amountToCharge > 0) {
          await addSalePayment(tenantId, editSaleId, {
            amount: amountToCharge,
            method: form.paymentMethod,
            note: form.paymentNote.trim() || undefined,
            paidOn: form.paidOn
              ? new Date(form.paidOn).toISOString()
              : undefined,
            accountId: form.paymentAccountId,
          });
        }
        return updated;
      }
      return createSale(tenantId, payload);
    },
    successMessage: (sale) => {
      const record = sale.recordStatus;
      if (record === "quotation") {
        return editSaleId && loadedAsFinal
          ? "Moved to quotation"
          : "Quotation saved";
      }
      if (record === "draft") {
        return editSaleId && loadedAsFinal ? "Moved to draft" : "Draft saved";
      }
      if (
        editSaleId &&
        (editSale?.recordStatus === "quotation" ||
          editSale?.recordStatus === "draft" ||
          presetStatus === "quotation" ||
          presetStatus === "draft")
      ) {
        return "Converted to sale";
      }
      return "Sale recorded";
    },
    progressLabel: editSaleId ? "Updating" : "Saving",
    invalidateKeys: [
      ["sales"],
      ["sale"],
      ["items"],
      ["catalog"],
      ["jobs"],
      ["job"],
      ["ledgerTablePage"],
      ["ledgerSummary"],
      ["stock-movements"],
      ["paymentAccounts"],
      ["suppliers"],
    ],
    onSuccess: async (sale) => {
      const shouldPrint = printAfterSaveRef.current;
      printAfterSaveRef.current = false;
      setSaveIntent(null);
      setError(null);
      try {
        await onSuccess?.(sale, { print: shouldPrint });
      } catch {
        // Sale already saved — invoice redirect must not fail the mutation.
      }
      // Only clear the form if the parent did not navigate away (e.g. modal).
      if (variant === "modal") {
        setCustomerAdvanceBalance(0);
        setForm(emptyForm(presetStatus));
        setLines([]);
      }
    },
    onError: (err: Error) => {
      setSaveIntent(null);
      setError(err.message);
    },
  });

  const kickSave = (intent: "save" | "print") => {
    // New docs always use the page preset (add-quotation → quotation).
    // Edits may change Final ↔ Quotation ↔ Draft.
    const statusToSave = (
      editSaleId ? form.status : presetStatus
    ) as SaleFormPresetStatus;

    try {
      assertBusinessLocationSelected(locationRequired, form.locationCode);
      if (lines.length === 0) throw new Error("Add at least one product");
      const tenantCode = (tenantConfig?.code ?? "").trim().toUpperCase();
      if (
        (tenantCode === "VA" || tenantCode === "VP") &&
        !form.serviceStaffId.trim() &&
        !form.serviceStaffName.trim()
      ) {
        throw new Error("Select service staff before saving");
      }
      const isProvisional =
        statusToSave === "draft" || statusToSave === "quotation";
      const convertingToFinal =
        Boolean(editSaleId) &&
        (editSale?.recordStatus === "draft" ||
          editSale?.recordStatus === "quotation") &&
        statusToSave === "final";
      const needsNewPayment =
        !isProvisional &&
        !convertingToFinal &&
        !editSaleId &&
        paidAmount > 0;
      const addingPaymentOnEdit =
        !isProvisional &&
        loadedAsFinal &&
        statusToSave === "final" &&
        paidAmount > 0 &&
        canAddPaymentForStatus(editSale?.paymentStatus, remainingDue);
      const amountToCharge = isProvisional
        ? Number(form.paymentAmount) || 0
        : convertingToFinal
          ? Number(form.paymentAmount) || 0
          : paidAmount;
      // Convert without payment account is allowed (sale becomes due).
      if (
        (needsNewPayment || addingPaymentOnEdit) &&
        amountToCharge > 0 &&
        !form.paymentAccountId.trim()
      ) {
        throw new Error(
          "Select a Payment Account so this money is posted to the account book",
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Cannot save this document";
      setError(message);
      toast.error(message);
      return;
    }

    pendingSaveStatusRef.current = statusToSave;
    // Keep form.status aligned so leave/list routing matches the write.
    if (form.status !== statusToSave) {
      patchForm({ status: statusToSave });
    }
    printAfterSaveRef.current = intent === "print";
    setSaveIntent(intent);
    mutation.mutate();
  };

  const quickCustomerMutation = useAppMutation({
    mutationFn: async () => {
      const valid = parseForm(
        saleCustomerSchema,
        { customerName: quickCustomerName },
        { toast: false },
      );
      if (!valid) throw new Error("Enter a customer name");
      return createCustomer(tenantId, { name: valid.customerName });
    },
    successMessage: "Customer created",
    invalidateKeys: [["customers"]],
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
    const primaryLabel = isEditing ? "Update" : "Save";
    const printLabel = isEditing ? "Update and print" : "Save and print";

    return (
      <div className="space-y-4">
        {/* Location — sell/create.blade.php input-group with map-marker */}
        <div className="row" style={{ marginBottom: 12 }}>
          <div className="col-sm-3">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="select_location_id" className="hq6-form-label">
                Business Location:<span className="req">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-addon">
                  <i className="fa fa-map-marker" aria-hidden />
                </span>
                <select
                  className="form-control input-sm"
                  id="select_location_id"
                  value={form.locationCode}
                  onChange={(e) => patchForm({ locationCode: e.target.value })}
                  aria-label="Business location"
                  required
                >
                  {businessLocationOptions.length > 0 ? (
                    businessLocationOptions.map((opt) => (
                      <option key={opt.value || "none"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))
                  ) : (
                    <option value="">Select location</option>
                  )}
                </select>
                <span className="input-group-addon">
                  <i className="fa fa-info-circle text-info" aria-hidden />
                </span>
              </div>
            </div>
          </div>
        </div>

        <section className="hq6-form-card">
          <div className="hq6-form-grid hq6-form-grid-3">
            <div className="space-y-3">
              <label className="hq6-form-label">
                <span>
                  Customer <span className="req">*</span>:
                </span>
                <div className="tw-flex tw-w-full tw-items-stretch tw-gap-2">
                  <div className="input-group hq6-input-group-select tw-min-w-0 tw-flex-1">
                    <span className="input-group-addon">
                      <i className="fa fa-user" aria-hidden />
                    </span>
                    <AsyncMenuSelect
                      className="hq6-input-group-select-field"
                      value={form.customerId}
                      selectedLabel={form.customerName || "Walk-In Customer"}
                      placeholder="Walk-In Customer"
                      loadOptions={loadCustomerOptions}
                      loadMoreOptions={loadMoreCustomerOptions}
                      debounceMs={0}
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
                            totalAdvance: contact.totalAdvance,
                            status: contact.status,
                            contactId: contact.contactId,
                            businessName: contact.businessName,
                            details: contact.details,
                          });
                        } catch {
                          patchForm({ customerId: id, customerName: id });
                        }
                      }}
                    />
                    <span className="input-group-btn">
                      <button
                        type="button"
                        className="btn btn-default bg-white btn-flat"
                        title="Add customer"
                        onClick={() => setQuickCustomerOpen((open) => !open)}
                      >
                        <i className="fa fa-plus-circle text-primary fa-lg" aria-hidden />
                      </button>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="hq6-btn hq6-btn-blue tw-shrink-0"
                    title="Customer info"
                    onClick={() => setCustomerInfoOpen((open) => !open)}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
              </label>
              {customerInfoOpen && form.customerId ? (
                <div className="rounded border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-xs text-[#374151]">
                  <div>
                    <strong>Customer:</strong> {form.customerName || "—"}
                  </div>
                  {isJobTenant ? (
                    <>
                      <div>
                        <strong>Plate:</strong> {form.plateNumber || "—"}
                      </div>
                      <div>
                        <strong>Car:</strong> {form.carModelYear || "—"}
                      </div>
                      <div>
                        <strong>Mileage:</strong> {form.mileage || "—"}
                      </div>
                    </>
                  ) : null}
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
                  <option value="">Please Select</option>
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
                <Hq6DateTimeInput
                  className="hq6-form-input"
                  value={form.saleDate}
                  onChange={(v) => patchForm({ saleDate: v })}
                />
              </div>
            </label>

            <label className="hq6-form-label">
              <span>
                Status <span className="req">*</span>:
              </span>
              <select
                className="hq6-form-input"
                value={editSaleId ? form.status : presetStatus}
                disabled={!editSaleId}
                aria-readonly={!editSaleId ? "true" : undefined}
                onChange={(e) =>
                  patchForm({
                    status: e.target.value as "final" | "draft" | "quotation",
                  })
                }
              >
                <option value="final">Final</option>
                <option value="quotation">Quotation</option>
                <option value="draft">Draft</option>
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

            {isJobTenant ? (
              <>
                <label className="hq6-form-label">
                  <span>
                    Vehicle Time In (Date entered) <span className="req">*</span>
                  </span>
                  <div className="hq6-form-input-wrap">
                    <Hq6DateTimeInput
                      className="hq6-form-input"
                      value={form.vehicleTimeIn}
                      onChange={(v) => patchForm({ vehicleTimeIn: v })}
                    />
                  </div>
                </label>

                <label className="hq6-form-label">
                  <span>Vehicle Release Date:</span>
                  <div className="hq6-form-input-wrap">
                    <Hq6DateTimeInput
                      className="hq6-form-input"
                      value={form.vehicleReleaseDate}
                      onChange={(v) => patchForm({ vehicleReleaseDate: v })}
                    />
                  </div>
                </label>
              </>
            ) : null}

            <label className="hq6-form-label">
              <span>Customer location:</span>
              <input
                className="hq6-form-input"
                value={form.customerLocation}
                onChange={(e) => patchForm({ customerLocation: e.target.value })}
              />
            </label>

            {isJobTenant ? (
              <>
                <label className="hq6-form-label">
                  <span>
                    Vehicle Registration (Plate) <span className="req">*</span>
                  </span>
                  <input
                    className="hq6-form-input"
                    value={form.plateNumber}
                    onChange={(e) => patchForm({ plateNumber: e.target.value })}
                    placeholder="e.g. ABC-123-XY"
                  />
                </label>

                <label className="hq6-form-label">
                  <span>Car Model &amp; Year:</span>
                  <input
                    className="hq6-form-input"
                    value={form.carModelYear}
                    onChange={(e) => patchForm({ carModelYear: e.target.value })}
                    placeholder="e.g. Camry 2018"
                  />
                </label>

                <label className="hq6-form-label">
                  <span>Car mileage:</span>
                  <input
                    className="hq6-form-input"
                    value={form.mileage}
                    onChange={(e) => patchForm({ mileage: e.target.value })}
                    placeholder="e.g. 125000"
                  />
                </label>
              </>
            ) : null}

            <label className="hq6-form-label">
              <span>Sales person:</span>
              <AsyncMenuSelect
                value={form.salesPersonId}
                selectedLabel={form.salesPersonName || "Select sales person"}
                placeholder="Select sales person"
                loadOptions={loadSalesPersonOptions}
                loadMoreOptions={loadMoreSalesPersonOptions}
                debounceMs={0}
                prefetchKey={tenantId}
                onChange={(id, option) => {
                  if (!id) {
                    patchForm({
                      salesPersonId: "",
                      salesPersonName: authUserName?.trim() || "",
                    });
                    return;
                  }
                  const fromOption = option
                    ? employeeLabelName(option.label)
                    : "";
                  patchForm({
                    salesPersonId: id,
                    salesPersonName: fromOption,
                  });
                  void getEmployees(tenantId).then((rows) => {
                    const match = rows.find((row) => row.id === id);
                    if (match?.name) {
                      patchForm({
                        salesPersonId: id,
                        salesPersonName: match.name,
                      });
                    }
                  });
                }}
              />
            </label>

            <label className="hq6-form-label">
              <span>
                Select service staff: <span className="req">*</span>
              </span>
              <AsyncMenuSelect
                value={form.serviceStaffId}
                selectedLabel={form.serviceStaffName || "Select service staff"}
                placeholder="Select service staff"
                loadOptions={loadStaffOptions}
                loadMoreOptions={loadMoreStaffOptions}
                debounceMs={0}
                prefetchKey={tenantId}
                onChange={(id, option) => {
                  if (!id) {
                    patchForm({
                      serviceStaffId: "",
                      serviceStaffUserId: "",
                      serviceStaffName: "",
                    });
                    return;
                  }
                  const fromOption = option
                    ? employeeLabelName(option.label)
                    : "";
                  patchForm({
                    serviceStaffId: id,
                    serviceStaffUserId: "",
                    serviceStaffName: fromOption,
                  });
                  void getServiceStaff(tenantId).then((rows) => {
                    const match = rows.find((row) => row.id === id);
                    if (match) {
                      patchForm({
                        serviceStaffId: id,
                        serviceStaffUserId: match.userId ?? "",
                        serviceStaffName: match.name,
                      });
                    }
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
                  <th style={{ width: "2rem" }}>#</th>
                  <th>Product</th>
                  <th style={{ width: "7.5rem" }}>Source</th>
                  <th>Quantity</th>
                  <th>Cost Price</th>
                  <th>Unit Price</th>
                  <th>Discount</th>
                  <th>Tax</th>
                  <th className="text-right">Price inc. tax</th>
                  <th className="text-right">Subtotal</th>
                  <th aria-label="Remove">
                    <i className="fa fa-times" aria-hidden />
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center text-[#9ca3af]">
                      &nbsp;
                    </td>
                  </tr>
                ) : (
                  lines.map((line, index) => {
                    const taxPct = line.taxPercent ?? 0;
                    const pretax = lineSubtotal(line);
                    const taxAmt = (pretax * taxPct) / 100;
                    const withTax = pretax + taxAmt;
                    const sourceCode =
                      line.sourceTenantCode ||
                      (line.createPurchase ? "Purchase" : tenantConfig?.code || "Own");
                    return (
                      <tr key={line.key}>
                        <td>{index + 1}</td>
                        <td className="hq6-sale-line-product">
                          <div className="font-medium">{line.name}</div>
                          <div className="text-xs text-[#6b7280]">{line.sku}</div>
                          {line.createPurchase ? (
                            <div className="mt-2 space-y-1">
                              <div className="text-xs text-amber-600">
                                Will add to Purchases
                              </div>
                              <div className="flex flex-wrap items-center gap-1">
                                <AsyncMenuSelect
                                  value={line.supplierId ?? ""}
                                  selectedLabel={line.supplierName}
                                  placeholder="Supplier (optional)"
                                  loadOptions={loadSupplierOptions}
                                  loadMoreOptions={loadMoreSupplierOptions}
                                  debounceMs={0}
                                  onChange={(supplierId) => {
                                    const match = supplierOptions.find(
                                      (s) => s.id === supplierId,
                                    );
                                    updateLine(line.key, {
                                      supplierId: supplierId || undefined,
                                      supplierName:
                                        match?.businessName ??
                                        match?.name ??
                                        (supplierId
                                          ? line.supplierName
                                          : undefined),
                                    });
                                  }}
                                />
                                <button
                                  type="button"
                                  className="btn btn-default btn-xs"
                                  onClick={() =>
                                    setAddSupplierForLineKey(line.key)
                                  }
                                >
                                  + Supplier
                                </button>
                              </div>
                            </div>
                          ) : null}
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
                          <div className="text-xs font-semibold text-[#374151]">
                            {sourceCode}
                          </div>
                          {line.availableQty != null &&
                          !line.createPurchase &&
                          !line.isOutsideOrService &&
                          !groupStockConsumer ? (
                            <div
                              className={
                                line.availableQty <= 5
                                  ? "text-xs font-medium text-amber-600"
                                  : "text-xs text-[#6b7280]"
                              }
                            >
                              {line.availableQty} left
                            </div>
                          ) : line.isOutsideOrService ? (
                            <div className="text-xs text-[#6b7280]">
                              Service / outside
                            </div>
                          ) : null}
                          {line.sourceLabel &&
                          line.sourceLabel !== sourceCode ? (
                            <div className="text-[11px] text-[#9ca3af]">
                              {line.sourceLabel}
                            </div>
                          ) : null}
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
                          <span className="tabular-nums text-[#6b7280]">
                            {formatHq6Currency(line.costPrice ?? 0)}
                          </span>
                        </td>
                        <td>
                          <ClearableNumberInput
                            min={0}
                            showZero
                            value={line.unitPrice}
                            onChange={(n) =>
                              updateLine(line.key, { unitPrice: n })
                            }
                          />
                        </td>
                        <td>
                          <ClearableNumberInput
                            min={0}
                            value={line.discount}
                            onChange={(n) =>
                              updateLine(line.key, { discount: n })
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
                          {formatHq6Currency(withTax)}
                        </td>
                        <td className="text-right tabular-nums font-semibold">
                          {formatHq6Currency(withTax)}
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
          <div className="hq6-form-table-footer !border-0 mt-2 pt-1">
            <span>
              <b>Items:</b> {lines.length}
              &nbsp;&nbsp;&nbsp;&nbsp;
              <b>Total:</b> {formatHq6Currency(lineTotal)}
            </span>
          </div>
          <div className="hq6-form-products-toolbar mt-3">
            <div className="hq6-form-products-search input-group" style={{ width: "100%" }}>
              <span className="input-group-addon">
                <i className="fa fa-search" aria-hidden />
              </span>
              <ProductItemSearch
                tenantId={tenantId}
                tenantCode={tenantConfig?.code}
                retailOnly={false}
                includeWarehouse={includeWarehouseSearch}
                ownCatalog={ownCatalogSearch}
                pickSourceAfterSelect={allowCrossEntitySource}
                showStockQty={!groupStockConsumer}
                showLeadingIcon={false}
                showSearchButton={false}
                businessLocations={saleLocations}
                onSelect={addLineFromPick}
                placeholder={
                  groupStockConsumer
                    ? "Search catalog (own / VW / VISP / VSP) — stock not required"
                    : "Enter Product name / SKU / Scan bar code"
                }
                className="hq6-product-search-embedded"
              />
              {!groupStockConsumer ? (
              <span className="input-group-btn">
                <button
                  type="button"
                  className="btn btn-default bg-white btn-flat"
                  title="Add new product"
                  onClick={() =>
                    tenantConfig?.code
                      ? router.push(tenantPath(tenantConfig.code, "add-product"))
                      : undefined
                  }
                >
                  <i className="fa fa-plus-circle text-primary fa-lg" aria-hidden />
                </button>
              </span>
              ) : null}
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
                <strong>{lines.length}</strong>
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
                    accept=".pdf,.csv,.zip,.doc,.docx,.jpeg,.jpg,.png,.avif"
                />
              </div>
            </label>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              className="hq6-form-expenses-link self-start"
              onClick={() =>
                setAdditionalExpenses((prev) => [
                  ...prev,
                  {
                    key: `exp-${Date.now().toString(36)}`,
                    name: "",
                    amount: "",
                  },
                ])
              }
            >
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
                  {additionalExpenses.map((row, index) => (
                    <tr key={row.key}>
                      <td>
                        <input
                          className="hq6-form-input"
                          placeholder="Additional expense name"
                          aria-label={`Additional expense name ${index + 1}`}
                          value={row.name}
                          onChange={(e) => {
                            const value = e.target.value;
                            setAdditionalExpenses((prev) =>
                              prev.map((item) =>
                                item.key === row.key
                                  ? { ...item, name: value }
                                  : item,
                              ),
                            );
                          }}
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
                          value={row.amount}
                          onChange={(e) => {
                            const value = e.target.value;
                            setAdditionalExpenses((prev) =>
                              prev.map((item) =>
                                item.key === row.key
                                  ? { ...item, amount: value }
                                  : item,
                              ),
                            );
                          }}
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

        <section className="hq6-form-card">
          <h2 className="hq6-form-card-title">Add payment</h2>
          {editingFinalized && !showAddPayment ? (
            <p className="mb-3 text-sm text-[#6b7280]">
              This sale is fully paid. Use{" "}
              <strong>View Payments</strong> on the sales list to review or edit
              existing payments.
            </p>
          ) : editingFinalized ? (
            <p className="mb-3 text-sm text-[#6b7280]">
              Remaining due: {formatHq6Currency(remainingDue)}. Existing
              payments stay as they are — enter an amount below to add another
              payment on Update.
            </p>
          ) : isProvisional ? (
            <p className="mb-3 text-sm text-[#6b7280]">
              Payment posts when Status is <strong>Final</strong> (converts this{" "}
              {form.status === "draft" ? "draft" : "quotation"} to a real sale).
            </p>
          ) : (
            <p className="mb-3 text-sm text-[#6b7280]">
              Advance Balance: {formatHq6Currency(customerAdvanceBalance)}
            </p>
          )}
          {showAddPayment ? (
          <>
          <div className="hq6-form-grid hq6-form-grid-3">
            <label className="hq6-form-label">
              <span>
                Amount <span className="req">*</span>:
              </span>
              <input
                type="text"
                inputMode="decimal"
                className="hq6-form-input"
                placeholder={
                  (editingFinalized ? remainingDue : totalPayable) > 0
                    ? (editingFinalized ? remainingDue : totalPayable).toFixed(2)
                    : "0.00"
                }
                value={form.paymentAmount}
                onChange={(e) => patchForm({ paymentAmount: e.target.value })}
              />
            </label>
            <label className="hq6-form-label">
              <span>
                Paid on <span className="req">*</span>:
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
                Payment Method <span className="req">*</span>:
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
                <option value="bank_transfer">Bank Transfer</option>
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
                debounceMs={0}
                onChange={(id) => patchForm({ paymentAccountId: id })}
              />
            </label>
            <label className="hq6-form-label" style={{ gridColumn: "1 / -1" }}>
              <span>Payment note:</span>
              <textarea
                className="hq6-form-input"
                rows={3}
                value={form.paymentNote}
                onChange={(e) => patchForm({ paymentNote: e.target.value })}
              />
            </label>
          </div>
          <div className="hq6-form-table-footer">
            <span>
              Change Return:{" "}
              <strong>{formatHq6Currency(changeReturn)}</strong>
            </span>
          </div>
          </>
          ) : null}
        </section>

        {error ? <p className="text-sm text-[#dc2626]">{error}</p> : null}

        <div className="hq6-form-save-row">
          {onCancel ? (
            <button
              type="button"
              className="hq6-modal-btn hq6-modal-btn-close"
              disabled={mutation.isPending}
              onClick={onCancel}
            >
              Cancel
            </button>
          ) : null}
          <Hq6BusyButton
            className="hq6-btn-purple"
            busy={mutation.isPending && saveIntent === "save"}
            busyLabel={isEditing ? "Updating…" : "Saving…"}
            disabled={lines.length === 0 || mutation.isPending}
            onClick={() => {
              kickSave("save");
            }}
          >
            {primaryLabel}
          </Hq6BusyButton>
          <Hq6BusyButton
            className="hq6-btn-green"
            busy={mutation.isPending && saveIntent === "print"}
            busyLabel={isEditing ? "Updating…" : "Saving…"}
            disabled={lines.length === 0 || mutation.isPending}
            onClick={() => {
              kickSave("print");
            }}
          >
            {printLabel}
          </Hq6BusyButton>
        </div>

        <Hq6AddSupplierModal
          open={Boolean(addSupplierForLineKey)}
          tenantId={tenantId}
          onClose={() => setAddSupplierForLineKey(null)}
          onSaved={(result) => {
            if (addSupplierForLineKey && result?.supplierId) {
              updateLine(addSupplierForLineKey, {
                supplierId: result.supplierId,
              });
            }
            setAddSupplierForLineKey(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className={shellClass}>
      {editSaleId && editSale ? (
        <p className="rounded-md border border-[var(--hq6-border,#ddd)] bg-[#f9f9f9] px-3 py-2 text-sm text-[#555]">
          Editing <strong>{editSale.reference}</strong>
          {editSale.recordStatus ? ` (${editSale.recordStatus})` : ""}. Changes
          update this document in place. Change Status to Quotation or Draft to
          move it off final sales.
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

      {showJobField ? (
        <div className="max-w-xl rounded-lg border border-border bg-card p-4">
          <label className="mb-1 block text-xs font-medium text-muted">
            Job <span className="font-normal text-muted">(optional)</span>
          </label>
          <AsyncMenuSelect
            value={form.jobId}
            selectedLabel={
              form.jobReference
                ? `${form.jobReference}${form.customerName ? ` · ${form.customerName}` : ""}`
                : "No job linked"
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
            Optional — link a job to prefill customer/parts. Sales can be saved
            and updated without a job. If linked, parts already issued on the
            job are not deducted again.
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
                      loadMoreOptions={loadMoreCustomerOptions}
                debounceMs={0}
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
                      totalAdvance: contact.totalAdvance,
                      status: contact.status,
                      contactId: contact.contactId,
                      businessName: contact.businessName,
                      details: contact.details,
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
          {isJobTenant ? (
            <Input
              label="Car mileage"
              value={form.mileage}
              onChange={(e) => patchForm({ mileage: e.target.value })}
              placeholder="e.g. 125000"
            />
          ) : null}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Sales Person
            </label>
            <AsyncMenuSelect
              value={form.salesPersonId}
              selectedLabel={form.salesPersonName || "Select sales person"}
              placeholder="Select sales person"
              loadOptions={loadSalesPersonOptions}
              loadMoreOptions={loadMoreSalesPersonOptions}
              debounceMs={0}
              prefetchKey={tenantId}
              onChange={(id, option) => {
                if (!id) {
                  patchForm({
                    salesPersonId: "",
                    salesPersonName: authUserName?.trim() || "",
                  });
                  return;
                }
                const fromOption = option
                  ? employeeLabelName(option.label)
                  : "";
                patchForm({
                  salesPersonId: id,
                  salesPersonName: fromOption,
                });
                void getEmployees(tenantId).then((rows) => {
                  const match = rows.find((row) => row.id === id);
                  if (match?.name) {
                    patchForm({
                      salesPersonId: id,
                      salesPersonName: match.name,
                    });
                  }
                });
              }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Service Staff <span className="text-error">*</span>
            </label>
            <AsyncMenuSelect
              value={form.serviceStaffId}
              selectedLabel={form.serviceStaffName || "Select service staff"}
              placeholder="Select service staff"
              loadOptions={loadStaffOptions}
              loadMoreOptions={loadMoreStaffOptions}
              debounceMs={0}
              prefetchKey={tenantId}
              onChange={(id, option) => {
                if (!id) {
                  patchForm({
                    serviceStaffId: "",
                    serviceStaffUserId: "",
                    serviceStaffName: "",
                  });
                  return;
                }
                const fromOption = option
                  ? employeeLabelName(option.label)
                  : "";
                patchForm({
                  serviceStaffId: id,
                  serviceStaffUserId: "",
                  serviceStaffName: fromOption,
                });
                void getServiceStaff(tenantId).then((rows) => {
                  const match = rows.find((row) => row.id === id);
                  if (match) {
                    patchForm({
                      serviceStaffId: id,
                      serviceStaffUserId: match.userId ?? "",
                      serviceStaffName: match.name,
                    });
                  }
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
            value={editSaleId ? form.status : presetStatus}
            disabled={!editSaleId}
            onChange={(e) =>
              patchForm({
                status: e.target.value as "final" | "draft" | "quotation",
              })
            }
            options={[
              { value: "final", label: "Final" },
              { value: "quotation", label: "Quotation" },
              { value: "draft", label: "Draft" },
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
          {isJobTenant ? (
            <>
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
                onChange={(e) =>
                  patchForm({ vehicleReleaseDate: e.target.value })
                }
              />
            </>
          ) : null}
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
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Quantity</th>
                <th className="px-3 py-2 font-medium">Cost Price</th>
                <th className="px-3 py-2 font-medium">Unit Price</th>
                <th className="px-3 py-2 font-medium">Discount</th>
                <th className="px-3 py-2 font-medium text-right">Subtotal</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted">
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
                        {line.createPurchase ? (
                          <div className="mt-2 space-y-1">
                            <div className="text-xs text-amber-600">
                              Will add to Purchases
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                              <AsyncMenuSelect
                                value={line.supplierId ?? ""}
                                selectedLabel={line.supplierName}
                                placeholder="Supplier (optional)"
                                loadOptions={loadSupplierOptions}
                                  loadMoreOptions={loadMoreSupplierOptions}
                                debounceMs={0}
                                onChange={(supplierId) => {
                                  const match = supplierOptions.find(
                                    (s) => s.id === supplierId,
                                  );
                                  updateLine(line.key, {
                                    supplierId: supplierId || undefined,
                                    supplierName:
                                      match?.businessName ??
                                      match?.name ??
                                      (supplierId
                                        ? line.supplierName
                                        : undefined),
                                  });
                                }}
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  setAddSupplierForLineKey(line.key)
                                }
                              >
                                + Supplier
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </td>
                    <td className="px-3 py-2 text-xs">
                      <div className="font-semibold text-foreground">
                        {line.sourceTenantCode ||
                          (line.createPurchase
                            ? "Purchase"
                            : tenantConfig?.code || "Own")}
                      </div>
                      {line.availableQty != null &&
                      !line.createPurchase &&
                      !line.isOutsideOrService &&
                      !groupStockConsumer ? (
                        <div
                          className={
                            line.availableQty <= 5
                              ? "font-medium text-amber-600"
                              : "text-muted"
                          }
                        >
                          {line.availableQty} left
                        </div>
                      ) : line.isOutsideOrService ? (
                        <div className="text-muted">Service / outside</div>
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
                    <td className="px-3 py-2 text-muted tabular-nums">
                      {formatCurrency(line.costPrice ?? 0)}
                    </td>
                    <td className="px-3 py-2">
                      <ClearableNumberInput
                        min={0}
                        showZero
                        value={line.unitPrice}
                        onChange={(n) =>
                          updateLine(line.key, { unitPrice: n })
                        }
                        className="w-24 rounded border border-border px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <ClearableNumberInput
                        min={0}
                        value={line.discount}
                        onChange={(n) =>
                          updateLine(line.key, { discount: n })
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
            includeWarehouse={includeWarehouseSearch}
            ownCatalog={ownCatalogSearch}
            pickSourceAfterSelect={allowCrossEntitySource}
            showStockQty={!groupStockConsumer}
            businessLocations={saleLocations}
            onSelect={addLineFromPick}
            placeholder={
              groupStockConsumer
                ? "Search catalog (own / VW / VISP / VSP) — stock not required"
                : isJobTenant
                  ? "Search products by name or SKU…"
                  : "Search products by name or SKU…"
            }
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

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground">Add payment</p>
        {editingFinalized && !showAddPayment ? (
          <p className="text-sm text-muted">
            This sale is fully paid. Use View Payments on the sales list to
            review or edit existing payments.
          </p>
        ) : editingFinalized ? (
          <p className="text-sm text-muted">
            Remaining due: {formatCurrency(remainingDue)}. Existing payments
            stay as they are — enter an amount below to add another payment on
            Update.
          </p>
        ) : isProvisional ? (
          <p className="text-sm text-muted">
            Payment posts when Status is <strong>Final</strong> (converts this{" "}
            {form.status === "draft" ? "draft" : "quotation"} to a real sale).
          </p>
        ) : (
          <p className="text-sm text-muted">
            Advance Balance: {formatCurrency(customerAdvanceBalance)}
          </p>
        )}
        {showAddPayment ? (
        <>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Amount"
            type="text"
            inputMode="decimal"
            placeholder={
              (editingFinalized ? remainingDue : totalPayable) > 0
                ? (editingFinalized ? remainingDue : totalPayable).toFixed(2)
                : "0.00"
            }
            value={form.paymentAmount}
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
              { value: "bank_transfer", label: "Bank Transfer" },
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
              debounceMs={0}
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
        </div>
        </>
        ) : null}
      </section>

      {error ? <p className="text-sm text-error">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-center gap-3 pb-2">
        {onCancel ? (
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button
          size="sm"
          isLoading={mutation.isPending && saveIntent === "save"}
          loadingText={editSaleId ? "Updating…" : "Saving…"}
          disabled={lines.length === 0 || mutation.isPending}
          onClick={() => kickSave("save")}
        >
          {editSaleId ? "Update" : "Save"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          isLoading={mutation.isPending && saveIntent === "print"}
          loadingText={editSaleId ? "Updating…" : "Saving…"}
          disabled={lines.length === 0 || mutation.isPending}
          onClick={() => kickSave("print")}
        >
          {editSaleId ? "Update and print" : "Save and print"}
        </Button>
      </div>

      <Hq6AddSupplierModal
        open={Boolean(addSupplierForLineKey)}
        tenantId={tenantId}
        onClose={() => setAddSupplierForLineKey(null)}
        onSaved={(result) => {
          if (addSupplierForLineKey && result?.supplierId) {
            updateLine(addSupplierForLineKey, {
              supplierId: result.supplierId,
            });
          }
          setAddSupplierForLineKey(null);
        }}
      />
    </div>
  );
}
