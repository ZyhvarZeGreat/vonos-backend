/**
 * Structured sale-note keys used for invoice print fields that are not
 * first-class Sale columns yet (sales person, mileage, vehicle time in).
 */

import { formatHq6Date, formatHq6DateTime } from "@/lib/utils/hq6Format";

const KEYS = {
  salesPerson: "Sales person",
  serviceStaff: "Service staff",
  mileage: "Mileage",
  plateNumber: "Plate number",
  carModelYear: "Car model & year",
  vehicleTimeIn: "Vehicle time in",
  vehicleRelease: "Vehicle release",
  customerLocation: "Customer location",
  payTerm: "Pay term",
  invoiceScheme: "Invoice scheme",
  shippingDetails: "Shipping details",
  deliveredTo: "Delivered to",
  deliveryPerson: "Delivery person",
  shippingCharges: "Shipping charges",
  additionalExpense: "Additional expense",
  redeemedPoints: "Redeemed points",
} as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readNoteLine(notes: string | null | undefined, label: string): string | null {
  if (!notes?.trim()) return null;
  const re = new RegExp(
    `^${escapeRegExp(label)}:\\s*(.+)$`,
    "im",
  );
  const match = notes.match(re);
  const value = match?.[1]?.trim();
  return value || null;
}

function upsertNoteLine(
  notes: string | null | undefined,
  label: string,
  value: string | null | undefined,
): string | undefined {
  const lines = (notes ?? "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  const re = new RegExp(`^${escapeRegExp(label)}:\\s*`, "i");
  const without = lines.filter((line) => !re.test(line));
  const trimmed = value?.trim();
  if (trimmed) {
    without.push(`${label}: ${trimmed}`);
  }
  return without.length > 0 ? without.join("\n") : undefined;
}

export type ParsedSaleInvoiceNotes = {
  salesPerson: string | null;
  serviceStaff: string | null;
  mileage: string | null;
  plateNumber: string | null;
  carModelYear: string | null;
  vehicleTimeIn: string | null;
  vehicleRelease: string | null;
  customerLocation: string | null;
  payTermValue: string | null;
  payTermUnit: string | null;
  invoiceScheme: string | null;
  shippingDetails: string | null;
  deliveredTo: string | null;
  deliveryPerson: string | null;
  shippingCharges: string | null;
  redeemedPoints: string | null;
  additionalExpenses: Array<{ name: string; amount: string }>;
};

function parsePayTerm(raw: string | null): {
  payTermValue: string | null;
  payTermUnit: string | null;
} {
  if (!raw) return { payTermValue: null, payTermUnit: null };
  const match = raw.trim().match(/^(\d+(?:\.\d+)?)\s*(days|months)?$/i);
  if (!match) {
    return { payTermValue: raw.trim(), payTermUnit: null };
  }
  return {
    payTermValue: match[1] ?? null,
    payTermUnit: match[2]?.toLowerCase() ?? null,
  };
}

function parseAdditionalExpenses(
  notes: string | null | undefined,
): Array<{ name: string; amount: string }> {
  if (!notes?.trim()) return [];
  const rows: Array<{ name: string; amount: string }> = [];
  for (const line of notes.split("\n")) {
    const match = line
      .trim()
      .match(/^Additional expense:\s*(.+?)\s+\(([\d.]+)\)$/i);
    if (!match) continue;
    rows.push({
      name: match[1]!.trim(),
      amount: match[2]!.trim(),
    });
  }
  return rows;
}

export function parseSaleInvoiceNotes(notes: string | null | undefined): ParsedSaleInvoiceNotes {
  const payTerm = parsePayTerm(readNoteLine(notes, KEYS.payTerm));
  return {
    salesPerson: readNoteLine(notes, KEYS.salesPerson),
    serviceStaff: readNoteLine(notes, KEYS.serviceStaff),
    mileage: readNoteLine(notes, KEYS.mileage),
    plateNumber: readNoteLine(notes, KEYS.plateNumber),
    carModelYear: readNoteLine(notes, KEYS.carModelYear),
    vehicleTimeIn: readNoteLine(notes, KEYS.vehicleTimeIn),
    vehicleRelease: readNoteLine(notes, KEYS.vehicleRelease),
    customerLocation: readNoteLine(notes, KEYS.customerLocation),
    payTermValue: payTerm.payTermValue,
    payTermUnit: payTerm.payTermUnit,
    invoiceScheme: readNoteLine(notes, KEYS.invoiceScheme),
    shippingDetails: readNoteLine(notes, KEYS.shippingDetails),
    deliveredTo: readNoteLine(notes, KEYS.deliveredTo),
    deliveryPerson: readNoteLine(notes, KEYS.deliveryPerson),
    shippingCharges: readNoteLine(notes, KEYS.shippingCharges),
    redeemedPoints: readNoteLine(notes, KEYS.redeemedPoints),
    additionalExpenses: parseAdditionalExpenses(notes),
  };
}

export function withSaleInvoiceNoteFields(
  baseNotes: string | null | undefined,
  fields: {
    salesPerson?: string | null;
    serviceStaff?: string | null;
    mileage?: string | null;
    plateNumber?: string | null;
    carModelYear?: string | null;
    vehicleTimeIn?: string | null;
    vehicleRelease?: string | null;
  },
): string | undefined {
  let notes = baseNotes ?? undefined;
  if (fields.salesPerson !== undefined) {
    notes = upsertNoteLine(notes, KEYS.salesPerson, fields.salesPerson);
  }
  if (fields.serviceStaff !== undefined) {
    notes = upsertNoteLine(notes, KEYS.serviceStaff, fields.serviceStaff);
  }
  if (fields.mileage !== undefined) {
    notes = upsertNoteLine(notes, KEYS.mileage, fields.mileage);
  }
  if (fields.plateNumber !== undefined) {
    notes = upsertNoteLine(notes, KEYS.plateNumber, fields.plateNumber);
  }
  if (fields.carModelYear !== undefined) {
    notes = upsertNoteLine(notes, KEYS.carModelYear, fields.carModelYear);
  }
  if (fields.vehicleTimeIn !== undefined) {
    notes = upsertNoteLine(notes, KEYS.vehicleTimeIn, fields.vehicleTimeIn);
  }
  if (fields.vehicleRelease !== undefined) {
    notes = upsertNoteLine(notes, KEYS.vehicleRelease, fields.vehicleRelease);
  }
  return notes;
}

const STRUCTURED_SELL_NOTE_LINE =
  /^(Sales person|Service staff|Mileage|Plate number|Car model & year|Vehicle time in|Vehicle release|Customer location|Pay term|Invoice scheme|Shipping details|Delivered to|Delivery person|Shipping charges|Additional expense|Redeemed points):/i;

/** ISO / datetime-local tokens that leak into sell-note display. */
const NOTE_TIMESTAMP_RE =
  /\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?\b/g;

/** Free-text sell note only — drop structured invoice meta lines. */
export function sellNoteOnly(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null;
  const kept = notes
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !STRUCTURED_SELL_NOTE_LINE.test(line));
  return kept.length > 0 ? kept.join("\n") : null;
}

function formatNoteTimestampToken(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return formatHq6Date(raw) || raw;
  }
  const formatted = formatHq6DateTime(raw);
  return formatted || raw;
}

/** Rewrite ISO / datetime-local stamps to HQ6 DD-MM-YYYY [HH:mm]. */
export function formatTimestampsInNoteText(text: string): string {
  return text.replace(NOTE_TIMESTAMP_RE, formatNoteTimestampToken);
}

/**
 * Sell-note / notes blob display — rewrite ISO / datetime-local stamps to
 * HQ6 DD-MM-YYYY [HH:mm] so users never see raw timestamps.
 */
export function formatSaleNotesForDisplay(
  notes: string | null | undefined,
): string {
  if (!notes?.trim()) return "";
  return formatTimestampsInNoteText(notes.trim());
}
