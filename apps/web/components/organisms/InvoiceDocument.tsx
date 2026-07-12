"use client";

import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import { cn } from "@/lib/utils/cn";

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
  /** For customer account statements — transaction rows instead of SKU lines. */
  statementRows?: InvoiceStatementRow[];
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
  statementRows,
  className,
}: InvoiceDocumentProps) {
  const isStatement = kind === "statement" && statementRows && statementRows.length > 0;

  return (
    <article
      className={cn(
        "invoice-document mx-auto max-w-3xl bg-white p-8 text-foreground shadow-card print:shadow-none",
        className,
      )}
    >
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {KIND_LABELS[kind]}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{tenantName}</h1>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{reference}</p>
          <p className="text-muted">{formatDate(date)}</p>
          {validUntil ? (
            <p className="mt-1 text-xs text-muted">Valid until {formatDate(validUntil)}</p>
          ) : null}
        </div>
      </header>

      <section className="mb-8 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {kind === "purchase" ? "Supplier" : kind === "statement" ? "Account holder" : "Bill to"}
          </p>
          <p className="mt-2 text-base font-semibold">{contact.name}</p>
          {contact.businessName && contact.businessName !== contact.name ? (
            <p className="text-sm text-muted">{contact.businessName}</p>
          ) : null}
          {contact.email ? <p className="mt-1 text-sm">{contact.email}</p> : null}
          {contact.phone ? <p className="text-sm">{contact.phone}</p> : null}
        </div>
        {balanceDue != null && balanceDue > 0 ? (
          <div className="rounded-lg border border-border bg-[var(--color-surface-muted)] p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Account balance
            </p>
            <p className="mt-1 text-lg font-semibold text-amber-700">
              {formatCurrency(balanceDue, currency)} due
            </p>
          </div>
        ) : null}
      </section>

      <table className="mb-6 w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            {isStatement ? (
              <>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Reference</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </>
            ) : (
              <>
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Unit</th>
                <th className="pb-2 text-right font-medium">Total</th>
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
              <td colSpan={5} className="py-6 text-center text-muted">
                No line items
              </td>
            </tr>
          ) : (
            lineItems.map((line, index) => (
              <tr key={`${line.label}-${index}`} className="border-b border-border last:border-0">
                <td className="py-2.5 pr-2">{line.label}</td>
                <td className="py-2.5 text-muted">{line.kind ?? "—"}</td>
                <td className="py-2.5 text-right tabular-nums">{line.quantity}</td>
                <td className="py-2.5 text-right tabular-nums">
                  {formatCurrency(line.unitPrice, currency)}
                </td>
                <td className="py-2.5 text-right font-medium tabular-nums">
                  {formatCurrency(line.total, currency)}
                </td>
              </tr>
            ))
          )}
        </tbody>
        {!isStatement ? (
        <tfoot>
          <tr>
            <td colSpan={4} className="pt-4 text-right text-sm font-medium text-muted">
              Subtotal
            </td>
            <td className="pt-4 text-right font-semibold tabular-nums">
              {formatCurrency(subtotal, currency)}
            </td>
          </tr>
          <tr>
            <td colSpan={4} className="pt-2 text-right text-base font-semibold">
              Total
            </td>
            <td className="pt-2 text-right text-base font-bold tabular-nums">
              {formatCurrency(total, currency)}
            </td>
          </tr>
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
        <section className="border-t border-border pt-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Notes</p>
          <p className="mt-2 whitespace-pre-wrap">{notes}</p>
        </section>
      ) : null}
    </article>
  );
}
