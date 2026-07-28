"use client";

import Image from "next/image";
import type { SaleDetail, SalePaymentViewRow } from "@vonos/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import { amountToWords } from "@/lib/utils/amountToWords";
import {
  formatHq6PaymentMethod,
  formatHq6PaymentStatus,
} from "@/lib/utils/hq6Format";
import { cn } from "@/lib/utils/cn";

export interface SaleInvoicePayslipDocumentProps {
  sale: SaleDetail;
  tenantName: string;
  tenantAddress?: string | null;
  tenantMobile?: string | null;
  tenantEmail?: string | null;
  locationLabel?: string | null;
  payments?: SalePaymentViewRow[];
  termsBody?: string | null;
  termsTitle?: string | null;
  disclaimer?: string | null;
  supportLine?: string | null;
  kind?: "invoice" | "packing_slip" | "delivery_note";
  className?: string;
}

type TermsSection = { heading: string | null; paragraphs: string[] };

/** Split ALL-CAPS headings + body into readable document sections (no monospace). */
export function formatTermsSections(raw: string): TermsSection[] {
  const lines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim());

  const sections: TermsSection[] = [];
  let current: TermsSection = { heading: null, paragraphs: [] };

  const flush = () => {
    if (current.heading || current.paragraphs.length > 0) {
      sections.push(current);
    }
    current = { heading: null, paragraphs: [] };
  };

  for (const line of lines) {
    if (!line) {
      flush();
      continue;
    }
    const isHeading =
      line.length <= 80 &&
      /^[A-Z0-9][A-Z0-9\s/&'.,\-()]+$/.test(line) &&
      /[A-Z]/.test(line) &&
      line === line.toUpperCase();

    if (isHeading) {
      flush();
      current = { heading: line, paragraphs: [] };
      continue;
    }
    current.paragraphs.push(line);
  }
  flush();
  return sections;
}

