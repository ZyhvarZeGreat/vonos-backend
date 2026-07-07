"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { accentForTenantCode } from "@/lib/registries/tenantAccents";
import type { TenantCode } from "@/lib/registries/tenants";
import { cn } from "@/lib/utils/cn";

export interface EntityOverviewCardProps {
  code: TenantCode;
  name: string;
  stats: [string, string, string];
  href: string;
  className?: string;
}

export function EntityOverviewCard({
  code,
  name,
  stats,
  href,
  className,
}: EntityOverviewCardProps) {
  const accent = accentForTenantCode(code);

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div
        className="absolute left-0 top-0 h-full w-1.5"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <div className="flex flex-1 flex-col p-5 pl-6">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <span
              className="inline-block rounded-md px-2 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              {code}
            </span>
            <h4 className="mt-2 font-semibold text-foreground">{name}</h4>
          </div>
        </div>
        <ul className="mb-4 space-y-1 text-sm text-muted">
          {stats.map((stat) => (
            <li key={stat}>{stat}</li>
          ))}
        </ul>
        <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-foreground group-hover:text-[var(--color-brand-accent)]">
          Enter
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
