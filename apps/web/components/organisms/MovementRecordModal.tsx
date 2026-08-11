"use client";

import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/atoms/Button";
import { StatusPill } from "@/components/atoms/StatusPill";
import { RecordViewModal } from "@/components/organisms/RecordViewModal";
import { InvoiceDocument } from "@/components/organisms/InvoiceDocument";
import { DocumentPreviewModal } from "@/components/organisms/DocumentPreviewModal";
import { getStockMovement } from "@/lib/api/stockMovements";
import { getInvoiceSettings } from "@/lib/api/invoiceSettings";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import {
  MODAL_RECORD_STALE_MS,
  MODAL_REF_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import { movementToPurchaseLines } from "@/lib/utils/invoiceBuilders";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import { stockMovementSeedFromListRow } from "@/lib/utils/listModalSeeds";
import { invoiceDocumentLayoutProps } from "@/lib/utils/resolveInvoiceLayout";
import type { StockMovementListRow } from "@vonos/types";
import { tenantBasePath } from "@/lib/utils/tenantMount";

export interface MovementRecordModalProps {
  movementId: string | null;
  /** List row — paints title/meta immediately while detail loads. */
  initialRow?: StockMovementListRow | null;
  listSlug?: string;
  onClose: () => void;
  /** When false, hide the "Open full page" link (e.g. reports stay on-page). */
  showFullPageLink?: boolean;
  showBack?: boolean;
}

function partyFromNotes(notes: string | null): string {
  if (!notes) return "Supplier";
  return notes.split("|")[0]?.trim() || notes;
}

export function MovementRecordModal({
  movementId,
  initialRow = null,
  listSlug = "inbound",
  onClose,
  showFullPageLink = true,
  showBack = false,
}: MovementRecordModalProps) {
  const { tenantId, tenantName, tenantCode } = useRouteTenant();
  const [docOpen, setDocOpen] = useState(false);

  const seeded =
    initialRow && movementId && initialRow.id === movementId
      ? stockMovementSeedFromListRow(
          initialRow,
          listSlug === "outbound" ? "outbound" : "inbound",
        )
      : null;

  const { data: fetched, isLoading, isFetching, error } = useQuery({
    queryKey: modalKeys.movement(tenantId, movementId),
    queryFn: () => getStockMovement(movementId!),
    enabled: Boolean(tenantId && movementId),
    staleTime: MODAL_RECORD_STALE_MS,
    placeholderData: (prev) =>
      prev?.id === movementId ? prev : undefined,
  });

  const movement =
    fetched?.id === movementId ? fetched : seeded;
  const linesPending = Boolean(
    movement && movement.lines.length === 0 && (isLoading || isFetching),
  );

  const { data: invoiceSettings } = useQuery({
    queryKey: modalKeys.invoiceSettings(tenantId),
    queryFn: getInvoiceSettings,
    enabled: Boolean(tenantId && docOpen),
    staleTime: MODAL_REF_STALE_MS,
    placeholderData: (prev) => prev,
  });

  const lineItems = useMemo(
    () => (movement && movement.lines.length > 0 ? movementToPurchaseLines(movement) : []),
    [movement],
  );

  const subtotal = useMemo(
    () =>
      lineItems.length > 0
        ? lineItems.reduce((sum, line) => sum + line.total, 0)
        : (initialRow?.grandTotal ?? 0),
    [initialRow?.grandTotal, lineItems],
  );

  const total = subtotal;
  const currency = "NGN";

  const layoutProps = invoiceDocumentLayoutProps(invoiceSettings);

  const purchaseDoc = movement && lineItems.length > 0 ? (
    <InvoiceDocument
      kind="purchase"
      tenantName={tenantName}
      reference={movement.reference}
      date={movement.date}
      contact={{ name: partyFromNotes(movement.notes) }}
      lineItems={lineItems}
      subtotal={subtotal}
      total={total}
      currency={currency}
      notes={movement.notes}
      {...layoutProps}
      className="invoice-print-root"
    />
  ) : null;

  return (
    <>
      <RecordViewModal
        open={Boolean(movementId)}
        title={
          movement
            ? listSlug === "purchases" || listSlug === "inbound"
              ? `Purchase Details (Reference No: ${movement.reference})`
              : movement.reference
            : listSlug === "purchases" || listSlug === "inbound"
              ? "Purchase Details"
              : "Movement"
        }
        subtitle={
          movement
            ? `${formatDate(movement.date)} · ${movement.type} · ${movement.status}`
            : undefined
        }
        onClose={onClose}
        showBack={showBack}
        fullPageHref={
          showFullPageLink && movementId && tenantCode
            ? `${tenantBasePath(tenantCode)}/${listSlug}/${movementId}`
            : undefined
        }
        isLoading={isLoading && !movement}
        error={error && !movement ? "Could not load this movement." : null}
        footer={
          movement ? (
            <div className="flex flex-wrap items-center justify-end gap-2 px-4 pb-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDocOpen(true)}
                disabled={lineItems.length === 0}
              >
                <Eye className="mr-1.5 h-4 w-4" />
                Preview purchase
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : undefined
        }
      >
        {movement ? (
          <div className="space-y-4">
            <StatusPill status={movement.status} vocabulary="movementStatus" />
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Party</dt>
                <dd className="text-sm">{partyFromNotes(movement.notes)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Lines</dt>
                <dd className="text-sm">
                  {linesPending
                    ? "Loading…"
                    : movement.lines.length || initialRow?.itemCount || 0}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Value</dt>
                <dd className="text-sm font-semibold">{formatCurrency(total, currency)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Source</dt>
                <dd className="text-sm capitalize">{movement.source ?? "standard"}</dd>
              </div>
            </dl>
            {linesPending ? (
              <p className="text-sm text-muted">Loading line items…</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="pb-2 font-medium">SKU</th>
                    <th className="pb-2 font-medium">Qty</th>
                    <th className="pb-2 text-right font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {movement.lines.map((line, index) => (
                    <tr key={`${line.sku}-${index}`} className="border-b border-border">
                      <td className="py-2">{line.name ?? line.sku}</td>
                      <td className="py-2">{line.quantity}</td>
                      <td className="py-2 text-right tabular-nums">
                        {formatCurrency((line.unitCost ?? 0) * line.quantity, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}
      </RecordViewModal>

      <DocumentPreviewModal
        open={docOpen}
        title="Purchase preview"
        onClose={() => setDocOpen(false)}
      >
        {purchaseDoc}
      </DocumentPreviewModal>
    </>
  );
}
