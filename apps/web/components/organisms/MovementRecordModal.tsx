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
import { movementToPurchaseLines } from "@/lib/utils/invoiceBuilders";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";

export interface MovementRecordModalProps {
  movementId: string | null;
  listSlug?: string;
  onClose: () => void;
}

function partyFromNotes(notes: string | null): string {
  if (!notes) return "Supplier";
  return notes.split("|")[0]?.trim() || notes;
}

export function MovementRecordModal({
  movementId,
  listSlug = "inbound",
  onClose,
}: MovementRecordModalProps) {
  const { tenantId, tenantName, tenantCode } = useRouteTenant();
  const [docOpen, setDocOpen] = useState(false);

  const { data: movement, isLoading, error } = useQuery({
    queryKey: ["movement-modal", tenantId, movementId],
    queryFn: () => getStockMovement(movementId!),
    enabled: Boolean(tenantId && movementId),
  });

  const { data: invoiceSettings } = useQuery({
    queryKey: ["invoice-settings", tenantId],
    queryFn: getInvoiceSettings,
    enabled: Boolean(tenantId),
  });

  const lineItems = useMemo(
    () => (movement ? movementToPurchaseLines(movement) : []),
    [movement],
  );

  const subtotal = useMemo(
    () => lineItems.reduce((sum, line) => sum + line.total, 0),
    [lineItems],
  );

  const total = subtotal;
  const currency = "NGN";

  const purchaseDoc = movement ? (
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
      notes={invoiceSettings?.termsText ?? movement.notes}
      className="invoice-print-root"
    />
  ) : null;

  return (
    <>
      <RecordViewModal
        open={Boolean(movementId)}
        title={movement?.reference ?? "Movement"}
        subtitle={
          movement
            ? `${formatDate(movement.date)} · ${movement.type} · ${movement.status}`
            : undefined
        }
        onClose={onClose}
        fullPageHref={
          movementId && tenantCode ? `/${tenantCode}/${listSlug}/${movementId}` : undefined
        }
        isLoading={isLoading}
        error={error ? "Could not load this movement." : null}
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
                <dd className="text-sm">{movement.lines.length}</dd>
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
