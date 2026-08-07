/**
 * Derive plate / car model / clean customer name for print docs.
 * Customer names often encode plate + model
 * (e.g. "MR JOSHUA OKAFOR T.COROLLA 2009 GWA-425SF").
 */

const PLATE_RE = /\b([A-Z]{2,3}[- ]?\d{2,4}[A-Z]{0,3})\b/i;

const HONORIFIC_RE = /^(mr|mrs|miss|ms|alh|alhaji|chief|dr|eng|engr)\.?\s+/i;

const MODEL_TOKEN_RE =
  /\b((?:T\.?\s*)?(?:COROLLA|CAMRY|ACCORD|CIVIC|HIGHLANDER|RAV4|LAND\s*CRUISER|PRADO|HILUX|PATHFINDER|ALTIMA|SENTRA|PEUGEOT|BENZ|MERCEDES|BMW|LEXUS|TOYOTA|HONDA|NISSAN|FORD|HYUNDAI|KIA|MAZDA|VOLKSWAGEN|GOLF|PASSAT|PICANTO|ELANTRA|SONATA|SPARK|MATRIX|AVENSIS|YARIS|SIENNA|INNOVA)(?:\s+[A-Z0-9./-]*)?(?:\s+20\d{2})?)\b/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractPlate(haystack: string): string | null {
  const plateMatch = haystack.match(PLATE_RE);
  return plateMatch?.[1]?.replace(/\s+/g, "-").toUpperCase() ?? null;
}

function stripPlate(text: string, plate: string | null): string {
  if (!plate) return text.trim();
  return text
    .replace(new RegExp(escapeRegExp(plate).replace(/-/g, "[- ]?"), "i"), " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pull a known car model token; never return a multi-word person name. */
function extractModelYear(text: string): string | null {
  const match = text.match(MODEL_TOKEN_RE);
  if (match?.[1]) return match[1].replace(/\s+/g, " ").trim();

  // Trailing "T.COROLLA" / "COROLLA 2009" style without brand list hit.
  const trailing = text.match(
    /\b((?:T\.?\s*)[A-Z][A-Z0-9./-]*(?:\s+20\d{2})?)\s*$/i,
  );
  if (trailing?.[1]) return trailing[1].replace(/\s+/g, " ").trim();

  const yearTail = text.match(/\b([A-Z][A-Z0-9./-]{1,20}\s+20\d{2})\s*$/i);
  if (yearTail?.[1] && yearTail[1].split(/\s+/).length <= 3) {
    return yearTail[1].replace(/\s+/g, " ").trim();
  }

  return null;
}

export function saleVehicleFields(input: {
  customerName?: string | null;
  vehicleLabel?: string | null;
  /** Explicit plate from sale notes / contact ID — wins over name parsing. */
  plateNumber?: string | null;
  /** Explicit car model & year from sale notes / contact custom field. */
  carModelYear?: string | null;
}): {
  customerDisplay: string;
  plateNumber: string | null;
  carModelYear: string | null;
} {
  const vehicle = (input.vehicleLabel ?? "").trim();
  const customer = (input.customerName ?? "").trim();
  const haystack = `${vehicle} ${customer}`.trim();

  const explicitPlate = input.plateNumber?.trim() || null;
  const plateNumber = explicitPlate || extractPlate(haystack);

  // Prefer structured note/contact fields, then vehicle label / customer name.
  const explicitCar = input.carModelYear?.trim() || null;
  const carModelYear =
    explicitCar ||
    extractModelYear(stripPlate(vehicle, plateNumber)) ||
    extractModelYear(stripPlate(customer, plateNumber)) ||
    null;

  let customerDisplay = customer || "Walk-in Customer";

  if (customer) {
    let working = stripPlate(customer, plateNumber);
    if (carModelYear) {
      working = working
        .replace(new RegExp(escapeRegExp(carModelYear), "i"), " ")
        .replace(/\s+/g, " ")
        .trim();
    }
    // Drop leftover lone "T." / "T" after model strip.
    working = working.replace(/\bT\.?\s*$/i, "").replace(/\s+/g, " ").trim();

    const honorific = customer.match(HONORIFIC_RE)?.[0] ?? "";
    const withoutHonorific = working.replace(HONORIFIC_RE, "").trim();
    customerDisplay =
      ((honorific ? honorific : "") + (withoutHonorific || working)).trim() ||
      customer;
    customerDisplay = customerDisplay.replace(/\s+/g, " ").trim();
  }

  return { customerDisplay, plateNumber, carModelYear };
}
