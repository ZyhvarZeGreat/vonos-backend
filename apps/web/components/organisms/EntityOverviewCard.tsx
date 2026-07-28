"use client";

import Link from "next/link";
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

/** Ultimate POS–style entity tile (white card + ring, circular accent icon). */
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
        "tw-block tw-rounded-xl tw-bg-white tw-shadow-sm tw-ring-1 tw-ring-gray-200 tw-no-underline tw-transition-all tw-duration-200 hover:tw-shadow-md hover:tw--translate-y-0.5",
        className,
      )}
      aria-busy={isLoading || undefined}
    >
      <div className="tw-p-4 sm:tw-p-5">
        <div className="tw-flex tw-items-center tw-gap-3">
          <span
            className="tw-inline-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-text-white"
            style={{ backgroundColor: accent }}
          >
            <Icon className="tw-h-5 tw-w-5" />
          </span>
          <div className="tw-min-w-0 tw-flex-1">
            <p className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-gray-500">
              {code}
            </p>
            <h4 className="tw-truncate tw-text-base tw-font-bold tw-text-gray-900">
              {name.replace(/^Vonos\s+/i, "")}
            </h4>
            {description ? (
              <p className="tw-mt-0.5 tw-truncate tw-text-xs tw-text-gray-500">
                {description}
              </p>
            ) : null}
          </div>
          {isLoading ? <Spinner size="sm" className="text-muted" /> : null}
        </div>
        <ul className="tw-mt-4 tw-space-y-1.5 tw-text-sm tw-text-gray-600">
          {displayStats.map((stat, index) => (
            <li key={`${stat}-${index}`} className="tw-truncate">
              {stat}
            </li>
          ))}
        </ul>
        <p className="tw-mt-4 tw-text-sm tw-font-semibold tw-text-gray-900">
          Enter →
        </p>
      </div>
    </Link>
  );
}
