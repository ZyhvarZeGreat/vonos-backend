"use client";

import type { Sale, SaleDetail } from "@vonos/types";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Printer } from "lucide-react";
import { Hq6Modal } from "@/components/hq6/Hq6Modal";
import { getSaleView } from "@/lib/api/sales";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import {
  MODAL_RECORD_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import { seedSaleViewSideCaches } from "@/lib/query/seedSaleViewCaches";
import {
  formatHq6Currency,
  formatHq6Date,
  formatHq6DateTime,
  formatHq6PaymentMethod,
  formatHq6PaymentStatus,
} from "@/lib/utils/hq6Format";
import { formatSaleNotesForDisplay } from "@/lib/utils/saleInvoiceNotes";
import { businessLocationName } from "@/lib/utils/locationLabels";
import { hq6PaymentBadgeClass } from "@/lib/utils/hq6PaymentBadge";
import { cn } from "@/lib/utils/cn";

function saleStatusLabel(recordStatus?: string | null): string {
  if (recordStatus === "draft") return "Draft";
  if (recordStatus === "quotation") return "Quotation";
  if (recordStatus === "completed") return "Final";
  if (!recordStatus) return "Final";
  return recordStatus.charAt(0).toUpperCase() + recordStatus.slice(1);
}

function actionLabel(action: string): string {
  if (action === "created" || action === "added") return "Added";
  if (action === "updated" || action === "edited") return "Edited";
  if (action === "deleted") return "Deleted";
  return action.charAt(0).toUpperCase() + action.slice(1);
}

function formatActivityTag(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  if (raw === "due") return "Due";
  if (raw === "partial") return "Partial";
  if (raw === "paid") return "Paid";
  if (raw === "draft") return "Draft";
  if (raw === "quotation") return "Quotation";
  if (raw === "completed") return "Final";
  return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/_/g, " ");
}

/** Status / payment movement for badge row: From → To */
function activityMovement(
  metadata: Record<string, unknown> | null | undefined,
): { from: string; to: string } | null {
  if (!metadata || typeof metadata !== "object") return null;
  const from =
    metadata.from ??
    metadata.fromStatus ??
    metadata.previousStatus ??
    metadata.fromPaymentStatus ??
    metadata.previousPaymentStatus;
  const to =
    metadata.to ??
    metadata.toStatus ??
    metadata.newStatus ??
    metadata.toPaymentStatus ??
    metadata.paymentStatus;
  if (from == null || to == null) return null;
  const fromLabel = formatActivityTag(from);
  const toLabel = formatActivityTag(to);
  if (fromLabel === toLabel) return null;
  return { from: fromLabel, to: toLabel };
}

function seedToDetail(seed: Sale): SaleDetail {
  return { ...seed, lines: [] };
}

/**
 * HQ6 Sell Details modal — matches Ultimate POS invoice view layout.
 * Opens instantly from a list-row seed; lines/payments fill in when fetched.
 */
