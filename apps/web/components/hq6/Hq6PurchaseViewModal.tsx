"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import type { StockMovement, StockMovementListRow } from "@vonos/types";
import { Hq6Modal } from "@/components/hq6/Hq6Modal";
import { getPurchaseView } from "@/lib/api/stockMovements";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import {
  MODAL_RECORD_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import { formatHq6Currency, formatHq6Date, formatHq6PaymentStatus } from "@/lib/utils/hq6Format";
import { hq6PaymentBadgeClass } from "@/lib/utils/hq6PaymentBadge";
import { stockMovementSeedFromListRow } from "@/lib/utils/listModalSeeds";
import { businessLocationName } from "@/lib/utils/locationLabels";
import { parsePurchaseNotes } from "@/lib/utils/purchaseNotes";
import { cn } from "@/lib/utils/cn";
import { Hq6AuditTrail } from "@/components/hq6/Hq6AuditTrail";

function partyFromNotes(notes: string | null): string {
  if (!notes) return "—";
  return notes.split("|")[0]?.trim() || notes;
}

function purchaseStatusLabel(status: string): string {
  if (status === "Received" || status === "Delivered") return "Received";
  if (status === "Ordered" || status === "Pending") return status;
  return status;
}

/**
 * HQ6 Purchase Details modal — ui-implement-bundle/modal/21-purchases/view.
 * Opens instantly from a list-row seed; lines/payments fill in when fetched.
 */
export function Hq6PurchaseViewModal({
  open,
  purchaseId,
  initialPurchase = null,
  onClose,
  showBack = false,
}: {
  open: boolean;
  purchaseId: string | null;
  initialPurchase?: StockMovementListRow | null;
  onClose: () => void;
  showBack?: boolean;
}) {
  const tenantId = useTenantId();
  const { tenantId: routeTenantId, config, tenantName } = useRouteTenant();
  const effectiveTenantId = tenantId ?? routeTenantId;

  const queryClient = useQueryClient();
  const seeded: StockMovement | null =
    initialPurchase && purchaseId && initialPurchase.id === purchaseId
      ? stockMovementSeedFromListRow(initialPurchase, "inbound")
      : null;

  const { data: bundle, isLoading, isFetching } = useQuery({
    queryKey: modalKeys.purchaseView(effectiveTenantId, purchaseId),
    queryFn: async () => {
      const data = await getPurchaseView(effectiveTenantId!, purchaseId!);
      queryClient.setQueryData(
        modalKeys.purchasePayments(effectiveTenantId, purchaseId),
        data.payments,
      );
      return data;
    },
    enabled: Boolean(open && effectiveTenantId && purchaseId),
    staleTime: MODAL_RECORD_STALE_MS,
    placeholderData: (prev) =>
      prev?.movement?.id === purchaseId ? prev : undefined,
  });

  const movement =
    bundle?.movement?.id === purchaseId ? bundle.movement : seeded;
  const payments =
    bundle?.movement?.id === purchaseId ? (bundle.payments ?? []) : [];
  const supplier =
    bundle?.movement?.id === purchaseId ? (bundle.supplier ?? null) : null;
  const detailPending = Boolean(open && purchaseId && !bundle?.movement);
  const paymentsLoading = detailPending && (isLoading || isFetching);
  const linesLoading = detailPending && (movement?.lines.length ?? 0) === 0;

  const currency = "NGN";
  const locationLabel = businessLocationName(
    movement?.locationCode ?? null,
    config?.businessLocations,
  );

  const lines = useMemo(() => {
    if (!movement) return [];
    return movement.lines.map((line, index) => {
      const unitBeforeDiscount = line.unitCost ?? 0;
      const discountPercent = 0;
      const unitBeforeTax = unitBeforeDiscount * (1 - discountPercent / 100);
      const qty = line.quantity;
      const subtotalBeforeTax = unitBeforeTax * qty;
      const tax = 0;
      const unitAfterTax = unitBeforeTax + tax;
      const subtotal = unitAfterTax * qty;
      return {
        index: index + 1,
        name: line.name || line.sku,
        sku: line.sku,
        qty,
        unit: "Single",
        unitBeforeDiscount,
        discountPercent,
        unitBeforeTax,
        subtotalBeforeTax,
        tax,
        unitAfterTax,
        subtotal,
      };
    });
  }, [movement]);

  const listTotal = initialPurchase?.grandTotal ?? 0;
  const netTotal = lines.reduce((sum, line) => sum + line.subtotalBeforeTax, 0);
  const discountTotal = 0;
  const taxTotal = 0;
  const purchaseTotal = linesLoading
    ? listTotal
    : netTotal - discountTotal + taxTotal;

  const supplierName =
    supplier?.businessName ??
    supplier?.name ??
    initialPurchase?.supplierOrDest ??
    partyFromNotes(movement?.notes ?? null) ??
    "—";
  const supplierMobile = supplier?.phone ?? null;
  const supplierAddress = supplier?.address ?? null;

  const title = movement
    ? `Purchase Details (Reference No: #${movement.reference.replace(/^#/, "")})`
    : "Purchase Details";

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
            className="hq6-modal-btn hq6-modal-btn-print"
            onClick={() => window.print()}
          >
            <Printer className="h-3.5 w-3.5" />
            Print
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
      {!movement ? (
        <div className="space-y-3 py-2" aria-busy aria-label="Loading purchase">
          <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
          <div className="mt-4 h-48 w-full animate-pulse rounded-lg bg-gray-100" />
          <p className="pt-2 text-center text-sm text-[#6b7280]">
            {isLoading ? "Loading purchase…" : "Purchase not found."}
          </p>
        </div>
      ) : (
        <div className="hq6-purchase-view">
          <p className="hq6-purchase-view-date">
            <b>Date:</b> {formatHq6Date(movement.date)}
          </p>

          <div className="hq6-purchase-view-meta">
            <div>
              <div className="hq6-purchase-view-meta-label">Supplier:</div>
              <address className="hq6-purchase-view-address">
                {supplierName}
                {supplierAddress ? (
                  <>
                    <br />
                    {supplierAddress}
                  </>
                ) : null}
                <br />
                Mobile: {supplierMobile?.trim() || "—"}
              </address>
            </div>
            <div>
              <div className="hq6-purchase-view-meta-label">Business:</div>
              <address className="hq6-purchase-view-address">
                <strong>{tenantName || config?.name || "Vonos Autos HQ"}</strong>
                {locationLabel ? (
                  <>
                    <br />
                    {locationLabel}
                  </>
                ) : null}
                <br />
                ARK GARDEN
                <br />
                KUBWA, FCT, Nigeria
                <br />
                Mobile: —
                <br />
                Email: —
              </address>
            </div>
            <div>
              <div>
                <b>Reference No:</b> #{movement.reference.replace(/^#/, "")}
              </div>
              <div>
                <b>Date:</b> {formatHq6Date(movement.date)}
              </div>
              <div>
                <b>Purchase Status:</b> {purchaseStatusLabel(movement.status)}
              </div>
              <div>
                <b>Payment Status:</b>{" "}
                {movement.paymentStatus ? (
                  <span
                    className={cn(
                      "hq6-pay-badge",
                      hq6PaymentBadgeClass(movement.paymentStatus),
                    )}
                  >
                    {formatHq6PaymentStatus(movement.paymentStatus)}
                  </span>
                ) : (
                  <span className={cn("hq6-pay-badge", hq6PaymentBadgeClass("due"))}>
                    Due
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="hq6-product-view-table-wrap">
            <table className="hq6-product-view-table hq6-purchase-lines-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th className="text-right">Purchase Quantity</th>
                  <th className="text-right">Unit Cost (Before Discount)</th>
                  <th className="text-right">Discount Percent</th>
                  <th className="text-right">Unit Cost (Before Tax)</th>
                  <th className="text-right">Subtotal (Before Tax)</th>
                  <th className="text-right">Tax</th>
                  <th className="text-right">Unit Cost Price (After Tax)</th>
                  <th className="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {linesLoading ? (
                  <tr>
                    <td colSpan={11} className="text-center">
                      Loading…
                    </td>
                  </tr>
                ) : lines.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center">
                      No products
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => (
                    <tr key={`${line.sku}-${line.index}`}>
                      <td>{line.index}</td>
                      <td className="font-semibold">{line.name}</td>
                      <td>{line.sku}</td>
                      <td className="text-right tabular-nums">
                        {line.qty.toFixed(2)} {line.unit}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatHq6Currency(line.unitBeforeDiscount, currency)}
                      </td>
                      <td className="text-right tabular-nums">
                        {line.discountPercent.toFixed(2)} %
                      </td>
                      <td className="text-right tabular-nums">
                        {formatHq6Currency(line.unitBeforeTax, currency)}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatHq6Currency(line.subtotalBeforeTax, currency)}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatHq6Currency(line.tax, currency)}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatHq6Currency(line.unitAfterTax, currency)}
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
                      <th>#</th>
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
                        <td colSpan={6} className="text-center">
                          Loading…
                        </td>
                      </tr>
                    ) : payments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center">
                          No payments found
                        </td>
                      </tr>
                    ) : (
                      payments.map((pay, idx) => (
                        <tr key={pay.id}>
                          <td>{idx + 1}</td>
                          <td>{formatHq6Date(pay.paidOn ?? "")}</td>
                          <td>—</td>
                          <td>
                            {formatHq6Currency(pay.amount, pay.currency || currency)}
                          </td>
                          <td>{pay.method ?? "—"}</td>
                          <td>{pay.note ?? ""}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <table className="hq6-purchase-totals">
              <tbody>
                <tr>
                  <th>Net Total Amount:</th>
                  <td />
                  <td className="text-right tabular-nums">
                    {formatHq6Currency(
                      linesLoading ? purchaseTotal : netTotal,
                      currency,
                    )}
                  </td>
                </tr>
                <tr>
                  <th>Discount:</th>
                  <td>
                    <b>(-)</b>
                  </td>
                  <td className="text-right tabular-nums">
                    {formatHq6Currency(discountTotal, currency)}
                  </td>
                </tr>
                <tr>
                  <th>Purchase Tax:</th>
                  <td>
                    <b>(+)</b>
                  </td>
                  <td className="text-right tabular-nums">
                    {taxTotal === 0
                      ? "0.00"
                      : formatHq6Currency(taxTotal, currency)}
                  </td>
                </tr>
                <tr>
                  <th>Purchase Total:</th>
                  <td />
                  <td className="text-right tabular-nums font-semibold">
                    {formatHq6Currency(purchaseTotal, currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="hq6-purchase-view-notes">
            <div>
              <strong>Shipping Details:</strong>
              <p className="hq6-purchase-note-well whitespace-pre-wrap">
                {parsePurchaseNotes(movement.notes).shippingDetails || "—"}
              </p>
            </div>
            <div>
              <strong>Additional Notes:</strong>
              <p className="hq6-purchase-note-well whitespace-pre-wrap">
                {parsePurchaseNotes(movement.notes).additionalNotes || "—"}
              </p>
            </div>
            <div>
              <strong>Payment note:</strong>
              <p className="hq6-purchase-note-well whitespace-pre-wrap">
                {parsePurchaseNotes(movement.notes).paymentNote ||
                  payments
                    .map((p) => p.note?.trim())
                    .filter(Boolean)
                    .join("\n") ||
                  "—"}
              </p>
            </div>
          </div>

          <Hq6AuditTrail
            entityType="stockMovement"
            entityId={purchaseId}
            title="Activity"
            enabled={open}
          />
        </div>
      )}
    </Hq6Modal>
  );
}
