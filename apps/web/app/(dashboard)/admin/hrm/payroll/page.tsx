"use client";

import { PayrollView } from "@/lib/registries/lazyEntityViews";

/** VAG HRM → Payroll across all businesses (pay per-entity accounts). */
export default function AdminHrmPayrollPage() {
  return <PayrollView allTenants />;
}
