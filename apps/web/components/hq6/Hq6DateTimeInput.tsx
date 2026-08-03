"use client";

import {
  useEffect,
  useId,
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
  nowIsoLocal,
  type Hq6DateTimeMode,
} from "@/lib/utils/hq6DateTimeInput";
import { cn } from "@/lib/utils/cn";

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
  /** Show Now/Today + native calendar picker (default true). */
  showQuickPick?: boolean;
};

/**
 * HQ6 date(+time) text field with Now/Today + native calendar quick-picks.
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
  showQuickPick = true,
}: Hq6DateTimeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const nativeRef = useRef<HTMLInputElement>(null);
  const autoId = useId();
  const fieldId = id ?? `hq6-dt-${autoId}`;
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

  const commitIso = (iso: string) => {
    onChange(iso);
    setDraft(iso ? isoLocalToHq6Display(iso, mode) : "");
    setFocused(false);
  };

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

  const setNow = () => {
    if (disabled) return;
    commitIso(nowIsoLocal(mode));
  };

  const openNativePicker = () => {
    if (disabled) return;
    const el = nativeRef.current;
    if (!el) return;
    // Prefer current value so the picker opens on the selected moment.
    el.value = toNativeValue(value, mode) || toNativeValue(nowIsoLocal(mode), mode);
    try {
      el.showPicker?.();
    } catch {
      el.click();
    }
  };

  const handleNativeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!raw) {
      commitIso("");
      return;
    }
    // datetime-local → YYYY-MM-DDTHH:mm ; date → YYYY-MM-DD
    commitIso(raw.length === 16 || raw.includes("T") ? raw.slice(0, 16) : raw.slice(0, 10));
  };

  const input = (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      id={fieldId}
      name={name}
      required={required}
      disabled={disabled}
      autoFocus={autoFocus}
      className={cn(showQuickPick ? "hq6-dt-field" : null, className)}
      placeholder={placeholder ?? hq6DateTimePlaceholder(mode)}
      value={display}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      aria-label={mode === "date" ? "Date" : "Date and time"}
      title="Type date as dd-mm-yyyy — or use Now / calendar"
    />
  );

  if (!showQuickPick) return input;

  const nowLabel = mode === "date" ? "Today" : "Now";

  return (
    <div className={cn("hq6-dt-input-group", disabled && "is-disabled")}>
      {input}
      <input
        ref={nativeRef}
        type={mode === "date" ? "date" : "datetime-local"}
        className="hq6-dt-native"
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        onChange={handleNativeChange}
      />
      <button
        type="button"
        className="hq6-dt-picker-btn"
        disabled={disabled}
        title={mode === "date" ? "Pick a date" : "Pick date and time"}
        aria-label={mode === "date" ? "Open date picker" : "Open date and time picker"}
        onClick={openNativePicker}
      >
        <CalendarIcon />
      </button>
      <button
        type="button"
        className="hq6-dt-now-btn"
        disabled={disabled}
        title={`Set to ${nowLabel.toLowerCase()}`}
        aria-label={`Set ${nowLabel.toLowerCase()}`}
        onClick={setNow}
      >
        {nowLabel}
      </button>
    </div>
  );
}

function toNativeValue(iso: string, mode: Hq6DateTimeMode): string {
  if (!iso?.trim()) return "";
  if (mode === "date") return iso.slice(0, 10);
  // Accept YYYY-MM-DDTHH:mm or with seconds
  if (iso.includes("T")) return iso.slice(0, 16);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return `${iso}T00:00`;
  return "";
}

function CalendarIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
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
