"use client";

import { ChevronDown } from "lucide-react";
import { DropdownMenu } from "@/components/molecules/DropdownMenu";
import { useUiStore, type DateRangePreset } from "@/stores/uiStore";
import { cn } from "@/lib/utils/cn";

export const DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "all_time", label: "All Time" },
  { value: "last_hour", label: "Last Hour" },
  { value: "last_1_day", label: "Last 1 Day" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_90_days", label: "Last 90 Days" },
  { value: "this_month", label: "This Month" },
];

export function getDateRangeLabel(preset: DateRangePreset): string {
  return DATE_RANGE_OPTIONS.find((o) => o.value === preset)?.label ?? "All Time";
}

export interface DateRangeDropdownProps {
  value?: DateRangePreset;
  onChange?: (value: DateRangePreset) => void;
  className?: string;
}

export function DateRangeDropdown({
  value: controlledValue,
  onChange,
  className,
}: DateRangeDropdownProps) {
  const storeValue = useUiStore((state) => state.dateRange);
  const setDateRange = useUiStore((state) => state.setDateRange);
  const value = controlledValue ?? storeValue;

  return (
    <DropdownMenu
      className={className}
      value={value}
      options={DATE_RANGE_OPTIONS}
      onSelect={(next) => {
        const preset = next as DateRangePreset;
        setDateRange(preset);
        onChange?.(preset);
      }}
      trigger={
        <button
          type="button"
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-[var(--color-text-secondary)] shadow-sm transition-colors hover:bg-[var(--color-surface-muted)]",
          )}
        >
          {getDateRangeLabel(value)}
          <ChevronDown className="h-4 w-4 text-muted" />
        </button>
      }
    />
  );
}
