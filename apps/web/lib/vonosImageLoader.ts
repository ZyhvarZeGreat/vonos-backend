/**
 * next/image does NOT auto-prefix `basePath` on `src` (unlike next/link).
 * Return the static public URL with basePath — no `/_next/image` wrapper
 * (custom loaders replace the optimizer; wrapping it caused broken logos).
 *
 * Wired via `images.loaderFile` in next.config.ts.
 */
export default function vonosImageLoader({
  src,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");
  if (/^(https?:|data:|blob:)/i.test(src)) return src;

  const path = src.startsWith("/") ? src : `/${src}`;
  if (!base) return path;
  if (path === base || path.startsWith(`${base}/`)) return path;
  return `${base}${path}`;
}
