"use client";

import { formatHq6PaymentMethod } from "@/lib/utils/hq6Format";

export interface Hq6SalesSummaryStripProps {
  paidCount: number;
  dueCount: number;
  partialCount: number;
  methodCounts: Record<string, number>;
}

/** Dark footer summary row — ui-audit/24_sells/screenshot.png */
export function Hq6SalesSummaryStrip({
  paidCount,
  dueCount,
  partialCount,
  methodCounts,
}: Hq6SalesSummaryStripProps) {
  const methods = Object.entries(methodCounts).filter(([, count]) => count > 0);

  return (
    <div className="hq6-sales-summary">
      <div className="hq6-sales-summary-group">
        <span className="hq6-sales-summary-label">Payment Status:</span>
        <span>Paid: {paidCount}</span>
        <span>Due: {dueCount}</span>
        <span>Partial: {partialCount}</span>
      </div>
      {methods.length > 0 ? (
        <div className="hq6-sales-summary-group">
          <span className="hq6-sales-summary-label">Payment Method:</span>
          {methods.map(([method, count]) => (
            <span key={method}>
              {formatHq6PaymentMethod(method)}: {count}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
