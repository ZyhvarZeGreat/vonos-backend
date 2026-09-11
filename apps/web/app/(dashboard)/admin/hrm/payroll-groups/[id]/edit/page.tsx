"use client";

import { useParams, useSearchParams } from "next/navigation";
import { PayrollGroupEditPage } from "@/components/pages/payroll/PayrollGroupEditPage";
import { useTenantId } from "@/lib/hooks/useRouteTenant";

export default function AdminPayrollGroupEditPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const routeTenantId = useTenantId();
  const tenantId = searchParams.get("tenantId") ?? routeTenantId;
  const tenantQuery = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
  const viewHref = `/admin/hrm/payroll-groups/${params.id}${tenantQuery}`;

  return (
    <PayrollGroupEditPage
      groupId={params.id}
      tenantId={tenantId}
      backHref={viewHref}
      viewHref={viewHref}
    />
  );
}
