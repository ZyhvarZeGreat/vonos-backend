export interface CompositeCursor {
  sortValue: string;
  id: string;
}

export function encodeCompositeCursor(cursor: CompositeCursor): string {
  const json = JSON.stringify(cursor);
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  return Buffer.from(json).toString("base64url");
}

export function compositeListCursor(
  row: { id: string } & Record<string, unknown>,
  sortBy: string,
  sortValueType: "string" | "date" | "number" = "string",
): string {
  const raw = row[sortBy];
  let sortValue = "";
  if (raw instanceof Date) {
    sortValue = raw.toISOString();
  } else if (typeof raw === "number") {
    sortValue = String(raw);
  } else if (raw != null) {
    sortValue = String(raw);
  }
  if (sortValueType === "date" && sortValue && !sortValue.includes("T")) {
    sortValue = new Date(sortValue).toISOString();
  }
  return encodeCompositeCursor({ sortValue, id: row.id });
}

/** Build a composite cursor from a typed list row without requiring an index signature. */
export function compositeListCursorFrom(
  row: { id: string },
  sortBy: string,
  sortValueType: "string" | "date" | "number" = "string",
): string {
  return compositeListCursor(
    row as { id: string } & Record<string, unknown>,
    sortBy,
    sortValueType,
  );
}

export function saleListCursor(row: { id: string; date: string }): string {
  const sortValue = row.date.includes("T") ? row.date : new Date(row.date).toISOString();
  return encodeCompositeCursor({ sortValue, id: row.id });
}

export function customerListCursor(row: { id: string; name: string }): string {
  return encodeCompositeCursor({ sortValue: row.name, id: row.id });
}

export function itemListCursor(row: { id: string; name: string }): string {
  return encodeCompositeCursor({ sortValue: row.name, id: row.id });
}

export function ledgerListCursor(row: { id: string; date: string }): string {
  const sortValue = row.date.includes("T") ? row.date : new Date(row.date).toISOString();
  return encodeCompositeCursor({ sortValue, id: row.id });
}

export function movementListCursor(row: { id: string; date: string }): string {
  const sortValue = row.date.includes("T") ? row.date : new Date(row.date).toISOString();
  return encodeCompositeCursor({ sortValue, id: row.id });
}

export function nameListCursor(row: { id: string; name: string }): string {
  return encodeCompositeCursor({ sortValue: row.name, id: row.id });
}

export function payrollListCursor(row: {
  id: string;
  payrollMonth: string;
}): string {
  const sortValue = row.payrollMonth.includes("T")
    ? row.payrollMonth
    : new Date(row.payrollMonth).toISOString();
  return encodeCompositeCursor({ sortValue, id: row.id });
}
