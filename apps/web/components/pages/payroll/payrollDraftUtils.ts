import type { PayComponent, Payroll } from "@vonos/types";

export type AmountType = "fixed" | "percent";

export type PayLine = {
  id: string;
  name: string;
  amountType: AmountType;
  amount: string;
};

export type EmployeePayrollDraft = {
  workDuration: string;
  durationUnit: string;
  amountPerUnit: string;
  allowances: PayLine[];
  deductions: PayLine[];
  note: string;
};

export const DURATION_UNIT_OPTIONS = [
  { value: "Month", label: "Month" },
  { value: "Day", label: "Day" },
  { value: "Hour", label: "Hour" },
] as const;

export function newPayLine(): PayLine {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    amountType: "fixed",
    amount: "0",
  };
}

export function emptyEmployeeDraft(): EmployeePayrollDraft {
  return {
    workDuration: "1",
    durationUnit: "Month",
    amountPerUnit: "0",
    allowances: [newPayLine()],
    deductions: [newPayLine()],
    note: "",
  };
}

/** Pay components that apply to this employee (global or employee-specific). */
export function payComponentsForEmployee(
  components: PayComponent[],
  employeeRecordId: string,
): PayComponent[] {
  return components.filter(
    (c) =>
      !c.employeeRecordId || c.employeeRecordId === employeeRecordId,
  );
}

/** Prefill allowance / deduction rows from the Pay Components catalog. */
export function employeeDraftFromPayComponents(
  components: PayComponent[],
): EmployeePayrollDraft {
  const allowances = components
    .filter((c) => c.type === "allowance" && Number(c.amount) > 0)
    .map((c) => ({
      id: `line-${c.id}`,
      name: c.name,
      amountType: "fixed" as const,
      amount: String(c.amount),
    }));
  const deductions = components
    .filter((c) => c.type === "deduction" && Number(c.amount) > 0)
    .map((c) => ({
      id: `line-${c.id}`,
      name: c.name,
      amountType: "fixed" as const,
      amount: String(c.amount),
    }));
  return {
    workDuration: "1",
    durationUnit: "Month",
    amountPerUnit: "0",
    allowances: allowances.length > 0 ? allowances : [newPayLine()],
    deductions: deductions.length > 0 ? deductions : [newPayLine()],
    note: "",
  };
}

function clonePayLinesForEmployee(
  lines: PayLine[],
  employeeId: string,
  prefix: "a" | "d",
): PayLine[] {
  return lines.map((line) => ({
    ...line,
    id: `line-${employeeId}-${prefix}-${line.id}`,
  }));
}

/** Skip E2E test rows and catalog noise when prefilling create payroll. */
function isSkippedCreatePrefillLine(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (/e2e/i.test(trimmed)) return true;
  return false;
}

function namedPayLines(lines: PayLine[]): PayLine[] {
  return lines.filter(
    (line) => line.name.trim() && !isSkippedCreatePrefillLine(line.name),
  );
}

/**
 * Create flow: basic salary from latest payroll only.
 * Earnings/deductions start blank unless the prior payroll note had explicit named lines
 * (never auto-import Allowance & Deduction catalog entries like PAYE).
 */
export function buildEmployeeCreateDraft(
  employeeRecordId: string,
  latestPayroll: Payroll | null | undefined,
): EmployeePayrollDraft {
  const blankLines = (prefix: "a" | "d") =>
    clonePayLinesForEmployee([newPayLine()], employeeRecordId, prefix);

  if (!latestPayroll || latestPayroll.grossPay <= 0) {
    return {
      workDuration: "1",
      durationUnit: "Month",
      amountPerUnit: "0",
      allowances: blankLines("a"),
      deductions: blankLines("d"),
      note: "",
    };
  }

  const parsed = parsePayrollNote(
    latestPayroll.note,
    latestPayroll.id,
    latestPayroll.grossPay,
  );
  const allowances = namedPayLines(parsed.allowances);
  const deductions = namedPayLines(parsed.deductions);

  return {
    workDuration: parsed.workDuration,
    durationUnit: parsed.durationUnit,
    amountPerUnit: parsed.amountPerUnit,
    allowances: clonePayLinesForEmployee(
      allowances.length > 0 ? allowances : [newPayLine()],
      employeeRecordId,
      "a",
    ),
    deductions: clonePayLinesForEmployee(
      deductions.length > 0 ? deductions : [newPayLine()],
      employeeRecordId,
      "d",
    ),
    note: parsed.userNote,
  };
}

