"use client";

import { useEffect } from "react";

const UPOS_STYLESHEETS = [
  "/upos/tailwind-app.css",
  "/upos/vendor.css",
  "/upos/app.css",
  "/upos/bridge.css",
  "/upos/hq6-users-lift.css",
] as const;

/**
 * Loads Ultimate POS vendor + app CSS for HQ6 tenants.
 * These are the real UPOS stylesheets (copied from UltimatePOS-V7.1/public/css).
 */
export function Hq6UposStyles() {
  useEffect(() => {
    const created: HTMLLinkElement[] = [];
    for (const href of UPOS_STYLESHEETS) {
      const id = `upos-css-${href.replace(/\W+/g, "-")}`;
      if (document.getElementById(id)) continue;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
      created.push(link);
    }
    document.documentElement.classList.add("upos-hq6");
    return () => {
      document.documentElement.classList.remove("upos-hq6");
      // Keep stylesheets cached across navigations within HQ6;
      // only remove class so non-HQ6 routes aren't forced into UPOS skin.
    };
  }, []);

  return null;
}
