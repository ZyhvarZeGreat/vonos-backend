"use client";

import { useParams } from "next/navigation";
import { AdminEntityFinanceSheet } from "@/components/pages/AdminEntityFinanceSheet";
import { isTenantCode } from "@/lib/registries/tenants";

export default function AdminEntityFinancePage() {
  const params = useParams<{ tenantCode: string }>();
  const code = params.tenantCode?.toUpperCase() ?? "";

  if (!isTenantCode(code)) {
    return (
      <p className="text-sm text-muted">
        Entity &quot;{params.tenantCode}&quot; not found.
      </p>
    );
  }

  return <AdminEntityFinanceSheet tenantCode={code} />;
}
