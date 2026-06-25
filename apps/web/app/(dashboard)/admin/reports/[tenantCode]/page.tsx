"use client";

import { useParams } from "next/navigation";
import { AdminEntityReportsHub } from "@/components/pages/AdminEntityReportsHub";
import { isTenantCode } from "@/lib/registries/tenants";

export default function AdminEntityReportsPage() {
  const params = useParams<{ tenantCode: string }>();
  const code = params.tenantCode?.toUpperCase() ?? "";

  if (!isTenantCode(code)) {
    return (
      <p className="text-sm text-muted">
        Entity &quot;{params.tenantCode}&quot; not found.
      </p>
    );
  }

  return <AdminEntityReportsHub tenantCode={code} />;
}
