"use client";

import type { InvoiceDetail, Payroll } from "@vonos/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import { amountToWords } from "@/lib/utils/amountToWords";
import { cn } from "@/lib/utils/cn";

export interface PayslipLine {
  label: string;
  detail?: string;
  amount: number;
}

export interface PayrollPayslipDocumentProps {
  payroll: Payroll;
  tenantName: string;
  tenantAddress?: string | null;
  locationLabel?: string | null;
  currency?: string;
  invoice?: InvoiceDetail | null;
  className?: string;
}

function monthLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en", { month: "long", year: "numeric" });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "V";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
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

function parseDeductionPart(part: string): PayslipLine | null {
  const trimmed = part.trim();
  if (!trimmed) return null;

  const added = trimmed.match(/^Added deduction\s+([\d,.]+)/i);
  if (added) {
    const amount = Number(added[1]!.replace(/,/g, ""));
    return {
      label: "Deduction",
      amount: Number.isFinite(amount) ? amount : 0,
    };
  }

  const withAmount = trimmed.match(/^(.+?)[:：]\s*₦?\s*([\d,.]+)(?:\s*[—–-]\s*(.+))?$/);
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

  return { label: trimmed, amount: 0 };
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
    // Prefer named amounts; if they under-count, leave remainder on last line.
    const remainder = payroll.totalDeduction - summed;
    if (remainder > 0) {
      named[named.length - 1]!.amount += remainder;
    }
  }

  return named;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <p className="text-[13px] leading-6 text-foreground">
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
  className,
}: PayrollPayslipDocumentProps) {
  const earnings = buildEarnings(payroll);
  const deductions = buildDeductions(payroll);
  const totalEarnings = payroll.grossPay + payroll.totalAllowance;
  const month = monthLabel(payroll.payrollMonth);
  const paymentDate = invoice?.documentDate ?? payroll.payrollMonth;
  const paymentRef = invoice?.reference ?? `PP-${payroll.id.slice(-8).toUpperCase()}`;
  const showPayment =
    payroll.paymentStatus === "paid" ||
    payroll.status === "paid" ||
    Boolean(invoice);

  const noteLines =
    payroll.note
      ?.split(/[·|;]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => {
        if (/^Added deduction\s+/i.test(part)) return false;
        if (/^.+?[:：]\s*₦?\s*[\d,.]+\s*$/.test(part)) return false;
        return true;
      }) ?? [];
  const noteText = noteLines.join(" · ");

  return (
    <article
      className={cn(
        "invoice-document mx-auto max-w-4xl overflow-hidden border border-neutral-800 bg-white text-foreground print:border-black",
        className,
      )}
    >
      <header className="relative border-b border-neutral-800 px-6 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1" />
          <div className="flex flex-1 justify-center pt-1">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-neutral-300 bg-white text-lg font-bold tracking-tight">
              <span className="text-red-600">{initials(tenantName).slice(0, 1)}</span>
              <span className="text-blue-700">{initials(tenantName).slice(1, 2)}</span>
            </div>
          </div>
          <div className="flex-1 text-right">
            <p className="text-lg font-bold leading-tight">{tenantName}</p>
            {tenantAddress ? (
              <p className="mt-1 text-xs leading-snug text-neutral-700">{tenantAddress}</p>
            ) : null}
          </div>
        </div>
        <p className="mt-4 text-center text-sm font-medium">
          Payslip for the month of {month}
        </p>
      </header>

      <section className="grid border-b border-neutral-800 sm:grid-cols-2">
        <div className="space-y-0.5 border-b border-neutral-800 px-5 py-4 sm:border-b-0 sm:border-r">
          <InfoRow label="Employee" value={payroll.employeeName} />
          <InfoRow label="Department" value={payroll.payrollGroupName} />
          <InfoRow label="Designation" value={payroll.designationName} />
          <InfoRow
            label="Primary work location"
            value={locationLabel ?? payroll.locationCode}
          />
          <InfoRow label="Tax Payer ID" value={null} />
        </div>
        <div className="space-y-0.5 px-5 py-4">
          <InfoRow label="Bank Name" value={null} />
          <InfoRow label="Branch" value={null} />
          <InfoRow label="Bank Identifier Code" value={null} />
          <InfoRow label="Account Holder's Name" value={payroll.employeeName} />
          <InfoRow label="Bank Account No." value={null} />
        </div>
      </section>

      <section className="grid grid-cols-3 border-b border-neutral-800 text-[13px]">
        <div className="border-r border-neutral-800 px-5 py-3">
          <span className="font-semibold">Total work duration:</span> 0
        </div>
        <div className="border-r border-neutral-800 px-5 py-3">
          <span className="font-semibold">Days present:</span> 0
        </div>
        <div className="px-5 py-3">
          <span className="font-semibold">Days absent:</span> 0
        </div>
      </section>

      <section className="grid border-b border-neutral-800 sm:grid-cols-2">
        <div className="border-b border-neutral-800 sm:border-b-0 sm:border-r">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-neutral-800 px-4 py-2 text-xs font-semibold">
            <span>Earnings</span>
            <span className="w-16 text-right">Rate</span>
            <span className="w-28 text-right">Amount</span>
          </div>
          <div className="min-h-[7rem] px-4 py-2 text-[13px]">
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
          <div className="flex items-center justify-between border-t border-neutral-800 px-4 py-2 text-[13px] font-semibold">
            <span>Total earnings</span>
            <span className="tabular-nums">{formatCurrency(totalEarnings, currency)}</span>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-neutral-800 px-4 py-2 text-xs font-semibold">
            <span>Deductions</span>
            <span className="w-16 text-right">Rate</span>
            <span className="w-28 text-right">Amount</span>
          </div>
          <div className="min-h-[7rem] px-4 py-2 text-[13px]">
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
          <div className="flex items-center justify-between border-t border-neutral-800 px-4 py-2 text-[13px] font-semibold">
            <span>Total deductions</span>
            <span className="tabular-nums">
              {formatCurrency(payroll.totalDeduction, currency)}
            </span>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-800 px-5 py-3 text-[13px]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p>
            <span className="font-semibold">In words:</span>{" "}
            {amountToWords(payroll.netPay)}
          </p>
          <div className="text-right">
            <p className="font-semibold">
              Net pay / month balance{" "}
              <span className="ml-4 tabular-nums">
                {formatCurrency(payroll.netPay, currency)}
              </span>
            </p>
            <p className="mt-0.5 text-xs font-normal text-neutral-600">
              Take-home after deductions (gross is unchanged)
            </p>
          </div>
        </div>
      </section>

      {showPayment ? (
        <section className="border-b border-neutral-800">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-emerald-500 text-left text-white">
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
                <td className="px-3 py-2">Bank Transfer</td>
                <td className="px-3 py-2">--</td>
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}

      <footer className="px-5 py-4 text-[13px]">
        <p>
          <span className="font-semibold">Note:</span>{" "}
          {noteText}
        </p>
      </footer>
    </article>
  );
}

export function payrollPayslipTitle(payroll: Payroll): string {
  return `Payroll of ${payroll.employeeName} for ${monthLabel(payroll.payrollMonth)}`;
}
