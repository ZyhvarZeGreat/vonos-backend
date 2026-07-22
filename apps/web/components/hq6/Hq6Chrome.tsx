"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Hq6PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="hq6-content-header">
      <h1>
        {title}
        {subtitle ? <small>{subtitle}</small> : null}
      </h1>
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
        <Filter className="h-4 w-4" />
        Filters
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 opacity-60 transition-transform",
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
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** When true, children render as sibling cards under the header (no single wrapper card). */
  multiCard?: boolean;
}) {
  return (
    <div className="hq6-page">
      <Hq6PageHeader title={title} subtitle={subtitle} />
      {multiCard ? children : <div className="hq6-card p-4 md:p-6">{children}</div>}
      <p className="hq6-footer">
        Vonos Autos Head Office - V6.8 | Copyright © {new Date().getFullYear()} All
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
        Vonos Autos Head Office - V6.8 | Copyright © {new Date().getFullYear()} All
        rights reserved.
      </p>
    </div>
  );
}
