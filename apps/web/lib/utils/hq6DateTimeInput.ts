/** HQ6 text date/time: DD-MM-YYYY [HH:mm] ↔ ISO local for form state. */

export type Hq6DateTimeMode = "date" | "datetime";

const DATE_DIGITS = 8;
const DATETIME_DIGITS = 12;

export function hq6DateTimePlaceholder(mode: Hq6DateTimeMode): string {
  return mode === "date" ? "dd-mm-yyyy" : "dd-mm-yyyy HH:mm";
}

export function hq6DateTimeZeroTemplate(mode: Hq6DateTimeMode): string {
  return mode === "date" ? "00-00-0000" : "00-00-0000 00:00";
}

function digitCount(mode: Hq6DateTimeMode): number {
  return mode === "date" ? DATE_DIGITS : DATETIME_DIGITS;
}

/** Format raw digit string (0-padded) into display text. */
export function formatHq6Digits(digits: string, mode: Hq6DateTimeMode): string {
  const n = digitCount(mode);
  const d = digits.replace(/\D/g, "").slice(0, n).padEnd(n, "0");
  const dd = d.slice(0, 2);
  const mm = d.slice(2, 4);
  const yyyy = d.slice(4, 8);
  if (mode === "date") return `${dd}-${mm}-${yyyy}`;
  const hh = d.slice(8, 10);
  const mi = d.slice(10, 12);
  return `${dd}-${mm}-${yyyy} ${hh}:${mi}`;
}

export function extractHq6Digits(display: string, mode: Hq6DateTimeMode): string {
  return display.replace(/\D/g, "").slice(0, digitCount(mode));
}

/** ISO local `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm` → digit string. */
export function isoLocalToDigits(
  iso: string | null | undefined,
  mode: Hq6DateTimeMode,
): string {
  if (!iso?.trim()) return "".padEnd(digitCount(mode), "0");
  const d = new Date(iso.includes("T") || iso.includes(" ") ? iso : `${iso}T00:00`);
  if (Number.isNaN(d.getTime())) {
    // Already display-ish?
    const fromDisplay = extractHq6Digits(iso, mode);
    if (fromDisplay.length > 0) return fromDisplay.padEnd(digitCount(mode), "0");
    return "".padEnd(digitCount(mode), "0");
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const base = `${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}`;
  if (mode === "date") return base;
  return `${base}${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function isoLocalToHq6Display(
  iso: string | null | undefined,
  mode: Hq6DateTimeMode,
): string {
  if (!iso?.trim()) return "";
  return formatHq6Digits(isoLocalToDigits(iso, mode), mode);
}

/**
 * Parse display or digit string → ISO local.
 * Returns null if incomplete / invalid calendar values.
 */
export function hq6DisplayToIsoLocal(
  display: string,
  mode: Hq6DateTimeMode,
): string | null {
  const digits = extractHq6Digits(display, mode);
  if (digits.length < digitCount(mode)) return null;
  if (/^0+$/.test(digits)) return null;

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const hour = mode === "datetime" ? Number(digits.slice(8, 10)) : 0;
  const minute = mode === "datetime" ? Number(digits.slice(10, 12)) : 0;

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1000) return null;
  if (hour > 23 || minute > 59) return null;

  const probe = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    probe.getFullYear() !== year ||
    probe.getMonth() !== month - 1 ||
    probe.getDate() !== day
  ) {
    return null;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const datePart = `${year}-${pad(month)}-${pad(day)}`;
  if (mode === "date") return datePart;
  return `${datePart}T${pad(hour)}:${pad(minute)}`;
}

/** Current local date (or date+time) as ISO local for form state. */
export function nowIsoLocal(mode: Hq6DateTimeMode = "datetime"): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const datePart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (mode === "date") return datePart;
  return `${datePart}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Apply a typed digit under “start fresh with zeros” editing. */
export function applyDigitToHq6Mask(
  currentDigits: string,
  digit: string,
  cursorDigitIndex: number | null,
  mode: Hq6DateTimeMode,
  replaceAll: boolean,
): { digits: string; nextIndex: number } {
  const n = digitCount(mode);
  const d = digit.replace(/\D/g, "").slice(0, 1);
  if (!d) {
    return {
      digits: currentDigits.padEnd(n, "0").slice(0, n),
      nextIndex: cursorDigitIndex ?? 0,
    };
  }

  if (replaceAll) {
    const next = (d + "".padEnd(n - 1, "0")).slice(0, n);
    return { digits: next, nextIndex: 1 };
  }

  const base = currentDigits.padEnd(n, "0").slice(0, n).split("");
  const idx = Math.min(Math.max(cursorDigitIndex ?? 0, 0), n - 1);
  base[idx] = d;
  return { digits: base.join(""), nextIndex: Math.min(idx + 1, n) };
}

export function backspaceHq6Mask(
  currentDigits: string,
  cursorDigitIndex: number | null,
  mode: Hq6DateTimeMode,
  clearAll: boolean,
): { digits: string; nextIndex: number } {
  const n = digitCount(mode);
  if (clearAll) {
    return { digits: "".padEnd(n, "0"), nextIndex: 0 };
  }
  const base = currentDigits.padEnd(n, "0").slice(0, n).split("");
  const idx = Math.min(Math.max((cursorDigitIndex ?? n) - 1, 0), n - 1);
  base[idx] = "0";
  return { digits: base.join(""), nextIndex: idx };
}
