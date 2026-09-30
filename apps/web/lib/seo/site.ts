export const SITE_NAME = "Vonos";

export function siteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/+$/, "")}`;
  }
  return "http://localhost:3000";
}

export function absoluteUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl()}${normalized}`;
}

export function shopProductPath(sku: string): string {
  return `/shop/${encodeURIComponent(sku.trim())}`;
}

export const DEFAULT_OG_IMAGE = "/images/vonos-photos/IMG_0437.jpg";

export const DEFAULT_KEYWORDS = [
  "Vonos",
  "auto workshop Abuja",
  "car servicing Kubwa",
  "car repair Abuja",
  "car diagnostics Abuja",
  "genuine auto parts Nigeria",
  "brake pads Abuja",
  "Toyota servicing Abuja",
];
