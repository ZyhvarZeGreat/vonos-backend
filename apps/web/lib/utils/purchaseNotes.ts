/**
 * Purchase `StockMovement.notes` is a free-text blob. Add Purchase packs
 * additional notes + metadata (+ optional "Payment note:") as newline lines.
 * Legacy rows sometimes use `|` segments (supplier | rest).
 */
export type ParsedPurchaseNotes = {
  additionalNotes: string;
  paymentNote: string;
  shippingDetails: string;
};

const META_PREFIX =
  /^(Pay term:|Purchase order:|Discount:|Purchase tax:|Shipping charges:|Extra expense:|Payment:|Payment account id:)/i;

export function parsePurchaseNotes(
  notes: string | null | undefined,
): ParsedPurchaseNotes {
  const raw = notes?.trim() ?? "";
  if (!raw) {
    return { additionalNotes: "", paymentNote: "", shippingDetails: "" };
  }

  const segments = raw.includes("\n")
    ? raw.split("\n").map((s) => s.trim()).filter(Boolean)
    : raw.split("|").map((s) => s.trim()).filter(Boolean);

  // Legacy `|` blobs: first segment is often the supplier label when no supplierId.
  const start =
    !raw.includes("\n") && segments.length > 1 ? 1 : 0;

  let paymentNote = "";
  let shippingDetails = "";
  const additional: string[] = [];

  for (let i = start; i < segments.length; i++) {
    const line = segments[i]!;
    const pay = line.match(/^Payment note:\s*(.*)$/i);
    if (pay) {
      paymentNote = pay[1]!.trim();
      continue;
    }
    const ship = line.match(/^Shipping details:\s*(.*)$/i);
    if (ship) {
      shippingDetails = ship[1]!.trim();
      continue;
    }
    if (META_PREFIX.test(line)) continue;
    additional.push(line);
  }

  return {
    additionalNotes: additional.join("\n").trim(),
    paymentNote,
    shippingDetails,
  };
}