type ParsedPayrollNote = {
  workDuration: string;
  durationUnit: string;
  amountPerUnit: string;
  allowances: PayLine[];
  deductions: PayLine[];
  userNote: string;
};

function parsePayLineSegment(
  segment: string,
  sign: "+" | "-",
  payrollId: string,
  index: number,
): PayLine | null {
  const trimmed = segment.trim();
  const match = trimmed.match(
    new RegExp(
      `^\\${sign}\\s+(.+?):\\s*([\\d.]+)(?:\\s*\\(([\\d.]+)% of basic\\))?$`,
    ),
  );
  if (!match) return null;
  const [, name, amount, percent] = match;
  const prefix = sign === "+" ? "allow" : "ded";
  return {
    id: `${prefix}-${payrollId}-${index}`,
    name: name!.trim(),
    amountType: percent ? "percent" : "fixed",
    amount: percent ?? amount!,
  };
}

/** Restore basic, earnings, deductions, and free-text note from stored payroll note. */
export function parsePayrollNote(
  note: string | null | undefined,
  payrollId: string,
  fallbackGrossPay: number,
): ParsedPayrollNote {
  const fallback: ParsedPayrollNote = {
    workDuration: "1",
    durationUnit: "Month",
    amountPerUnit: String(fallbackGrossPay || 0),
    allowances: [newPayLine()],
    deductions: [newPayLine()],
    userNote: "",
  };
  if (!note?.trim()) return fallback;

  let workDuration = fallback.workDuration;
  let durationUnit = fallback.durationUnit;
  let amountPerUnit = fallback.amountPerUnit;
  const allowances: PayLine[] = [];
  const deductions: PayLine[] = [];
  const userNoteParts: string[] = [];

  for (const part of note.split(" · ").map((segment) => segment.trim())) {
    if (!part) continue;

    const basicMatch = part.match(
      /^Basic:\s*([\d.]+)\s+(\S+)\s+×\s*([\d.]+)$/,
    );
    if (basicMatch) {
      workDuration = basicMatch[1]!;
      durationUnit = basicMatch[2]!;
      amountPerUnit = basicMatch[3]!;
      continue;
    }

    let matchedLine = false;
    for (const segment of part.split(";").map((row) => row.trim())) {
      if (!segment) continue;
      const allowance = parsePayLineSegment(segment, "+", payrollId, allowances.length);
      if (allowance) {
        allowances.push(allowance);
        matchedLine = true;
        continue;
      }
      const deduction = parsePayLineSegment(segment, "-", payrollId, deductions.length);
      if (deduction) {
        deductions.push(deduction);
        matchedLine = true;
      }
    }
    if (!matchedLine) userNoteParts.push(part);
  }

  return {
    workDuration,
    durationUnit,
    amountPerUnit,
    allowances: allowances.length > 0 ? allowances : [newPayLine()],
    deductions: deductions.length > 0 ? deductions : [newPayLine()],
    userNote: userNoteParts.join(" · "),
  };
}

/** Approximate draft from an existing payroll row (edit flow). */
export function employeeDraftFromPayroll(row: Payroll): EmployeePayrollDraft {
  const parsed = parsePayrollNote(row.note, row.id, row.grossPay || 0);

  if (
    parsed.allowances.length === 1 &&
    !parsed.allowances[0]!.name.trim() &&
    row.totalAllowance > 0
  ) {
    parsed.allowances = [
      {
        id: `allow-${row.id}`,
        name: "Allowances",
        amountType: "fixed",
        amount: String(row.totalAllowance),
      },
    ];
  }

  if (
    parsed.deductions.length === 1 &&
    !parsed.deductions[0]!.name.trim() &&
    row.totalDeduction > 0
  ) {
    parsed.deductions = [
      {
        id: `ded-${row.id}`,
        name: "Deductions",
        amountType: "fixed",
        amount: String(row.totalDeduction),
      },
    ];
  }

  return {
    workDuration: parsed.workDuration,
    durationUnit: parsed.durationUnit,
    amountPerUnit: parsed.amountPerUnit,
    allowances: parsed.allowances,
    deductions: parsed.deductions,
    note: parsed.userNote,
  };
}

