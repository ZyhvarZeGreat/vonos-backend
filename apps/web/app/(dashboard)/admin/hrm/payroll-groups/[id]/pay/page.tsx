"use client";

import { useParams, useSearchParams } from "next/navigation";
import { PayrollGroupPayPage } from "@/components/pages/payroll/PayrollGroupPayPage";
import { useTenantId } from "@/lib/hooks/useRouteTenant";

export default function AdminPayrollGroupPayPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const routeTenantId = useTenantId();
  const tenantId = searchParams.get("tenantId") ?? routeTenantId;
  const tenantQuery = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
  const viewHref = `/admin/hrm/payroll-groups/${params.id}${tenantQuery}`;

  return (
    <PayrollGroupPayPage
      groupId={params.id}
      tenantId={tenantId}
      backHref={viewHref}
      viewHref={viewHref}
    />
  );
}
