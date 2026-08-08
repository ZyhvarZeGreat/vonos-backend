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

function toSafeCursorDate(raw: string): string {
  if (!raw.trim()) return new Date(0).toISOString();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? new Date(0).toISOString()
    : parsed.toISOString();
}

export function compositeListCursor(
  row: { id: string } & Record<string, unknown>,
  sortBy: string,
  sortValueType: "string" | "date" | "number" = "string",
): string {
  const raw = row[sortBy];
  let sortValue = "";
  if (raw instanceof Date) {
    sortValue = Number.isNaN(raw.getTime())
      ? new Date(0).toISOString()
      : raw.toISOString();
  } else if (typeof raw === "number") {
    sortValue = String(raw);
  } else if (raw != null) {
    sortValue = String(raw);
  }
  if (sortValueType === "date") {
    sortValue = toSafeCursorDate(sortValue);
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

export function customerListCursor(
  row: { id: string; name: string; createdAt?: string; updatedAt?: string },
  sortBy: string = "updatedAt",
): string {
  if (sortBy === "name") {
    return encodeCompositeCursor({ sortValue: row.name, id: row.id });
  }
  const raw =
    sortBy === "updatedAt"
      ? (row.updatedAt ?? row.createdAt ?? "")
      : (row.createdAt ?? "");
  const sortValue = toSafeCursorDate(raw);
  return encodeCompositeCursor({ sortValue, id: row.id });
}

/**
 * Matches items/catalog API default sort (`updatedAt` desc, then id).
 * Do not encode `name` here — the API treats the cursor sortValue as a Date.
 */
export function itemListCursor(row: {
  id: string;
  name?: string;
  updatedAt?: string;
  createdAt?: string;
}): string {
  return encodeCompositeCursor({
    sortValue: toSafeCursorDate(row.updatedAt || row.createdAt || ""),
    id: row.id,
  });
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

export function workforceListCursor(row: {
  id: string;
  employeeName: string;
}): string {
  return encodeCompositeCursor({ sortValue: row.employeeName, id: row.id });
}

export function userNameListCursor(row: {
  id: string;
  userName: string;
}): string {
  return encodeCompositeCursor({ sortValue: row.userName, id: row.id });
}

export function dateListCursor(row: { id: string; date: string }): string {
  const sortValue = row.date.includes("T")
    ? row.date
    : new Date(row.date).toISOString();
  return encodeCompositeCursor({ sortValue, id: row.id });
}

export function leaveListCursor(row: {
  id: string;
  leaveDate: string;
}): string {
  const sortValue = row.leaveDate.includes("T")
    ? row.leaveDate
    : new Date(row.leaveDate).toISOString();
  return encodeCompositeCursor({ sortValue, id: row.id });
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

export function createdAtListCursor(row: {
  id: string;
  createdAt: string;
}): string {
  const sortValue = row.createdAt.includes("T")
    ? row.createdAt
    : new Date(row.createdAt).toISOString();
  return encodeCompositeCursor({ sortValue, id: row.id });
}

export function plateListCursor(row: {
  id: string;
  plateNumber: string;
}): string {
  return encodeCompositeCursor({ sortValue: row.plateNumber, id: row.id });
}

export function expenseListCursor(row: {
  id: string;
  updatedAt?: string;
  expenseDate: string;
}): string {
  const raw = row.updatedAt || row.expenseDate;
  const sortValue = raw.includes("T")
    ? raw
    : new Date(raw).toISOString();
  return encodeCompositeCursor({ sortValue, id: row.id });
}

/** Newest activity first — prefer updatedAt, else createdAt. */
export function chronoListCursor(row: {
  id: string;
  updatedAt?: string;
  createdAt?: string;
}): string {
  return encodeCompositeCursor({
    sortValue: toSafeCursorDate(row.updatedAt || row.createdAt || ""),
    id: row.id,
  });
}

export function invoiceListCursor(row: {
  id: string;
  documentDate: string;
}): string {
  const sortValue = row.documentDate.includes("T")
    ? row.documentDate
    : new Date(row.documentDate).toISOString();
  return encodeCompositeCursor({ sortValue, id: row.id });
}

export function appointmentListCursor(row: {
  id: string;
  startTime: string;
}): string {
  const sortValue = row.startTime.includes("T")
    ? row.startTime
    : new Date(row.startTime).toISOString();
  return encodeCompositeCursor({ sortValue, id: row.id });
}

export function operationDateListCursor(row: {
  id: string;
  operationDate: string;
}): string {
  const sortValue = row.operationDate.includes("T")
    ? row.operationDate
    : new Date(row.operationDate).toISOString();
  return encodeCompositeCursor({ sortValue, id: row.id });
}
