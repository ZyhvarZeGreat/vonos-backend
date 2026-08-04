"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Filter } from "lucide-react";
import {
  Hq6Breadcrumbs,
  useHq6Breadcrumbs,
  type Hq6BreadcrumbItem,
} from "@/components/hq6/Hq6Breadcrumbs";
import { cn } from "@/lib/utils/cn";

export function Hq6PageHeader({
  title,
  subtitle,
  breadcrumbs,
  showBreadcrumbs = true,
}: {
  title: string;
  subtitle?: string;
  /** Override auto crumbs from the current route. */
  breadcrumbs?: Hq6BreadcrumbItem[];
  showBreadcrumbs?: boolean;
}) {
  const autoCrumbs = useHq6Breadcrumbs({ leafLabel: title });
  const crumbs = breadcrumbs ?? autoCrumbs;

  return (
    <section className="content-header hq6-content-header">
      <h1 className="tw-text-xl md:tw-text-3xl tw-font-bold tw-text-black">
        {title}
        {subtitle ? (
          <small className="tw-text-sm md:tw-text-base tw-text-gray-700 tw-font-semibold">
            {subtitle}
          </small>
        ) : null}
      </h1>
      {showBreadcrumbs ? <Hq6Breadcrumbs items={crumbs} /> : null}
    </section>
  );
}

export function Hq6FiltersCard({
  children,
  defaultOpen = true,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="hq6-card hq6-filters-card">
      <button
        type="button"
        className="hq6-filters-summary"
        onClick={() => setOpen((v) => !v)}
      >
        <Filter className="h-4 w-4 shrink-0" />
        Filters
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 opacity-60 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? <div className="hq6-filters-body">{children}</div> : null}
    </div>
  );
}

export function Hq6FormShell({
  title,
  subtitle,
  children,
  multiCard = false,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** When true, children render as sibling cards under the header (no single wrapper card). */
  multiCard?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("hq6-page", className)}>
      <Hq6PageHeader title={title} subtitle={subtitle} />
      <section className="content">
        {multiCard ? (
          children
        ) : (
          <div className="box-primary tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
            <div className="tw-p-2 sm:tw-p-3 md:p-6">{children}</div>
          </div>
        )}
      </section>
      <p className="hq6-footer">
        Vonos Autos Head Office - V8.1 | Copyright © {new Date().getFullYear()} All
        rights reserved.
      </p>
    </div>
  );
}

export function Hq6PageFrame({
  title,
  subtitle,
  filters,
  children,
}: {
  title: string;
  subtitle?: string;
  filters?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="hq6-page">
      <Hq6PageHeader title={title} subtitle={subtitle} />
      {filters ? <Hq6FiltersCard>{filters}</Hq6FiltersCard> : null}
      {children}
      <p className="hq6-footer">
        Vonos Autos Head Office - V8.1 | Copyright © {new Date().getFullYear()} All
        rights reserved.
      </p>
    </div>
  );
}
