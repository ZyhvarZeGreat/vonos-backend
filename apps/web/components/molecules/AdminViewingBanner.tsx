"use client";

import Link from "next/link";
import { Shield } from "lucide-react";

export function AdminViewingBanner({
  tenantCode,
  tenantName,
}: {
  tenantCode: string;
  tenantName: string;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#0f172a] bg-[#1E293B] px-6 py-2.5 text-sm text-white">
      <div className="flex items-center gap-2 font-medium">
        <Shield className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        <span>
          Viewing: {tenantName}
          {tenantCode ? ` (${tenantCode})` : ""} — Group Admin
        </span>
      </div>
      <Link
        href="/admin/overview"
        className="shrink-0 font-medium text-white/90 underline-offset-2 hover:text-white hover:underline"
      >
        ← Back to Group Overview
      </Link>
    </div>
  );
}
