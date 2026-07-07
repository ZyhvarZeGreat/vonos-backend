export type PayrollStatus = "draft" | "final" | "paid";
export type PayComponentType = "allowance" | "deduction";

export interface Payroll {
  id: string;
  tenantId: string;
  payrollGroupId: string | null;
  payrollGroupName: string | null;
  employeeName: string;
  employeeId: string | null;
  locationCode: string | null;
  grossPay: number;
  totalAllowance: number;
  totalDeduction: number;
  netPay: number;
  status: PayrollStatus;
  paymentStatus: string;
  payrollMonth: string;
  note: string | null;
  createdAt: string;
}

export interface PayrollGroup {
  id: string;
  tenantId: string;
  name: string;
  payrollCount: number;
  createdAt: string;
}

export interface PayComponent {
  id: string;
  tenantId: string;
  name: string;
  type: PayComponentType;
  amount: number;
  createdAt: string;
}

export interface CreatePayrollRequest {
  employeeName: string;
  employeeId?: string;
  payrollGroupId?: string;
  locationCode?: string;
  grossPay: number;
  totalAllowance?: number;
  totalDeduction?: number;
  payrollMonth: string;
  note?: string;
}

export interface CreatePayrollGroupRequest {
  name: string;
}

export interface CreatePayComponentRequest {
  name: string;
  type: PayComponentType;
  amount: number;
}

/** Distinct employee roster derived from imported payroll history. */
export interface WorkforceMember {
  id: string;
  tenantId: string;
  tenantCode?: string | null;
  tenantName?: string | null;
  employeeName: string;
  employeeId: string | null;
  locationCode: string | null;
  payrollCount: number;
  lastPayrollMonth: string;
  totalNetPay: number;
}
