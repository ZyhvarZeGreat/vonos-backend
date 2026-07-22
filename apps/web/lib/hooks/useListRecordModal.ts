"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface UseListRecordModalOptions {
  /** When set, open/close syncs with this query param (e.g. `record`). */
  syncUrlParam?: string;
}

/** Keeps list pages in place while opening a record detail modal. */
export function useListRecordModal(options?: UseListRecordModalOptions) {
  const syncUrlParam = options?.syncUrlParam;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlRecordId = syncUrlParam ? searchParams.get(syncUrlParam) : null;

  const [recordId, setRecordId] = useState<string | null>(urlRecordId);

  useEffect(() => {
    if (!syncUrlParam) return;
    setRecordId(urlRecordId);
  }, [syncUrlParam, urlRecordId]);

  const writeUrl = useCallback(
    (id: string | null) => {
      if (!syncUrlParam) return;
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set(syncUrlParam, id);
      else params.delete(syncUrlParam);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams, syncUrlParam],
  );

  const openRecord = useCallback(
    (id: string) => {
      setRecordId(id);
      writeUrl(id);
    },
    [writeUrl],
  );

  const closeRecord = useCallback(() => {
    setRecordId(null);
    writeUrl(null);
  }, [writeUrl]);

  return {
    recordId,
    isOpen: recordId !== null,
    openRecord,
    closeRecord,
  };
}