export function Hq6SaleViewModal({
  open,
  saleId,
  initialSale = null,
  onClose,
  onPrintInvoice,
  onPackingSlip,
  showBack = false,
}: {
  open: boolean;
  saleId: string | null;
  /** List row — paints the frame immediately (expenses-style). */
  initialSale?: Sale | null;
  onClose: () => void;
  onPrintInvoice?: () => void;
  onPackingSlip?: () => void;
  showBack?: boolean;
}) {
  const tenantId = useTenantId();
  const { tenantId: routeTenantId, config } = useRouteTenant();
  const effectiveTenantId = tenantId ?? routeTenantId;

  const queryClient = useQueryClient();
  const seeded =
    initialSale && saleId && initialSale.id === saleId
      ? seedToDetail(initialSale)
      : null;

  const { data: bundle, isLoading, isFetching } = useQuery({
    queryKey: modalKeys.saleView(effectiveTenantId, saleId),
    queryFn: async () => {
      const data = await getSaleView(saleId!, effectiveTenantId!);
      seedSaleViewSideCaches(queryClient, effectiveTenantId!, data);
      return data;
    },
    enabled: Boolean(open && effectiveTenantId && saleId),
    staleTime: MODAL_RECORD_STALE_MS,
    placeholderData: (prev) =>
      prev?.sale?.id === saleId ? prev : undefined,
  });

  // Prefer the prefetched /view bundle (invoice + payments + activities).
  const sale = bundle?.sale?.id === saleId ? bundle.sale : seeded;
  const payments = bundle?.sale?.id === saleId ? (bundle.payments ?? []) : [];
  const activities =
    bundle?.sale?.id === saleId ? (bundle.activities ?? []) : [];
  const detailPending = Boolean(open && saleId && !bundle?.sale);
  const paymentsLoading = detailPending && (isLoading || isFetching);
  // Same payload as invoice — only spin if /view is still in flight.
  const activitiesLoading =
    detailPending && !activities.length && (isLoading || isFetching);
  const linesLoading = detailPending && (sale?.lines.length ?? 0) === 0;

  const currency = sale?.currency ?? "NGN";
  const locationLabel = businessLocationName(
    sale?.locationCode ?? null,
    config?.businessLocations,
  );

  const lines = useMemo(() => {
    if (!sale) return [];
    return sale.lines.map((line, index) => {
      const qty = line.quantity;
      const unitPrice = line.unitPrice;
      const discountAmt = line.discountAmount ?? 0;
      const gross = unitPrice * qty;
      const discountPercent =
        gross > 0 ? Math.round((discountAmt / gross) * 10000) / 100 : 0;
      const priceIncTax = Math.max(
        0,
        unitPrice - (qty > 0 ? discountAmt / qty : 0),
      );
      const subtotal = line.lineTotal;
      return {
        index: index + 1,
        name: line.name,
        qty,
        unit: "sng",
        unitPrice,
        discountAmt,
        discountPercent,
        tax: 0,
        priceIncTax,
        subtotal,
      };
    });
  }, [sale]);

  const lineTotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const discountAmount = sale?.discountAmount ?? 0;
  const taxAmount = sale?.taxAmount ?? 0;
  const totalPayable = sale?.total ?? lineTotal;
  const totalPaid = sale?.totalPaid ?? 0;
  const totalRemaining =
    sale?.sellDue ?? Math.max(0, totalPayable - totalPaid);
  const discountPercent =
    lineTotal > 0
      ? Math.round((discountAmount / lineTotal) * 10000) / 100
      : 0;

  const customerDisplay = sale
    ? [sale.customerName, sale.vehicleLabel].filter(Boolean).join(" ")
    : "";

  const title = sale
    ? `Sell Details ( Invoice No. : ${sale.reference.replace(/^#/, "")})`
    : "Sell Details";

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title={title}
      size="2xl"
      showBack={showBack}
      bodyClassName="hq6-purchase-view-body"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {showBack ? (
            <button
              type="button"
              className="hq6-modal-btn hq6-modal-btn-close"
              onClick={onClose}
            >
              Back
            </button>
          ) : null}
          <button
            type="button"
            className="hq6-modal-btn hq6-modal-btn-packing"
            onClick={() => onPackingSlip?.()}
            disabled={!onPackingSlip}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Packing Slip
          </button>
          <button
            type="button"
            className="hq6-modal-btn hq6-modal-btn-print"
            onClick={() => onPrintInvoice?.()}
            disabled={!onPrintInvoice}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Invoice
          </button>
          <button
            type="button"
            className="hq6-modal-btn hq6-modal-btn-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      }
    >
      {!sale ? (
        <div className="space-y-3 py-2" aria-busy aria-label="Loading sale">
          <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-gray-200" />
          <div className="mt-4 h-48 w-full animate-pulse rounded-lg bg-gray-100" />
          <p className="pt-2 text-center text-sm text-[#6b7280]">
            {isLoading ? "Loading sale…" : "Sale not found."}
          </p>
        </div>
      ) : (
        <div className="hq6-purchase-view hq6-sale-view">
          <p className="hq6-purchase-view-date">
            <b>Date:</b> {formatHq6Date(sale.date)}
          </p>

          <div className="hq6-purchase-view-meta">
            <div>
              <div>
                <b>Invoice No.:</b> #{sale.reference.replace(/^#/, "")}
              </div>
              <div>
                <b>Status:</b> {saleStatusLabel(sale.recordStatus)}
              </div>
              <div>
                <b>Payment Status:</b>{" "}
                <span
                  className={cn(
                    "hq6-pay-badge",
                    hq6PaymentBadgeClass(sale.paymentStatus),
                  )}
                >
                  {formatHq6PaymentStatus(sale.paymentStatus) || "Due"}
                </span>
              </div>
              <div>
                <b>Vehicle Time in (Date entered):</b>{" "}
                {formatHq6Date(sale.date) || "--"}
              </div>
              <div>
                <b>Vehicle Release Date:</b> --
              </div>
              <div>
                <b>Customer location:</b> {locationLabel || "--"}
              </div>
            </div>

            <div>
              <div>
                <b>Customer name:</b> {customerDisplay || "--"}
              </div>
              <div>
                <b>Address:</b> {customerDisplay || "--"}
              </div>
              <div>
                <b>Mobile:</b> {sale.customerPhone?.trim() || "--"}
              </div>
            </div>

            <div>
              <div>
                <b>Service staff:</b>{" "}
                {sale.serviceStaffEmployeeName?.trim() ||
                  sale.cleanerName?.trim() ||
                  "--"}
              </div>
              <div>
                <b>Shipping:</b>{" "}
                {sale.shippingAddress?.trim() ||
                  (sale.shippingStatus
                    ? sale.shippingStatus.charAt(0).toUpperCase() +
                      sale.shippingStatus.slice(1)
                    : "--")}
              </div>
            </div>
          </div>

          <h4 className="hq6-purchase-view-section-title">Products:</h4>
          <div className="hq6-product-view-table-wrap">
            <table className="hq6-product-view-table hq6-sale-view-lines">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th className="text-right">Quantity</th>
                  <th className="text-right">Unit Price</th>
                  <th className="text-right">Discount</th>
                  <th className="text-right">Tax</th>
                  <th className="text-right">Price inc. tax</th>
                  <th className="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {linesLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center">
                      Loading…
                    </td>
                  </tr>
                ) : lines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center">
                      No products
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => (
                    <tr key={`${line.name}-${line.index}`}>
                      <td>{line.index}</td>
                      <td className="font-semibold">{line.name}</td>
                      <td className="text-right tabular-nums">
                        {line.qty.toFixed(2)} {line.unit}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatHq6Currency(line.unitPrice, currency)}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatHq6Currency(line.discountAmt, currency)}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatHq6Currency(line.tax, currency)}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatHq6Currency(line.priceIncTax, currency)}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatHq6Currency(line.subtotal, currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="hq6-purchase-view-bottom">
            <div>
              <h4 className="hq6-purchase-view-section-title">Payment info:</h4>
              <div className="hq6-product-view-table-wrap">
                <table className="hq6-product-view-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reference No</th>
                      <th>Amount</th>
                      <th>Payment mode</th>
                      <th>Payment note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsLoading ? (
                      <tr>
                        <td colSpan={5} className="text-center">
                          Loading…
                        </td>
                      </tr>
                    ) : payments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-[#9ca3af]">
                          &nbsp;
                        </td>
                      </tr>
                    ) : (
                      payments.map((pay) => (
                        <tr key={pay.id}>
                          <td>{formatHq6Date(pay.paidOn ?? "")}</td>
                          <td>{pay.paymentRefNo ?? "—"}</td>
                          <td>
                            {formatHq6Currency(
                              pay.amount,
                              pay.currency || currency,
                            )}
                          </td>
                          <td>{formatHq6PaymentMethod(pay.method)}</td>
                          <td>{pay.note ?? ""}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <table className="hq6-purchase-totals hq6-sale-view-totals">
              <tbody>
                <tr>
                  <th>Total:</th>
                  <td />
                  <td className="text-right tabular-nums">
                    {formatHq6Currency(
                      linesLoading ? totalPayable : lineTotal || totalPayable,
                      currency,
                    )}
                  </td>
                </tr>
                <tr>
                  <th>Discount:(-)</th>
                  <td className="text-right tabular-nums">
                    {discountPercent.toFixed(2)} %
                  </td>
                  <td />
                </tr>
                <tr>
                  <th>Order Tax:(+)</th>
                  <td />
                  <td className="text-right tabular-nums">
                    {taxAmount === 0
                      ? "0.00"
                      : formatHq6Currency(taxAmount, currency)}
                  </td>
                </tr>
                <tr>
                  <th>Shipping:(+)</th>
                  <td />
                  <td className="text-right tabular-nums">
                    {formatHq6Currency(0, currency)}
                  </td>
                </tr>
                <tr>
                  <th>Round Off:</th>
                  <td />
                  <td className="text-right tabular-nums">
                    {formatHq6Currency(0, currency)}
                  </td>
                </tr>
                <tr>
                  <th>Total Payable:</th>
                  <td />
                  <td className="text-right tabular-nums font-semibold">
                    {formatHq6Currency(totalPayable, currency)}
                  </td>
                </tr>
                <tr>
                  <th>Total paid:</th>
                  <td />
                  <td className="text-right tabular-nums">
                    {formatHq6Currency(totalPaid, currency)}
                  </td>
                </tr>
                <tr>
                  <th>Total remaining:</th>
                  <td />
                  <td className="text-right tabular-nums font-semibold">
                    {formatHq6Currency(totalRemaining, currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="hq6-purchase-view-notes hq6-sale-view-notes">
            <div>
              <strong>Sell note:</strong>
              <p className="hq6-purchase-note-well whitespace-pre-wrap">
                {formatSaleNotesForDisplay(sale.notes) || "—"}
              </p>
            </div>
            <div>
              <strong>Payment note:</strong>
              <p className="hq6-purchase-note-well whitespace-pre-wrap">
                {sale.paymentNote?.trim() || "—"}
              </p>
            </div>
          </div>

          <h4 className="hq6-purchase-view-section-title hq6-sale-activity-heading">
            Sale activity
          </h4>
          <div className="hq6-product-view-table-wrap">
            <table className="hq6-product-view-table hq6-sale-activities">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>By</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {activitiesLoading ? (
                  <tr>
                    <td colSpan={4} className="text-center">
                      Loading…
                    </td>
                  </tr>
                ) : activities.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-[#9ca3af]">
                      No activity yet
                    </td>
                  </tr>
                ) : (
                  activities.map((entry) => {
                    const movement = activityMovement(
                      entry.metadata && typeof entry.metadata === "object"
                        ? (entry.metadata as Record<string, unknown>)
                        : null,
                    );
                    return (
                      <tr key={entry.id}>
                        <td className="whitespace-nowrap">
                          {formatHq6DateTime(entry.occurredAt)}
                        </td>
                        <td>
                          <div className="hq6-sale-activity-action">
                            <span className="hq6-sale-activity-action-label">
                              {actionLabel(entry.action)}
                            </span>
                            {movement ? (
                              <span
                                className="hq6-sale-activity-badges"
                                title={`${movement.from} → ${movement.to}`}
                              >
                                <span className="hq6-sale-activity-badge">
                                  {movement.from}
                                </span>
                                <span className="hq6-sale-activity-arrow" aria-hidden>
                                  →
                                </span>
                                <span className="hq6-sale-activity-badge hq6-sale-activity-badge-to">
                                  {movement.to}
                                </span>
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td>{entry.actorName ?? "—"}</td>
                        <td>
                          <span className="hq6-sale-activity-note">
                            {entry.summary}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Hq6Modal>
  );
}
