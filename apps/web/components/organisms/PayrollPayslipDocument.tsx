"use client";

import Image from "next/image";
import type { InvoiceListRow, Payroll } from "@vonos/types";
import { formatHq6Currency } from "@/lib/utils/hq6Format";
import { publicAssetPath } from "@/lib/utils/basePath";
import { cn } from "@/lib/utils/cn";

export interface PayslipLine {
  label: string;
  detail?: string;
  rate?: string;
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
  totalWorkDuration?: string | number | null;
  paymentMode?: string | null;
  paymentNote?: string | null;
}

export interface PayrollPayslipDocumentProps {
  payroll: Payroll;
  tenantName: string;
  tenantAddress?: string | null;
  locationLabel?: string | null;
  currency?: string;
  invoice?: Pick<
    InvoiceListRow,
    "documentDate" | "reference" | "paymentStatus"
  > | null;
  extras?: PayslipExtraDetails | null;
  className?: string;
}

function monthLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en", { month: "long", year: "numeric" });
}

/** Ultimate POS payslip dates use DD-MM-YYYY. */
function payslipDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Ultimate POS / PHP NumberFormatter(en_IN) style — e.g. 600000 → "Six lakh".
 * Title-case, no currency suffix.
 */
function amountInWordsIndian(amount: number): string {
  const n = Math.floor(Math.abs(amount) + 1e-9);
  if (n === 0) return "Zero";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function underHundred(value: number): string {
    if (value < 20) return ones[value] ?? "";
    const t = Math.floor(value / 10);
    const o = value % 10;
    return `${tens[t]}${o ? ` ${ones[o]}` : ""}`.trim();
  }

  function underThousand(value: number): string {
    if (value < 100) return underHundred(value);
    const h = Math.floor(value / 100);
    const rest = value % 100;
    return `${ones[h]} Hundred${rest ? ` ${underHundred(rest)}` : ""}`;
  }

  const parts: string[] = [];
  let remaining = n;

  const crore = Math.floor(remaining / 10_000_000);
  if (crore) {
    parts.push(`${underThousand(crore)} Crore`);
    remaining %= 10_000_000;
  }
  const lakh = Math.floor(remaining / 100_000);
  if (lakh) {
    parts.push(`${underHundred(lakh)} Lakh`.replace(/^(\w)/, (c) => c));
    remaining %= 100_000;
  }
  const thousand = Math.floor(remaining / 1000);
  if (thousand) {
    parts.push(`${underHundred(thousand)} Thousand`);
    remaining %= 1000;
  }
  if (remaining) parts.push(underThousand(remaining));

  // Match UPOS NumberFormatter(en_IN): "Six lakh" / "One lakh twenty two thousand…"
  const joined = parts
    .join(" ")
    .replace(/\bLakh\b/g, "lakh")
    .replace(/\bCrore\b/g, "crore")
    .replace(/\bThousand\b/g, "thousand")
    .replace(/\bHundred\b/g, "hundred");
  return joined.charAt(0).toUpperCase() + joined.slice(1).toLowerCase();
}

