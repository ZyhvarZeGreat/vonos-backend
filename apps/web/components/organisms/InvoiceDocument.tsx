"use client";

import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import { cn } from "@/lib/utils/cn";
import type { InvoiceLayoutDesign } from "@vonos/types";
import { normalizeInvoiceDesign } from "@/lib/utils/resolveInvoiceLayout";
import { stripHtmlToText } from "@/lib/utils/stripHtml";

export type InvoiceDocumentKind =
  | "quotation"
  | "invoice"
  | "receipt"
  | "purchase"
  | "statement";

export interface InvoiceStatementRow {
  date: string;
  reference: string;
  kind: string;
  amount: number;
  status?: string;
}

export interface InvoiceContact {
  name: string;
  email?: string | null;
  phone?: string | null;
  businessName?: string | null;
}

export interface InvoiceLineItem {
  label: string;
  kind?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceDocumentProps {
  kind: InvoiceDocumentKind;
  tenantName: string;
  reference: string;
  date: string;
  contact: InvoiceContact;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  total: number;
  currency: string;
  notes?: string | null;
  validUntil?: string | null;
  balanceDue?: number | null;
  /** Job / vehicle meta shown on automotive quotations. */
  jobDescription?: string | null;
  vehicleLabel?: string | null;
  amountInWords?: string | null;
  /** For customer account statements — transaction rows instead of SKU lines. */
  statementRows?: InvoiceStatementRow[];
  /** Print layout style from Invoice Settings. */
  design?: InvoiceLayoutDesign | string | null;
  headerText?: string | null;
  footerText?: string | null;
  termsText?: string | null;
  className?: string;
}

const KIND_LABELS: Record<InvoiceDocumentKind, string> = {
  quotation: "Quotation",
  invoice: "Tax Invoice",
  receipt: "Receipt",
  purchase: "Purchase Order",
  statement: "Account Statement",
};

export function InvoiceDocument({
  kind,
  tenantName,
  reference,
  date,
  contact,
  lineItems,
  subtotal,
  total,
  currency,
  notes,
  validUntil,
  balanceDue,
  jobDescription,
  vehicleLabel,
  amountInWords,
  statementRows,
  design: designProp,
  headerText,
  footerText,
  termsText,
  className,
}: InvoiceDocumentProps) {
  const design = normalizeInvoiceDesign(designProp);
  const isStatement = kind === "statement" && statementRows && statementRows.length > 0;
  const isQuotation = kind === "quotation";
  const isSlim = design === "slim";
  const isDetailed = design === "detailed";
  const isElegant = design === "elegant";
  const headerPlain = stripHtmlToText(headerText);
  const footerPlain = stripHtmlToText(footerText);
  const termsPlain = stripHtmlToText(termsText);
  const hasTerms = Boolean(termsPlain) || isQuotation;

  return (
    <article
      className={cn(
        "invoice-document mx-auto bg-white text-foreground shadow-card print:shadow-none",
        isSlim ? "max-w-md p-5 text-sm" : "max-w-3xl p-8",
        isDetailed && "border border-border",
        isElegant && "font-serif",
        className,
      )}
      data-invoice-design={design}
    >
      {headerPlain ? (
        <p
          className={cn(
            "mb-4 whitespace-pre-wrap text-center text-muted",
            isSlim ? "text-[11px]" : "text-xs",
            isElegant && "italic tracking-wide",
          )}
        >
          {headerPlain}
        </p>
      ) : null}

      <header
        className={cn(
          "flex flex-wrap items-start justify-between gap-4",
          isSlim
            ? "mb-4 border-b border-dashed border-border pb-3"
            : "mb-8 border-b border-border pb-6",
          isDetailed && "bg-[var(--color-surface-muted)] -mx-2 rounded-lg px-3 py-4",
          isElegant && "border-b-2 border-[var(--hq6-purple,#6366f1)]",
        )}
      >
        <div>
          <p
            className={cn(
              "font-semibold uppercase tracking-wider text-muted",
              isSlim ? "text-[10px]" : "text-xs",
            )}
          >
            {KIND_LABELS[kind]}
          </p>
          <h1
            className={cn(
              "mt-1 font-bold tracking-tight",
              isSlim ? "text-lg" : "text-2xl",
            )}
          >
            {tenantName}
          </h1>
          {isQuotation && !isSlim ? (
            <p className="mt-1 text-sm text-muted">
              Quotation for repair / service work — subject to approval
            </p>
          ) : null}
        </div>
        <div className={cn("text-right", isSlim ? "text-xs" : "text-sm")}>
          <p className="font-semibold">{reference}</p>
          <p className="text-muted">{formatDate(date)}</p>
          {validUntil ? (
            <p className="mt-1 text-xs text-muted">Valid until {formatDate(validUntil)}</p>
          ) : null}
        </div>
      </header>

      <section
        className={cn(
          "grid gap-6",
          isSlim ? "mb-4 gap-3" : "mb-8 sm:grid-cols-2",
        )}
      >
        <div>
          <p
            className={cn(
              "font-semibold uppercase tracking-wider text-muted",
              isSlim ? "text-[10px]" : "text-xs",
            )}
          >
            {kind === "purchase"
              ? "Supplier"
              : kind === "statement"
                ? "Account holder"
                : "Bill to"}
          </p>
          <p className={cn("mt-2 font-semibold", isSlim ? "text-sm" : "text-base")}>
            {contact.name}
          </p>
          {contact.businessName && contact.businessName !== contact.name ? (
            <p className="text-sm text-muted">{contact.businessName}</p>
          ) : null}
          {contact.email ? <p className="mt-1 text-sm">{contact.email}</p> : null}
          {contact.phone ? <p className="text-sm">{contact.phone}</p> : null}
        </div>
        {!isSlim ? (
          <div className="space-y-3 text-sm">
            {vehicleLabel ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Vehicle
                </p>
                <p className="mt-1 font-medium">{vehicleLabel}</p>
              </div>
            ) : null}
            {jobDescription ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Job
                </p>
                <p className="mt-1 whitespace-pre-wrap text-muted">{jobDescription}</p>
              </div>
            ) : null}
            {balanceDue != null && balanceDue > 0 ? (
              <div className="rounded-lg border border-border bg-[var(--color-surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Account balance
                </p>
                <p className="mt-1 text-lg font-semibold text-amber-700">
                  {formatCurrency(balanceDue, currency)} due
                </p>
              </div>
            ) : null}
          </div>
        ) : vehicleLabel ? (
          <p className="text-xs text-muted">{vehicleLabel}</p>
        ) : null}
      </section>

