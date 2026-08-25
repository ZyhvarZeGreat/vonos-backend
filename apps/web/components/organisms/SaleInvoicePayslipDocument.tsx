"use client";

import Image from "next/image";
import type { SaleDetail, SalePaymentViewRow } from "@vonos/types";
import { formatHq6Currency, formatHq6DateTime } from "@/lib/utils/hq6Format";
import { amountToWords } from "@/lib/utils/amountToWords";
import { saleVehicleFields } from "@/lib/utils/saleVehicleFields";
import { parseSaleInvoiceNotes, sellNoteOnly } from "@/lib/utils/saleInvoiceNotes";
import { publicAssetPath } from "@/lib/utils/basePath";
import { cn } from "@/lib/utils/cn";

export interface SaleInvoicePayslipDocumentProps {
  sale: SaleDetail;
  tenantName: string;
  tenantAddress?: string | null;
  tenantMobile?: string | null;
  tenantMobileSecondary?: string | null;
  tenantEmail?: string | null;
  tenantSection?: string | null;
  locationLabel?: string | null;
  /** Kept for call-site compat; classic HQ6 prints omit the payment table. */
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
    ? "text-[10px] leading-[1.4] text-neutral-700"
    : "text-[13px] leading-relaxed text-neutral-700";

  return (
    <div className={cn(size, "space-y-1.5", className)}>
      {title ? (
        <p
          className={cn(
            "font-bold text-neutral-900",
            finePrint && "text-[10px]",
          )}
        >
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

function MetaRow({
  label,
  value,
  colon = true,
}: {
  label: string;
  value?: string | null;
  colon?: boolean;
}) {
  if (value == null || !String(value).trim()) return null;
  return (
    <div className="text-[14px] leading-[1.45] text-neutral-900">
      <span className="font-bold">
        {label}
        {colon ? ":" : ""}
      </span>{" "}
      {value}
    </div>
  );
}

function qtyWithUnit(qty: number, productName: string): string {
  const unit = /labou?r|service/i.test(productName) ? "Pc(s)" : "sng";
  return `${qty.toFixed(2)} ${unit}`;
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
  if (status === "due" || status === "overdue" || !status) return "Invoice UNPAID";
  return "Invoice";
}

function invoiceWords(amount: number): string {
  const raw = amountToWords(amount, { currencyLabel: "", subunitLabel: "" })
    .replace(/\s+Only$/i, "")
    .trim()
    .toLowerCase();
  return raw || "zero";
}

/**
 * Full Vonos mark (VG emblem over “VONOS GROUP”) — never crop to a circle or
 * place the emblem beside the wordmark; the asset already stacks them.
 */
function BrandMark({ width = 132 }: { width?: number }) {
  // Stacked mark (emblem over wordmark) is roughly square — do not crop.
  const height = width;
  return (
    <div className="relative shrink-0 bg-white" style={{ width, height }}>
      <Image
        src={publicAssetPath("/brand/vonos-group-logo.png")}
        alt="Vonos Group"
        fill
        className="object-contain object-top"
        sizes={`${width}px`}
        priority
      />
    </div>
  );
}

function CompanyBlock({
  name,
  section,
  address,
  mobile,
  mobileSecondary,
  email,
  serviceStaff,
  align = "left",
}: {
  name: string;
  section?: string | null;
  address?: string | null;
  mobile?: string | null;
  mobileSecondary?: string | null;
  email?: string | null;
  serviceStaff?: string | null;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "min-w-0 text-[14px] leading-[1.5] text-neutral-900",
        align === "right" && "text-right",
      )}
    >
      <p className="text-[18px] font-bold tracking-tight">{name}</p>
      {section ? <p className="text-[14px]">{section}</p> : null}
      {address ? (
        <p>
          <span className="font-bold">Address:</span> {address}
        </p>
      ) : null}
      {mobile ? (
        <p>
          <span className="font-bold">Mobile:</span> {mobile}
          {mobileSecondary ? ` / ${mobileSecondary}` : ""}
        </p>
      ) : mobileSecondary ? (
        <p>
          <span className="font-bold">Mobile:</span> {mobileSecondary}
        </p>
      ) : null}
      {email ? (
        <p>
          <span className="font-bold">Email:</span> {email}
        </p>
      ) : null}
      <p className="mt-0.5">
        <span className="font-bold">Service staff:</span>{" "}
        {serviceStaff?.trim() || "—"}
      </p>
    </div>
  );
}

/** Logo stacked above company lines — never side-by-side. */
function LetterheadBrand({
  name,
  section,
  address,
  mobile,
  mobileSecondary,
  email,
  serviceStaff,
  align = "left",
  logoWidth = 128,
}: {
  name: string;
  section?: string | null;
  address?: string | null;
  mobile?: string | null;
  mobileSecondary?: string | null;
  email?: string | null;
  serviceStaff?: string | null;
  align?: "left" | "right";
  logoWidth?: number;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2",
        align === "right" ? "items-end" : "items-start",
      )}
    >
      <BrandMark width={logoWidth} />
      <CompanyBlock
        name={name}
        section={section}
        address={address}
        mobile={mobile}
        mobileSecondary={mobileSecondary}
        email={email}
        serviceStaff={serviceStaff}
        align={align}
      />
    </div>
  );
}

