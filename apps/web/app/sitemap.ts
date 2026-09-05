import type { MetadataRoute } from "next";

import { fetchAllStoreProductsForSitemap } from "@/lib/marketing/store-api";
import { absoluteUrl, shopProductPath } from "@/lib/seo/site";

const STATIC_PATHS = [
  "/",
  "/services",
  "/about",
  "/contact",
  "/shop",
  "/track",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" || path === "/shop" ? "daily" : "weekly",
    priority: path === "/" ? 1 : path === "/shop" ? 0.9 : 0.7,
  }));

  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const products = await fetchAllStoreProductsForSitemap();
    productEntries = products
      .filter((product) => Boolean(product.sku))
      .map((product) => ({
        url: absoluteUrl(shopProductPath(product.sku!)),
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.8,
      }));
  } catch {
    productEntries = [];
  }

  return [...staticEntries, ...productEntries];
}
