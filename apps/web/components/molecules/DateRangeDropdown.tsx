"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { DateRangeCalendar } from "@/components/molecules/DateRangeCalendar";
import { DropdownMenu } from "@/components/molecules/DropdownMenu";
import { toDateInputValue } from "@/lib/utils/dateRange";
import {
  useUiStore,
  type CustomDateRange,
  type DateRangePreset,
} from "@/stores/uiStore";
import { cn } from "@/lib/utils/cn";

export const DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "all_time", label: "All Time" },
  { value: "last_hour", label: "Last Hour" },
  { value: "last_1_day", label: "Last 1 Day" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_90_days", label: "Last 90 Days" },
  { value: "this_month", label: "This Month" },
  { value: "custom", label: "Custom…" },
];

export function getDateRangeLabel(
  preset: DateRangePreset,
  custom?: CustomDateRange | null,
): string {
  if (preset === "custom" && custom?.from && custom?.to) {
    return `${toDateInputValue(custom.from)} → ${toDateInputValue(custom.to)}`;
  }
  return DATE_RANGE_OPTIONS.find((o) => o.value === preset)?.label ?? "All Time";
}

export interface DateRangeDropdownProps {
  value?: DateRangePreset;
  onChange?: (value: DateRangePreset) => void;
  customValue?: CustomDateRange | null;
  onCustomChange?: (range: CustomDateRange | null) => void;
  className?: string;
}

export function DateRangeDropdown({
  value: controlledValue,
  onChange,
  customValue: controlledCustom,
  onCustomChange,
  className,
}: DateRangeDropdownProps) {
  const storeValue = useUiStore((state) => state.dateRange);
  const storeCustom = useUiStore((state) => state.customDateRange);
  const setDateRange = useUiStore((state) => state.setDateRange);
  const setCustomDateRange = useUiStore((state) => state.setCustomDateRange);
  const value = controlledValue ?? storeValue;
  const custom = controlledCustom ?? storeCustom;
  const [calendarOpen, setCalendarOpen] = useState(value === "custom");

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <DropdownMenu
        value={value}
        options={DATE_RANGE_OPTIONS}
        onSelect={(next) => {
          const preset = next as DateRangePreset;
          if (preset === "custom") {
            setCalendarOpen(true);
            setDateRange("custom");
            onChange?.("custom");
            return;
          }
          setCalendarOpen(false);
          setDateRange(preset);
          onChange?.(preset);
          onCustomChange?.(null);
        }}
        trigger={
          <button
            type="button"
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-[var(--color-text-secondary)] shadow-sm transition-colors hover:bg-[var(--color-surface-muted)]",
            )}
          >
            {getDateRangeLabel(value, custom)}
            <ChevronDown className="h-4 w-4 text-muted" />
          </button>
        }
      />
      {calendarOpen || value === "custom" ? (
        <DateRangeCalendar
          value={custom}
          onApply={(range) => {
            setCustomDateRange(range);
            onCustomChange?.(range);
            onChange?.("custom");
            setCalendarOpen(true);
          }}
          onClear={() => {
            setCustomDateRange(null);
            setDateRange("all_time");
            onCustomChange?.(null);
            onChange?.("all_time");
            setCalendarOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
