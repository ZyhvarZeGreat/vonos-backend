"use client";

import { useParams } from "next/navigation";
import { AdminEntityReportSheet } from "@/components/pages/AdminEntityReportSheet";
import { isTenantCode } from "@/lib/registries/tenants";

export default function AdminEntityReportDetailPage() {
  const params = useParams<{ tenantCode: string; reportSlug: string }>();
  const code = params.tenantCode?.toUpperCase() ?? "";

  if (!isTenantCode(code)) {
    return (
      <p className="text-sm text-muted">
        Entity &quot;{params.tenantCode}&quot; not found.
      </p>
    );
  }

  return (
    <AdminEntityReportSheet
      tenantCode={code}
      reportSlug={params.reportSlug ?? ""}
    />
  );
}
