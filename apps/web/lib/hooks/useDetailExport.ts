"use client";

import { useCallback } from "react";
import type { CsvExportPayload } from "@/lib/utils/exportCsv";
import { useUiStore } from "@/stores/uiStore";

export function useDetailExport() {
  const openExportModal = useUiStore((state) => state.openExportModal);

  return useCallback(
    (title: string, payload: CsvExportPayload) => {
      openExportModal(
        { title, subtitle: "Download as a spreadsheet (CSV opens in Excel)" },
        payload,
      );
    },
    [openExportModal],
  );
}
