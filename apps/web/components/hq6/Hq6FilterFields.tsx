"use client";

import type { ReactNode } from "react";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { MenuSelect } from "@/components/molecules/MenuSelect";
import { FILTER_SEARCHABLE_MIN_OPTIONS } from "@/lib/constants/search";
import type { CustomDateRange, DateRangePreset } from "@/stores/uiStore";

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
        className="h-4 w-4 rounded border border-[#d1d5db]"
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
  searchable,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  emptyLabel?: string;
  searchable?: boolean;
}) {
  const uniqueOptions = options.filter(
    (option, index, all) =>
      all.findIndex((row) => row.value === option.value) === index,
  );
  const hasBlank = uniqueOptions.some((o) => o.value === "");
  const menuOptions = hasBlank
    ? uniqueOptions
    : [{ value: "", label: emptyLabel }, ...uniqueOptions];
  const useSearch =
    searchable ?? menuOptions.length >= FILTER_SEARCHABLE_MIN_OPTIONS;

  return (
    <label className="hq6-field">
      <span>{label}:</span>
      <MenuSelect
        value={value}
        onChange={onChange}
        options={menuOptions}
        placeholder={emptyLabel}
        searchable={useSearch}
      />
    </label>
  );
}

export function Hq6FilterDateRange({
  label = "Date Range",
  value,
  onChange,
  customValue,
  onCustomChange,
}: {
  label?: string;
  value: DateRangePreset;
  onChange: (value: DateRangePreset) => void;
  customValue?: CustomDateRange | null;
  onCustomChange?: (range: CustomDateRange | null) => void;
}) {
  return (
    <div className="hq6-field">
      <span>{label}:</span>
      <DateRangeDropdown
        value={value}
        onChange={onChange}
        customValue={customValue}
        onCustomChange={onCustomChange}
      />
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
