"use client";

import { useMemo, useState } from "react";
import { Eye, FileText, Receipt, Printer } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import type { JobDetail } from "@/lib/api/jobs";
import { updateJobBilling } from "@/lib/api/jobs";
import { getCustomer } from "@/lib/api/customers";
import {
  InvoiceDocument,
  type InvoiceContact,
  type InvoiceLineItem,
} from "@/components/organisms/InvoiceDocument";
import { DocumentPreviewModal } from "@/components/organisms/DocumentPreviewModal";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { cn } from "@/lib/utils/cn";

type BillingTab = "quotation" | "invoice";

export interface JobQuoteInvoicePanelProps {
  job: JobDetail;
  onJobChange: (job: JobDetail) => void;
}

function buildLineItems(job: JobDetail) {
  const materialLines = job.materials.map((row) => ({
    id: row.id,
    label: row.name,
    qty: row.quantity,
    unit: row.unitCost,
    total: row.totalCost,
    kind: "Material" as const,
  }));
  const labourLines = job.labourEntries.map((row) => ({
    id: row.id,
    label: row.staffName ?? row.staffId,
    qty: row.hours,
    unit: row.rate,
    total: row.totalCost,
    kind: "Labour" as const,
  }));
  return [...materialLines, ...labourLines];
}

function toInvoiceLines(
  lineItems: ReturnType<typeof buildLineItems>,
): InvoiceLineItem[] {
  return lineItems.map((row) => ({
    label: row.label,
    kind: row.kind,
    quantity: row.qty,
    unitPrice: row.unit,
    total: row.total,
  }));
}

