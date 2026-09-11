"use client";

import { PayrollGroupCreatePage } from "@/components/pages/payroll/PayrollGroupCreatePage";

export default function AdminPayrollCreatePage() {
  return (
    <PayrollGroupCreatePage
      allTenants
      backHref="/admin/hrm/payroll"
      payrollListHref="/admin/hrm/payroll"
    />
  );
}
