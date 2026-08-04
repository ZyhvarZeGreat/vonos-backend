/**
 * Structured sale-note keys used for invoice print fields that are not
 * first-class Sale columns yet (sales person, mileage, vehicle time in).
 */

const KEYS = {
  salesPerson: "Sales person",
  serviceStaff: "Service staff",
  mileage: "Mileage",
  vehicleTimeIn: "Vehicle time in",
  vehicleRelease: "Vehicle release",
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

export function parseSaleInvoiceNotes(notes: string | null | undefined): {
  salesPerson: string | null;
  serviceStaff: string | null;
  mileage: string | null;
  vehicleTimeIn: string | null;
} {
  return {
    salesPerson: readNoteLine(notes, KEYS.salesPerson),
    serviceStaff: readNoteLine(notes, KEYS.serviceStaff),
    mileage: readNoteLine(notes, KEYS.mileage),
    vehicleTimeIn: readNoteLine(notes, KEYS.vehicleTimeIn),
  };
}

export function withSaleInvoiceNoteFields(
  baseNotes: string | null | undefined,
  fields: {
    salesPerson?: string | null;
    serviceStaff?: string | null;
    mileage?: string | null;
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
  if (fields.vehicleTimeIn !== undefined) {
    notes = upsertNoteLine(notes, KEYS.vehicleTimeIn, fields.vehicleTimeIn);
  }
  if (fields.vehicleRelease !== undefined) {
    notes = upsertNoteLine(notes, KEYS.vehicleRelease, fields.vehicleRelease);
  }
  return notes;
}
