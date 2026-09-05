"use client";

import type { PeerStockEntityQty } from "@vonos/types";
import { PRODUCT_STOCK_LOCATION_CODES } from "@vonos/types";
import { cn } from "@/lib/utils/cn";

function labelForCode(code: string): string {
  if (code === "VW") return "Warehouse";
  if (code === "VISP") return "Institute";
  if (code === "VSP") return "Marketplace";
  return code;
}

/** Compact read-only VW / VISP / VSP quantities for a SKU. */
export function GroupPeerStockReadout({
  entities,
  highlightCode,
  className,
}: {
  entities: PeerStockEntityQty[] | undefined;
  /** Current tenant — shown with emphasis; still not editable here. */
  highlightCode?: string | null;
  className?: string;
}) {
  const byCode = new Map((entities ?? []).map((e) => [e.tenantCode, e]));
  return (
    <div
      className={cn(
        "flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums text-muted",
        className,
      )}
      title="Group stock (read-only) — edit only your own entity’s opening stock"
    >
      {PRODUCT_STOCK_LOCATION_CODES.map((code) => {
        const row = byCode.get(code);
        const qty = row?.quantity ?? 0;
        const isOwn = highlightCode?.toUpperCase() === code;
        return (
          <span
            key={code}
            className={cn(isOwn && "font-semibold text-foreground")}
          >
            {labelForCode(code)} ({code}): {Number(qty).toFixed(2)}
          </span>
        );
      })}
    </div>
  );
}

/** Table section for product view — group stock homes only. */
export function GroupPeerStockTable({
  entities,
  highlightCode,
}: {
  entities: PeerStockEntityQty[] | undefined;
  highlightCode?: string | null;
}) {
  const byCode = new Map((entities ?? []).map((e) => [e.tenantCode, e]));
  return (
    <div className="hq6-product-view-table-wrap">
      <table className="hq6-product-view-table">
        <thead>
          <tr>
            <th>Entity</th>
            <th>On hand</th>
            <th>Available</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {PRODUCT_STOCK_LOCATION_CODES.map((code) => {
            const row = byCode.get(code);
            const isOwn = highlightCode?.toUpperCase() === code;
            return (
              <tr key={code}>
                <td>
                  {row?.tenantName ?? labelForCode(code)} ({code})
                  {isOwn ? " — yours" : ""}
                </td>
                <td className="tabular-nums">
                  {Number(row?.quantity ?? 0).toFixed(2)}
                </td>
                <td className="tabular-nums">
                  {Number(row?.available ?? 0).toFixed(2)}
                </td>
                <td className="text-xs text-muted">
                  {isOwn ? "Edit via Opening Stock" : "View only"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
