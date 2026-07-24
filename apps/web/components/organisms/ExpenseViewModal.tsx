"use client";

import type { Expense } from "@vonos/types";
import { Hq6Modal } from "@/components/hq6/Hq6Modal";
import {
  formatHq6Currency,
  formatHq6Date,
  formatHq6PaymentStatus,
} from "@/lib/utils/hq6Format";
import { hq6PaymentBadgeClass } from "@/lib/utils/hq6PaymentBadge";
import { businessLocationName } from "@/lib/utils/locationLabels";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { cn } from "@/lib/utils/cn";

/**
 * HQ6 Expense details — same document frame as sell/purchase view modals.
 * Opens instantly from the list row (no fetch).
 */
export function ExpenseViewModal({
  expense,
  onClose,
  onEdit,
}: {
  expense: Expense | null;
  onClose: () => void;
  onEdit?: (expense: Expense) => void;
}) {
  const { config, tenantName } = useRouteTenant();

  const recurring =
    expense?.isRecurring && expense.recurInterval && expense.recurIntervalType
      ? `Every ${expense.recurInterval} ${expense.recurIntervalType}`
      : "No";

  const locationLabel = businessLocationName(
    expense?.locationCode ?? null,
    config?.businessLocations,
  );

  const title = expense
    ? `Expense Details ( Ref: ${expense.refNo ?? expense.id} )`
    : "Expense Details";

  const total = expense?.totalAmount ?? 0;
  const tax = expense?.taxAmount ?? 0;
  const due = expense?.paymentDue ?? 0;
  const paid = Math.max(0, total - due);

  return (
    <Hq6Modal
      open={Boolean(expense)}
      onClose={onClose}
      title={title}
      size="2xl"
      bodyClassName="hq6-purchase-view-body"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {expense && onEdit ? (
            <button
              type="button"
              className="hq6-modal-btn hq6-modal-btn-print"
              onClick={() => onEdit(expense)}
            >
              Edit
            </button>
          ) : null}
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
      {expense ? (
        <div className="hq6-purchase-view hq6-expense-view">
          <p className="hq6-purchase-view-date">
            <b>Date:</b> {formatHq6Date(expense.expenseDate)}
          </p>

          <div className="hq6-purchase-view-meta">
            <div>
              <div className="hq6-purchase-view-meta-label">
                {tenantName || "Business"}:
              </div>
              <address className="hq6-purchase-view-address">
                {locationLabel || expense.locationCode || "—"}
              </address>
            </div>
            <div>
              <div>
                <b>Reference No:</b> {expense.refNo ?? "—"}
              </div>
              <div>
                <b>Payment Status:</b>{" "}
                <span
                  className={cn(
                    "hq6-pay-badge",
                    hq6PaymentBadgeClass(expense.paymentStatus),
                  )}
                >
                  {formatHq6PaymentStatus(expense.paymentStatus) || "Due"}
                </span>
              </div>
              <div>
                <b>Category:</b> {expense.categoryName ?? "—"}
              </div>
              <div>
                <b>Sub category:</b> {expense.subCategory ?? "—"}
              </div>
            </div>
            <div>
              <div>
                <b>Expense for:</b> {expense.expenseFor ?? "—"}
              </div>
              <div>
                <b>Contact:</b> {expense.contactName ?? "—"}
              </div>
              <div>
                <b>Added by:</b> {expense.createdByName ?? "—"}
              </div>
              <div>
                <b>Recurring:</b> {recurring}
              </div>
            </div>
          </div>

          <h4 className="hq6-purchase-view-section-title">Summary:</h4>
          <div className="hq6-product-view-table-wrap">
            <table className="hq6-product-view-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Description</th>
                  <th className="text-right">Tax</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td className="font-semibold">
                    {[expense.categoryName, expense.subCategory]
                      .filter(Boolean)
                      .join(" · ") || "Expense"}
                  </td>
                  <td className="text-right tabular-nums">
                    {formatHq6Currency(tax, "NGN")}
                  </td>
                  <td className="text-right tabular-nums">
                    {formatHq6Currency(total, "NGN")}
                  </td>
                </tr>
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
                      <th>Status</th>
                      <th>Amount paid</th>
                      <th>Amount due</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{formatHq6Date(expense.expenseDate)}</td>
                      <td>
                        <span
                          className={cn(
                            "hq6-pay-badge",
                            hq6PaymentBadgeClass(expense.paymentStatus),
                          )}
                        >
                          {formatHq6PaymentStatus(expense.paymentStatus) ||
                            "Due"}
                        </span>
                      </td>
                      <td className="tabular-nums">
                        {formatHq6Currency(paid, "NGN")}
                      </td>
                      <td className="tabular-nums">
                        {formatHq6Currency(due, "NGN")}
                      </td>
                    </tr>
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
                    {formatHq6Currency(total, "NGN")}
                  </td>
                </tr>
                <tr>
                  <th>Tax:(+)</th>
                  <td />
                  <td className="text-right tabular-nums">
                    {formatHq6Currency(tax, "NGN")}
                  </td>
                </tr>
                <tr>
                  <th>Total paid:</th>
                  <td />
                  <td className="text-right tabular-nums">
                    {formatHq6Currency(paid, "NGN")}
                  </td>
                </tr>
                <tr>
                  <th>Total remaining:</th>
                  <td />
                  <td className="text-right tabular-nums font-semibold">
                    {formatHq6Currency(due, "NGN")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="hq6-purchase-view-notes hq6-sale-view-notes">
            <div>
              <strong>Note:</strong>
              <p className="hq6-purchase-note-well">
                {expense.note?.trim() || "--"}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </Hq6Modal>
  );
}
