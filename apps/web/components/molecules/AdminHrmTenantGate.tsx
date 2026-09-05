"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { AdminEntitySwitcher } from "@/components/molecules/AdminEntitySwitcher";

/**
 * VAG Users: no entity gate — add/edit assigns entities on the form itself.
 * VAG Roles: no entity gate — definitions are shared group-wide via the VAG
 * catalog tenant (`useRolesCatalogTenantId` → `tenant_vag_001`).
 */
export function AdminHrmTenantGate({ children }: { children: ReactNode }) {
  const tenantId = useTenantId();
  const pathname = usePathname() ?? "";
  const isUsersHrm = pathname.startsWith("/admin/hrm/users");
  const isRolesHrm = pathname.startsWith("/admin/hrm/roles");
  const isPayrollHrm = pathname.startsWith("/admin/hrm/payroll");

  if (isUsersHrm || isRolesHrm || isPayrollHrm) {
    return <>{children}</>;
  }

  if (!tenantId) {
    return (
      <div className="hq6-card space-y-4 px-4 py-6">
        <h2 className="tw-m-0 tw-text-lg tw-font-semibold tw-text-[#111827]">
          Select a business
        </h2>
        <p className="tw-mb-0 tw-text-sm tw-text-[#6b7280]">
          Pick which business to manage in HRM.
        </p>
        <div className="tw-max-w-md">
          <label className="tw-mb-1 tw-block tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-[#6b7280]">
            Show info for
          </label>
          <AdminEntitySwitcher variant="bar" className="tw-w-full" />
        </div>
        <p className="tw-mb-0 tw-text-xs tw-text-[#9ca3af]">
          Or open{" "}
          <Link href="/admin/hrm" className="tw-text-[#3c8dbc] tw-underline">
            HRM summary
          </Link>
          .
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
