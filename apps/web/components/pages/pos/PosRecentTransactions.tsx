"use client";

import { useQuery } from "@tanstack/react-query";
import type { Sale } from "@vonos/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { getSales } from "@/lib/api/sales";
import { PosModal } from "./PosModal";

export function PosRecentTransactions({
  open,
  tenantId,
  onClose,
  onPrint,
}: {
  open: boolean;
  tenantId: string;
  onClose: () => void;
  onPrint: (sale: Sale) => void;
}) {
  const salesQuery = useQuery({
    queryKey: ["pos-recent-sales", tenantId],
    enabled: open && Boolean(tenantId),
    staleTime: 20_000,
    queryFn: () => getSales(tenantId, { limit: 15 }),
  });

  const rows = salesQuery.data ?? [];

  return (
    <PosModal
      open={open}
      title="Recent Transactions"
      onClose={onClose}
      footer={
        <button type="button" className="cafe-pos-btn cafe-pos-btn--dark" onClick={onClose}>
          Close
        </button>
      }
    >
      {salesQuery.isLoading ? (
        <p className="cafe-pos-muted text-sm">Loading…</p>
      ) : salesQuery.isError ? (
        <p className="text-sm text-[var(--color-error-text)]">Could not load sales.</p>
      ) : rows.length === 0 ? (
        <p className="cafe-pos-muted text-sm">No sales yet.</p>
      ) : (
        <div>
          {rows.map((sale) => (
            <div key={sale.id} className="cafe-pos-txn-row">
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  {sale.reference} · {sale.customerName || "Walk-In"}
                </p>
                <p className="cafe-pos-muted text-xs">
                  {sale.paymentStatus ?? "due"} · {sale.status}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-medium tabular-nums text-foreground">
                  {formatCurrency(sale.total, sale.currency || "NGN")}
                </span>
                <button
                  type="button"
                  className="cafe-pos-chip"
                  onClick={() => onPrint(sale)}
                >
                  Print
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PosModal>
  );
}
