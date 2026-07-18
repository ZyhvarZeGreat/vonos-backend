"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { toDateInputValue } from "@/lib/utils/dateRange";
import type { CustomDateRange } from "@/stores/uiStore";
import { cn } from "@/lib/utils/cn";

export interface DateRangeCalendarProps {
  value: CustomDateRange | null;
  onApply: (range: CustomDateRange) => void;
  onClear?: () => void;
  className?: string;
}

export function DateRangeCalendar({
  value,
  onApply,
  onClear,
  className,
}: DateRangeCalendarProps) {
  const [from, setFrom] = useState(toDateInputValue(value?.from));
  const [to, setTo] = useState(toDateInputValue(value?.to));

  useEffect(() => {
    setFrom(toDateInputValue(value?.from));
    setTo(toDateInputValue(value?.to));
  }, [value?.from, value?.to]);

  const canApply = Boolean(from && to && from <= to);

  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3 shadow-sm",
        className,
      )}
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">To</label>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => setTo(e.target.value)}
          className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground"
        />
      </div>
      <Button
        type="button"
        size="sm"
        disabled={!canApply}
        onClick={() => onApply({ from, to })}
      >
        Apply
      </Button>
      {onClear ? (
        <Button type="button" size="sm" variant="secondary" onClick={onClear}>
          Clear
        </Button>
      ) : null}
    </div>
  );
}
