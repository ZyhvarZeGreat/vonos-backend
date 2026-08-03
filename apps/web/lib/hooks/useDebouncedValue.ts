"use client";

import { useEffect, useState } from "react";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/search";

/** Debounce a value — list search / filter typedown before hitting the API. */
export function useDebouncedValue<T>(
  value: T,
  delayMs = SEARCH_DEBOUNCE_MS,
): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
