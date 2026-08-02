/**
 * Ultimate POS stylesheet lifecycle — shared by login preload + shell mount.
 * Keeping links in <head> (not CSS modules) so AdminLTE can unload for auth pages.
 */

import { withBasePath } from "@/lib/utils/basePath";

const UPOS_STYLESHEET_PATHS = [
  "/upos/tailwind-app.css",
  "/upos/vendor.css",
  "/upos/app.css",
  "/upos/bridge.css",
  "/upos/hq6-users-lift.css",
] as const;

export const UPOS_STYLESHEETS = UPOS_STYLESHEET_PATHS.map((href) =>
  withBasePath(href),
);

export function uposStylesheetId(href: string): string {
  return `upos-css-${href.replace(/\W+/g, "-")}`;
}

let styleRefCount = 0;

export function retainUposStyles(): number {
  styleRefCount += 1;
  return styleRefCount;
}

export function releaseUposStyles(): number {
  styleRefCount = Math.max(0, styleRefCount - 1);
  return styleRefCount;
}

export function uposStyleConsumerCount(): number {
  return styleRefCount;
}

function whenLinkReady(link: HTMLLinkElement): Promise<void> {
  if (link.sheet) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      link.removeEventListener("load", done);
      link.removeEventListener("error", done);
      resolve();
    };
    link.addEventListener("load", done);
    link.addEventListener("error", done);
  });
}

/** Warm the browser cache on /login without applying AdminLTE rules yet. */
export function preloadUposStylesheets(): void {
  if (typeof document === "undefined") return;
  for (const href of UPOS_STYLESHEETS) {
    const id = uposStylesheetId(href);
    if (document.getElementById(id)) continue;
    if (
      document.querySelector(
        `link[rel="preload"][as="style"][href="${href}"]`,
      )
    ) {
      continue;
    }
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "style";
    link.href = href;
    link.dataset.uposPreload = "1";
    document.head.appendChild(link);
  }
}

/**
 * Ensure active stylesheets are in the document (promotes preloads).
 * Resolves when every sheet has loaded (or errored).
 */
export function ensureUposStylesheets(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();

  const waits: Promise<void>[] = [];

  for (const href of UPOS_STYLESHEETS) {
    const id = uposStylesheetId(href);
    let link = document.getElementById(id) as HTMLLinkElement | null;

    if (!link) {
      const preload = document.querySelector(
        `link[rel="preload"][as="style"][href="${href}"]`,
      ) as HTMLLinkElement | null;
      if (preload) {
        preload.id = id;
        preload.rel = "stylesheet";
        preload.removeAttribute("as");
        delete preload.dataset.uposPreload;
        link = preload;
      }
    }

    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    } else if (link.rel === "preload") {
      link.rel = "stylesheet";
      link.removeAttribute("as");
    }

    waits.push(whenLinkReady(link));
  }

  return Promise.all(waits).then(() => undefined);
}

export function removeUposStylesheets(): void {
  if (typeof document === "undefined") return;
  for (const href of UPOS_STYLESHEETS) {
    document.getElementById(uposStylesheetId(href))?.remove();
  }
  document
    .querySelectorAll('link[data-upos-preload="1"]')
    .forEach((node) => node.remove());
}
