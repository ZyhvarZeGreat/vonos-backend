"use client";

import { MenuSelect } from "@/components/molecules/MenuSelect";
import { cn } from "@/lib/utils/cn";

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  label?: string;
  options: SelectOption[];
  error?: string;
  className?: string;
  id?: string;
  name?: string;
  value?: string | number | readonly string[];
  disabled?: boolean;
  /** When false, hides the search field (default true). */
  searchable?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

/** Form select with searchable options (wraps MenuSelect). */
export function Select({
  label,
  options,
  error,
  className,
  id,
  name,
  value,
  disabled,
  searchable = true,
  onChange,
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const stringValue =
    value === undefined || value === null
      ? ""
      : Array.isArray(value)
        ? String(value[0] ?? "")
        : String(value);

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={selectId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <MenuSelect
        id={selectId}
        value={stringValue}
        options={options}
        disabled={disabled}
        searchable={searchable}
        className={cn(error && "[&>button]:border-error", className)}
        onChange={(next) => {
          if (!onChange) return;
          onChange({
            target: { value: next, name: name ?? "" },
            currentTarget: { value: next, name: name ?? "" },
          } as React.ChangeEvent<HTMLSelectElement>);
        }}
      />
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}
