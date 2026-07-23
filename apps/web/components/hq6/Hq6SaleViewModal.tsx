"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Printer } from "lucide-react";
import { Hq6Modal } from "@/components/hq6/Hq6Modal";
import { getSaleView } from "@/lib/api/sales";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import {
  MODAL_RECORD_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import {
  formatHq6Currency,
  formatHq6Date,
  formatHq6DateTime,
  formatHq6PaymentMethod,
  formatHq6PaymentStatus,
} from "@/lib/utils/hq6Format";
import { businessLocationName } from "@/lib/utils/locationLabels";

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

/**
 * HQ6 Sell Details modal — matches Ultimate POS invoice view layout.
 */
export function Hq6SaleViewModal({
  open,
  saleId,
  onClose,
  onPrintInvoice,
  onPackingSlip,
}: {
  open: boolean;
  saleId: string | null;
  onClose: () => void;
  onPrintInvoice?: () => void;
  onPackingSlip?: () => void;
}) {
  const tenantId = useTenantId();
  const { config } = useRouteTenant();

  const { data: bundle, isLoading } = useQuery({
    queryKey: modalKeys.saleView(tenantId, saleId),
    queryFn: () => getSaleView(saleId!, tenantId!),
    enabled: Boolean(open && tenantId && saleId),
    staleTime: MODAL_RECORD_STALE_MS,
  });

  const sale = bundle?.sale;
  const payments = bundle?.payments ?? [];
  const activities = bundle?.activities ?? [];
  const paymentsLoading = isLoading && !bundle;
  const activitiesLoading = isLoading && !bundle;

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
      const priceIncTax = Math.max(0, unitPrice - (qty > 0 ? discountAmt / qty : 0));
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
      bodyClassName="hq6-purchase-view-body"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="hq6-modal-btn hq6-modal-btn-packing"
            onClick={() => onPackingSlip?.() ?? window.print()}
          >
            <FileText className="h-3.5 w-3.5" />
            Packing Slip
          </button>
          <button
            type="button"
            className="hq6-modal-btn hq6-modal-btn-print"
            onClick={() => onPrintInvoice?.() ?? window.print()}
          >
            <Printer className="h-3.5 w-3.5" />
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
      {isLoading || !sale ? (
        <p className="text-sm text-[#6b7280]">
          {isLoading ? "Loading sale…" : "Sale not found."}
        </p>
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
                {formatHq6PaymentStatus(sale.paymentStatus) || "Due"}
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
                {lines.length === 0 ? (
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
                    {formatHq6Currency(lineTotal, currency)}
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
              <p className="hq6-purchase-note-well">
                {sale.notes?.trim() || "--"}
              </p>
            </div>
            <div>
              <strong>Staff note:</strong>
              <p className="hq6-purchase-note-well">--</p>
            </div>
          </div>

          <h4 className="hq6-purchase-view-section-title">Activities:</h4>
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
                  activities.map((entry) => (
                    <tr key={entry.id}>
                      <td className="whitespace-nowrap">
                        {formatHq6DateTime(entry.occurredAt)}
                      </td>
                      <td>{actionLabel(entry.action)}</td>
                      <td>{entry.actorName ?? "—"}</td>
                      <td>
                        <span className="hq6-sale-activity-note">
                          {entry.summary}
                        </span>
                        {entry.metadata &&
                        typeof entry.metadata === "object" &&
                        "from" in entry.metadata &&
                        "to" in entry.metadata ? (
                          <span className="hq6-sale-activity-badges">
                            <span className="hq6-sale-activity-badge">
                              {String(entry.metadata.from)}
                            </span>
                            <span className="hq6-sale-activity-arrow">→</span>
                            <span className="hq6-sale-activity-badge hq6-sale-activity-badge-to">
                              {String(entry.metadata.to)}
                            </span>
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Hq6Modal>
  );
}
