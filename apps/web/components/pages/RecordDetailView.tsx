"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useParams, useRouter } from "next/navigation";
import { EmptyState } from "@/components/atoms/EmptyState";
import { DetailPageShell } from "@/components/pages/DetailPageShell";
import { JobDetailView as JobDetailPage } from "@/components/pages/JobDetailView";
import { getCustomer, getItem, getJob, getSale, getCatalogItem } from "@/lib/api";
import { getAppointment } from "@/lib/api/appointments";
import { getReturn } from "@/lib/api/returns";
import { saleToOrder } from "@/lib/api/orders";
import { getVehicle, getVehicleHistory } from "@/lib/api/vehicles";
import { getStockMovement, updateStockMovementStatus, type StockMovementListRow } from "@/lib/api/stockMovements";
import { getSupplier } from "@/lib/api/suppliers";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate, formatDateTime } from "@/lib/utils/formatDate";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { useTenantStore } from "@/stores/tenantStore";
import type { SectionInstance, HistoryFeedEntry } from "@/lib/registries/sectionTypes";
import type {
  CustomerProfile,
  CustomerTransactionHistoryEntry,
  VehicleJobHistoryEntry,
} from "@vonos/types";
import { recordDetailPath } from "@/lib/utils/recordDetailPath";
import type { JobDetail } from "@/lib/api/jobs";
import type { SaleDetail, StockMovement, MovementStatus } from "@vonos/types";
import { useAuditHistoryFeed, createdByField } from "@/lib/hooks/useAuditHistoryFeed";
import { useDetailExport } from "@/lib/hooks/useDetailExport";
import { buildSaleDetailExport } from "@/lib/utils/detailExport";
import { Button } from "@/components/atoms/Button";
import { DetailPanelSection } from "@/components/organisms/DetailPanelSection";
import { getAdvanceLabel } from "@/components/organisms/StatusStepper";
import { DetailPageSkeleton } from "@/components/organisms/skeletons";
import { SaleReceiptPanel } from "@/components/molecules/SaleReceiptPanel";
import { AccountBookView } from "@/components/pages/PosNavViews";

function DetailLoading() {
  return <DetailPageSkeleton />;
}

function stockStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function movementPartyLabel(notes: string | null): string {
  return notes?.split("|")[0]?.trim() || notes || "—";
}

function isStockMovement(value: unknown): value is StockMovement {
  return (
    typeof value === "object" &&
    value !== null &&
    "lines" in value &&
    Array.isArray((value as StockMovement).lines)
  );
}

function ItemDetailView({
  recordId,
  showVariantMatrix,
  catalogMode,
}: {
  recordId: string;
  showVariantMatrix?: boolean;
  catalogMode?: boolean;
}) {
  const router = useRouter();
  const tenantId = useTenantId();
  const tenantConfig = useTenantStore((state) => state.tenantConfig);
  const listSlug = catalogMode ? "catalog" : "inventory";
  const { listPath } = useRecordNavigation(listSlug);
  const { data: item, isLoading } = useQuery({
    queryKey: ["item", recordId, catalogMode ? "catalog" : "inventory"],
    queryFn: () => (catalogMode ? getCatalogItem(recordId) : getItem(recordId)),
  });
  const { entries: auditEntries } = useAuditHistoryFeed("item", recordId, tenantId);

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  if (!item) {
    return (
      <EmptyState
        title="Item not found"
        message="This SKU may have been removed."
        ctaLabel={catalogMode ? "Back to catalog" : "Back to inventory"}
        onCta={() => router.push(listPath)}
      />
    );
  }

  const sections: SectionInstance[] = [
    {
      type: "stockInfo",
      title: "Stock Info",
      data: { item, businessLocations: tenantConfig?.businessLocations },
    },
  ];

  if (showVariantMatrix) {
    sections.push({
      type: "variantMatrix",
      title: "Size & Color Matrix",
      data: [],
    });
  }

  sections.push({ type: "pricing", title: "Pricing", data: item });

  const createdBy = createdByField(item.createdByName);
  const itemActivity: SectionInstance[] = [
    ...(createdBy
      ? [{ type: "genericFields" as const, title: "Record", data: [createdBy] }]
      : []),
    {
      type: "historyFeed",
      title: "Activity",
      data: auditEntries,
    },
  ];

  return (
    <DetailPageShell
      backHref={listPath}
      backLabel={catalogMode ? "Back to catalog" : "Back to inventory"}
      title={item.name}
      subtitle={item.sku}
      meta={item.category ?? undefined}
      status={{ label: stockStatusLabel(item.status), vocabulary: "stockStatus" }}
      layout="twoColumn"
      sections={sections}
      sidebarSections={itemActivity}
    />
  );
}

