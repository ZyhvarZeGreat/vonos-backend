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
import { saleVehicleFields } from "@/lib/utils/saleVehicleFields";
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

/** Split ALL-CAPS labels + body — labels render inline, same size as body (no big headers). */
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

/**
 * HQ6 fine-print T&Cs: one dense justified block.
 * Section labels are bold inline text at the same font size — never large headers.
 */
export function FormattedTermsBlock({
  title,
  body,
  className,
  finePrint = false,
}: {
  title?: string | null;
  body: string;
  className?: string;
  finePrint?: boolean;
}) {
  const sections = formatTermsSections(body);
  const size = finePrint
    ? "text-[8px] leading-[1.35] text-neutral-700"
    : "text-[11px] leading-relaxed text-neutral-700";

  return (
    <div className={cn(size, "space-y-1.5", className)}>
      {title ? (
        <p className={cn("font-bold text-neutral-900", finePrint && "text-[8px]")}>
          {title}
        </p>
      ) : null}
      {sections.map((section, index) => {
        const text = section.paragraphs.join(" ").trim();
        if (!section.heading && !text) return null;
        return (
          <p key={`${section.heading ?? "p"}-${index}`} className="text-justify">
            {section.heading ? (
              <strong className="font-bold text-neutral-900">
                {section.heading}
                {section.heading.endsWith(":") || section.heading.endsWith("-")
                  ? " "
                  : ": "}
              </strong>
            ) : null}
            {text}
          </p>
        );
      })}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="text-[12px] leading-5 text-neutral-900">
      <span className="font-bold">{label}:</span> {value}
    </div>
  );
}

function qtyLabel(qty: number): string {
  return qty.toFixed(2);
}

function documentHeading(
  kind: "invoice" | "packing_slip" | "delivery_note",
  sale: SaleDetail,
): string {
  if (kind === "packing_slip") return "Packing Slip";
  if (kind === "delivery_note") return "Delivery Note";
  const status = (sale.paymentStatus ?? "").toLowerCase();
  if (status === "paid") return "Invoice PAID";
  if (status === "partial") return "Invoice PARTIAL";
  if (sale.recordStatus === "quotation") return "Quotation";
  return "Invoice";
}

