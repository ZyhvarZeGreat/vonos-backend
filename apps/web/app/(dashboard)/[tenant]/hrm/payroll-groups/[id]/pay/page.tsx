"use client";

import { useParams } from "next/navigation";
import { PayrollGroupPayPage } from "@/components/pages/payroll/PayrollGroupPayPage";
import { tenantListPath } from "@/lib/utils/tenantRoutes";

export default function TenantPayrollGroupPayPage() {
  const params = useParams<{ tenant: string; id: string }>();
  const viewHref = tenantListPath(
    params.tenant,
    `hrm/payroll-groups/${params.id}`,
  );
  return (
    <PayrollGroupPayPage
      groupId={params.id}
      backHref={viewHref}
      viewHref={viewHref}
    />
  );
}
