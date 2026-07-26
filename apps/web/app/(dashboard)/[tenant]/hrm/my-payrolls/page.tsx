"use client";

import { HrmPageView } from "@/components/pages/HrmPageView";

/** HQ6 `/hrm/my-payrolls` → payroll tab (walkthrough 69). */
export default function HrmMyPayrollsPage() {
  return <HrmPageView defaultTab="payroll" />;
}
