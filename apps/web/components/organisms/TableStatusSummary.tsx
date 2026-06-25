"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface TableStatusSummaryProps {
  title?: string;
  subtitle?: string;
  available: number;
  occupied: number;
  reserved: number;
  viewTablesHref: string;
  className?: string;
}

export function TableStatusSummary({
  title = "Table Status",
  subtitle = "Floor overview — live counts",
  available,
  occupied,
  reserved,
  viewTablesHref,
  className,
}: TableStatusSummaryProps) {
  const items = [
    { label: "Available", count: available, dotClass: "bg-success" },
    { label: "Occupied", count: occupied, dotClass: "bg-[var(--color-brand-accent)]" },
    { label: "Reserved", count: reserved, dotClass: "bg-info" },
  ];

  return (
    <section
      className={cn(
        "flex h-[var(--space-chart-height)] flex-col rounded-xl border border-border bg-card p-6 shadow-sm",
        className,
      )}
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      <div className="flex flex-1 flex-col justify-center gap-6">
        <div className="flex flex-wrap gap-6">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className={cn("h-3 w-3 rounded-full", item.dotClass)} aria-hidden />
              <div>
                <p className="text-2xl font-bold text-foreground">{item.count}</p>
                <p className="text-sm text-muted">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
        <Link
          href={viewTablesHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-brand-accent)] hover:underline"
        >
          View Tables
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
