"use client";

import { useEffect, useRef, useState } from "react";
import { DateRangeCalendar } from "@/components/molecules/DateRangeCalendar";
import { FloatingMenuPanel } from "@/components/molecules/FloatingMenuPanel";
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
  /** Optional aria / visible label prefix (unused for native select value). */
  triggerLabel?: string;
  align?: "start" | "end";
  id?: string;
}

/**
 * Ultimate POS–style date filter: native `select.form-control.select2`.
 * Custom range opens the calendar panel when selected.
 */
export function DateRangeDropdown({
  value: controlledValue,
  onChange,
  customValue: controlledCustom,
  onCustomChange,
  className,
  align = "start",
  id = "date_range_filter",
}: DateRangeDropdownProps) {
  const storeValue = useUiStore((state) => state.dateRange);
  const storeCustom = useUiStore((state) => state.customDateRange);
  const setStoreDateRange = useUiStore((state) => state.setDateRange);
  const setStoreCustomDateRange = useUiStore((state) => state.setCustomDateRange);

  const isPresetControlled = controlledValue !== undefined;
  const isCustomControlled =
    onCustomChange != null || controlledCustom !== undefined;

  const value = controlledValue ?? storeValue;
  const custom = isCustomControlled
    ? (controlledCustom ?? null)
    : storeCustom;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const calendarMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calendarOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        anchorRef.current?.contains(target) ||
        calendarMenuRef.current?.contains(target)
      ) {
        return;
      }
      setCalendarOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [calendarOpen]);

  const applyPreset = (preset: DateRangePreset) => {
    if (!isPresetControlled) setStoreDateRange(preset);
    onChange?.(preset);
  };

  const applyCustom = (range: CustomDateRange | null) => {
    if (!isCustomControlled) setStoreCustomDateRange(range);
    onCustomChange?.(range);
  };

  return (
    <div ref={anchorRef} className={cn("relative min-w-0 w-full", className)}>
      <select
        id={id}
        className="form-control select2"
        value={value}
        aria-label="Filter by date"
        onChange={(event) => {
          const preset = event.target.value as DateRangePreset;
          if (preset === "custom") {
            applyPreset("custom");
            setCalendarOpen(true);
            return;
          }
          setCalendarOpen(false);
          applyCustom(null);
          applyPreset(preset);
        }}
      >
        {DATE_RANGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.value === "custom" && custom?.from && custom?.to
              ? getDateRangeLabel("custom", custom)
              : option.label}
          </option>
        ))}
      </select>
      <FloatingMenuPanel
        open={calendarOpen}
        anchorRef={anchorRef}
        menuRef={calendarMenuRef}
        align={align}
        className="overflow-visible rounded-lg border border-border bg-card p-0 shadow-lg"
      >
        <DateRangeCalendar
          className="border-0 shadow-none"
          value={custom}
          onApply={(range) => {
            applyCustom(range);
            applyPreset("custom");
            setCalendarOpen(false);
          }}
          onClear={() => {
            applyCustom(null);
            applyPreset("last_7_days");
            setCalendarOpen(false);
          }}
        />
      </FloatingMenuPanel>
    </div>
  );
}