function JobRecordDetail({ recordId }: { recordId: string }) {
  const router = useRouter();
  const tenantId = useTenantId();
  const { listPath } = useRecordNavigation("jobs");
  const { data: job, isLoading } = useQuery({
    queryKey: ["job", tenantId, recordId],
    queryFn: () => getJob(recordId),
    enabled: Boolean(tenantId),
  });
  const [jobState, setJobState] = useState<JobDetail | undefined>();

  const activeJob = jobState ?? job;

  if (!tenantId || (isLoading && !activeJob)) {
    return <DetailLoading />;
  }

  if (!activeJob) {
    return (
      <EmptyState
        title="Job not found"
        message="This job may have been archived."
        ctaLabel="Back to jobs"
        onCta={() => router.push(listPath)}
      />
    );
  }

  return <JobDetailPage job={activeJob} listPath={listPath} onJobChange={setJobState} />;
}

function VehicleDetailView({ recordId }: { recordId: string }) {
  const router = useRouter();
  const tenantId = useTenantId();
  const tenantCode = useTenantStore((state) => state.tenantConfig?.code ?? "VA");
  const { listPath } = useRecordNavigation("vehicles");
  const { data: vehicle, isLoading } = useQuery({
    queryKey: ["vehicle", tenantId, recordId],
    queryFn: () => getVehicle(recordId),
    enabled: Boolean(tenantId),
  });
  const { data: history = [] } = useQuery({
    queryKey: ["vehicle-history", tenantId, recordId],
    queryFn: () => getVehicleHistory(recordId),
    enabled: Boolean(tenantId),
  });

  if (!tenantId || isLoading) {
    return <DetailLoading />;
  }

  if (!vehicle) {
    return (
      <EmptyState
        title="Vehicle not found"
        message="This vehicle record could not be loaded."
        ctaLabel="Back to registry"
        onCta={() => router.push(listPath)}
      />
    );
  }

  const fields = [
    { label: "Plate", value: vehicle.plateNumber },
    { label: "Make", value: vehicle.make },
    { label: "Model", value: vehicle.model },
    { label: "Year", value: vehicle.year ? String(vehicle.year) : "—" },
    { label: "Owner", value: vehicle.ownerName },
    { label: "Owner phone", value: vehicle.ownerPhone ?? "—" },
    { label: "VIN", value: vehicle.vin ?? "—" },
  ];

  const historyEntries: HistoryFeedEntry[] = history.map((entry: VehicleJobHistoryEntry) => {
    const subtitleParts = [
      entry.customerName ?? undefined,
      entry.invoiceAmount != null
        ? formatCurrency(entry.invoiceAmount, "NGN")
        : entry.quoteAmount != null
          ? `${formatCurrency(entry.quoteAmount, "NGN")} (quote)`
          : undefined,
      entry.status,
    ].filter(Boolean);

    return {
      id: entry.id,
      title: `Job ${entry.reference}`,
      subtitle: subtitleParts.join(" · "),
      date: entry.dueDate ?? new Date().toISOString(),
      status: entry.status,
      href: recordDetailPath(tenantCode, "job", entry.id) ?? undefined,
    };
  });

  return (
    <DetailPageShell
      backHref={listPath}
      backLabel="Back to registry"
      title={vehicle.plateNumber}
      subtitle={`${vehicle.make} ${vehicle.model}`}
      layout="narrow"
      sidebarSections={[
        { type: "genericFields", title: "Vehicle details", data: fields },
        {
          type: "historyFeed",
          title: "Job history",
          data: historyEntries,
        },
      ]}
    />
  );
}

