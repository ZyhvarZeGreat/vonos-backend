import { apiUrl } from "@/lib/api/client";

const LEGACY_HOST_RE =
  /(^|\.)vonosautos\.com$|(^|\.)vonosautomarket\.com$/i;

/**
 * Legacy Ultimate POS hosts hotlink-block our app origin. Route those image
 * URLs through the API media proxy (server fetch uses the host's own Referer).
 */
export function resolveProductImageUrl(
  src: string | null | undefined,
): string | null {
  const raw = src?.trim();
  if (!raw) return null;

  if (raw.startsWith("/media/")) {
    return apiUrl(raw);
  }

  let host: string;
  try {
    host = new URL(raw).hostname;
  } catch {
    return raw;
  }

  if (!LEGACY_HOST_RE.test(host)) return raw;
  if (!raw.includes("/uploads/")) return raw;

  return apiUrl(`/media/legacy?url=${encodeURIComponent(raw)}`);
}
