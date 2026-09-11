"use client";

import { useParams, useSearchParams } from "next/navigation";
import { PayrollGroupViewPage } from "@/components/pages/payroll/PayrollGroupViewPage";
import { useTenantId } from "@/lib/hooks/useRouteTenant";

export default function AdminPayrollGroupViewPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const routeTenantId = useTenantId();
  const tenantId = searchParams.get("tenantId") ?? routeTenantId;
  const tenantQuery = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
  const groupBase = `/admin/hrm/payroll-groups/${params.id}${tenantQuery}`;

  return (
    <PayrollGroupViewPage
      groupId={params.id}
      tenantId={tenantId}
      backHref="/admin/hrm/payroll"
      editHref={`${groupBase}/edit`}
      payHref={`${groupBase}/pay`}
    />
  );
}
