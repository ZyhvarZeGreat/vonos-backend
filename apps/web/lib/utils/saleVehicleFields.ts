/**
 * Derive plate / car model labels for print docs from customer + job vehicle text.
 * Customer names often encode plate (e.g. "MR FORTUNE HONDA ACCORD 2010 KUJ-344EM").
 */
export function saleVehicleFields(input: {
  customerName?: string | null;
  vehicleLabel?: string | null;
}): { plateNumber: string | null; carModelYear: string | null } {
  const vehicle = (input.vehicleLabel ?? "").trim();
  const customer = (input.customerName ?? "").trim();
  const haystack = `${vehicle} ${customer}`.trim();

  const plateMatch = haystack.match(
    /\b([A-Z]{2,3}[- ]?\d{2,4}[A-Z]{0,3})\b/i,
  );
  const plateNumber = plateMatch?.[1]?.replace(/\s+/g, "-").toUpperCase() ?? null;

  let carModelYear: string | null = null;
  if (vehicle) {
    // API shape: "make-model plate"
    const withoutPlate = plateNumber
      ? vehicle.replace(new RegExp(plateNumber.replace(/-/g, "[- ]?"), "i"), "")
      : vehicle;
    carModelYear =
      withoutPlate
        .replace(/-/g, " ")
        .replace(/\s+/g, " ")
        .trim() || null;
  }

  if (!carModelYear && customer && plateNumber) {
    const stripped = customer
      .replace(new RegExp(plateNumber.replace(/-/g, "[- ]?"), "i"), "")
      .replace(/^(mr|mrs|miss|ms)\.?\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();
    carModelYear = stripped || null;
  }

  return { plateNumber, carModelYear };
}
