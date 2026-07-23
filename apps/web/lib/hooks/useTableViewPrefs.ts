"use client";

import { useCallback, useEffect, useState } from "react";
import type { TableDensity } from "@/lib/utils/tableColumnAlign";

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

function removeKey(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Persist column visibility + density for a table list key. */
export function useTableViewPrefs(storageKey: string | undefined) {
  const colsKey = storageKey ? `vonos.tableCols.${storageKey}` : null;
  const densityKey = storageKey ? `vonos.tableDensity.${storageKey}` : null;

  const [visibleColumnKeys, setVisibleColumnKeysState] = useState<
    string[] | null
  >(() => (colsKey ? readJson<string[]>(colsKey) : null));
  const [density, setDensityState] = useState<TableDensity>(() => {
    const stored = densityKey ? readJson<TableDensity>(densityKey) : null;
    return stored === "condensed" ||
      stored === "regular" ||
      stored === "relaxed"
      ? stored
      : "regular";
  });

  useEffect(() => {
    if (!colsKey) return;
    const stored = readJson<string[]>(colsKey);
    setVisibleColumnKeysState(stored);
  }, [colsKey]);

  useEffect(() => {
    if (!densityKey) return;
    const stored = readJson<TableDensity>(densityKey);
    if (
      stored === "condensed" ||
      stored === "regular" ||
      stored === "relaxed"
    ) {
      setDensityState(stored);
    }
  }, [densityKey]);

  const setVisibleColumnKeys = useCallback(
    (keys: string[] | null) => {
      setVisibleColumnKeysState(keys);
      if (!colsKey) return;
      if (keys == null) removeKey(colsKey);
      else writeJson(colsKey, keys);
    },
    [colsKey],
  );

  const setDensity = useCallback(
    (next: TableDensity) => {
      setDensityState(next);
      if (densityKey) writeJson(densityKey, next);
    },
    [densityKey],
  );

  const resetColumnVisibility = useCallback(() => {
    setVisibleColumnKeys(null);
  }, [setVisibleColumnKeys]);

  return {
    visibleColumnKeys,
    setVisibleColumnKeys,
    density,
    setDensity,
    resetColumnVisibility,
  };
}
