"use client";

import { X } from "lucide-react";
import type { MenuSelectOption } from "@/components/molecules/MenuSelect";
import { cn } from "@/lib/utils/cn";

export interface TagComboboxProps {
  id?: string;
  values: string[];
  options: MenuSelectOption[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Multi-select: selected tags as a chip row + a plain select to add more
 * (no inline search — for short fixed option lists).
 */
export function TagCombobox({
  id,
  values,
  options,
  onChange,
  placeholder = "Select…",
  disabled = false,
  className,
}: TagComboboxProps) {
  const selectedSet = new Set(values);
  const labelByValue = new Map(options.map((o) => [o.value, o.label]));
  const available = options.filter((opt) => !selectedSet.has(opt.value));

  const add = (value: string) => {
    if (!value || selectedSet.has(value)) return;
    onChange([...values, value]);
  };

  const remove = (value: string) => {
    onChange(values.filter((v) => v !== value));
  };

  return (
    <div
      className={cn("tw-flex tw-min-w-0 tw-w-full tw-flex-col tw-gap-2", className)}
    >
      {values.length > 0 ? (
        <ul
          className="tw-m-0 tw-flex tw-list-none tw-flex-wrap tw-gap-1.5 tw-p-0"
          aria-label="Selected"
        >
          {values.map((code) => (
            <li key={code}>
              <span
                title={labelByValue.get(code) ?? code}
                className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded tw-bg-[#eef2f6] tw-px-2 tw-py-1 tw-text-xs tw-font-semibold tw-text-[#111827] tw-ring-1 tw-ring-[#d2d6de]"
              >
                {code}
                {!disabled ? (
                  <button
                    type="button"
                    className="tw-inline-flex tw-size-3.5 tw-items-center tw-justify-center tw-rounded-sm tw-border-0 tw-bg-transparent tw-p-0 tw-text-[#697586] hover:tw-text-[#dd4b39]"
                    aria-label={`Remove ${code}`}
                    onClick={() => remove(code)}
                  >
                    <X className="tw-size-3" aria-hidden />
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <select
        id={id}
        className="form-control select2"
        disabled={disabled || available.length === 0}
        value=""
        aria-label={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          if (next) add(next);
        }}
      >
        <option value="" disabled>
          {available.length === 0 ? "All selected" : placeholder}
        </option>
        {available.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.value} — {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
