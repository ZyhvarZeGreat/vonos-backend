"use client";

import { useParams } from "next/navigation";
import { PayrollGroupEditPage } from "@/components/pages/payroll/PayrollGroupEditPage";
import { tenantListPath } from "@/lib/utils/tenantRoutes";

export default function TenantPayrollGroupEditPage() {
  const params = useParams<{ tenant: string; id: string }>();
  const viewHref = tenantListPath(
    params.tenant,
    `hrm/payroll-groups/${params.id}`,
  );
  return (
    <PayrollGroupEditPage
      groupId={params.id}
      backHref={viewHref}
      viewHref={viewHref}
    />
  );
}