function CustomerFields({
  customerDisplay,
  phone,
  plateNumber,
  carModelYear,
  mileage,
  salesPerson,
  repeatName = false,
}: {
  customerDisplay: string;
  phone?: string | null;
  plateNumber?: string | null;
  carModelYear?: string | null;
  mileage?: string | null;
  salesPerson?: string | null;
  repeatName?: boolean;
}) {
  return (
    <div className="space-y-0.5 text-[14px] leading-[1.5] text-neutral-900">
      <p className="font-bold">Customer</p>
      <p>{customerDisplay || "—"}</p>
      {repeatName && customerDisplay ? <p>{customerDisplay}</p> : null}
      <MetaRow label="Mobile" value={phone?.trim() || "NILL"} />
      <MetaRow label="Plate Number" value={plateNumber} />
      <MetaRow label="Car Model & Year" value={carModelYear} />
      <MetaRow label="Car Mileage" value={mileage} />
      <div className="text-[14px] leading-[1.5] text-neutral-900">
        <span className="font-bold">Sales Person :</span>{" "}
        {salesPerson?.trim() || "—"}
      </div>
    </div>
  );
}

function LineItemsTable({
  lines,
  showMoney,
}: {
  lines: Array<{
    index: number;
    name: string;
    qty: number;
    unitPrice: number;
    discount: number;
    subtotal: number;
  }>;
  showMoney: boolean;
}) {
  // HQ6 print: vertical column rules only — no horizontal lines between item rows.
  // Outer top/bottom + header underline frame the table (matches printed HQ6 slips).
  const th =
    "border-x border-[#d1d5db] border-y-0 bg-[#f3f4f6] px-2 py-1.5 text-left text-[13px] font-semibold text-[#6b7280]";
  const td =
    "border-x border-[#d1d5db] border-y-0 px-2 py-1.5 text-[14px] text-neutral-900 align-top";

  return (
    <table className="w-full border-collapse border border-[#d1d5db] text-[14px]">
      <thead>
        <tr className="border-b border-[#d1d5db]">
          <th className={`${th} w-10 text-center`}>#</th>
          <th className={`${th} text-center`}>Product</th>
          <th className={`${th} w-28 text-right`}>Quantity</th>
          {showMoney ? (
            <>
              <th className={`${th} w-[7rem] text-right`}>Unit Price</th>
              <th className={`${th} w-[7rem] text-right`}>item discount</th>
              <th className={`${th} w-[7.5rem] text-right`}>Subtotal</th>
            </>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {lines.length === 0 ? (
          <tr>
            <td
              colSpan={showMoney ? 6 : 3}
              className={`${td} text-center text-neutral-500`}
            >
              No line items
            </td>
          </tr>
        ) : (
          lines.map((line) => (
            <tr key={line.index}>
              <td className={`${td} text-center tabular-nums`}>{line.index}</td>
              <td className={td}>{line.name}</td>
              <td className={`${td} text-right tabular-nums`}>
                {qtyWithUnit(line.qty, line.name)}
              </td>
              {showMoney ? (
                <>
                  <td className={`${td} text-right tabular-nums`}>
                    {line.unitPrice.toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>
                    {line.discount.toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>
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
  );
}

function FinePrintFooter({
  disclaimer,
  supportLine,
  termsTitle,
  termsBody,
  notes,
}: {
  disclaimer?: string | null;
  supportLine?: string | null;
  termsTitle?: string | null;
  termsBody?: string | null;
  notes?: string | null;
}) {
  return (
    <footer className="mt-4 space-y-2 px-7 pb-5 pt-1">
      {notes?.trim() ? (
        <p className="text-[13px] text-neutral-800">
          <span className="font-bold">Note: </span>
          {notes.trim()}
        </p>
      ) : null}
      {disclaimer ? (
        <p className="text-[10px] italic leading-[1.4] text-neutral-700">
          {disclaimer}
        </p>
      ) : null}
      {supportLine ? (
        <p className="text-[13px] font-bold text-neutral-900">{supportLine}</p>
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
  );
}

/**
 * HQ6 sale print layout — invoice / packing slip / delivery note.
 * Layout mirrors legacy hq6.vonosautomarket.com print templates.
 */
export function SaleInvoicePayslipDocument({
  sale,
  tenantName,
  tenantAddress,
  tenantMobile,
  tenantMobileSecondary,
  tenantEmail,
  tenantSection,
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
  const noteFields = parseSaleInvoiceNotes(sale.notes);
  const { customerDisplay, plateNumber, carModelYear } = saleVehicleFields({
    customerName: sale.customerName,
    vehicleLabel: sale.vehicleLabel,
    plateNumber: noteFields.plateNumber,
    carModelYear: noteFields.carModelYear,
  });
  // Sales person ≠ service staff. Prefer explicit note, then creator — never service staff.
  const salesPerson =
    noteFields.salesPerson || sale.createdByName?.trim() || null;
  const serviceStaffName =
    sale.serviceStaffEmployeeName?.trim() ||
    sale.cleanerName?.trim() ||
    noteFields.serviceStaff ||
    null;
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
  const orderTax = Math.max(0, sale.taxAmount ?? 0);
  const totalPayable = sale.total ?? lineTotal;
  const totalQty = lines.reduce((sum, line) => sum + line.qty, 0);
  const totalPaid = sale.totalPaid ?? 0;
  const totalDue =
    sale.sellDue != null
      ? Math.max(0, sale.sellDue)
      : Math.max(0, totalPayable - totalPaid);
  const invoiceNo = sale.reference.replace(/^#/, "");
  const dateSource = sale.date ?? sale.createdAt;
  const dateLabel = formatHq6DateTime(dateSource);
  const vehicleTimeInLabel = noteFields.vehicleTimeIn
    ? formatHq6DateTime(noteFields.vehicleTimeIn) || noteFields.vehicleTimeIn
    : dateLabel;

  return (
    <article
      className={cn(
        "invoice-document mx-auto max-w-[210mm] bg-white font-sans text-neutral-900 shadow-sm print:max-w-none print:shadow-none",
        className,
      )}
    >
      {/* ─── INVOICE ─── */}
      {showMoney ? (
        <>
          <header className="px-7 pb-3 pt-5">
            <p className="text-center text-[22px] font-bold tracking-tight text-neutral-800">
              {heading}
            </p>

            <div className="mt-4 flex items-start justify-between gap-6">
              <div className="min-w-0 flex-1 space-y-0.5">
                <MetaRow label="Invoice No." value={invoiceNo} />
                <MetaRow
                  label="Total Due"
                  value={formatHq6Currency(totalDue, currency)}
                />
                <MetaRow
                  label="Total Paid"
                  value={formatHq6Currency(totalPaid, currency)}
                />
                <MetaRow label="Date" value={dateLabel} />
                <MetaRow
                  label="Vehicle Time in (Date entered)"
                  value={vehicleTimeInLabel}
                />
              </div>

              <LetterheadBrand
                name={tenantName}
                section={tenantSection}
                address={tenantAddress}
                mobile={tenantMobile}
                mobileSecondary={tenantMobileSecondary}
                email={tenantEmail}
                serviceStaff={serviceStaffName}
                align="right"
                logoWidth={132}
              />
            </div>
          </header>

          <section className="px-7 pb-4 pt-2">
            <CustomerFields
              customerDisplay={customerDisplay}
              phone={sale.customerPhone}
              plateNumber={plateNumber}
              carModelYear={carModelYear}
              mileage={noteFields.mileage}
              salesPerson={salesPerson}
            />
          </section>

          <section className="px-7 py-1">
            <LineItemsTable lines={lines} showMoney />
          </section>

          <section className="grid gap-6 px-7 py-5 sm:grid-cols-2">
            <div>
              <p className="text-[14px] font-bold text-neutral-900">
                Authorized Signatory
              </p>
              <div className="mt-14 w-52" />
            </div>
            <div className="space-y-1 text-right text-[14px] sm:justify-self-end">
              <p>
                Total Quantity:{" "}
                <span className="tabular-nums">{totalQty.toFixed(2)}</span>
              </p>
              <p>
                Subtotal:{" "}
                <span className="tabular-nums">
                  {formatHq6Currency(lineTotal, currency)}
                </span>
              </p>
              {discountAmount > 0 ? (
                <p>
                  Discount:(-){" "}
                  <span className="tabular-nums">
                    {formatHq6Currency(discountAmount, currency)}
                  </span>
                </p>
              ) : null}
              <p>
                Order Tax:(+){" "}
                <span className="tabular-nums">
                  {formatHq6Currency(orderTax, currency)}
                </span>
              </p>
              <p className="pt-1 text-[22px] font-bold leading-tight text-[#9ca3af]">
                Total:{" "}
                <span className="text-neutral-800">
                  {formatHq6Currency(totalPayable, currency)}
                </span>
              </p>
              <p className="text-[13px] text-neutral-600">
                ({invoiceWords(totalPayable)})
              </p>
              <div className="mt-3 border-t border-[#d1d5db] pt-2 text-left sm:text-right">
                <p className="font-bold text-neutral-900">Tax details</p>
                <div className="mt-1 flex justify-end gap-8 text-[13px]">
                  <span className="text-neutral-600">Order Tax</span>
                  <span className="tabular-nums">
                    {formatHq6Currency(orderTax, currency)}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {/* ─── PACKING SLIP ─── */}
      {isPacking ? (
        <>
          <header className="flex items-start justify-between gap-6 px-7 pb-2 pt-5">
            <LetterheadBrand
              name={tenantName}
              section={tenantSection}
              address={tenantAddress}
              mobile={tenantMobile}
              mobileSecondary={tenantMobileSecondary}
              email={tenantEmail}
              serviceStaff={serviceStaffName}
              logoWidth={120}
            />
            <div className="shrink-0 pt-1 text-right">
              <p className="text-[28px] font-bold leading-none text-neutral-700">
                {heading}
              </p>
              <p className="mt-4 text-[14px] font-bold text-neutral-900">
                Invoice No. {invoiceNo}
              </p>
              <p className="text-[14px] text-neutral-700">
                <span className="text-neutral-500">Date</span> {dateLabel}
              </p>
            </div>
          </header>

          <section className="grid gap-8 px-7 pb-4 pt-4 sm:grid-cols-2">
            <CustomerFields
              customerDisplay={customerDisplay}
              phone={sale.customerPhone}
              plateNumber={plateNumber}
              carModelYear={carModelYear}
              mileage={noteFields.mileage}
              salesPerson={salesPerson}
              repeatName
            />
            <div>
              <p className="text-[14px] font-bold text-neutral-900">
                Shipping Address:
              </p>
              <p className="mt-1 min-h-[3rem] whitespace-pre-wrap text-[14px] text-neutral-800">
                {sale.shippingAddress?.trim() || ""}
              </p>
            </div>
          </section>

          <section className="px-7 py-2">
            <LineItemsTable lines={lines} showMoney={false} />
          </section>

          <section className="px-7 py-6">
            <p className="text-[14px] font-bold text-neutral-900">
              Authorized Signatory
            </p>
            <div className="mt-12 w-52" />
          </section>
        </>
      ) : null}

      {/* ─── DELIVERY NOTE ─── */}
      {isDelivery ? (
        <>
          <header className="flex items-start justify-between gap-6 px-7 pb-3 pt-5">
            <LetterheadBrand
              name={tenantName}
              section={tenantSection}
              address={tenantAddress}
              mobile={tenantMobile}
              mobileSecondary={tenantMobileSecondary}
              email={tenantEmail}
              serviceStaff={serviceStaffName}
              logoWidth={120}
            />
            <div className="shrink-0 text-right">
              <p className="text-[28px] font-bold leading-none text-neutral-700">
                {heading}
              </p>
              <div className="mt-4 space-y-0.5 text-left sm:ml-auto sm:w-[16rem]">
                <MetaRow label="Invoice No." value={invoiceNo} />
                <MetaRow label="Date" value={dateLabel} />
                <MetaRow label="Customer" value={customerDisplay || "—"} />
                <MetaRow
                  label="Mobile"
                  value={sale.customerPhone?.trim() || "NILL"}
                />
                <MetaRow label="Plate Number" value={plateNumber} />
                <MetaRow label="Car Model & Year" value={carModelYear} />
                <MetaRow label="Car Mileage" value={noteFields.mileage} />
                <div className="text-[14px] leading-[1.5] text-neutral-900">
                  <span className="font-bold">Sales Person :</span>{" "}
                  {salesPerson?.trim() || "—"}
                </div>
              </div>
            </div>
          </header>

          <section className="px-7 py-3">
            <LineItemsTable lines={lines} showMoney={false} />
          </section>

          <section className="space-y-3 px-7 py-5 text-[14px]">
            <p className="font-bold text-neutral-900">
              Above mentioned items received in good condition
            </p>
            <p>
              <span className="font-bold">Received by :</span>
            </p>
            <p>
              <span className="font-bold">Date:</span>
            </p>
            <p className="pt-2 font-bold">Authorized Signatory</p>
          </section>
        </>
      ) : null}

      <FinePrintFooter
        notes={sellNoteOnly(sale.notes)}
        disclaimer={disclaimer}
        supportLine={supportLine}
        termsTitle={termsTitle}
        termsBody={termsBody}
      />
    </article>
  );
}
