"use client";

import { useLayoutEffect } from "react";
import {
  ensureUposStylesheets,
  releaseUposStyles,
  removeUposStylesheets,
  retainUposStyles,
  uposStyleConsumerCount,
} from "@/lib/upos/styles";

/**
 * Loads Ultimate POS vendor + app CSS for HQ6 / admin shells.
 * Removes stylesheets when the last consumer unmounts so auth pages
 * are not broken by leftover AdminLTE rules.
 */
export function Hq6UposStyles({
  onReady,
}: {
  onReady?: () => void;
} = {}) {
  useLayoutEffect(() => {
    retainUposStyles();
    document.documentElement.classList.add("upos-hq6");

    let cancelled = false;
    void ensureUposStylesheets().then(() => {
      if (!cancelled) onReady?.();
    });

    return () => {
      cancelled = true;
      releaseUposStyles();
      if (uposStyleConsumerCount() > 0) return;
      document.documentElement.classList.remove("upos-hq6");
      removeUposStylesheets();
    };
  }, [onReady]);

  return null;
}
