const APP_LOCALE = "en-NG";
const APP_TIMEZONE = "Africa/Lagos";

const MACHINE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;

function looksLikeMachineDate(value: string): boolean {
  return MACHINE_DATE_PATTERN.test(value) || value.includes("T");
}

export function parseAppDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  // Date-only values — anchor at noon local to avoid UTC day shifts.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** e.g. 14 Jun 2026 */
export function formatDate(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  if (typeof value === "string" && !looksLikeMachineDate(value)) {
    return value;
  }

  const date = parseAppDate(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** e.g. 14 Jun 2026, 10:30 am */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  if (typeof value === "string" && !looksLikeMachineDate(value)) {
    return value;
  }

  const date = parseAppDate(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** e.g. 10:30 am */
export function formatTime(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";

  const date = parseAppDate(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
