"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Spinner } from "@/components/atoms/Spinner";
import { accentForTenantCode } from "@/lib/registries/tenantAccents";
import { iconForTenantCode } from "@/lib/registries/tenantIcons";
import { cn } from "@/lib/utils/cn";

export interface EntityOverviewCardProps {
  code: string;
  name: string;
  stats: [string, string, string];
  href: string;
  className?: string;
  description?: string;
  /** When true, show 0 + spinner instead of empty/placeholder stats. */
  isLoading?: boolean;
}

export function EntityOverviewCard({
  code,
  name,
  stats,
  href,
  className,
  description,
  isLoading = false,
}: EntityOverviewCardProps) {
  const accent = accentForTenantCode(code);
  const Icon = iconForTenantCode(code);
  const displayStats = isLoading
    ? (["0", "0", "0"] as [string, string, string])
    : stats;

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
      aria-busy={isLoading || undefined}
    >
      <div
        className="absolute left-0 top-0 h-full w-1.5"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <div className="flex flex-1 flex-col p-5 pl-6">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white"
                style={{ backgroundColor: accent }}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span
                className="inline-block rounded-md px-2 py-0.5 text-xs font-semibold text-white"
                style={{ backgroundColor: accent }}
              >
                {code}
              </span>
              {isLoading ? (
                <Spinner size="sm" className="text-muted" />
              ) : null}
            </div>
            <h4 className="mt-2 font-semibold text-foreground">{name}</h4>
            {description ? (
              <p className="mt-0.5 text-xs text-muted">{description}</p>
            ) : null}
          </div>
        </div>
        <ul className="mb-4 space-y-1 text-sm text-muted">
          {displayStats.map((stat, index) => (
            <li key={`${stat}-${index}`}>{stat}</li>
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
