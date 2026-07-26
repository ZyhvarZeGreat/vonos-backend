"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { DateRangeCalendar } from "@/components/molecules/DateRangeCalendar";
import { DropdownMenu } from "@/components/molecules/DropdownMenu";
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
  /** Optional trigger label override (defaults to the selected range). */
  triggerLabel?: string;
  align?: "start" | "end";
}

export function DateRangeDropdown({
  value: controlledValue,
  onChange,
  customValue: controlledCustom,
  onCustomChange,
  className,
  triggerLabel,
  align = "start",
}: DateRangeDropdownProps) {
  const storeValue = useUiStore((state) => state.dateRange);
  const storeCustom = useUiStore((state) => state.customDateRange);
  const setStoreDateRange = useUiStore((state) => state.setDateRange);
  const setStoreCustomDateRange = useUiStore((state) => state.setCustomDateRange);

  const isPresetControlled = controlledValue !== undefined;
  // Controlled preset pages (esp. isolateDateRange) must own custom too —
  // otherwise Apply writes the global store while bounds read local null.
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
    <div ref={anchorRef} className={cn("relative inline-flex", className)}>
      <DropdownMenu
        value={value}
        options={DATE_RANGE_OPTIONS}
        align={align}
        onSelect={(next) => {
          const preset = next as DateRangePreset;
          if (preset === "custom") {
            setCalendarOpen(true);
            applyPreset("custom");
            return;
          }
          setCalendarOpen(false);
          applyPreset(preset);
          applyCustom(null);
        }}
        trigger={
          <button
            type="button"
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-[var(--color-text-secondary)] shadow-sm transition-colors hover:bg-[var(--color-surface-muted)]",
            )}
          >
            {triggerLabel ?? getDateRangeLabel(value, custom)}
            <ChevronDown className="h-4 w-4 text-muted" />
          </button>
        }
      />
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
            applyPreset("all_time");
            setCalendarOpen(false);
          }}
        />
      </FloatingMenuPanel>
    </div>
  );
}
