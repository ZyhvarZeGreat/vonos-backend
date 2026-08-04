"use client";

import { useCallback, type ReactNode } from "react";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import {
  AsyncMenuSelect,
  type AsyncMenuLoadResult,
} from "@/components/molecules/AsyncMenuSelect";
import { MenuSelect } from "@/components/molecules/MenuSelect";
import {
  FILTER_SEARCHABLE_MIN_OPTIONS,
  SEARCH_DEBOUNCE_MS,
} from "@/lib/constants/search";
import type { CustomDateRange, DateRangePreset } from "@/stores/uiStore";

type FilterOption = { value: string; label: string };

function withEmptyOption(
  rows: FilterOption[],
  emptyLabel: string,
): FilterOption[] {
  const unique = rows.filter(
    (option, index, all) =>
      all.findIndex((row) => row.value === option.value) === index,
  );
  const hasBlank = unique.some((o) => o.value === "");
  return hasBlank ? unique : [{ value: "", label: emptyLabel }, ...unique];
}

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
  loadOptions,
  loadMoreOptions,
  selectedLabel,
  prefetchKey,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: FilterOption[];
  emptyLabel?: string;
  searchable?: boolean;
  /**
   * Async entity catalogs: first page loads with the page; typing searches
   * loaded rows then API. Return `{ options, hasMore }` for scroll-to-load-more.
   */
  loadOptions?: (
    query: string,
  ) => Promise<FilterOption[] | AsyncMenuLoadResult>;
  /** Next batch while scrolling (browse mode). */
  loadMoreOptions?: (
    query: string,
  ) => Promise<FilterOption[] | AsyncMenuLoadResult>;
  selectedLabel?: string;
  /** Re-prefetch when this changes (usually tenantId). */
  prefetchKey?: string | null;
}) {
  const wrappedLoadOptions = useCallback(
    async (query: string) => {
      if (!loadOptions) return { options: [], hasMore: false };
      const raw = await loadOptions(query);
      if (Array.isArray(raw)) {
        return {
          options: withEmptyOption(raw, emptyLabel),
          hasMore: false,
        };
      }
      return {
        ...raw,
        options: withEmptyOption(raw.options, emptyLabel),
      };
    },
    [emptyLabel, loadOptions],
  );

  const wrappedLoadMoreOptions = useCallback(
    async (query: string) => {
      if (!loadMoreOptions) return { options: [], hasMore: false, append: true };
      const raw = await loadMoreOptions(query);
      if (Array.isArray(raw)) {
        return { options: raw, hasMore: false, append: true };
      }
      return { ...raw, append: raw.append !== false };
    },
    [loadMoreOptions],
  );

  if (loadOptions) {
    const knownLabel =
      selectedLabel ??
      options?.find((option) => option.value === value)?.label;
    return (
      <label className="hq6-field">
        <span>{label}:</span>
        <AsyncMenuSelect
          value={value}
          selectedLabel={value ? knownLabel ?? emptyLabel : emptyLabel}
          placeholder={emptyLabel}
          emptyMessage="No matches"
          debounceMs={SEARCH_DEBOUNCE_MS}
          loadOptions={wrappedLoadOptions}
          loadMoreOptions={loadMoreOptions ? wrappedLoadMoreOptions : undefined}
          onChange={onChange}
          prefetchKey={prefetchKey}
        />
      </label>
    );
  }

  const menuOptions = withEmptyOption(options ?? [], emptyLabel);
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
