"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface UseListRecordModalOptions {
  /** When set, open/close syncs with this query param (e.g. `record`). */
  syncUrlParam?: string;
  /** Prefetch / seed the record view query before or as the modal opens. */
  onPrefetchRecord?: (id: string) => void;
}

/** Keeps list pages in place while opening a record detail modal. */
export function useListRecordModal<TSeed = unknown>(
  options?: UseListRecordModalOptions,
) {
  const syncUrlParam = options?.syncUrlParam;
  const onPrefetchRecord = options?.onPrefetchRecord;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlRecordId = syncUrlParam ? searchParams.get(syncUrlParam) : null;

  const [recordId, setRecordId] = useState<string | null>(urlRecordId);
  const [recordSeed, setRecordSeed] = useState<TSeed | null>(null);

  useEffect(() => {
    if (!syncUrlParam) return;
    setRecordId(urlRecordId);
    if (!urlRecordId) setRecordSeed(null);
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
    (id: string, seed?: TSeed) => {
      onPrefetchRecord?.(id);
      setRecordSeed(seed ?? null);
      setRecordId(id);
      writeUrl(id);
    },
    [onPrefetchRecord, writeUrl],
  );

  const closeRecord = useCallback(() => {
    setRecordId(null);
    setRecordSeed(null);
    writeUrl(null);
  }, [writeUrl]);

  return {
    recordId,
    recordSeed,
    isOpen: recordId !== null,
    openRecord,
    closeRecord,
  };
}
