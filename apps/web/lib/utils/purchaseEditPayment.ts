/** Payment math for Add Purchase — edit must not re-post existing payments. */
export function purchaseAlreadyPaid(
  editId: string | null | undefined,
  totalPaid: number | null | undefined,
  paymentRows: Array<{ amount?: number | null }>,
): number {
  if (!editId) return 0;
  const fromCache = Math.max(0, Number(totalPaid ?? 0));
  const fromRows = paymentRows.reduce(
    (sum, row) => sum + Math.max(0, Number(row.amount ?? 0)),
    0,
  );
  return Math.max(fromCache, fromRows);
}

export function purchaseAdditionalPaymentAmount(
  editId: string | null | undefined,
  paymentAmount: number,
  alreadyPaid: number,
): number {
  if (!editId) return Math.max(0, paymentAmount);
  return Math.max(0, paymentAmount - alreadyPaid);
}

/** Keep PO reference stable on edit — never mint a new ref when the field is blank. */
export function purchaseSaveReference(
  formReference: string,
  editId: string | null | undefined,
  existingReference: string | null | undefined,
): string {
  const trimmed = formReference.trim();
  if (trimmed) return trimmed;
  if (editId && existingReference?.trim()) return existingReference.trim();
  return `PO-${Date.now()}`;
}
