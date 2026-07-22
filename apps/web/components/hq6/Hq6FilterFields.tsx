"use client";

import type { ReactNode } from "react";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import type { DateRangePreset } from "@/stores/uiStore";

export function Hq6FilterCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm font-medium text-[#374151]">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-[#d1d5db]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function Hq6FilterSelect({
  label,
  value,
  onChange,
  options,
  emptyLabel = "All",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  /** Used when options omit a blank row. */
  emptyLabel?: string;
}) {
  const hasBlank = options.some((o) => o.value === "");
  return (
    <label className="hq6-field">
      <span>{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {!hasBlank ? <option value="">{emptyLabel}</option> : null}
        {options.map((o) => (
          <option key={`${o.value}-${o.label}`} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Hq6FilterDateRange({
  label = "Date Range",
  value,
  onChange,
}: {
  label?: string;
  value: DateRangePreset;
  onChange: (value: DateRangePreset) => void;
}) {
  return (
    <div className="hq6-field">
      <span>{label}:</span>
      <DateRangeDropdown value={value} onChange={onChange} />
    </div>
  );
}

export function Hq6FilterCheckboxRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-x-6 gap-y-2">{children}</div>;
}

export function Hq6FilterGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
  );
}

export function Hq6FilterStack({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}
