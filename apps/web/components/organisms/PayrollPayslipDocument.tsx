"use client";

import Image from "next/image";
import type { InvoiceListRow, Payroll } from "@vonos/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import { amountToWords } from "@/lib/utils/amountToWords";
import { cn } from "@/lib/utils/cn";

export interface PayslipLine {
  label: string;
  detail?: string;
  amount: number;
}

export interface PayslipExtraDetails {
  taxPayerId?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  bankIdentifierCode?: string | null;
  bankAccountNo?: string | null;
  daysPresent?: number | null;
  daysAbsent?: number | null;
  totalWorkDuration?: string | null;
  paymentMode?: string | null;
  paymentNote?: string | null;
}

export interface PayrollPayslipDocumentProps {
  payroll: Payroll;
  tenantName: string;
  tenantAddress?: string | null;
  locationLabel?: string | null;
  currency?: string;
  invoice?: Pick<InvoiceListRow, "documentDate" | "reference" | "paymentStatus"> | null;
  extras?: PayslipExtraDetails | null;
  className?: string;
}

function monthLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en", { month: "long", year: "numeric" });
}

function buildEarnings(payroll: Payroll): PayslipLine[] {
  const lines: PayslipLine[] = [
    {
      label: "Basic salary",
      detail: `( 1.00 Month * ${payroll.grossPay.toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} )`,
      amount: payroll.grossPay,
    },
  ];
  if (payroll.totalAllowance > 0) {
    lines.push({
      label: "Allowances",
      amount: payroll.totalAllowance,
    });
  }
  return lines;
}

/** Voucher / payroll refs are notes, not deduction line items. */
function looksLikeReferenceNote(part: string): boolean {
  return /^(VPR|PR|PAY|REF|INV)[-/]?\d/i.test(part.trim());
}

function parseDeductionPart(part: string): PayslipLine | null {
  const trimmed = part.trim();
  if (!trimmed || looksLikeReferenceNote(trimmed)) return null;

  const added = trimmed.match(/^Added deduction\s+([\d,.]+)/i);
  if (added) {
    const amount = Number(added[1]!.replace(/,/g, ""));
    return {
      label: "Deduction",
      amount: Number.isFinite(amount) ? amount : 0,
    };
  }

  const withAmount = trimmed.match(
    /^(.+?)[:：]\s*₦?\s*([\d,.]+)(?:\s*[—–-]\s*(.+))?$/,
  );
  if (withAmount) {
    const amount = Number(withAmount[2]!.replace(/,/g, ""));
    return {
      label: withAmount[1]!.trim(),
      detail: withAmount[3]?.trim() || undefined,
      amount: Number.isFinite(amount) ? amount : 0,
    };
  }

  const withReason = trimmed.match(/^(.+?)\s*[—–-]\s*(.+)$/);
  if (withReason) {
    return {
      label: withReason[1]!.trim(),
      detail: withReason[2]!.trim(),
      amount: 0,
    };
  }

  // Unstructured free text without an amount is not a deduction row.
  return null;
}

function buildDeductions(payroll: Payroll): PayslipLine[] {
  if (payroll.totalDeduction <= 0) return [];

  const parts =
    payroll.note
      ?.split(/[·|;]/)
      .map((part) => part.trim())
      .filter(Boolean) ?? [];

  const named = parts
    .map(parseDeductionPart)
    .filter((line): line is PayslipLine => line != null);

  if (named.length === 0) {
    return [{ label: "Deductions", amount: payroll.totalDeduction }];
  }

  const summed = named.reduce((sum, line) => sum + line.amount, 0);
  if (summed <= 0) {
    named[named.length - 1]!.amount = payroll.totalDeduction;
  } else if (Math.abs(summed - payroll.totalDeduction) > 0.01) {
    const remainder = payroll.totalDeduction - summed;
    if (remainder > 0) {
      named.push({ label: "Other deductions", amount: remainder });
    }
  }

  return named;
}

/** Pull labeled meta out of payroll notes (legacy SQL / Ultimate POS). */
function extractNoteField(
  note: string | null | undefined,
  labels: string[],
): string | null {
  if (!note) return null;
  for (const part of note.split(/[·|;]/)) {
    const trimmed = part.trim();
    for (const label of labels) {
      const match = trimmed.match(
        new RegExp(`^${label}\\s*[:：]\\s*(.+)$`, "i"),
      );
      if (match?.[1]?.trim()) return match[1].trim();
    }
  }
  return null;
}

/** Prefer parenthetical group label as department (e.g. MANAGEMENT STAFF). */
function departmentLabel(groupName: string | null | undefined): string | null {
  if (!groupName) return null;
  const paren = groupName.match(/\(([^)]+)\)\s*$/);
  if (paren?.[1]?.trim()) return paren[1].trim();
  return groupName;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <p className="text-[13px] leading-6 text-neutral-900">
      <span className="font-semibold">{label}:</span>{" "}
      <span>{value?.trim() ? value : "\u00A0"}</span>
    </p>
  );
}

