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
 * Multi-select: selected tags render inside the input (chip field), not above it.
 * Chip × removes a value; native select adds values.
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
      className={cn("vonos-tag-combobox", className)}
      data-disabled={disabled ? "true" : undefined}
    >
      {values.map((code) => (
        <span
          key={code}
          className="vonos-tag-combobox__chip"
          title={labelByValue.get(code) ?? code}
        >
          <span className="vonos-tag-combobox__chip-label">{code}</span>
          {!disabled ? (
            <button
              type="button"
              className="vonos-tag-combobox__remove"
              aria-label={`Remove ${code}`}
              // mousedown: beat focus steal from the sibling <select>
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                remove(code);
              }}
            >
              <X aria-hidden className="vonos-tag-combobox__remove-icon" />
            </button>
          ) : null}
        </span>
      ))}

      <select
        id={id}
        className="vonos-tag-combobox__select"
        disabled={disabled || available.length === 0}
        value=""
        aria-label={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          if (next) add(next);
        }}
      >
        <option value="" disabled>
          {available.length === 0
            ? values.length > 0
              ? "All selected"
              : placeholder
            : placeholder}
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