/**
 * HQ6 sale print layout — invoice / packing slip / delivery note.
 * Terms & disclaimer always render as fine print (all document kinds).
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
  const isPacking = kind === "packing_slip";
  const isDelivery = kind === "delivery_note";
  const customerDisplay = [sale.customerName, sale.vehicleLabel]
    .filter(Boolean)
    .join(" ");
  const { plateNumber, carModelYear } = saleVehicleFields({
    customerName: sale.customerName,
    vehicleLabel: sale.vehicleLabel,
  });
  const salesPerson =
    sale.createdByName || sale.serviceStaffEmployeeName || null;
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
  const dateLabel = formatDate(sale.date ?? sale.createdAt);

  const thClass =
    "border border-neutral-300 bg-[#f3f4f6] px-2 py-1.5 text-left text-[11px] font-semibold text-neutral-600";
  const tdClass =
    "border border-neutral-300 px-2 py-1.5 text-[12px] text-neutral-900 align-top";

  return (
    <article
      className={cn(
        "invoice-document mx-auto max-w-[210mm] bg-white text-neutral-900 shadow-sm print:max-w-none print:shadow-none",
        className,
      )}
    >
      {/* Letterhead — invoice: title center + logo right; packing/delivery: logo left + title right */}
      <header className="px-7 pb-4 pt-6">
        {showMoney ? (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-center text-[22px] font-bold tracking-tight text-neutral-800 sm:text-left">
                {heading}
              </p>
              <MetaRow label="Invoice No." value={invoiceNo} />
              <MetaRow
                label="Total Paid"
                value={formatCurrency(totalPaid || totalPayable, currency)}
              />
              <MetaRow label="Date" value={dateLabel} />
              <MetaRow label="Vehicle Time in (Date entered)" value={dateLabel} />
            </div>
            <div className="shrink-0 text-right">
              <div className="ml-auto flex justify-end gap-3">
                <div className="text-right">
                  <p className="text-[15px] font-bold text-neutral-900">
                    {tenantName}
                  </p>
                  {tenantAddress ? (
                    <p className="text-[11px] text-neutral-600">{tenantAddress}</p>
                  ) : null}
                  {tenantMobile ? (
                    <p className="text-[11px] text-neutral-600">
                      Mobile: {tenantMobile}
                    </p>
                  ) : null}
                  {tenantEmail ? (
                    <p className="text-[11px] text-neutral-600">
                      Email: {tenantEmail}
                    </p>
                  ) : null}
                  {sale.serviceStaffEmployeeName ? (
                    <p className="mt-1 text-[11px] text-neutral-700">
                      <span className="font-bold">Service staff:</span>{" "}
                      {sale.serviceStaffEmployeeName}
                    </p>
                  ) : null}
                </div>
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-white">
                  <Image
                    src="/brand/vonos-autos-logo.png"
                    alt=""
                    fill
                    className="object-contain p-1.5"
                    sizes="64px"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-6">
            <div className="flex min-w-0 items-start gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-white">
                <Image
                  src="/brand/vonos-autos-logo.png"
                  alt=""
                  fill
                  className="object-contain p-1.5"
                  sizes="64px"
                  priority
                />
              </div>
              <div className="min-w-0 pt-1">
                <p className="text-[16px] font-bold text-neutral-900">
                  {tenantName}
                </p>
                {tenantAddress ? (
                  <p className="text-[11px] text-neutral-600">{tenantAddress}</p>
                ) : null}
                {tenantMobile ? (
                  <p className="text-[11px] text-neutral-600">
                    Mobile: {tenantMobile}
                  </p>
                ) : null}
                {tenantEmail ? (
                  <p className="text-[11px] text-neutral-600">
                    Email: {tenantEmail}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[26px] font-bold leading-none text-neutral-500">
                {heading}
              </p>
              <p className="mt-3 text-[13px] font-bold text-neutral-900">
                Invoice No. {invoiceNo}
              </p>
              <p className="text-[12px] text-neutral-600">
                <span className="text-neutral-500">Date</span> {dateLabel}
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Customer / shipping */}
      <section
        className={cn(
          "gap-6 px-7 pb-4",
          isPacking ? "grid sm:grid-cols-2" : "block",
        )}
      >
        <div className="space-y-0.5">
          <MetaRow label="Customer" value={customerDisplay || "—"} />
          <MetaRow label="Mobile" value={sale.customerPhone ?? "NILL"} />
          <MetaRow label="Plate Number" value={plateNumber} />
          <MetaRow label="Car Model & Year" value={carModelYear} />
          <MetaRow label="Sales Person" value={salesPerson} />
          {showMoney && locationLabel ? (
            <MetaRow label="Business Location" value={locationLabel} />
          ) : null}
          {showMoney ? (
            <MetaRow
              label="Payment"
              value={formatHq6PaymentStatus(sale.paymentStatus)}
            />
          ) : null}
        </div>
        {isPacking ? (
          <div>
            <p className="text-[12px] font-bold text-neutral-900">
              Shipping Address:
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[12px] text-neutral-700">
              {sale.shippingAddress?.trim() || ""}
            </p>
          </div>
        ) : null}
      </section>

      {/* Line items — bordered tabular grid (HQ6 packing slip / invoice) */}
      <section className="px-7 py-2">
        <table className="w-full border-collapse border border-neutral-300 text-[12px]">
          <thead>
            <tr>
              <th className={`${thClass} w-10 text-center`}>#</th>
              <th className={thClass}>Product</th>
              <th className={`${thClass} w-28 text-right`}>Quantity</th>
              {showMoney ? (
                <>
                  <th className={`${thClass} w-[7rem] text-right`}>Unit Price</th>
                  <th className={`${thClass} w-[7rem] text-right`}>
                    item discount
                  </th>
                  <th className={`${thClass} w-[7.5rem] text-right`}>Subtotal</th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td
                  colSpan={showMoney ? 6 : 3}
                  className={`${tdClass} text-center text-neutral-500`}
                >
                  No line items
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr key={line.index}>
                  <td className={`${tdClass} text-center tabular-nums`}>
                    {line.index}
                  </td>
                  <td className={tdClass}>{line.name}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {qtyLabel(line.qty)}
                  </td>
                  {showMoney ? (
                    <>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {line.unitPrice.toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {line.discount.toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {line.subtotal.toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {showMoney ? (
        <section className="grid gap-6 px-7 py-4 sm:grid-cols-2">
          <div>
            <p className="text-[12px] font-bold text-neutral-800">
              Authorized Signatory
            </p>
            <div className="mt-12 w-48 border-b border-neutral-400" />
          </div>
          <div className="space-y-1 text-right text-[12px] sm:justify-self-end">
            <p>
              <span className="text-neutral-600">Total Quantity:</span>{" "}
              <span className="font-medium tabular-nums">
                {totalQty.toFixed(2)}
              </span>
            </p>
            <p>
              <span className="text-neutral-600">Subtotal:</span>{" "}
              <span className="font-medium tabular-nums">
                {formatCurrency(lineTotal, currency)}
              </span>
            </p>
            {discountAmount > 0 ? (
              <p>
                <span className="text-neutral-600">Discount:</span>{" "}
                <span className="font-medium tabular-nums">
                  − {formatCurrency(discountAmount, currency)}
                </span>
              </p>
            ) : null}
            <p className="text-[15px] font-bold">
              Total: {formatCurrency(totalPayable, currency)}
            </p>
            <p className="text-[11px] italic text-neutral-600">
              ({amountToWords(totalPayable)})
            </p>
          </div>
        </section>
      ) : null}

      {isDelivery ? (
        <section className="space-y-3 px-7 py-4 text-[12px]">
          <p className="font-medium text-neutral-800">
            Above mentioned items received in good condition
          </p>
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="font-bold">Received by:</p>
              <div className="mt-8 border-b border-neutral-400" />
            </div>
            <div>
              <p className="font-bold">Date:</p>
              <div className="mt-8 border-b border-neutral-400" />
            </div>
            <div>
              <p className="font-bold">Authorized Signatory</p>
              <div className="mt-8 border-b border-neutral-400" />
            </div>
          </div>
        </section>
      ) : null}

      {isPacking ? (
        <section className="px-7 py-4">
          <p className="text-[12px] font-bold text-neutral-800">
            Authorized Signatory
          </p>
          <div className="mt-10 w-48 border-b border-neutral-400" />
        </section>
      ) : null}

      {showPaymentTable ? (
        <section className="px-7 py-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-700">
            Payments received
          </p>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-neutral-300">
                <th className="py-1 text-left font-semibold">#</th>
                <th className="py-1 text-left font-semibold">Date</th>
                <th className="py-1 text-left font-semibold">Reference</th>
                <th className="py-1 text-right font-semibold">Amount</th>
                <th className="py-1 text-left font-semibold">Mode</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((pay, index) => (
                <tr key={pay.id} className="border-b border-neutral-100">
                  <td className="py-1">{index + 1}</td>
                  <td className="py-1">
                    {pay.paidOn ? formatDate(pay.paidOn) : "—"}
                  </td>
                  <td className="py-1">{pay.paymentRefNo ?? invoiceNo}</td>
                  <td className="py-1 text-right tabular-nums">
                    {formatCurrency(pay.amount, pay.currency || currency)}
                  </td>
                  <td className="py-1">{formatHq6PaymentMethod(pay.method)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {/* Fine-print footer — always (invoice, packing slip, delivery note) */}
      <footer className="space-y-2 border-t border-neutral-200 px-7 py-4">
        {sale.notes?.trim() ? (
          <p className="text-[11px] text-neutral-800">
            <span className="font-bold">Note: </span>
            {sale.notes.trim()}
          </p>
        ) : null}

        {disclaimer ? (
          <p className="text-[8px] italic leading-[1.35] text-neutral-600">
            {disclaimer}
          </p>
        ) : null}
        {supportLine ? (
          <p className="text-[8px] font-bold italic text-neutral-900">
            {supportLine}
          </p>
        ) : null}

        {termsBody ? (
          <div className="pt-0.5">
            <FormattedTermsBlock
              title={termsTitle ?? "Terms and conditions"}
              body={termsBody}
              finePrint
            />
          </div>
        ) : null}
      </footer>
    </article>
  );
}
