import type { PayrollEmployeePick } from "@/components/molecules/EmployeePayrollSearch";

export const PAYROLL_CREATE_SESSION_KEY = "vonos:payroll-create-session";

export type PayrollCreateSession = {
  tenantId: string;
  locationCode: string;
  /** YYYY-MM */
  month: string;
  employees: PayrollEmployeePick[];
};

export function savePayrollCreateSession(data: PayrollCreateSession): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(PAYROLL_CREATE_SESSION_KEY, JSON.stringify(data));
}

export function loadPayrollCreateSession(): PayrollCreateSession | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(PAYROLL_CREATE_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PayrollCreateSession;
    if (
      !parsed?.tenantId ||
      !parsed?.month ||
      !Array.isArray(parsed.employees) ||
      parsed.employees.length === 0
    ) {
      return null;
    }
    return {
      tenantId: parsed.tenantId,
      locationCode: parsed.locationCode ?? "",
      month: parsed.month,
      employees: parsed.employees,
    };
  } catch {
    return null;
  }
}

export function clearPayrollCreateSession(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(PAYROLL_CREATE_SESSION_KEY);
}
