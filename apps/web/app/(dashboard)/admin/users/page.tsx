"use client";

import { HrmPageView } from "@/components/pages/HrmPageView";
import {
  ADMIN_DEFAULT_ENTITY,
  useAdminEntityStore,
} from "@/stores/adminEntityStore";
import { getTenantByCode } from "@/lib/registries/tenants";

/**
 * Admin HR uses the same HRM module as Vonos Automotive.
 * Scoped to the admin viewing entity (defaults to VA).
 */
export default function AdminUsersPage() {
  const viewingCode = useAdminEntityStore((s) => s.viewingCode);
  const code = viewingCode ?? ADMIN_DEFAULT_ENTITY;
  const tenant = getTenantByCode(code);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted">
        HRM for{" "}
        <span className="font-medium text-foreground">
          {tenant?.name ?? code}
        </span>
        . Change entity with the viewing switcher above — same experience as
        Vonos Automotive HRM.
      </div>
      <HrmPageView defaultTab="dashboard" />
    </div>
  );
}