function transactionHistoryFeed(
  tenantCode: string,
  history: CustomerProfile["transactionHistory"],
): HistoryFeedEntry[] {
  const kindLabel: Record<CustomerTransactionHistoryEntry["kind"], string> = {
    sale: "Sale",
    job: "Job",
    appointment: "Appointment",
  };

  return history.map((entry) => {
    const subtitleParts = [
      formatCurrency(entry.amount, entry.currency),
      entry.status,
      entry.paymentStatus ?? undefined,
    ].filter(Boolean);

    return {
      id: `${entry.kind}-${entry.id}`,
      title: `${kindLabel[entry.kind]} ${entry.reference}`,
      subtitle: subtitleParts.join(" · "),
      date: entry.date,
      status: entry.status,
      href: recordDetailPath(tenantCode, entry.kind, entry.id) ?? undefined,
    };
  });
}

function CustomerDetailView({ recordId }: { recordId: string }) {
  const router = useRouter();
  const params = useParams<{ tenant: string }>();
  const tenantId = useTenantId();
  const { listPath } = useRecordNavigation("customers");
  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", tenantId, recordId],
    queryFn: () => getCustomer(recordId),
    enabled: Boolean(tenantId),
  });
  const { entries: auditEntries } = useAuditHistoryFeed("customer", recordId, tenantId);
  const createdBy = createdByField(customer?.createdByName);
  const isSaloon = params.tenant === "VS";
  const transactionEntries = customer
    ? transactionHistoryFeed(params.tenant, customer.transactionHistory)
    : [];

  if (!tenantId || isLoading) {
    return <DetailLoading />;
  }

  if (!customer) {
    return (
      <EmptyState
        title="Customer not found"
        message="This profile could not be loaded."
        ctaLabel="Back to customers"
        onCta={() => router.push(listPath)}
      />
    );
  }

  const balanceDue = customer.totalSellDue ?? 0;
  const accountFields = [
    { label: "Total billed", value: formatCurrency(customer.totalSell ?? 0, "NGN") },
    { label: "Total paid", value: formatCurrency(customer.totalSellPaid ?? 0, "NGN") },
    {
      label: "Balance due",
      value: formatCurrency(balanceDue, "NGN"),
    },
  ];

  const contactFields = [
    { label: "Email", value: customer.email ?? "—" },
    { label: "Phone", value: customer.phone ?? "—" },
    ...(customer.businessName ? [{ label: "Business", value: customer.businessName }] : []),
    { label: "Total Spend", value: formatCurrency(customer.totalSpend, "NGN") },
    { label: "Visits", value: String(customer.visitCount) },
    ...(createdBy ? [createdBy] : []),
  ];

  const saloonSections: SectionInstance[] = isSaloon
    ? [
        {
          type: "genericFields",
          title: "Contact",
          data: contactFields,
        },
        {
          type: "genericFields",
          title: "Account",
          data: accountFields,
        },
        {
          type: "historyFeed",
          title: "Transaction history",
          data: transactionEntries,
        },
        {
          type: "historyFeed",
          title: "Activity",
          data: auditEntries,
        },
      ]
    : [
        {
          type: "genericFields",
          title: "Contact",
          data: contactFields,
        },
        {
          type: "genericFields",
          title: "Account",
          data: accountFields,
        },
        {
          type: "historyFeed",
          title: "Transaction history",
          data: transactionEntries,
        },
        {
          type: "historyFeed",
          title: "Activity",
          data: auditEntries,
        },
      ];

  return (
    <DetailPageShell
      backHref={listPath}
      backLabel="Back to customers"
      title={customer.name}
      subtitle={customer.email ?? customer.phone ?? undefined}
      meta={isSaloon ? "Customer since Jan 2024" : undefined}
      actions={
        isSaloon ? (
          <div className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-[var(--color-brand-accent)] text-white shadow-card">
            <span className="text-lg font-bold leading-none">420</span>
            <span className="text-[9px] font-medium uppercase tracking-wide opacity-90">pts</span>
          </div>
        ) : undefined
      }
      sections={saloonSections}
    />
  );
}

