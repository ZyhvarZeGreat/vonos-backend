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

function ordinalDay(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function rawValueHasTime(value: string): boolean {
  if (!value.includes("T")) return false;
  const date = parseAppDate(value);
  if (!date) return false;

  const parts = new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const second = Number(parts.find((part) => part.type === "second")?.value ?? 0);
  return hour !== 0 || minute !== 0 || second !== 0;
}

function formatAppDateParts(date: Date, withTime: boolean): string {
  const parts = new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime
      ? { hour: "numeric", minute: "2-digit", hour12: true }
      : {}),
  }).formatToParts(date);

  const dayNum = Number(parts.find((part) => part.type === "day")?.value ?? 0);
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  let formatted = `${ordinalDay(dayNum)} ${month} ${year}`;

  if (withTime) {
    const hour = parts.find((part) => part.type === "hour")?.value ?? "";
    const minute = parts.find((part) => part.type === "minute")?.value ?? "";
    const dayPeriod = (
      parts.find((part) => part.type === "dayPeriod")?.value ?? ""
    ).toLowerCase();
    formatted += `, ${hour}:${minute} ${dayPeriod}`;
  }

  return formatted;
}

/** e.g. 16th July 2026 — includes time when the source value has a time component. */
export function formatDate(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  if (typeof value === "string" && !looksLikeMachineDate(value)) {
    return value;
  }

  const date = parseAppDate(value);
  if (!date) return "—";

  const withTime = typeof value === "string" && rawValueHasTime(value);
  return formatAppDateParts(date, withTime);
}

/** e.g. 16th July 2026, 7:28 am */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  if (typeof value === "string" && !looksLikeMachineDate(value)) {
    return value;
  }

  const date = parseAppDate(value);
  if (!date) return "—";

  return formatAppDateParts(date, true);
}

/** e.g. 7:28 am */
export function formatTime(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";

  const date = parseAppDate(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .toLowerCase();
}
