"use client";

import { AdminEntityReportsHub } from "@/components/pages/AdminEntityReportsHub";
import { ReportsView } from "@/components/pages/ReportsView";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import type { TenantCode } from "@/lib/registries/tenants";

/**
 * Tenant `/reports` hub.
 * HQ6 (VA etc.): same dashboard + all-reports grid as VAG entity reports.
 * Legacy: archetype tabbed ReportsView.
 */
export function EntityReportsView({ tenantCode }: { tenantCode: TenantCode }) {
  const isHq6 = useIsVaHq6();
  if (isHq6) {
    return (
      <AdminEntityReportsHub
        tenantCode={tenantCode}
        linkMode="tenant"
        showBackToGroup={false}
        title="Reports"
        subtitle="Dashboard and printable report sheets"
      />
    );
  }
  return <ReportsView tenantCode={tenantCode} />;
}
