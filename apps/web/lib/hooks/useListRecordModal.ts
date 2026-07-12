"use client";

import { useCallback, useState } from "react";

/** Keeps list pages in place while opening a record detail modal. */
export function useListRecordModal() {
  const [recordId, setRecordId] = useState<string | null>(null);

  const openRecord = useCallback((id: string) => {
    setRecordId(id);
  }, []);

  const closeRecord = useCallback(() => {
    setRecordId(null);
  }, []);

  return {
    recordId,
    isOpen: recordId !== null,
    openRecord,
    closeRecord,
  };
}
