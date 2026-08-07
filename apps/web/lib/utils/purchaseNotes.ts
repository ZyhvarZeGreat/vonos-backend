/**
 * Purchase `StockMovement.notes` is a free-text blob. Add Purchase packs
 * additional notes + metadata (+ optional "Payment note:") as newline lines.
 * Legacy rows sometimes use `|` segments (supplier | rest).
 */
export type ParsedPurchaseNotes = {
  additionalNotes: string;
  paymentNote: string;
  shippingDetails: string;
  payTermValue: string;
  payTermUnit: "days" | "months" | "";
  purchaseOrder: string;
  discountType: "none" | "fixed" | "percentage";
  discountAmount: string;
  purchaseTax: string;
  shippingCharges: string;
  extraExpenses: Array<{ name: string; amount: string }>;
  paymentAmount: string;
  paidOn: string;
  paymentMethod: string;
  paymentAccountId: string;
};

const META_PREFIX =
  /^(Pay term:|Purchase order:|Discount:|Purchase tax:|Shipping charges:|Extra expense:|Payment:|Payment account id:)/i;

function emptyParsedPurchaseNotes(): ParsedPurchaseNotes {
  return {
    additionalNotes: "",
    paymentNote: "",
    shippingDetails: "",
    payTermValue: "",
    payTermUnit: "",
    purchaseOrder: "",
    discountType: "none",
    discountAmount: "",
    purchaseTax: "",
    shippingCharges: "",
    extraExpenses: [],
    paymentAmount: "",
    paidOn: "",
    paymentMethod: "",
    paymentAccountId: "",
  };
}

export function parsePurchaseNotes(
  notes: string | null | undefined,
): ParsedPurchaseNotes {
  const parsed = emptyParsedPurchaseNotes();
  const raw = notes?.trim() ?? "";
  if (!raw) return parsed;

  const segments = raw.includes("\n")
    ? raw.split("\n").map((s) => s.trim()).filter(Boolean)
    : raw.split("|").map((s) => s.trim()).filter(Boolean);

  // Legacy `|` blobs: first segment is often the supplier label when no supplierId.
  const start =
    !raw.includes("\n") && segments.length > 1 ? 1 : 0;

  const additional: string[] = [];

  for (let i = start; i < segments.length; i++) {
    const line = segments[i]!;
    const payNote = line.match(/^Payment note:\s*(.*)$/i);
    if (payNote) {
      parsed.paymentNote = payNote[1]!.trim();
      continue;
    }
    const ship = line.match(/^Shipping details:\s*(.*)$/i);
    if (ship) {
      parsed.shippingDetails = ship[1]!.trim();
      continue;
    }
    const payTerm = line.match(/^Pay term:\s*(\S+)\s*(days|months)?$/i);
    if (payTerm) {
      parsed.payTermValue = payTerm[1]!.trim();
      parsed.payTermUnit =
        payTerm[2]?.toLowerCase() === "months" ? "months" : "days";
      continue;
    }
    const purchaseOrder = line.match(/^Purchase order:\s*(.*)$/i);
    if (purchaseOrder) {
      parsed.purchaseOrder = purchaseOrder[1]!.trim();
      continue;
    }
    const discount = line.match(/^Discount:\s*(\S+)\s*\((%|percentage|fixed)\)$/i);
    if (discount) {
      parsed.discountAmount = discount[1]!.trim();
      parsed.discountType =
        discount[2] === "fixed" ? "fixed" : "percentage";
      continue;
    }
    const tax = line.match(/^Purchase tax:\s*(.*)$/i);
    if (tax) {
      parsed.purchaseTax = tax[1]!.trim();
      continue;
    }
    const shippingCharges = line.match(/^Shipping charges:\s*(.*)$/i);
    if (shippingCharges) {
      parsed.shippingCharges = shippingCharges[1]!.trim();
      continue;
    }
    const extra = line.match(/^Extra expense:\s*(.*?)\s*=\s*([\d.]+)$/i);
    if (extra) {
      parsed.extraExpenses.push({
        name: extra[1]!.trim() === "—" ? "" : extra[1]!.trim(),
        amount: extra[2]!.trim(),
      });
      continue;
    }
    const payment = line.match(
      /^Payment:\s*([\d.]+)\s+via\s+(\S+)\s+on\s+(.+)$/i,
    );
    if (payment) {
      parsed.paymentAmount = payment[1]!.trim();
      parsed.paymentMethod = payment[2]!.trim();
      parsed.paidOn = payment[3]!.trim() === "—" ? "" : payment[3]!.trim();
      continue;
    }
    const account = line.match(/^Payment account id:\s*(.*)$/i);
    if (account) {
      parsed.paymentAccountId = account[1]!.trim();
      continue;
    }
    if (META_PREFIX.test(line)) continue;
    additional.push(line);
  }

  parsed.additionalNotes = additional.join("\n").trim();
  return parsed;
}
