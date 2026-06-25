"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { getMigrationSource } from "@/lib/registries/migrationSources";
import { getTenantByCode, isTenantCode } from "@/lib/registries/tenants";

export function AdminViewingBanner({
  tenantCode,
  tenantName,
}: {
  tenantCode: string;
  tenantName: string;
}) {
  const registry = getTenantByCode(tenantCode);
  const source = isTenantCode(tenantCode) ? getMigrationSource(tenantCode) : null;

  return (
    <div className="flex shrink-0 flex-col gap-1 border-b border-[#0f172a] bg-[#1E293B] px-6 py-2.5 text-sm text-white">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-medium">
          <Shield className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          <span>
            Viewing: {tenantName}
            {registry ? ` (${registry.code})` : ""} — Group Admin
          </span>
        </div>
        <Link
          href="/admin/overview"
          className="shrink-0 font-medium text-white/90 underline-offset-2 hover:text-white hover:underline"
        >
          ← Back to Group Overview
        </Link>
      </div>
      {source ? (
        <p className="pl-6 text-xs text-white/75">
          Data scoped to <code className="text-white/90">{source.tenantId}</code>
          {source.legacyDatabase !== "—"
            ? ` · legacy import: ${source.legacyDatabase}`
            : " · new build (no legacy import)"}
        </p>
      ) : null}
    </div>
  );
}
