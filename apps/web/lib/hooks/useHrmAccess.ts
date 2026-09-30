"use client";

import { useMemo } from "react";
import { resolveHrmAccess, type HrmAccessLevel } from "@vonos/types";
import { useAuthStore } from "@/stores/authStore";

export interface HrmAccessApi {
  /** `full` = whole HRM module, `own-payroll` = own payslips only. */
  access: HrmAccessLevel;
  /** Whole HRM module (dashboard, leave, attendance, payroll admin, …). */
  canManageHrm: boolean;
  /** May open HRM at all — everyone can, but only their own payslips. */
  canOpenHrm: boolean;
  /** Own-payslip-only view: single My Payrolls tab, read-only. */
  isOwnPayrollOnly: boolean;
}

/**
 * HRM visibility for the signed-in user — same rules as the API
 * `HrmAccessGuard` (Admin / HR / Accountant / granted `essentials.*` = full,
 * everyone else = own payslips only).
 */
export function useHrmAccess(): HrmAccessApi {
  const role = useAuthStore((s) => s.role);
  const tenantRoleName = useAuthStore((s) => s.tenantRoleName);
  const tenantRolePermissions = useAuthStore((s) => s.tenantRolePermissions);

  return useMemo(() => {
    const access = resolveHrmAccess({
      role,
      tenantRoleName,
      tenantRolePermissions,
    });
    const canManageHrm = access === "full";
    return {
      access,
      canManageHrm,
      canOpenHrm: true,
      isOwnPayrollOnly: !canManageHrm,
    };
  }, [role, tenantRoleName, tenantRolePermissions]);
}