function buildEarnings(payroll: Payroll): PayslipLine[] {
  const basic = payroll.grossPay.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const lines: PayslipLine[] = [
    {
      label: "Basic salary",
      detail: `( 1.00 Month * ${basic} )`,
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

function departmentLabel(groupName: string | null | undefined): string | null {
  if (!groupName) return null;
  const paren = groupName.match(/\(([^)]+)\)\s*$/);
  if (paren?.[1]?.trim()) return paren[1].trim();
  return groupName;
}

/** Bold label + value on one line — Ultimate POS meta style. */
function MetaLine({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <p style={{ margin: "2px 0", fontSize: 13, lineHeight: 1.4 }}>
      <strong>{label}:</strong>
      {value?.trim() ? ` ${value}` : ""}
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

  const daysPresent = extras?.daysPresent ?? 0;
  const daysAbsent = extras?.daysAbsent ?? 0;
  const totalWorkDuration = extras?.totalWorkDuration ?? 0;

  const noteLines =
    payroll.note
      ?.split(/[·|;]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => {
        if (/^Added deduction\s+/i.test(part)) return false;
        if (/^.+?[:：]\s*₦?\s*[\d,.]+\s*$/.test(part)) return false;
        if (
          /^(Tax Payer ID|Tax ID|TIN|Bank Name|Bank|Branch|Bank Branch|Bank Identifier Code|BIC|Swift|Sort Code|Bank Account No\.?|Account No\.?|Account Number|A\/C|Basic)\s*[:：]/i.test(
            part,
          )
        ) {
          return false;
        }
        return true;
      }) ?? [];
  const noteText = noteLines.join(" · ");

  const addressLines = (tenantAddress?.trim() || "")
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const money = (n: number) => formatHq6Currency(n, currency);
  const rowCount = Math.max(earnings.length, deductions.length, 1);

  return (
    <article
      className={cn(
        "invoice-document mx-auto max-w-[860px] bg-white text-neutral-900",
        className,
      )}
      style={{
        border: "1px solid #333",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#111",
      }}
    >
      {/* Header: logo center, business top-right */}
      <div style={{ position: "relative", padding: "20px 24px 0", minHeight: 100 }}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 16,
            transform: "translateX(-50%)",
            width: 78,
            height: 78,
            borderRadius: "50%",
            overflow: "hidden",
            border: "1px solid #e5e5e5",
            background: "#fff",
          }}
        >
          <Image
            src={publicAssetPath("/brand/vonos-autos-logo.png")}
            alt="Vonos Autos"
            fill
            className="object-contain p-1"
            sizes="78px"
            priority
          />
        </div>
        <div style={{ textAlign: "right", marginLeft: "auto", maxWidth: "42%" }}>
          <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.25 }}>
            {tenantName}
          </div>
          {addressLines.map((line) => (
            <div key={line} style={{ fontSize: 12, lineHeight: 1.45 }}>
              {line}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          textAlign: "center",
          fontSize: 14,
          fontWeight: 600,
          padding: "12px 24px 10px",
          borderBottom: "1px solid #333",
          marginTop: 12,
        }}
      >
        Payslip for the month of {month}
      </div>

      {/* Employee | Bank — table layout (CSS grid is overridden by section{display:block}) */}
      <table
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        style={{ borderBottom: "1px solid #333", borderCollapse: "collapse" }}
      >
        <tbody>
          <tr>
            <td
              width="50%"
              valign="top"
              style={{
                padding: "12px 20px",
                borderRight: "1px solid #333",
                verticalAlign: "top",
              }}
            >
              <MetaLine label="Employee" value={payroll.employeeName} />
              <MetaLine
                label="Department"
                value={departmentLabel(payroll.payrollGroupName)}
              />
              <MetaLine label="Designation" value={payroll.designationName} />
              <MetaLine
                label="Primary work location"
                value={locationLabel ?? payroll.locationCode}
              />
              <MetaLine label="Tax Payer ID" value={taxPayerId} />
            </td>
            <td
              width="50%"
              valign="top"
              style={{ padding: "12px 20px", verticalAlign: "top" }}
            >
              <MetaLine label="Bank Name" value={bankName} />
              <MetaLine label="Branch" value={bankBranch} />
              <MetaLine
                label="Bank Identifier Code"
                value={bankIdentifierCode}
              />
              <MetaLine label="Account Holder's Name" value={accountHolder} />
              <MetaLine label="Bank Account No." value={bankAccountNo} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* Attendance strip */}
      <table
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        style={{ borderBottom: "1px solid #333", borderCollapse: "collapse" }}
      >
        <tbody>
          <tr>
            <td
              width="33.33%"
              style={{
                padding: "10px 16px",
                fontSize: 13,
                borderRight: "1px solid #333",
              }}
            >
              <strong>Total work duration:</strong> {totalWorkDuration}
            </td>
            <td
              width="33.33%"
              style={{
                padding: "10px 16px",
                fontSize: 13,
                borderRight: "1px solid #333",
              }}
            >
              <strong>Days present:</strong> {daysPresent}
            </td>
            <td width="33.33%" style={{ padding: "10px 16px", fontSize: 13 }}>
              <strong>Days absent:</strong> {daysAbsent}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Earnings | Deductions — single 6-column table */}
      <table
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        style={{ borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: "left",
                padding: "8px 12px",
                borderBottom: "1px solid #333",
                borderRight: "1px solid #ddd",
                fontWeight: 600,
              }}
            >
              Earnings
            </th>
            <th
              style={{
                textAlign: "right",
                padding: "8px 8px",
                borderBottom: "1px solid #333",
                borderRight: "1px solid #ddd",
                fontWeight: 600,
                width: "9%",
              }}
            >
              Rate
            </th>
            <th
              style={{
                textAlign: "right",
                padding: "8px 12px",
                borderBottom: "1px solid #333",
                borderRight: "1px solid #333",
                fontWeight: 600,
                width: "16%",
              }}
            >
              Amount
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "8px 12px",
                borderBottom: "1px solid #333",
                borderRight: "1px solid #ddd",
                fontWeight: 600,
              }}
            >
              Deductions
            </th>
            <th
              style={{
                textAlign: "right",
                padding: "8px 8px",
                borderBottom: "1px solid #333",
                borderRight: "1px solid #ddd",
                fontWeight: 600,
                width: "9%",
              }}
            >
              Rate
            </th>
            <th
              style={{
                textAlign: "right",
                padding: "8px 12px",
                borderBottom: "1px solid #333",
                fontWeight: 600,
                width: "16%",
              }}
            >
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }).map((_, i) => {
            const earn = earnings[i];
            const ded =
              i === 0 && deductions.length === 0
                ? ({ label: "None", amount: 0 } as PayslipLine)
                : deductions[i];
            return (
              <tr key={`pay-row-${i}`}>
                <td
                  style={{
                    padding: "8px 12px",
                    borderRight: "1px solid #ddd",
                    verticalAlign: "top",
                  }}
                >
                  {earn?.label ?? ""}
                </td>
                <td
                  style={{
                    padding: "8px 8px",
                    borderRight: "1px solid #ddd",
                    textAlign: "right",
                    verticalAlign: "top",
                  }}
                >
                  {earn?.rate ?? ""}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    borderRight: "1px solid #333",
                    textAlign: "right",
                    verticalAlign: "top",
                    whiteSpace: "nowrap",
                  }}
                >
                  {earn && earn.amount > 0 ? (
                    <>
                      <div>{money(earn.amount)}</div>
                      {earn.detail ? (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#555",
                            marginTop: 2,
                            whiteSpace: "normal",
                          }}
                        >
                          {earn.detail}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    ""
                  )}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    borderRight: "1px solid #ddd",
                    verticalAlign: "top",
                  }}
                >
                  {ded?.label ?? ""}
                </td>
                <td
                  style={{
                    padding: "8px 8px",
                    borderRight: "1px solid #ddd",
                    textAlign: "right",
                    verticalAlign: "top",
                  }}
                >
                  {ded?.rate ?? ""}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    textAlign: "right",
                    verticalAlign: "top",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ded && ded.amount > 0 ? (
                    <>
                      <div>{money(ded.amount)}</div>
                      {ded.detail ? (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#555",
                            marginTop: 2,
                            whiteSpace: "normal",
                          }}
                        >
                          {ded.detail}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    ""
                  )}
                </td>
              </tr>
            );
          })}
          <tr>
            <td
              colSpan={3}
              style={{
                padding: "10px 12px",
                borderTop: "1px solid #333",
                borderRight: "1px solid #333",
                fontWeight: 700,
              }}
            >
              Total earnings: {money(totalEarnings)}
            </td>
            <td
              colSpan={3}
              style={{
                padding: "10px 12px",
                borderTop: "1px solid #333",
                fontWeight: 700,
              }}
            >
              Total deductions: {money(payroll.totalDeduction)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Net pay */}
      <table
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        style={{ borderTop: "1px solid #333", borderCollapse: "collapse" }}
      >
        <tbody>
          <tr>
            <td
              style={{
                padding: "12px 16px",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Net pay
            </td>
            <td
              style={{
                padding: "12px 16px",
                fontSize: 14,
                fontWeight: 700,
                textAlign: "right",
              }}
            >
              {money(payroll.netPay)}
            </td>
          </tr>
        </tbody>
      </table>

      <div
        style={{
          padding: "8px 16px 12px",
          fontSize: 13,
          borderTop: "1px solid #ccc",
          borderBottom: "1px solid #333",
        }}
      >
        <strong>In words:</strong> {amountInWordsIndian(payroll.netPay)}
      </div>

      {/* Payment history */}
      {showPayment ? (
        <table
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{
            borderCollapse: "collapse",
            fontSize: 13,
            borderBottom: "1px solid #333",
          }}
        >
          <thead>
            <tr style={{ background: "#5cb85c", color: "#fff" }}>
              <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600 }}>
                #
              </th>
              <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600 }}>
                Date
              </th>
              <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600 }}>
                Reference No
              </th>
              <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600 }}>
                Amount
              </th>
              <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600 }}>
                Payment mode
              </th>
              <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600 }}>
                Payment note
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: "#f5f5f5" }}>
              <td style={{ padding: "8px 10px" }}>1</td>
              <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                {payslipDate(paymentDate)}
              </td>
              <td style={{ padding: "8px 10px" }}>{paymentRef}</td>
              <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                {money(payroll.netPay)}
              </td>
              <td style={{ padding: "8px 10px" }}>
                {extras?.paymentMode ?? "Bank Transfer"}
              </td>
              <td style={{ padding: "8px 10px" }}>
                {extras?.paymentNote?.trim() ? extras.paymentNote : "--"}
              </td>
            </tr>
          </tbody>
        </table>
      ) : null}

      {/* Note */}
      <div style={{ padding: "14px 20px 48px", fontSize: 13, minHeight: 72 }}>
        <strong>Note:</strong>
        {noteText ? (
          <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{noteText}</div>
        ) : null}
      </div>
    </article>
  );
}

export function payrollPayslipTitle(payroll: Payroll): string {
  return `Payroll of ${payroll.employeeName} for ${monthLabel(payroll.payrollMonth)}`;
}
