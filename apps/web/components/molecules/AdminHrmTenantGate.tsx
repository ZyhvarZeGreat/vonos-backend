"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { AdminEntitySwitcher } from "@/components/molecules/AdminEntitySwitcher";

/**
 * VAG HRM pages need a concrete business selected in “Show info for”
 * so the same VA user/role forms and APIs have a tenantId.
 */
export function AdminHrmTenantGate({ children }: { children: ReactNode }) {
  const tenantId = useTenantId();

  if (!tenantId) {
    return (
      <div className="hq6-card space-y-4 px-4 py-6">
        <h2 className="tw-m-0 tw-text-lg tw-font-semibold tw-text-[#111827]">
          Select a business
        </h2>
        <p className="tw-mb-0 tw-text-sm tw-text-[#6b7280]">
          Manage users, add users, and add roles use the same forms as each
          app. Pick which business to work on first.
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