export function parseMoneyInput(raw: string): number {
  const cleaned = raw.replace(/,/g, "").replace(/\s/g, "").trim();
  if (!cleaned) return Number.NaN;
  return Number.parseFloat(cleaned);
}

export function lineAmountValue(line: PayLine, base: number): number {
  const n = parseMoneyInput(line.amount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (line.amountType === "percent") return (base * n) / 100;
  return n;
}

export function sumPayLines(lines: PayLine[], base: number): number {
  return lines.reduce((sum, line) => sum + lineAmountValue(line, base), 0);
}

export function basicSalaryTotal(draft: EmployeePayrollDraft): number {
  const duration = parseMoneyInput(draft.workDuration);
  const rate = parseMoneyInput(draft.amountPerUnit);
  if (!Number.isFinite(duration) || !Number.isFinite(rate)) return 0;
  return duration * rate;
}

export function formatPayLinesNote(
  allowances: PayLine[],
  deductions: PayLine[],
  base: number,
): string | undefined {
  const parts: string[] = [];
  for (const line of allowances) {
    const amt = lineAmountValue(line, base);
    if (!line.name.trim() || amt <= 0) continue;
    const suffix =
      line.amountType === "percent" ? ` (${line.amount}% of basic)` : "";
    parts.push(`+ ${line.name.trim()}: ${amt}${suffix}`);
  }
  for (const line of deductions) {
    const amt = lineAmountValue(line, base);
    if (!line.name.trim() || amt <= 0) continue;
    const suffix =
      line.amountType === "percent" ? ` (${line.amount}% of basic)` : "";
    parts.push(`- ${line.name.trim()}: ${amt}${suffix}`);
  }
  return parts.length > 0 ? parts.join("; ") : undefined;
}

export function updatePayLine(
  lines: PayLine[],
  id: string,
  patch: Partial<PayLine>,
): PayLine[] {
  return lines.map((row) => (row.id === id ? { ...row, ...patch } : row));
}

export function payrollBankDetailLines(
  row: Payroll,
): Array<{ label: string; value: string }> {
  return [
    { label: "Bank Name", value: row.bankName?.trim() || "" },
    {
      label: "Account Holder's Name",
      value: row.accountHolderName?.trim() || "",
    },
    { label: "Branch Name", value: row.bankBranch?.trim() || "" },
    {
      label: "Bank Identifier Code",
      value: row.bankCode?.trim() || "",
    },
    { label: "Bank Account No.", value: row.bankAccountNo?.trim() || "" },
    { label: "Tax Payer ID", value: row.taxPayerId?.trim() || "" },
  ];
}

export function buildPayrollNoteFromDraft(draft: EmployeePayrollDraft): string | undefined {
  const basic = basicSalaryTotal(draft);
  const lineNote = formatPayLinesNote(
    draft.allowances,
    draft.deductions,
    basic,
  );
  const noteParts = [
    `Basic: ${draft.workDuration} ${draft.durationUnit} × ${draft.amountPerUnit}`,
    lineNote,
    draft.note.trim() || undefined,
  ].filter(Boolean);
  return noteParts.length > 0 ? noteParts.join(" · ") : undefined;
}

export function payrollAmountsFromDraft(draft: EmployeePayrollDraft): {
  grossPay: number;
  totalAllowance: number;
  totalDeduction: number;
} {
  const grossPay = basicSalaryTotal(draft);
  return {
    grossPay,
    totalAllowance: sumPayLines(draft.allowances, grossPay),
    totalDeduction: sumPayLines(draft.deductions, grossPay),
  };
}
