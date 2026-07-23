"use client";

import type { ReportsTableRow } from "@vonos/types";
import { RecordViewModal } from "@/components/organisms/RecordViewModal";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { isReportCurrencyDisplayKey } from "@/lib/utils/reportTableTotals";

const HIDDEN_KEYS = new Set([
  "id",
  "recordType",
  "actions",
  "saleId",
  "itemId",
  "customerId",
  "supplierId",
  "sortAt",
  "currency",
]);

function labelForKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(
  key: string,
  value: string | number | undefined,
  currency?: string,
): string {
  if (value == null || value === "") return "—";
  if (typeof value === "number" && isReportCurrencyDisplayKey(key)) {
    return formatCurrency(value, currency ?? "NGN");
  }
  return String(value);
}

/** Fallback modal: shows the report row fields without leaving the page. */
export function ReportRowDetailModal({
  row,
  title,
  onClose,
}: {
  row: ReportsTableRow | null;
  title?: string;
  onClose: () => void;
}) {
  const currency =
    row?.currency != null && typeof row.currency === "string"
      ? row.currency
      : "NGN";

  const entries = row
    ? Object.entries(row).filter(
        ([key, value]) =>
          !HIDDEN_KEYS.has(key) &&
          value != null &&
          !Array.isArray(value) &&
          (typeof value === "string" || typeof value === "number"),
      )
    : [];

  return (
    <RecordViewModal
      open={Boolean(row)}
      title={title ?? "Report details"}
      subtitle={
        row?.recordType ? String(row.recordType).replace(/_/g, " ") : undefined
      }
      onClose={onClose}
    >
      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No details available.</p>
      ) : (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {entries.map(([key, value]) => (
            <div key={key}>
              <dt className="text-muted">{labelForKey(key)}</dt>
              <dd className="font-medium text-foreground">
                {formatValue(key, value as string | number, currency)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </RecordViewModal>
  );
}