function MovementDetailView({
  recordId,
  type,
}: {
  recordId: string;
  type: "inbound" | "outbound";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  const { listPath } = useRecordNavigation(type);
  const { entries: auditEntries } = useAuditHistoryFeed("stockMovement", recordId, tenantId);
  const { data: movement, isLoading } = useQuery({
    queryKey: ["stock-movement", tenantId, recordId],
    queryFn: async (): Promise<StockMovement | StockMovementListRow | null> => {
      if (!tenantId) return null;
      return getStockMovement(recordId);
    },
    enabled: Boolean(tenantId),
  });

  const statusMutation = useAppMutation({
    mutationFn: (status: MovementStatus) => updateStockMovementStatus(recordId, status),
    successMessage: (_data, status) => `Movement marked as ${status}`,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["stock-movement", tenantId, recordId] });
      await queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });

  if (!tenantId || isLoading) {
    return <DetailLoading />;
  }

  if (!movement) {
    return (
      <EmptyState
        title="Movement not found"
        message="This record may have been removed."
        ctaLabel={`Back to ${type}`}
        onCta={() => router.push(listPath)}
      />
    );
  }

  const lineItems =
    isStockMovement(movement) && movement.lines.length > 0
      ? movement.lines.map((line) => ({
          name: line.name,
          sku: line.sku,
          qty: line.quantity,
        }))
      : [];

  const loggedByName = isStockMovement(movement) ? movement.createdByName : null;

  const supplierOrDest = isStockMovement(movement)
    ? movementPartyLabel(movement.notes)
    : movement.supplierOrDest;

  const totalUnits = lineItems.reduce((sum, row) => sum + row.qty, 0);
  const displayDate = formatDate(movement.date);

  const nextAction =
    movement.status === "Pending"
      ? type === "inbound"
        ? { label: "Mark as Received", status: "Received" as MovementStatus }
        : { label: "Mark as Shipped", status: "Shipped" as MovementStatus }
      : null;

  return (
    <DetailPageShell
      backHref={listPath}
      backLabel={`Back to ${type}`}
      title={movement.reference}
      subtitle={displayDate}
      status={{ label: movement.status, vocabulary: "movementStatus" }}
      layout="narrow"
      footer={
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-6 shadow-card">
            <p className="mb-4 text-sm text-muted">
              {type === "inbound" ? "Supplier" : "Destination"}:{" "}
              <span className="font-medium text-foreground">{supplierOrDest}</span>
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium">SKU</th>
                  <th className="pb-2 text-right font-medium">Qty</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-sm text-muted">
                      No line items on this movement.
                    </td>
                  </tr>
                ) : (
                  lineItems.map((row) => (
                    <tr key={row.sku} className="border-b border-border">
                      <td className="py-2.5">{row.name}</td>
                      <td className="py-2.5 font-mono text-xs">{row.sku}</td>
                      <td className="py-2.5 text-right">{row.qty}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="pt-3 text-right font-semibold">
                    Total units
                  </td>
                  <td className="pt-3 text-right font-semibold">{totalUnits}</td>
                </tr>
              </tfoot>
            </table>
          </section>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-xs font-medium">
                {(loggedByName ?? "?").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {loggedByName ? `Logged by ${loggedByName}` : "Creator not recorded"}
                </p>
                <p className="text-xs text-muted">{displayDate}</p>
              </div>
            </div>
            {nextAction ? (
              <Button
                onClick={() => statusMutation.mutate(nextAction.status)}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? "Updating…" : nextAction.label}
              </Button>
            ) : null}
          </div>
          <DetailPanelSection
            sections={[{ type: "historyFeed", title: "Activity", data: auditEntries }]}
          />
        </div>
      }
    />
  );
}

function SaleDetailView({ recordId }: { recordId: string }) {
  const router = useRouter();
  const tenantId = useTenantId();
  const exportDetail = useDetailExport();
  const { listPath } = useRecordNavigation("sales");
  const { data: sale, isLoading } = useQuery({
    queryKey: ["sale", tenantId, recordId],
    queryFn: () => getSale(recordId, tenantId!),
    enabled: Boolean(tenantId),
  });
  const { entries: auditEntries } = useAuditHistoryFeed("sale", recordId, tenantId);

  if (!tenantId || isLoading) {
    return <DetailLoading />;
  }

  if (!sale) {
    return (
      <EmptyState
        title="Sale not found"
        message="This transaction could not be loaded."
        ctaLabel="Back to sales"
        onCta={() => router.push(listPath)}
      />
    );
  }

  const lineItems = sale.lines;

  const createdBy = createdByField(sale.createdByName);
  const paymentLabel =
    sale.paymentStatus === "paid"
      ? "Paid"
      : sale.paymentStatus === "partial"
        ? "Partial"
        : sale.paymentStatus === "due"
          ? "Due"
          : "—";

  return (
    <DetailPageShell
      backHref={listPath}
      backLabel="Back to sales"
      title={sale.reference}
      subtitle={`${formatDate(sale.date)} · ${sale.customerName}`}
      status={{ label: sale.status, vocabulary: "saleReturnStatus" }}
      layout="narrow"
      actions={
        lineItems.length > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              exportDetail(`Export ${sale.reference}`, buildSaleDetailExport(sale))
            }
          >
            Export spreadsheet
          </Button>
        ) : null
      }
      sidebarSections={[
        ...(createdBy
          ? [{ type: "genericFields" as const, title: "Record", data: [createdBy] }]
          : []),
        {
          type: "historyFeed",
          title: "Activity",
          data: auditEntries,
        },
      ]}
      footer={
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-6 shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Unit</th>
                  <th className="pb-2 text-right font-medium">Line</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-muted">
                      No line items on this sale.
                    </td>
                  </tr>
                ) : (
                  lineItems.map((line) => (
                    <tr key={line.id} className="border-b border-border">
                      <td className="py-2.5">{line.name}</td>
                      <td className="py-2.5">{line.quantity}</td>
                      <td className="py-2.5 text-right">
                        {formatCurrency(line.unitPrice, sale.currency)}
                      </td>
                      <td className="py-2.5 text-right">
                        {formatCurrency(line.lineTotal, sale.currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-3 text-right font-semibold">
                    Total
                  </td>
                  <td className="pt-3 text-right text-lg font-bold">
                    {formatCurrency(sale.total, sale.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>
          <SaleReceiptPanel sale={sale} />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Payment: {paymentLabel}</span>
            {sale.status === "Completed" ? (
              <Button variant="secondary">Process Return</Button>
            ) : null}
          </div>
        </div>
      }
    />
  );
}

function OrderDetailView({ recordId }: { recordId: string }) {
  const router = useRouter();
  const tenantId = useTenantId();
  const exportDetail = useDetailExport();
  const { listPath } = useRecordNavigation("orders");
  const [status, setStatus] = useState<string | null>(null);
  const { data: sale, isLoading } = useQuery({
    queryKey: ["order", tenantId, recordId],
    queryFn: () => getSale(recordId, tenantId!),
    enabled: Boolean(tenantId),
  });

  if (!tenantId || isLoading) return <DetailLoading />;

  if (!sale) {
    return (
      <EmptyState
        title="Order not found"
        message="This order could not be loaded."
        ctaLabel="Back to orders"
        onCta={() => router.push(listPath)}
      />
    );
  }

  const order = saleToOrder(sale);
  const currentStatus = status ?? order.status;
  const orderStages = ["New", "Preparing", "Ready", "Served"] as const;
  const stageIndex = orderStages.indexOf(currentStatus as (typeof orderStages)[number]);
  const nextStage =
    stageIndex >= 0 && stageIndex < orderStages.length - 1
      ? orderStages[stageIndex + 1]
      : null;

  const saleDetail = sale as SaleDetail;
  const lineItems = Array.isArray(saleDetail.lines) ? saleDetail.lines : [];

  return (
    <DetailPageShell
      backHref={listPath}
      backLabel="Back to orders"
      title={order.reference}
      subtitle={order.tableNumber ? `Table ${order.tableNumber}` : "Takeaway"}
      status={{ label: currentStatus, vocabulary: "orderStatus" }}
      actions={
        lineItems.length > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              exportDetail(`Export ${order.reference}`, buildSaleDetailExport(saleDetail))
            }
          >
            Export spreadsheet
          </Button>
        ) : null
      }
      headerAction={
        nextStage
          ? {
              label: getAdvanceLabel(currentStatus, nextStage),
              onClick: () => setStatus(nextStage),
            }
          : undefined
      }
      footer={
        <div className="space-y-3">
          {lineItems.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted shadow-card">
              No line items on this order.
            </p>
          ) : (
            lineItems.map((line) => (
              <article
                key={line.id}
                className="rounded-xl border border-border bg-card p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <h4 className="font-semibold text-foreground">{line.name}</h4>
                  <span className="text-sm font-medium">
                    {formatCurrency(line.lineTotal, order.currency)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {line.quantity} × {formatCurrency(line.unitPrice, order.currency)}
                  {line.sku ? ` · ${line.sku}` : ""}
                </p>
              </article>
            ))
          )}
          <div className="flex justify-between border-t border-border pt-4 text-lg font-bold">
            <span>Total</span>
            <span>{formatCurrency(order.total, order.currency)}</span>
          </div>
        </div>
      }
    />
  );
}

function AppointmentDetailView({ recordId }: { recordId: string }) {
  const router = useRouter();
  const tenantId = useTenantId();
  const { listPath } = useRecordNavigation("appointments");
  const { entries: auditEntries } = useAuditHistoryFeed("appointment", recordId, tenantId);
  const { data: appt, isLoading } = useQuery({
    queryKey: ["appointment", tenantId, recordId],
    queryFn: () => getAppointment(recordId),
    enabled: Boolean(tenantId),
  });

  if (!tenantId || isLoading) return <DetailLoading />;

  if (!appt) {
    return (
      <EmptyState
        title="Appointment not found"
        message="This booking could not be loaded."
        ctaLabel="Back to calendar"
        onCta={() => router.push(listPath)}
      />
    );
  }

  return (
    <DetailPageShell
      backHref={listPath}
      backLabel="Back to appointments"
      title={appt.serviceName}
      subtitle={appt.customerName}
      status={{ label: appt.status, vocabulary: "appointmentStatus" }}
      sections={[
        {
          type: "genericFields",
          title: "Booking Details",
          data: [
            { label: "Stylist", value: appt.stylistName },
            { label: "Start", value: formatDateTime(appt.startTime) },
            { label: "End", value: formatDateTime(appt.endTime) },
            { label: "Customer", value: appt.customerName },
          ],
        },
        {
          type: "historyFeed",
          title: "Activity",
          data: auditEntries,
        },
      ]}
    />
  );
}

function SupplierDetailView({ recordId }: { recordId: string }) {
  const router = useRouter();
  const tenantId = useTenantId();
  const { listPath } = useRecordNavigation("suppliers");
  const { entries: auditEntries } = useAuditHistoryFeed("supplier", recordId, tenantId);
  const { data: supplier, isLoading } = useQuery({
    queryKey: ["supplier", tenantId, recordId],
    queryFn: () => getSupplier(recordId),
    enabled: Boolean(tenantId),
  });
  const createdBy = createdByField(supplier?.createdByName);

  if (!tenantId || isLoading) {
    return <DetailPageSkeleton />;
  }

  if (!supplier) {
    return (
      <EmptyState
        title="Supplier not found"
        message="This supplier could not be loaded."
        ctaLabel="Back to suppliers"
        onCta={() => router.push(listPath)}
      />
    );
  }

  return (
    <DetailPageShell
      backHref={listPath}
      backLabel="Back to suppliers"
      title={supplier.name}
      subtitle={supplier.category}
      sections={[
        { type: "supplierInfo", title: "Supplier Information", data: supplier },
        ...(createdBy
          ? [{ type: "genericFields" as const, title: "Record", data: [createdBy] }]
          : []),
        { type: "historyFeed", title: "Activity", data: auditEntries },
      ]}
    />
  );
}

function GenericReferenceDetailView({
  listSlug,
  title,
  fields,
}: {
  listSlug: string;
  recordId: string;
  title: string;
  fields: { label: string; value: string }[];
}) {
  const { listPath } = useRecordNavigation(listSlug);
  return (
    <DetailPageShell
      backHref={listPath}
      backLabel={`Back to ${listSlug.replace(/-/g, " ")}`}
      title={title}
      sections={[{ type: "genericFields", title: "Details", data: fields }]}
    />
  );
}

function ReturnDetailView({ recordId }: { recordId: string }) {
  const router = useRouter();
  const tenantId = useTenantId();
  const { listPath } = useRecordNavigation("returns");
  const { data: row, isLoading } = useQuery({
    queryKey: ["return", tenantId, recordId],
    queryFn: () => getReturn(tenantId!, recordId),
    enabled: Boolean(tenantId),
  });

  if (!tenantId || isLoading) return <DetailLoading />;

  if (!row) {
    return (
      <EmptyState
        title="Return not found"
        message="This return could not be loaded."
        ctaLabel="Back to returns"
        onCta={() => router.push(listPath)}
      />
    );
  }

  return (
    <GenericReferenceDetailView
      listSlug="returns"
      recordId={recordId}
      title={row.reference}
      fields={[
        { label: "Original Sale", value: row.saleReference },
        { label: "Customer", value: row.customerName },
        { label: "Amount", value: formatCurrency(row.amount, "NGN") },
        { label: "Status", value: row.status },
        { label: "Date", value: formatDate(row.date) },
      ]}
    />
  );
}

function UnavailableDetailView({
  listSlug,
  title,
  message,
}: {
  listSlug: string;
  title: string;
  message: string;
}) {
  const router = useRouter();
  const { listPath } = useRecordNavigation(listSlug);

  return (
    <EmptyState
      title={title}
      message={message}
      ctaLabel="Back to list"
      onCta={() => router.push(listPath)}
    />
  );
}

export function RecordDetailView({ listSlug, recordId }: { listSlug: string; recordId: string }) {
  const router = useRouter();
  const params = useParams<{ tenant: string }>();
  const tenantCode = params.tenant;
  const tenantId = useTenantId();
  const { listPath } = useRecordNavigation(listSlug);

  const view = useMemo(() => {
    if (!tenantId) return null;
    switch (listSlug) {
      case "inventory":
        return (
          <ItemDetailView
            recordId={recordId}
            showVariantMatrix={tenantCode === "VKW"}
          />
        );
      case "catalog":
        return <ItemDetailView recordId={recordId} catalogMode />;
      case "jobs":
        return <JobRecordDetail recordId={recordId} />;
      case "vehicles":
        return <VehicleDetailView recordId={recordId} />;
      case "customers":
        return <CustomerDetailView recordId={recordId} />;
      case "inbound":
        return <MovementDetailView recordId={recordId} type="inbound" />;
      case "outbound":
        return <MovementDetailView recordId={recordId} type="outbound" />;
      case "sales":
        return <SaleDetailView recordId={recordId} />;
      case "orders":
        return <OrderDetailView recordId={recordId} />;
      case "appointments":
        return <AppointmentDetailView recordId={recordId} />;
      case "suppliers":
        return <SupplierDetailView recordId={recordId} />;
      case "returns":
        return <ReturnDetailView recordId={recordId} />;
      case "requisitions":
        return (
          <UnavailableDetailView
            listSlug={listSlug}
            title="Requisitions not available"
            message="Cross-entity material requisitions are not yet stored in the platform database."
          />
        );
      case "menu-items":
        return (
          <ItemDetailView recordId={recordId} catalogMode />
        );
      case "account-book":
        return <AccountBookView accountId={recordId} />;
      default:
        return null;
    }
  }, [listSlug, recordId, tenantCode, tenantId]);

  if (!tenantId) {
    return <DetailLoading />;
  }

  if (!view) {
    return (
      <EmptyState
        title="Detail not available"
        message="This record type does not have a detail view yet."
        ctaLabel="Back to list"
        onCta={() => router.push(listPath)}
      />
    );
  }

  return view;
}
