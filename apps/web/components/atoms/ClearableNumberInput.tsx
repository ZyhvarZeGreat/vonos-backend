"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

type ClearableNumberInputProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: string | number;
  className?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  /** When true, zero displays as "0" instead of empty. Default empty. */
  showZero?: boolean;
};

/**
 * Numeric text input that can be fully cleared (no sticky undeleteable 0).
 * Keeps a draft string while focused so values like `0.5` can be typed.
 */
export function ClearableNumberInput({
  value,
  onChange,
  min = 0,
  max,
  className,
  id,
  name,
  disabled,
  required,
  placeholder = "",
  showZero = false,
}: ClearableNumberInputProps) {
  const focusedRef = useRef(false);
  const format = (n: number) => {
    if (!Number.isFinite(n)) return "";
    if (n === 0 && !showZero) return "";
    return String(n);
  };
  const [text, setText] = useState(() => format(value));

  useEffect(() => {
    if (focusedRef.current) return;
    setText(format(value));
  }, [value, showZero]);

  const clamp = (n: number) => {
    let next = n;
    if (Number.isFinite(min)) next = Math.max(min, next);
    if (max != null && Number.isFinite(max)) next = Math.min(max, next);
    return next;
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      id={id}
      name={name}
      disabled={disabled}
      required={required}
      placeholder={placeholder}
      className={cn(className)}
      value={text}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
        const trimmed = text.trim();
        if (!trimmed || trimmed === ".") {
          onChange(clamp(0));
          setText(format(clamp(0)));
          return;
        }
        const n = Number(trimmed);
        const next = clamp(Number.isFinite(n) ? n : 0);
        onChange(next);
        setText(format(next));
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw !== "" && !/^-?\d*\.?\d*$/.test(raw)) return;
        setText(raw);
        if (raw === "" || raw === "." || raw === "-") {
          onChange(clamp(0));
          return;
        }
        const n = Number(raw);
        if (Number.isFinite(n)) onChange(clamp(n));
      }}
    />
  );
}
