"use client";

import { ReportsView } from "@/components/pages/ReportsView";
import type { TenantCode } from "@/lib/registries/tenants";

export function EntityReportsView({ tenantCode }: { tenantCode: TenantCode }) {
  return <ReportsView tenantCode={tenantCode} />;
}
