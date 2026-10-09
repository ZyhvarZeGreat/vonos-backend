"use client";

import { useQuery } from "@tanstack/react-query";
import type { Sale } from "@vonos/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { getSale, getSales, deleteSale } from "@/lib/api/sales";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { toast } from "@/stores/toastStore";
import { usePosCartStore, type PosCartLine } from "@/stores/posCartStore";
import { PosModal } from "./PosModal";

export function PosDraftsModal({
  open,
  tenantId,
  onClose,
  onResumed,
}: {
  open: boolean;
  tenantId: string;
  onClose: () => void;
  onResumed: () => void;
}) {
  const loadCart = usePosCartStore((s) => s.loadCart);

  const draftsQuery = useQuery({
    queryKey: ["pos-drafts", tenantId],
    enabled: open && Boolean(tenantId),
    staleTime: 15_000,
    queryFn: () => getSales(tenantId, { saleStatus: "draft", limit: 25 }),
  });

  const deleteMutation = useAppMutation({
    mutationFn: (saleId: string) => deleteSale(tenantId, saleId),
    successMessage: "Draft deleted",
    invalidateKeys: [["pos-drafts", tenantId], ["sales"]],
  });

  const resumeMutation = useAppMutation({
    mutationFn: async (sale: Sale) => {
      const detail = await getSale(sale.id, tenantId);
      const lines: PosCartLine[] = detail.lines.map((line) => ({
        key: `pos-${line.itemId ?? line.id}`,
        itemId: line.itemId ?? "",
        sku: line.sku,
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        unit: null,
        stockQty: 0,
      }));
      // Draft is resumed into the ticket, so drop the draft to avoid a duplicate.
      await deleteSale(tenantId, sale.id);
      return { detail, lines };
    },
    invalidateKeys: [["pos-drafts", tenantId], ["sales"], ["items"], ["catalog"]],
    onSuccess: ({ detail, lines }) => {
      loadCart(lines, {
        customerId: detail.customerId ?? null,
        discountAmount: detail.discountAmount ?? 0,
        taxAmount: detail.taxAmount ?? 0,
      });
      toast.success(`Resumed ${detail.reference}`);
      onResumed();
    },
  });

  const drafts = draftsQuery.data ?? [];
  const busy = deleteMutation.isPending || resumeMutation.isPending;

  return (
    <PosModal
      open={open}
      title="Suspended Sales"
      onClose={onClose}
      footer={
        <button type="button" className="cafe-pos-btn cafe-pos-btn--dark" onClick={onClose}>
          Close
        </button>
      }
    >
      {draftsQuery.isLoading ? (
        <p className="cafe-pos-muted text-sm">Loading…</p>
      ) : draftsQuery.isError ? (
        <p className="text-sm text-[var(--color-error-text)]">Could not load drafts.</p>
      ) : drafts.length === 0 ? (
        <p className="cafe-pos-muted text-sm">No drafts yet.</p>
      ) : (
        <div>
          {drafts.map((sale) => (
            <div key={sale.id} className="cafe-pos-txn-row">
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  {sale.reference} · {sale.customerName || "Walk-in"}
                </p>
                <p className="cafe-pos-muted text-xs">
                  {formatCurrency(sale.total, sale.currency || "NGN")} ·{" "}
                  {sale.createdAt ? new Date(sale.createdAt).toLocaleString() : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="cafe-pos-chip"
                  disabled={busy}
                  onClick={() => resumeMutation.mutate(sale)}
                >
                  Resume
                </button>
                <button
                  type="button"
                  className="cafe-pos-chip"
                  disabled={busy}
                  onClick={() => deleteMutation.mutate(sale.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PosModal>
  );
}
