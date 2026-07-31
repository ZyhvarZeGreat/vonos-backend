"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import {
  applyDigitToHq6Mask,
  backspaceHq6Mask,
  extractHq6Digits,
  formatHq6Digits,
  hq6DateTimePlaceholder,
  hq6DateTimeZeroTemplate,
  hq6DisplayToIsoLocal,
  isoLocalToDigits,
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
 * Copyable / editable HQ6 date(+time) text field.
 * - Native text selection & clipboard
 * - Controlled ISO local value (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`)
 * - Typing starts from zeros (digit mask) so controlled values are fully changeable
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
  const [digits, setDigits] = useState(() => isoLocalToDigits(value, mode));
  const [replaceNext, setReplaceNext] = useState(true);
  const digitIndexRef = useRef(0);

  useEffect(() => {
    if (focused) return;
    setDigits(isoLocalToDigits(value, mode));
  }, [value, mode, focused]);

  const display = focused
    ? formatHq6Digits(digits, mode)
    : value.trim()
      ? isoLocalToHq6Display(value, mode)
      : "";

  const emitFromDigits = (nextDigits: string) => {
    setDigits(nextDigits);
    const iso = hq6DisplayToIsoLocal(formatHq6Digits(nextDigits, mode), mode);
    if (iso) onChange(iso);
    else if (/^0+$/.test(nextDigits)) onChange("");
  };

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    const next = isoLocalToDigits(value, mode);
    setDigits(next);
    setReplaceNext(true);
    digitIndexRef.current = 0;
    requestAnimationFrame(() => {
      e.target.select();
    });
  };

  const handleBlur = () => {
    setFocused(false);
    const iso = hq6DisplayToIsoLocal(formatHq6Digits(digits, mode), mode);
    if (iso) {
      onChange(iso);
      setDigits(isoLocalToDigits(iso, mode));
    } else if (/^0+$/.test(digits) || !digits.trim()) {
      onChange("");
      setDigits(isoLocalToDigits("", mode));
    } else {
      // Keep last valid value if draft invalid
      setDigits(isoLocalToDigits(value, mode));
    }
    setReplaceNext(true);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "a" && (e.metaKey || e.ctrlKey)) {
      return;
    }
    if (
      e.key === "c" ||
      e.key === "x" ||
      e.key === "v" ||
      e.key === "C" ||
      e.key === "X" ||
      e.key === "V"
    ) {
      if (e.metaKey || e.ctrlKey) return;
    }

    if (e.key === "Tab" || e.key === "Enter" || e.key === "Escape") return;

    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      const clearAll = replaceNext || e.key === "Delete";
      const result = backspaceHq6Mask(
        digits,
        digitIndexRef.current,
        mode,
        clearAll,
      );
      digitIndexRef.current = result.nextIndex;
      setReplaceNext(false);
      emitFromDigits(result.digits);
      return;
    }

    if (e.key.length === 1 && /\d/.test(e.key)) {
      e.preventDefault();
      const result = applyDigitToHq6Mask(
        digits,
        e.key,
        digitIndexRef.current,
        mode,
        replaceNext,
      );
      digitIndexRef.current = result.nextIndex;
      setReplaceNext(false);
      emitFromDigits(result.digits);
      return;
    }

    // Block other printable keys from breaking the mask; arrows allowed for caret
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Fallback for mobile / IME / autofill: strip to digits and re-mask
    const raw = extractHq6Digits(e.target.value, mode);
    if (!raw) {
      emitFromDigits(isoLocalToDigits("", mode));
      digitIndexRef.current = 0;
      setReplaceNext(true);
      return;
    }
    const padded = raw.padEnd(
      mode === "date" ? 8 : 12,
      "0",
    );
    digitIndexRef.current = Math.min(raw.length, mode === "date" ? 8 : 12);
    setReplaceNext(false);
    emitFromDigits(padded);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").trim();
    const fromDisplay = hq6DisplayToIsoLocal(text, mode);
    const fromIsoShape = hq6DisplayToIsoLocal(
      isoLocalToHq6Display(text, mode),
      mode,
    );
    const parsed = fromDisplay ?? fromIsoShape;
    if (parsed) {
      onChange(parsed);
      setDigits(isoLocalToDigits(parsed, mode));
      setReplaceNext(true);
      digitIndexRef.current = 0;
      return;
    }
    const pastedDigits = extractHq6Digits(text, mode);
    if (!pastedDigits) return;
    const padded = pastedDigits.padEnd(mode === "date" ? 8 : 12, "0");
    emitFromDigits(padded);
    digitIndexRef.current = Math.min(
      pastedDigits.length,
      mode === "date" ? 8 : 12,
    );
    setReplaceNext(false);
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
      placeholder={
        placeholder ??
        (focused
          ? hq6DateTimeZeroTemplate(mode)
          : hq6DateTimePlaceholder(mode))
      }
      value={display}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      onPaste={handlePaste}
      aria-label={mode === "date" ? "Date" : "Date and time"}
      title="Selectable text — type digits to edit (starts from 0)"
    />
  );
}
