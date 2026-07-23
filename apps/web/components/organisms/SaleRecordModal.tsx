"use client";

import { useMemo, useState } from "react";
import { Eye, CheckCircle, RotateCcw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SaleReturnDisposition } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { Select } from "@/components/atoms/Select";
import { StatusPill } from "@/components/atoms/StatusPill";
import { Hq6SaleViewModal } from "@/components/hq6/Hq6SaleViewModal";
import { RecordViewModal } from "@/components/organisms/RecordViewModal";
import { InvoiceDocument } from "@/components/organisms/InvoiceDocument";
import { DocumentPreviewModal } from "@/components/organisms/DocumentPreviewModal";
import { getInvoiceSettings } from "@/lib/api/invoiceSettings";
import { createSaleReturn, finalizeSale, getSaleView } from "@/lib/api/sales";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import {
  MODAL_RECORD_STALE_MS,
  MODAL_REF_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import {
  saleDocumentKind,
  saleToInvoiceContact,
  saleToInvoiceLines,
} from "@/lib/utils/invoiceBuilders";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import { invoiceDocumentLayoutProps } from "@/lib/utils/resolveInvoiceLayout";

export interface SaleRecordModalProps {
  saleId: string | null;
  listSlug?: string;
  onClose: () => void;
  /** When false, hide the "Open full page" link (e.g. reports stay on-page). */
  showFullPageLink?: boolean;
}

export function SaleRecordModal({
  saleId,
  listSlug = "sales",
  onClose,
  showFullPageLink = true,
}: SaleRecordModalProps) {
  const isHq6 = useIsVaHq6();
  const { tenantId, tenantName, tenantCode } = useRouteTenant();
  const queryClient = useQueryClient();
  const [docPreviewOpen, setDocPreviewOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [disposition, setDisposition] = useState<SaleReturnDisposition>("refunded");
  const [returnNotes, setReturnNotes] = useState("");

  const { data: bundle, isLoading, error } = useQuery({
    queryKey: modalKeys.saleView(tenantId, saleId),
    queryFn: () => getSaleView(saleId!, tenantId!),
    enabled: Boolean(tenantId && saleId) && !isHq6,
    staleTime: MODAL_RECORD_STALE_MS,
  });
  const sale = bundle?.sale;

  const { data: invoiceSettings } = useQuery({
    queryKey: modalKeys.invoiceSettings(tenantId),
    queryFn: getInvoiceSettings,
    enabled: Boolean(tenantId),
    staleTime: MODAL_REF_STALE_MS,
  });

  const documentKind = useMemo(
    () => saleDocumentKind(sale?.recordStatus, sale?.paymentStatus),
    [sale?.paymentStatus, sale?.recordStatus],
  );

  const lineItems = useMemo(
    () => (sale ? saleToInvoiceLines(sale) : []),
    [sale],
  );

  const subtotal = useMemo(
    () => lineItems.reduce((sum, line) => sum + line.total, 0),
    [lineItems],
  );

  const layoutProps = invoiceDocumentLayoutProps(invoiceSettings);

  const document = sale ? (
    <InvoiceDocument
      kind={documentKind}
      tenantName={tenantName}
      reference={sale.reference}
      date={sale.date}
      contact={saleToInvoiceContact(sale)}
      lineItems={lineItems}
      subtotal={subtotal}
      total={sale.total}
      currency={sale.currency}
      notes={null}
      balanceDue={sale.customerTotalSellDue ?? null}
      {...layoutProps}
      className="invoice-print-root"
    />
  ) : null;

  const paymentLabel =
    sale?.paymentStatus === "paid"
      ? "Paid"
      : sale?.paymentStatus === "partial"
        ? "Partial"
        : sale?.paymentStatus === "due"
          ? "Due"
          : "—";

  const isProvisional =
    sale?.recordStatus === "draft" || sale?.recordStatus === "quotation";

  const isCompletedSale =
    sale?.recordStatus === "completed" && !sale?.originalSaleId;

  const statusLabel =
    sale?.recordStatus === "draft"
      ? "Draft"
      : sale?.recordStatus === "quotation"
        ? "Quotation"
        : sale?.status ?? "Completed";

  const finalizeMutation = useAppMutation({
    mutationFn: () => {
      if (!tenantId || !saleId) throw new Error("Missing sale");
      return finalizeSale(tenantId, saleId);
    },
    successMessage: "Sale finalized",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: modalKeys.saleView(tenantId, saleId) });
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      await queryClient.invalidateQueries({ queryKey: ["ledgerTablePage"] });
    },
  });

  const returnMutation = useAppMutation({
    mutationFn: () => {
      if (!tenantId || !saleId) throw new Error("Missing sale");
      return createSaleReturn(tenantId, saleId, {
        disposition,
        notes: returnNotes.trim() || undefined,
      });
    },
    successMessage: "Return recorded",
    onSuccess: async () => {
      setReturnOpen(false);
      setReturnNotes("");
      await queryClient.invalidateQueries({ queryKey: modalKeys.saleView(tenantId, saleId) });
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      await queryClient.invalidateQueries({ queryKey: ["returns"] });
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      await queryClient.invalidateQueries({ queryKey: ["ledgerTablePage"] });
    },
  });

  if (isHq6) {
    return (
      <>
        <Hq6SaleViewModal
          open={Boolean(saleId)}
          saleId={saleId}
          onClose={onClose}
          onPrintInvoice={() => setDocPreviewOpen(true)}
          onPackingSlip={() => setDocPreviewOpen(true)}
        />
        <DocumentPreviewModal
          open={docPreviewOpen}
          title="Invoice preview"
          onClose={() => setDocPreviewOpen(false)}
        >
          {saleId ? <Hq6SaleInvoicePreview saleId={saleId} /> : null}
        </DocumentPreviewModal>
      </>
    );
  }

  return (
    <>
      <RecordViewModal
        open={Boolean(saleId)}
        title={
          sale
            ? `Sell Details ( Invoice No.  : ${sale.reference})`
            : "Sell Details"
        }
        subtitle={
          sale
            ? `${formatDate(sale.date)} · ${sale.customerName} · ${paymentLabel}`
            : undefined
        }
        onClose={onClose}
        fullPageHref={
          showFullPageLink && saleId && tenantCode
            ? `/${tenantCode}/${listSlug}/${saleId}`
            : undefined
        }
        isLoading={isLoading}
        error={error ? "Could not load this sale." : null}
        footer={
          sale ? (
            <div className="flex w-full flex-col gap-3 px-4 pb-4">
              {returnOpen && isCompletedSale && listSlug === "sales" ? (
                <div className="space-y-3 rounded-lg border border-border bg-[var(--color-surface-muted)] p-3">
                  <Select
                    label="Return disposition"
                    value={disposition}
                    onChange={(event) =>
                      setDisposition(event.target.value as SaleReturnDisposition)
                    }
                    options={[
                      { label: "Refunded (no restock)", value: "refunded" },
                      { label: "Restocked", value: "restocked" },
                      { label: "Written off", value: "written_off" },
                    ]}
                  />
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                    Notes
                    <textarea
                      className="min-h-[72px] rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                      value={returnNotes}
                      onChange={(event) => setReturnNotes(event.target.value)}
                      placeholder="Optional return reason"
                    />
                  </label>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-end gap-2">
              {isProvisional ? (
                <Button
                  size="sm"
                  disabled={finalizeMutation.isPending}
                  onClick={() => finalizeMutation.mutate()}
                >
                  <CheckCircle className="mr-1.5 h-4 w-4" />
                  Convert to final sale
                </Button>
              ) : null}
              {isCompletedSale && listSlug === "sales" ? (
                returnOpen ? (
                  <>
                    <Button
                      size="sm"
                      disabled={returnMutation.isPending}
                      onClick={() => returnMutation.mutate()}
                    >
                      Record return
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReturnOpen(false)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setReturnOpen(true)}
                  >
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                    Create return
                  </Button>
                )
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDocPreviewOpen(true)}
                disabled={lineItems.length === 0}
              >
                <Eye className="mr-1.5 h-4 w-4" />
                Preview {documentKind === "quotation" ? "quotation" : documentKind}
              </Button>
              {showFullPageLink && saleId && tenantCode ? (
                <a
                  href={`/${tenantCode}/${listSlug}/${saleId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-[var(--color-surface-muted)]"
                >
                  Open full page
                </a>
              ) : null}
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {sale ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={statusLabel} vocabulary="saleReturnStatus" />
            </div>
            {sale.originalSaleReference ? (
              <p className="text-sm text-muted">
                Original sale:{" "}
                <span className="font-medium text-foreground">
                  {sale.originalSaleReference}
                </span>
              </p>
            ) : null}
            {sale.notes ? (
              <p className="text-sm text-muted">{sale.notes}</p>
            ) : null}
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Customer</dt>
                <dd className="text-sm font-medium">{sale.customerName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Total</dt>
                <dd className="text-sm font-semibold">
                  {formatCurrency(sale.total, sale.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Payment</dt>
                <dd className="text-sm">{paymentLabel}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Items</dt>
                <dd className="text-sm">{sale.lines.length}</dd>
              </div>
            </dl>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Line</th>
                </tr>
              </thead>
              <tbody>
                {sale.lines.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-muted">
                      No line items
                    </td>
                  </tr>
                ) : (
                  sale.lines.map((line) => (
                    <tr key={line.id} className="border-b border-border">
                      <td className="py-2">{line.name}</td>
                      <td className="py-2">{line.quantity}</td>
                      <td className="py-2 text-right tabular-nums">
                        {formatCurrency(line.lineTotal, sale.currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </RecordViewModal>

      <DocumentPreviewModal
        open={docPreviewOpen}
        title={`${documentKind.charAt(0).toUpperCase()}${documentKind.slice(1)} preview`}
        onClose={() => setDocPreviewOpen(false)}
      >
        {document}
      </DocumentPreviewModal>
    </>
  );
}

/** Lightweight invoice document for HQ6 print from the Sell Details modal. */
function Hq6SaleInvoicePreview({ saleId }: { saleId: string }) {
  const { tenantId, tenantName } = useRouteTenant();
  const { data: bundle } = useQuery({
    queryKey: modalKeys.saleView(tenantId, saleId),
    queryFn: () => getSaleView(saleId, tenantId!),
    enabled: Boolean(tenantId && saleId),
    staleTime: MODAL_RECORD_STALE_MS,
  });
  const sale = bundle?.sale;
  const { data: invoiceSettings } = useQuery({
    queryKey: modalKeys.invoiceSettings(tenantId),
    queryFn: getInvoiceSettings,
    enabled: Boolean(tenantId),
    staleTime: MODAL_REF_STALE_MS,
  });

  if (!sale) {
    return <p className="p-4 text-sm text-muted">Loading invoice…</p>;
  }

  const kind = saleDocumentKind(sale.recordStatus, sale.paymentStatus);
  const lines = saleToInvoiceLines(sale);
  const sub = lines.reduce((sum, line) => sum + line.total, 0);

  return (
    <InvoiceDocument
      kind={kind}
      tenantName={tenantName}
      reference={sale.reference}
      date={sale.date}
      contact={saleToInvoiceContact(sale)}
      lineItems={lines}
      subtotal={sub}
      total={sale.total}
      currency={sale.currency}
      notes={sale.notes}
      balanceDue={sale.sellDue ?? null}
      {...invoiceDocumentLayoutProps(invoiceSettings)}
      className="invoice-print-root"
    />
  );
}
