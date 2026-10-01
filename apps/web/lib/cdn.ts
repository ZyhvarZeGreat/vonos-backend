/**
 * Static website imagery lives on Cloudflare R2 (zero egress) instead of the
 * Vercel deployment. NEXT_PUBLIC_CDN_URL is the CDN root, e.g.
 *
 *   NEXT_PUBLIC_CDN_URL=https://pub-<hash>.r2.dev/static
 *
 * When it is unset (local dev / previews) every helper below is a pass-through
 * and the same files are served from apps/web/public as before.
 */
const RAW_BASE = process.env.NEXT_PUBLIC_CDN_URL?.trim() ?? "";

export const CDN_BASE = RAW_BASE.replace(/\/+$/, "");

const IS_ABSOLUTE = /^[a-z][a-z0-9+.-]*:\/\//i;

export function isAbsoluteUrl(value: string): boolean {
  return IS_ABSOLUTE.test(value);
}

/** Rewrite a public path ("/images/x.jpg") to its CDN URL. */
export function cdn(path: string): string {
  if (!CDN_BASE || !path.startsWith("/") || isAbsoluteUrl(path)) return path;
  return `${CDN_BASE}${path}`;
}
