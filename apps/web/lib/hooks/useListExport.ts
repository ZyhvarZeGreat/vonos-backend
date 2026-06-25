"use client";

import { useCallback } from "react";
import type { CsvExportPayload } from "@/lib/utils/exportCsv";
import { useUiStore } from "@/stores/uiStore";

export function useListExport() {
  const openExportModal = useUiStore((state) => state.openExportModal);

  return useCallback(
    (
      filename: string,
      columns: CsvExportPayload["columns"],
      rows: CsvExportPayload["rows"],
      title = "Export",
    ) => {
      openExportModal(
        { title, subtitle: "Download the current filtered view as a spreadsheet (CSV)" },
        { filename, columns, rows },
      );
    },
    [openExportModal],
  );
}
