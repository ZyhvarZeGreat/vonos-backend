export interface CsvExportColumn {
  key: string;
  header: string;
}

export interface CsvExportPayload {
  filename: string;
  columns: CsvExportColumn[];
  rows: Record<string, string | number | null | undefined>[];
}

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadCsv(payload: CsvExportPayload): void {
  const header = payload.columns.map((col) => escapeCsvCell(col.header)).join(",");
  const lines = payload.rows.map((row) =>
    payload.columns
      .map((col) => {
        const raw = row[col.key];
        const text = raw === null || raw === undefined ? "" : String(raw);
        return escapeCsvCell(text);
      })
      .join(","),
  );
  // BOM helps Excel open UTF-8 CSV correctly.
  const csv = `\uFEFF${[header, ...lines].join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = payload.filename.endsWith(".csv")
    ? payload.filename
    : `${payload.filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Excel-friendly CSV (same as downloadCsv — Excel opens .csv natively). */
export function downloadExcelCsv(payload: CsvExportPayload): void {
  const base = payload.filename.replace(/\.csv$/i, "");
  downloadCsv({ ...payload, filename: `${base}.csv` });
}
