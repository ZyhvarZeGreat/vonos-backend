"use client";

import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { SaleDetail } from "@vonos/types";
import { getInvoiceSettings } from "@/lib/api/invoiceSettings";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import {
  InvoiceDocument,
  type InvoiceContact,
  type InvoiceLineItem,
} from "@/components/organisms/InvoiceDocument";
import { DocumentPreviewModal } from "@/components/organisms/DocumentPreviewModal";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { saleToInvoiceContact } from "@/lib/utils/invoiceBuilders";

export interface SaleReceiptPanelProps {
  sale: SaleDetail;
}

export function SaleReceiptPanel({ sale }: SaleReceiptPanelProps) {
  const { tenantName, tenantId } = useRouteTenant();
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: invoiceSettings } = useQuery({
    queryKey: ["invoice-settings", tenantId],
    queryFn: getInvoiceSettings,
    enabled: Boolean(tenantId),
    staleTime: 10 * 60_000,
  });

  const lineItems = useMemo<InvoiceLineItem[]>(
    () =>
      sale.lines.map((line) => ({
        label: line.name,
        kind: line.sku,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        total: line.lineTotal,
      })),
    [sale.lines],
  );

  const subtotal = useMemo(
    () => sale.lines.reduce((sum, line) => sum + line.lineTotal, 0),
    [sale.lines],
  );

  const contact: InvoiceContact = saleToInvoiceContact(sale);

  const notes = [
    invoiceSettings?.termsText,
    sale.paymentStatus === "paid"
      ? "Payment received. Thank you for your business."
      : sale.paymentStatus === "partial"
        ? "Partial payment received. Balance may remain due."
        : sale.paymentStatus === "due"
          ? "Payment due."
          : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const receipt = (
    <InvoiceDocument
      kind="receipt"
      tenantName={tenantName}
      reference={sale.reference}
      date={sale.date}
      contact={contact}
      lineItems={lineItems}
      subtotal={subtotal}
      total={sale.total}
      currency={sale.currency}
      notes={notes || null}
      balanceDue={sale.customerTotalSellDue ?? null}
      className="invoice-print-root"
    />
  );

  return (
    <>
      <section className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Receipt</h3>
            <p className="text-sm text-muted">
              Preview or print a customer receipt for this sale.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[var(--color-surface-nav-hover)]"
          >
            <Eye className="h-4 w-4" />
            Preview receipt
          </button>
        </div>
        <p className="mt-4 text-sm text-muted">
          Total {formatCurrency(sale.total, sale.currency)}
          {sale.paymentStatus ? ` · ${sale.paymentStatus}` : ""}
        </p>
      </section>

      <DocumentPreviewModal
        open={previewOpen}
        title="Receipt preview"
        onClose={() => setPreviewOpen(false)}
      >
        {receipt}
      </DocumentPreviewModal>
    </>
  );
}
