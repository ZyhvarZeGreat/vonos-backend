"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ReportTableSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Search input embedded in a report table chrome (not a separate Filters card). */
export function ReportTableSearchBar({
  value,
  onChange,
  placeholder = "Search …",
  className,
}: ReportTableSearchBarProps) {
  return (
    <div
      className={cn(
        "border-b border-border bg-card px-3 py-2 print:hidden",
        className,
      )}
    >
      <div className="relative max-w-md ml-auto">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-9 w-full rounded-md border border-border bg-[var(--color-surface-muted)]/40 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          aria-label={placeholder}
        />
      </div>
    </div>
  );
}
