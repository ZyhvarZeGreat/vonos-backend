"use client";

import { useParams } from "next/navigation";
import { PayrollGroupCreatePage } from "@/components/pages/payroll/PayrollGroupCreatePage";
import { tenantListPath } from "@/lib/utils/tenantRoutes";

export default function TenantPayrollCreatePage() {
  const params = useParams<{ tenant: string }>();
  const listHref = tenantListPath(params.tenant, "hrm/my-payrolls");
  return (
    <PayrollGroupCreatePage backHref={listHref} payrollListHref={listHref} />
  );
}
