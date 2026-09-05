"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Applies Motocare/Webflow document classes for the public site only,
 * without changing the ERP root layout fonts/providers.
 */
export default function MarketingShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const htmlExtras = ["w-mod-js", "w-mod-ix3", "lenis"];
    const bodyExtras = ["body"];

    for (const cls of htmlExtras) html.classList.add(cls);
    for (const cls of bodyExtras) body.classList.add(cls);

    return () => {
      for (const cls of htmlExtras) html.classList.remove(cls);
      for (const cls of bodyExtras) body.classList.remove(cls);
    };
  }, []);

  return children;
}
