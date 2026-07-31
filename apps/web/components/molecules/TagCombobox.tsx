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
      className={cn("form-control select2", className)}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
        minHeight: 38,
        height: "auto",
        padding: "4px 8px",
        boxSizing: "border-box",
        cursor: disabled ? "not-allowed" : "text",
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {values.map((code) => (
        <span
          key={code}
          title={labelByValue.get(code) ?? code}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            borderRadius: 3,
            background: "#eef2f6",
            padding: "2px 8px",
            fontSize: 12,
            fontWeight: 600,
            color: "#111827",
            border: "1px solid #d2d6de",
            lineHeight: 1.4,
            maxWidth: "100%",
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {code}
          </span>
          {!disabled ? (
            <button
              type="button"
              aria-label={`Remove ${code}`}
              onClick={() => remove(code)}
              style={{
                display: "inline-flex",
                width: 14,
                height: 14,
                alignItems: "center",
                justifyContent: "center",
                border: 0,
                background: "transparent",
                padding: 0,
                margin: 0,
                cursor: "pointer",
                color: "#697586",
                flexShrink: 0,
              }}
            >
              <X style={{ width: 12, height: 12 }} aria-hidden />
            </button>
          ) : null}
        </span>
      ))}

      <select
        id={id}
        disabled={disabled || available.length === 0}
        value=""
        aria-label={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          if (next) add(next);
        }}
        style={{
          flex: "1 1 120px",
          minWidth: 120,
          border: 0,
          outline: "none",
          background: "transparent",
          boxShadow: "none",
          padding: "2px 0",
          margin: 0,
          height: 28,
          fontSize: 13,
          color: "#111827",
          cursor: disabled ? "not-allowed" : "pointer",
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