export function FormattedTermsBlock({
  title,
  body,
  className,
}: {
  title?: string | null;
  body: string;
  className?: string;
}) {
  const sections = formatTermsSections(body);
  return (
    <div className={cn("space-y-3 text-[11px] leading-relaxed text-neutral-700", className)}>
      {title ? (
        <h3 className="text-[12px] font-bold tracking-wide text-neutral-900">
          {title}
        </h3>
      ) : null}
      {sections.map((section, index) => (
        <div key={`${section.heading ?? "p"}-${index}`} className="space-y-1.5">
          {section.heading ? (
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-neutral-900">
              {section.heading}
            </h4>
          ) : null}
          {section.paragraphs.map((para, paraIndex) => (
            <p key={paraIndex} className="text-justify">
              {para}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-2 text-[12px] leading-5">
      <dt className="font-bold text-neutral-800">{label}</dt>
      <dd className="min-w-0 break-words text-neutral-900">{value}</dd>
    </div>
  );
}

const thClass =
  "border border-neutral-800 bg-neutral-100 px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-neutral-900";
const tdClass = "border border-neutral-800 px-2 py-2 text-[12px] text-neutral-900";
const tdCenter = `${tdClass} text-center`;
const tdRight = `${tdClass} text-right tabular-nums`;
const tdLeft = `${tdClass} text-left`;

function documentHeading(
  kind: "invoice" | "packing_slip" | "delivery_note",
  sale: SaleDetail,
): string {
  if (kind === "packing_slip") return "Packing Slip";
  if (kind === "delivery_note") return "Delivery Note";
  const status = (sale.paymentStatus ?? "").toLowerCase();
  if (status === "paid") return "Tax Invoice — Paid";
  if (status === "partial") return "Tax Invoice — Partially Paid";
  if (sale.recordStatus === "quotation") return "Quotation";
  return "Tax Invoice";
}

function saleStatusLabel(recordStatus?: string | null): string {
  if (recordStatus === "draft") return "Draft";
  if (recordStatus === "quotation") return "Quotation";
  if (recordStatus === "completed") return "Final";
  if (!recordStatus) return "Final";
  return recordStatus.charAt(0).toUpperCase() + recordStatus.slice(1);
}

/**
 * Official sale invoice print layout (payslip-inspired shell, document typography).
 */
export function SaleInvoicePayslipDocument({
  sale,
  tenantName,
  tenantAddress,
  tenantMobile,
  tenantEmail,
  locationLabel,
  payments = [],
  termsBody,
  termsTitle,
  disclaimer,
  supportLine,
  kind = "invoice",
  className,
}: SaleInvoicePayslipDocumentProps) {
  const currency = sale.currency || "NGN";
  const showMoney = kind === "invoice";
  const customerDisplay = [sale.customerName, sale.vehicleLabel]
    .filter(Boolean)
    .join(" ");
  const heading = documentHeading(kind, sale);

  const lines = sale.lines.map((line, index) => ({
    index: index + 1,
    name: line.name,
    qty: line.quantity,
    unitPrice: line.unitPrice,
    discount: line.discountAmount ?? 0,
    subtotal: line.lineTotal,
  }));

  const lineTotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const discountAmount = sale.discountAmount ?? 0;
  const totalPayable = sale.total ?? lineTotal;
  const totalQty = lines.reduce((sum, line) => sum + line.qty, 0);
  const totalPaid = sale.totalPaid ?? 0;
  const showPaymentTable = showMoney && payments.length > 0;
  const invoiceNo = sale.reference.replace(/^#/, "");

  return (
    <article
      className={cn(
        "invoice-document mx-auto max-w-[210mm] bg-white text-neutral-900 shadow-sm print:max-w-none print:shadow-none",
        "border border-neutral-300 print:border-neutral-400",
        className,
      )}
    >
      {/* Letterhead */}
      <header className="border-b border-neutral-300 px-7 pb-5 pt-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-white">
              <Image
                src="/brand/vonos-autos-logo.png"
                alt=""
                fill
                className="object-contain p-1.5"
                sizes="56px"
                priority
              />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[17px] font-bold tracking-tight text-neutral-900">
                {tenantName}
              </p>
              <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-neutral-600">
                {tenantAddress?.trim() || "Vonos Autos Group"}
                {tenantMobile ? (
                  <>
                    <br />
                    Tel: {tenantMobile}
                  </>
                ) : null}
                {tenantEmail ? (
                  <>
                    <br />
                    {tenantEmail}
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[15px] font-bold tracking-wide text-neutral-900">
              {heading}
            </p>
            <p className="mt-2 text-[12px] text-neutral-600">
              No. <span className="font-bold text-neutral-900">#{invoiceNo}</span>
            </p>
            <p className="text-[12px] text-neutral-600">
              Date{" "}
              <span className="font-bold text-neutral-900">
                {formatDate(sale.date ?? sale.createdAt)}
              </span>
            </p>
          </div>
        </div>
      </header>

      {/* Parties */}
      <section className="grid gap-6 border-b border-neutral-300 px-7 py-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-800">
            Bill to
          </p>
          <dl className="space-y-1.5">
            <MetaItem label="Customer" value={customerDisplay || "—"} />
            <MetaItem label="Mobile" value={sale.customerPhone} />
            <MetaItem label="Vehicle" value={sale.vehicleLabel} />
            <MetaItem label="Status" value={saleStatusLabel(sale.recordStatus)} />
          </dl>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-800">
            Business details
          </p>
          <dl className="space-y-1.5">
            <MetaItem
              label="Location"
              value={locationLabel ?? sale.locationCode}
            />
            <MetaItem
              label="Attended by"
              value={sale.serviceStaffEmployeeName || sale.createdByName}
            />
            {showMoney ? (
              <>
                <MetaItem
                  label="Payment"
                  value={formatHq6PaymentStatus(sale.paymentStatus)}
                />
                <MetaItem
                  label="Amount paid"
                  value={formatCurrency(totalPaid || totalPayable, currency)}
                />
              </>
            ) : null}
          </dl>
        </div>
      </section>

      {/* Line items — Word-style bordered table */}
      <section className="px-7 py-5">
        <table className="w-full border-collapse border border-neutral-800 text-[12px]">
          <thead>
            <tr>
              <th className={`${thClass} w-10`}>#</th>
              <th className={thClass}>Product</th>
              <th className={`${thClass} w-16`}>Qty</th>
              {showMoney ? (
                <>
                  <th className={`${thClass} w-[7.5rem]`}>Unit price</th>
                  <th className={`${thClass} w-[7rem]`}>Discount</th>
                  <th className={`${thClass} w-[7.5rem]`}>Subtotal</th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td
                  colSpan={showMoney ? 6 : 3}
                  className={`${tdCenter} text-neutral-500`}
                >
                  No line items
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr key={line.index} className="align-top">
                  <td className={`${tdCenter} tabular-nums`}>{line.index}</td>
                  <td className={`${tdLeft} font-semibold`}>{line.name}</td>
                  <td className={`${tdCenter} tabular-nums`}>{line.qty}</td>
                  {showMoney ? (
                    <>
                      <td className={tdRight}>
                        {formatCurrency(line.unitPrice, currency)}
                      </td>
                      <td className={tdRight}>
                        {formatCurrency(line.discount, currency)}
                      </td>
                      <td className={`${tdRight} font-semibold`}>
                        {formatCurrency(line.subtotal, currency)}
                      </td>
                    </>
                  ) : null}
                </tr>
              ))
            )}
            {showMoney && lines.length > 0 ? (
              <tr className="bg-neutral-50">
                <td
                  colSpan={2}
                  className={`${tdLeft} font-bold text-neutral-900`}
                >
                  Total
                </td>
                <td className={`${tdCenter} font-bold tabular-nums`}>
                  {totalQty.toFixed(2)}
                </td>
                <td className={tdRight} />
                <td className={tdRight} />
                <td className={`${tdRight} font-bold`}>
                  {formatCurrency(lineTotal, currency)}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      {showMoney ? (
        <section className="grid gap-6 border-t border-neutral-300 px-7 py-5 sm:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-bold text-neutral-800">
                Amount in words
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-neutral-900">
                {amountToWords(totalPayable)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-neutral-800">
                Authorized signatory
              </p>
              <div className="mt-10 w-44 border-b border-neutral-800" />
            </div>
          </div>
          <div className="sm:justify-self-end sm:w-full sm:max-w-[260px]">
            <table className="w-full border-collapse border border-neutral-800 text-[12px]">
              <tbody>
                <tr>
                  <td className={`${tdLeft} font-bold`}>Subtotal</td>
                  <td className={tdRight}>
                    {formatCurrency(lineTotal, currency)}
                  </td>
                </tr>
                <tr>
                  <td className={`${tdLeft} font-bold`}>Discount</td>
                  <td className={tdRight}>
                    − {formatCurrency(discountAmount, currency)}
                  </td>
                </tr>
                <tr className="bg-neutral-50">
                  <td className={`${tdLeft} text-[13px] font-bold`}>
                    Total due
                  </td>
                  <td className={`${tdRight} text-[13px] font-bold`}>
                    {formatCurrency(totalPayable, currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {showPaymentTable ? (
        <section className="border-t border-neutral-300 px-7 py-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-800">
            Payments received
          </p>
          <table className="w-full border-collapse border border-neutral-800 text-[12px]">
            <thead>
              <tr>
                <th className={`${thClass} w-10`}>#</th>
                <th className={thClass}>Date</th>
                <th className={thClass}>Reference</th>
                <th className={thClass}>Amount</th>
                <th className={thClass}>Mode</th>
                <th className={thClass}>Note</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((pay, index) => (
                <tr key={pay.id} className="align-top">
                  <td className={`${tdCenter} tabular-nums`}>{index + 1}</td>
                  <td className={`${tdCenter} whitespace-nowrap`}>
                    {pay.paidOn ? formatDate(pay.paidOn) : "—"}
                  </td>
                  <td className={tdCenter}>{pay.paymentRefNo ?? invoiceNo}</td>
                  <td className={`${tdRight} font-semibold`}>
                    {formatCurrency(pay.amount, pay.currency || currency)}
                  </td>
                  <td className={tdCenter}>
                    {formatHq6PaymentMethod(pay.method)}
                  </td>
                  <td className={tdLeft}>{pay.note?.trim() || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {/* Footer / terms */}
      <footer className="space-y-4 border-t border-neutral-300 px-7 py-5">
        {sale.notes?.trim() ? (
          <p className="text-[12px] text-neutral-800">
            <span className="font-bold text-neutral-800">Note: </span>
            {sale.notes.trim()}
          </p>
        ) : null}

        {disclaimer ? (
          <p className="text-[11px] leading-relaxed text-neutral-600">
            {disclaimer}
          </p>
        ) : null}
        {supportLine ? (
          <p className="text-[11px] font-medium text-neutral-800">{supportLine}</p>
        ) : null}

        {termsBody && showMoney ? (
          <div className="border-t border-neutral-200 pt-4">
            <FormattedTermsBlock
              title={termsTitle ?? "Terms and conditions"}
              body={termsBody}
            />
          </div>
        ) : null}
      </footer>
    </article>
  );
}