export function PayrollPayslipDocument({
  payroll,
  tenantName,
  tenantAddress,
  locationLabel,
  currency = "NGN",
  invoice,
  extras,
  className,
}: PayrollPayslipDocumentProps) {
  const earnings = buildEarnings(payroll);
  const deductions = buildDeductions(payroll);
  const totalEarnings = payroll.grossPay + payroll.totalAllowance;
  const month = monthLabel(payroll.payrollMonth);
  const paymentDate = invoice?.documentDate ?? payroll.payrollMonth;
  const paymentRef =
    invoice?.reference ?? `PP-${payroll.id.slice(-8).toUpperCase()}`;
  const showPayment =
    payroll.paymentStatus === "paid" ||
    payroll.status === "paid" ||
    Boolean(invoice);

  const taxPayerId =
    extras?.taxPayerId ??
    payroll.taxPayerId ??
    extractNoteField(payroll.note, ["Tax Payer ID", "Tax ID", "TIN", "Tax"]);
  const bankName =
    extras?.bankName ??
    payroll.bankName ??
    extractNoteField(payroll.note, ["Bank Name", "Bank"]);
  const bankBranch =
    extras?.bankBranch ??
    payroll.bankBranch ??
    extractNoteField(payroll.note, ["Branch", "Bank Branch"]);
  const bankIdentifierCode =
    extras?.bankIdentifierCode ??
    payroll.bankCode ??
    extractNoteField(payroll.note, [
      "Bank Identifier Code",
      "BIC",
      "Swift",
      "Sort Code",
      "Bank Code",
    ]);
  const bankAccountNo =
    extras?.bankAccountNo ??
    payroll.bankAccountNo ??
    extractNoteField(payroll.note, [
      "Bank Account No",
      "Bank Account No.",
      "Account No",
      "Account Number",
      "A/C",
    ]);
  const accountHolder =
    payroll.accountHolderName?.trim() || payroll.employeeName;

  const daysPresent = extras?.daysPresent ?? null;
  const daysAbsent = extras?.daysAbsent ?? null;
  const totalWorkDuration = extras?.totalWorkDuration ?? null;

  const noteLines =
    payroll.note
      ?.split(/[·|;]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => {
        if (/^Added deduction\s+/i.test(part)) return false;
        if (/^.+?[:：]\s*₦?\s*[\d,.]+\s*$/.test(part)) return false;
        if (
          /^(Tax Payer ID|Tax ID|TIN|Bank Name|Bank|Branch|Bank Branch|Bank Identifier Code|BIC|Swift|Sort Code|Bank Account No\.?|Account No\.?|Account Number|A\/C)\s*[:：]/i.test(
            part,
          )
        ) {
          return false;
        }
        return true;
      }) ?? [];
  const noteText = noteLines.join(" · ");

  return (
    <article
      className={cn(
        "invoice-document mx-auto max-w-4xl overflow-hidden border border-neutral-800 bg-white text-neutral-900 print:border-black",
        className,
      )}
    >
      <div className="relative border-b border-neutral-800 px-6 pb-4 pt-5">
        <div className="flex items-start justify-between gap-6">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-white">
            <Image
              src="/brand/vonos-autos-logo.png"
              alt="Vonos Autos"
              fill
              className="object-contain p-1.5"
              sizes="64px"
              priority
            />
          </div>
          <div className="min-w-0 flex-1 text-right">
            <p className="text-lg font-bold leading-tight text-neutral-900">
              {tenantName}
            </p>
            {tenantAddress ? (
              <p className="mt-1 text-xs leading-snug text-neutral-700">
                {tenantAddress}
              </p>
            ) : (
              <p className="mt-1 text-xs leading-snug text-neutral-700">
                Vonos Autos Group
              </p>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-sm font-semibold text-neutral-900">
          Payslip for the month of {month}
        </p>
      </div>

      <section className="grid border-b border-neutral-800 sm:grid-cols-2">
        <div className="space-y-0.5 border-b border-neutral-800 px-5 py-4 sm:border-b-0 sm:border-r">
          <InfoRow label="Employee" value={payroll.employeeName} />
          <InfoRow label="Employee ID" value={payroll.employeeId} />
          <InfoRow
            label="Department"
            value={departmentLabel(payroll.payrollGroupName)}
          />
          <InfoRow label="Designation" value={payroll.designationName} />
          <InfoRow
            label="Primary work location"
            value={locationLabel ?? payroll.locationCode}
          />
          <InfoRow label="Tax Payer ID" value={taxPayerId} />
          <InfoRow label="Status" value={payroll.status} />
        </div>
        <div className="space-y-0.5 px-5 py-4">
          <InfoRow label="Bank Name" value={bankName} />
          <InfoRow label="Branch" value={bankBranch} />
          <InfoRow label="Bank Identifier Code" value={bankIdentifierCode} />
          <InfoRow label="Account Holder's Name" value={accountHolder} />
          <InfoRow label="Bank Account No." value={bankAccountNo} />
          <InfoRow label="Payment status" value={payroll.paymentStatus} />
        </div>
      </section>

      <section className="grid grid-cols-3 border-b border-neutral-800 text-[13px] text-neutral-900">
        <div className="border-r border-neutral-800 px-5 py-3">
          <span className="font-semibold">Total work duration:</span>{" "}
          {totalWorkDuration ?? "—"}
        </div>
        <div className="border-r border-neutral-800 px-5 py-3">
          <span className="font-semibold">Days present:</span>{" "}
          {daysPresent ?? "—"}
        </div>
        <div className="px-5 py-3">
          <span className="font-semibold">Days absent:</span>{" "}
          {daysAbsent ?? "—"}
        </div>
      </section>

      <section className="grid border-b border-neutral-800 sm:grid-cols-2">
        <div className="border-b border-neutral-800 sm:border-b-0 sm:border-r">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-neutral-800 bg-neutral-50 px-4 py-2 text-xs font-semibold text-neutral-900">
            <span>Earnings</span>
            <span className="w-16 text-right">Rate</span>
            <span className="w-28 text-right">Amount</span>
          </div>
          <div className="min-h-[7rem] px-4 py-2 text-[13px] text-neutral-900">
            {earnings.map((line) => (
              <div
                key={line.label}
                className="mb-3 grid grid-cols-[1fr_auto_auto] items-start gap-2"
              >
                <div>
                  <p>{line.label}</p>
                  {line.detail ? (
                    <p className="text-xs text-neutral-600">{line.detail}</p>
                  ) : null}
                </div>
                <span className="w-16 text-right text-neutral-500">—</span>
                <span className="w-28 text-right tabular-nums">
                  {formatCurrency(line.amount, currency)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-neutral-800 px-4 py-2 text-[13px] font-semibold text-neutral-900">
            <span>Total earnings</span>
            <span className="tabular-nums">
              {formatCurrency(totalEarnings, currency)}
            </span>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-neutral-800 bg-neutral-50 px-4 py-2 text-xs font-semibold text-neutral-900">
            <span>Deductions</span>
            <span className="w-16 text-right">Rate</span>
            <span className="w-28 text-right">Amount</span>
          </div>
          <div className="min-h-[7rem] px-4 py-2 text-[13px] text-neutral-900">
            {deductions.length === 0 ? (
              <p className="text-neutral-500">No deductions</p>
            ) : (
              deductions.map((line, index) => (
                <div
                  key={`${line.label}-${index}`}
                  className="mb-3 grid grid-cols-[1fr_auto_auto] items-start gap-2"
                >
                  <div>
                    <p>{line.label}</p>
                    {line.detail ? (
                      <p className="text-xs text-neutral-600">{line.detail}</p>
                    ) : null}
                  </div>
                  <span className="w-16 text-right text-neutral-500">—</span>
                  <span className="w-28 text-right tabular-nums">
                    {line.amount > 0
                      ? formatCurrency(line.amount, currency)
                      : ""}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="flex items-center justify-between border-t border-neutral-800 px-4 py-2 text-[13px] font-semibold text-neutral-900">
            <span>Total deductions</span>
            <span className="tabular-nums">
              {formatCurrency(payroll.totalDeduction, currency)}
            </span>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-800 px-5 py-3 text-[13px] text-neutral-900">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p>
            <span className="font-semibold">In words:</span>{" "}
            {amountToWords(payroll.netPay)}
          </p>
          <div className="text-right">
            <p className="font-semibold">
              Net pay{" "}
              <span className="ml-4 tabular-nums">
                {formatCurrency(payroll.netPay, currency)}
              </span>
            </p>
          </div>
        </div>
      </section>

      {showPayment ? (
        <section className="border-b border-neutral-800">
          <table className="w-full text-[13px] text-neutral-900">
            <thead>
              <tr className="bg-emerald-600 text-left text-white">
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Reference No</th>
                <th className="px-3 py-2 font-semibold">Amount</th>
                <th className="px-3 py-2 font-semibold">Payment mode</th>
                <th className="px-3 py-2 font-semibold">Payment note</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-neutral-800">
                <td className="px-3 py-2">1</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatDate(paymentDate)}
                </td>
                <td className="px-3 py-2">{paymentRef}</td>
                <td className="px-3 py-2 tabular-nums">
                  {formatCurrency(payroll.netPay, currency)}
                </td>
                <td className="px-3 py-2">
                  {extras?.paymentMode ?? "Bank Transfer"}
                </td>
                <td className="px-3 py-2">
                  {extras?.paymentNote ?? invoice?.paymentStatus ?? "--"}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}

      <div className="px-5 py-4 text-[13px] text-neutral-900">
        <p>
          <span className="font-semibold">Note:</span> {noteText || "—"}
        </p>
        <p className="mt-1 text-xs text-neutral-600">
          Created {formatDate(payroll.createdAt)}
        </p>
      </div>
    </article>
  );
}

export function payrollPayslipTitle(payroll: Payroll): string {
  return `Payroll of ${payroll.employeeName} for ${monthLabel(payroll.payrollMonth)}`;
}
