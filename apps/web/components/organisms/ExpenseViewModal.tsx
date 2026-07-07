"use client";

import type { Expense } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { StatusPill } from "@/components/atoms/StatusPill";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr]">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function ExpenseViewModal({
  expense,
  onClose,
  onEdit,
}: {
  expense: Expense | null;
  onClose: () => void;
  onEdit?: (expense: Expense) => void;
}) {
  if (!expense) return null;

  const recurring =
    expense.isRecurring && expense.recurInterval && expense.recurIntervalType
      ? `Every ${expense.recurInterval} ${expense.recurIntervalType}`
      : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {expense.refNo ?? "Expense"}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {formatDate(expense.expenseDate)}
            </p>
          </div>
          <StatusPill status={expense.paymentStatus} vocabulary="movementStatus" />
        </div>

        <dl className="mt-6 space-y-3">
          <DetailRow label="Category" value={expense.categoryName ?? "—"} />
          <DetailRow label="Sub category" value={expense.subCategory ?? "—"} />
          <DetailRow label="Location" value={expense.locationCode ?? "—"} />
          <DetailRow label="Expense for" value={expense.expenseFor ?? "—"} />
          <DetailRow label="Contact" value={expense.contactName ?? "—"} />
          <DetailRow
            label="Total"
            value={formatCurrency(expense.totalAmount, "NGN")}
          />
          <DetailRow
            label="Tax"
            value={formatCurrency(expense.taxAmount, "NGN")}
          />
          <DetailRow
            label="Payment due"
            value={formatCurrency(expense.paymentDue, "NGN")}
          />
          <DetailRow label="Recurring" value={recurring} />
          <DetailRow label="Added by" value={expense.createdByName ?? "—"} />
          <DetailRow label="Note" value={expense.note ?? "—"} />
        </dl>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
          {onEdit ? (
            <Button type="button" onClick={() => onEdit(expense)}>
              Edit
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