      {isDetailed && (vehicleLabel || jobDescription) ? (
        <section className="mb-6 grid gap-3 rounded-lg border border-border p-3 text-sm sm:grid-cols-2">
          {vehicleLabel ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Vehicle details
              </p>
              <p className="mt-1 font-medium">{vehicleLabel}</p>
            </div>
          ) : null}
          {jobDescription ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Scope of work
              </p>
              <p className="mt-1 whitespace-pre-wrap text-muted">{jobDescription}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <table className={cn("w-full", isSlim ? "mb-4 text-xs" : "mb-6 text-sm")}>
        <thead>
          <tr
            className={cn(
              "border-b text-left text-muted",
              isSlim ? "border-dashed border-border text-[10px]" : "border-border text-xs",
              isDetailed && "bg-[var(--color-surface-muted)]",
            )}
          >
            {isStatement ? (
              <>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Reference</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </>
            ) : isSlim ? (
              <>
                <th className="pb-2 font-medium">Item</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Total</th>
              </>
            ) : (
              <>
                <th className="pb-2 pl-1 font-medium">Description</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Unit</th>
                <th className="pb-2 pr-1 text-right font-medium">Total</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {isStatement ? (
            statementRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted">
                  No transactions yet
                </td>
              </tr>
            ) : (
              statementRows.map((row) => (
                <tr
                  key={`${row.reference}-${row.date}`}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-2.5 whitespace-nowrap">{formatDate(row.date)}</td>
                  <td className="py-2.5 pr-2">{row.reference}</td>
                  <td className="py-2.5 capitalize text-muted">{row.kind}</td>
                  <td className="py-2.5 text-muted">{row.status ?? "—"}</td>
                  <td className="py-2.5 text-right font-medium tabular-nums">
                    {formatCurrency(row.amount, currency)}
                  </td>
                </tr>
              ))
            )
          ) : lineItems.length === 0 ? (
            <tr>
              <td colSpan={isSlim ? 3 : 5} className="py-6 text-center text-muted">
                No line items
              </td>
            </tr>
          ) : (
            lineItems.map((line, index) =>
              isSlim ? (
                <tr
                  key={`${line.label}-${index}`}
                  className="border-b border-dashed border-border last:border-0"
                >
                  <td className="py-1.5 pr-2">{line.label}</td>
                  <td className="py-1.5 text-right tabular-nums">{line.quantity}</td>
                  <td className="py-1.5 text-right font-medium tabular-nums">
                    {formatCurrency(line.total, currency)}
                  </td>
                </tr>
              ) : (
                <tr
                  key={`${line.label}-${index}`}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-2.5 pr-2 pl-1">{line.label}</td>
                  <td className="py-2.5 text-muted">{line.kind ?? "—"}</td>
                  <td className="py-2.5 text-right tabular-nums">{line.quantity}</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {formatCurrency(line.unitPrice, currency)}
                  </td>
                  <td className="py-2.5 pr-1 text-right font-medium tabular-nums">
                    {formatCurrency(line.total, currency)}
                  </td>
                </tr>
              ),
            )
          )}
        </tbody>
        {!isStatement ? (
          <tfoot>
            {!isSlim ? (
              <tr>
                <td colSpan={4} className="pt-4 text-right text-sm font-medium text-muted">
                  Subtotal
                </td>
                <td className="pt-4 pr-1 text-right font-semibold tabular-nums">
                  {formatCurrency(subtotal, currency)}
                </td>
              </tr>
            ) : null}
            <tr>
              <td
                colSpan={isSlim ? 2 : 4}
                className={cn(
                  "pt-2 text-right font-semibold",
                  isSlim ? "text-sm" : "text-base",
                )}
              >
                Total
              </td>
              <td
                className={cn(
                  "pt-2 text-right font-bold tabular-nums",
                  isSlim ? "text-sm" : "text-base pr-1",
                )}
              >
                {formatCurrency(total, currency)}
              </td>
            </tr>
            {amountInWords && !isSlim ? (
              <tr>
                <td colSpan={5} className="pt-3 text-sm italic text-muted">
                  Amount in words: {amountInWords}
                </td>
              </tr>
            ) : null}
          </tfoot>
        ) : (
          <tfoot>
            <tr>
              <td colSpan={4} className="pt-4 text-right text-base font-semibold">
                Total activity
              </td>
              <td className="pt-4 text-right text-base font-bold tabular-nums">
                {formatCurrency(total, currency)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>

      {notes ? (
        <section
          className={cn(
            "border-t border-border pt-4",
            isSlim ? "text-xs" : "text-sm",
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Notes
          </p>
          <p className="mt-2 whitespace-pre-wrap">{notes}</p>
        </section>
      ) : null}

      {hasTerms ? (
        <section
          className={cn(
            "mt-6 border-t border-border pt-4 text-muted",
            isSlim ? "text-[10px]" : "text-xs",
            isDetailed && "rounded-lg bg-[var(--color-surface-muted)] p-3",
            isElegant && "border-t-2 border-[var(--hq6-purple,#6366f1)]/30 italic",
          )}
        >
          <p className="font-semibold uppercase tracking-wider not-italic">Terms</p>
          {termsPlain ? (
            <p className="mt-2 whitespace-pre-wrap">{termsPlain}</p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-4 not-italic">
              <li>
                This quotation is an estimate and may change after inspection or
                parts sourcing.
              </li>
              <li>
                Work proceeds after customer approval of this quote (or signed
                acceptance).
              </li>
              <li>
                Warranty terms, if any, are noted above or provided on the final
                invoice.
              </li>
            </ul>
          )}
        </section>
      ) : null}

      {footerPlain ? (
        <p
          className={cn(
            "mt-6 whitespace-pre-wrap text-center text-muted",
            isSlim ? "text-[10px]" : "text-xs",
            isElegant && "italic",
          )}
        >
          {footerPlain}
        </p>
      ) : null}
    </article>
  );
}
