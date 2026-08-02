"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import {
  extractHq6Digits,
  hq6DateTimePlaceholder,
  hq6DisplayToIsoLocal,
  isoLocalToHq6Display,
  type Hq6DateTimeMode,
} from "@/lib/utils/hq6DateTimeInput";

export type Hq6DateTimeInputProps = {
  value: string;
  onChange: (isoLocal: string) => void;
  mode?: Hq6DateTimeMode;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  /** Override placeholder (default dd-mm-yyyy [HH:mm]). */
  placeholder?: string;
  autoFocus?: boolean;
};

/**
 * HQ6 date(+time) text field.
 * Empty when cleared — no sticky `00-00-0000` zeros.
 * Digits auto-format with separators; Backspace/Delete clear normally.
 */
export function Hq6DateTimeInput({
  value,
  onChange,
  mode = "datetime",
  className,
  id,
  name,
  required,
  disabled,
  placeholder,
  autoFocus,
}: Hq6DateTimeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() =>
    value.trim() ? isoLocalToHq6Display(value, mode) : "",
  );

  useEffect(() => {
    if (focused) return;
    setDraft(value.trim() ? isoLocalToHq6Display(value, mode) : "");
  }, [value, mode, focused]);

  const display = focused
    ? draft
    : value.trim()
      ? isoLocalToHq6Display(value, mode)
      : "";

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    const next = value.trim() ? isoLocalToHq6Display(value, mode) : "";
    setDraft(next);
    requestAnimationFrame(() => {
      e.target.select();
    });
  };

  const handleBlur = () => {
    setFocused(false);
    const trimmed = draft.trim();
    if (!trimmed) {
      onChange("");
      setDraft("");
      return;
    }
    const iso = hq6DisplayToIsoLocal(trimmed, mode);
    if (iso) {
      onChange(iso);
      setDraft(isoLocalToHq6Display(iso, mode));
      return;
    }
    // Invalid draft: revert to last committed value (or empty)
    setDraft(value.trim() ? isoLocalToHq6Display(value, mode) : "");
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!raw.trim()) {
      setDraft("");
      onChange("");
      return;
    }

    const digits = extractHq6Digits(raw, mode);
    if (!digits) {
      setDraft(raw.replace(/[^\d\-:\s]/g, ""));
      return;
    }

    // Format only digits typed so far — never pad with zeros into the field
    const partial = formatPartialDigits(digits, mode);
    setDraft(partial);

    const iso = hq6DisplayToIsoLocal(partial, mode);
    if (iso) onChange(iso);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key.length === 1 && !/\d/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (e.key === "-" || e.key === ":" || e.key === " ") return;
      e.preventDefault();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      id={id}
      name={name}
      required={required}
      disabled={disabled}
      autoFocus={autoFocus}
      className={className}
      placeholder={placeholder ?? hq6DateTimePlaceholder(mode)}
      value={display}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      aria-label={mode === "date" ? "Date" : "Date and time"}
      title="Type date as dd-mm-yyyy — fully clearable"
    />
  );
}

/** Format typed digits without padEnd zeros — only show what the user entered. */
function formatPartialDigits(digits: string, mode: Hq6DateTimeMode): string {
  const d = digits.replace(/\D/g, "").slice(0, mode === "date" ? 8 : 12);
  if (!d) return "";

  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}-${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`;

  const datePart = `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4, 8)}`;
  const timeDigits = d.slice(8);
  if (timeDigits.length <= 2) return `${datePart} ${timeDigits}`;
  return `${datePart} ${timeDigits.slice(0, 2)}:${timeDigits.slice(2)}`;
}
