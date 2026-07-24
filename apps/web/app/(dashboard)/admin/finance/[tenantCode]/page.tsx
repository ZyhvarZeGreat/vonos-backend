"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { isTenantCode } from "@/lib/registries/tenants";
import { vagViewUnitIdForTenantCode } from "@/lib/registries/vagViewUnits";
import { useAdminEntityStore } from "@/stores/adminEntityStore";

/**
 * Legacy /admin/finance/VA → set viewing unit and stay on /admin/finance
 * so Switch entity works without bouncing through Group.
 */
export default function AdminEntityFinanceRedirectPage() {
  const params = useParams<{ tenantCode: string }>();
  const router = useRouter();
  const setViewingCode = useAdminEntityStore((s) => s.setViewingCode);
  const code = params.tenantCode?.toUpperCase() ?? "";

  useEffect(() => {
    if (!isTenantCode(code)) {
      router.replace("/admin/finance");
      return;
    }
    const unitId = vagViewUnitIdForTenantCode(code);
    if (unitId) setViewingCode(unitId);
    router.replace("/admin/finance");
  }, [code, router, setViewingCode]);

  return (
    <p className="text-sm text-muted">Opening finance…</p>
  );
}
