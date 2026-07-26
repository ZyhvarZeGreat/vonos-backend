"use client";

import { cn } from "@/lib/utils/cn";

export interface ReportTableSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /** Optional explicit commit (button / Enter). Defaults to applying trimmed value. */
  onCommit?: () => void;
  placeholder?: string;
  className?: string;
}

/** Search input embedded in a report table chrome (not a separate Filters card). */
export function ReportTableSearchBar({
  value,
  onChange,
  onCommit,
  placeholder = "Search …",
  className,
}: ReportTableSearchBarProps) {
  const commit = () => {
    if (onCommit) onCommit();
    else onChange(value.trim());
  };

  return (
    <div
      className={cn(
        "border-b border-border bg-card px-3 py-2 print:hidden",
        className,
      )}
    >
      <div className="ml-auto flex max-w-md items-stretch">
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
          className="h-9 min-w-0 flex-1 rounded-l-md border border-r-0 border-border bg-[var(--color-surface-muted)]/40 px-3 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          aria-label={placeholder}
        />
        <button
          type="button"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-r-md border border-[#2563eb] bg-[#2563eb] px-3 text-sm font-semibold text-white hover:border-[#1d4ed8] hover:bg-[#1d4ed8]"
          aria-label="Search"
          onClick={commit}
        >
          Search
        </button>
      </div>
    </div>
  );
}
