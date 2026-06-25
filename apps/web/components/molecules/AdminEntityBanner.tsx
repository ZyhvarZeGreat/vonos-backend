"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { TenantCode } from "@/lib/registries/tenants";

export interface AdminEntityBannerProps {
  tenantCode: TenantCode;
  tenantName: string;
  backHref: string;
  backLabel: string;
}

export function AdminEntityBanner({
  tenantCode,
  tenantName,
  backHref,
  backLabel,
}: AdminEntityBannerProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm dark:border-sky-900/50 dark:bg-sky-950/30">
      <div>
        <p className="font-medium text-sky-950 dark:text-sky-100">
          Viewing: {tenantName} ({tenantCode}) · as Admin
        </p>
        <p className="mt-0.5 text-sky-900/80 dark:text-sky-100/80">
          Scoped to this entity only. Record links open in the entity workspace.
        </p>
      </div>
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-sm font-medium text-sky-900 transition-colors hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100 dark:hover:bg-sky-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>
    </div>
  );
}