export function JobQuoteInvoicePanel({ job, onJobChange }: JobQuoteInvoicePanelProps) {
  const queryClient = useQueryClient();
  const { tenantName, tenantId } = useRouteTenant();
  const [tab, setTab] = useState<BillingTab>("quotation");
  const [previewOpen, setPreviewOpen] = useState(false);

  const customerId = job.customer?.id ?? job.customerId ?? null;

  const { data: customerProfile } = useQuery({
    queryKey: ["customer", tenantId, customerId],
    queryFn: () => getCustomer(customerId!),
    enabled: Boolean(tenantId && customerId),
  });

  const suggestedTotal = useMemo(() => {
    const materials = job.materials.reduce((sum, row) => sum + row.totalCost, 0);
    const labour = job.labourEntries.reduce((sum, row) => sum + row.totalCost, 0);
    return materials + labour;
  }, [job.labourEntries, job.materials]);

  const lineItems = useMemo(() => buildLineItems(job), [job]);
  const invoiceLines = useMemo(() => toInvoiceLines(lineItems), [lineItems]);

  const [quoteAmount, setQuoteAmount] = useState(
    job.quoteAmount != null ? String(job.quoteAmount) : String(suggestedTotal || ""),
  );
  const [quoteValidUntil, setQuoteValidUntil] = useState(job.quoteValidUntil ?? "");
  const [quoteNotes, setQuoteNotes] = useState(job.quoteNotes ?? "");
  const [invoiceAmount, setInvoiceAmount] = useState(
    job.invoiceAmount != null ? String(job.invoiceAmount) : String(suggestedTotal || ""),
  );
  const [invoiceNotes, setInvoiceNotes] = useState(job.invoiceNotes ?? "");

  const saveMutation = useAppMutation({
    mutationFn: () =>
      updateJobBilling(job.id, {
        hasQuote: tab === "quotation" ? true : job.hasQuote,
        ...(tab === "quotation"
          ? {
              quoteAmount: quoteAmount.trim() ? Number(quoteAmount) : null,
              quoteValidUntil: quoteValidUntil.trim() || null,
              quoteNotes: quoteNotes.trim() || null,
            }
          : {
              invoiceAmount: invoiceAmount.trim() ? Number(invoiceAmount) : null,
              invoiceNotes: invoiceNotes.trim() || null,
            }),
      }),
    successMessage: () =>
      tab === "quotation" ? "Quotation draft saved" : "Invoice draft saved",
    onSuccess: (updated) => {
      onJobChange(updated);
      void queryClient.invalidateQueries({ queryKey: ["job", job.id] });
    },
  });

  const applySuggested = () => {
    const value = String(suggestedTotal);
    if (tab === "quotation") setQuoteAmount(value);
    else setInvoiceAmount(value);
  };

  const documentTotal =
    tab === "quotation"
      ? Number(quoteAmount) || suggestedTotal
      : Number(invoiceAmount) || suggestedTotal;

  const contact: InvoiceContact = {
    name: job.customer?.name ?? job.customerName ?? "Customer",
    email: job.customer?.email ?? customerProfile?.email,
    phone: job.customer?.phone ?? customerProfile?.phone,
    businessName: customerProfile?.businessName,
  };

  const balanceDue = customerProfile?.totalSellDue ?? null;

  const previewDocument = (
    <InvoiceDocument
      kind={tab}
      tenantName={tenantName}
      reference={job.reference}
      date={new Date().toISOString()}
      contact={contact}
      lineItems={invoiceLines}
      subtotal={suggestedTotal}
      total={documentTotal}
      currency="NGN"
      notes={tab === "quotation" ? quoteNotes : invoiceNotes}
      validUntil={tab === "quotation" ? quoteValidUntil || null : null}
      balanceDue={balanceDue}
      className="invoice-print-root"
    />
  );

  return (
    <>
      <section className="rounded-lg border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Quote &amp; Invoice</h3>
            <p className="text-sm text-muted">
              Draft a customer quotation or final invoice from job costs.
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setTab("quotation")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === "quotation"
                  ? "bg-[var(--color-brand-primary)] text-white"
                  : "text-foreground hover:bg-[var(--color-surface-nav-hover)]",
              )}
            >
              <FileText className="h-4 w-4" />
              Quotation
            </button>
            <button
              type="button"
              onClick={() => setTab("invoice")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === "invoice"
                  ? "bg-[var(--color-brand-primary)] text-white"
                  : "text-foreground hover:bg-[var(--color-surface-nav-hover)]",
              )}
            >
              <Receipt className="h-4 w-4" />
              Invoice
            </button>
          </div>
        </div>

        {lineItems.length > 0 ? (
          <div className="mb-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border bg-[var(--color-surface-muted)] text-left text-xs text-muted">
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 text-right font-medium">Unit</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{row.label}</td>
                    <td className="px-3 py-2 text-muted">{row.kind}</td>
                    <td className="px-3 py-2">{row.qty}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(row.unit, "NGN")}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      {formatCurrency(row.total, "NGN")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right text-sm font-medium text-muted">
                    Job cost subtotal
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {formatCurrency(suggestedTotal, "NGN")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="mb-4 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
            Add materials and labour to this job to pre-fill line items.
          </p>
        )}

        {tab === "quotation" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">Quote total (NGN)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder="0"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">Valid until</span>
              <input
                type="date"
                value={quoteValidUntil}
                onChange={(e) => setQuoteValidUntil(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block font-medium text-foreground">Quotation notes</span>
              <textarea
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder="Scope of work, exclusions, payment terms…"
              />
            </label>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">Invoice total (NGN)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder="0"
              />
            </label>
            <div className="flex flex-col justify-end gap-1 text-sm">
              <p className="text-muted">
                Customer: {contact.name}
              </p>
              {balanceDue != null && balanceDue > 0 ? (
                <p className="font-medium text-amber-700">
                  Account balance due: {formatCurrency(balanceDue, "NGN")}
                </p>
              ) : null}
            </div>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block font-medium text-foreground">Invoice notes</span>
              <textarea
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder="Payment due date, bank details, warranty terms…"
              />
            </label>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applySuggested}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[var(--color-surface-nav-hover)]"
          >
            Use job cost ({formatCurrency(suggestedTotal, "NGN")})
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[var(--color-surface-nav-hover)]"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[var(--color-surface-nav-hover)]"
          >
            <Printer className="h-4 w-4" />
            {tab === "quotation" ? "Generate quote PDF" : "Print invoice"}
          </button>
          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-primary-hover)] disabled:opacity-60"
          >
            {saveMutation.isPending
              ? "Saving…"
              : tab === "quotation"
                ? "Save quotation draft"
                : "Save invoice draft"}
          </button>
        </div>
      </section>

      <DocumentPreviewModal
        open={previewOpen}
        title={tab === "quotation" ? "Quotation preview" : "Invoice preview"}
        onClose={() => setPreviewOpen(false)}
      >
        {previewDocument}
      </DocumentPreviewModal>
    </>
  );
}
