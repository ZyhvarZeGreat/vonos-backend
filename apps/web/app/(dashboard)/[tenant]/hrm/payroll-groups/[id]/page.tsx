"use client";

import { useParams } from "next/navigation";
import { PayrollGroupViewPage } from "@/components/pages/payroll/PayrollGroupViewPage";
import { tenantListPath } from "@/lib/utils/tenantRoutes";

export default function TenantPayrollGroupViewPage() {
  const params = useParams<{ tenant: string; id: string }>();
  const listHref = tenantListPath(params.tenant, "hrm/my-payrolls");
  const groupBase = tenantListPath(
    params.tenant,
    `hrm/payroll-groups/${params.id}`,
  );
  return (
    <PayrollGroupViewPage
      groupId={params.id}
      backHref={listHref}
      editHref={`${groupBase}/edit`}
      payHref={`${groupBase}/pay`}
    />
  );
}
