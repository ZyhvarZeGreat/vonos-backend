import type { MetadataRoute } from "next";

import { BLOG_POSTS } from "@/lib/marketing/blog-posts";
import { SERVICES, servicePath } from "@/lib/marketing/services";
import { fetchAllStoreProductsForSitemap } from "@/lib/marketing/store-api";
import { absoluteUrl, shopProductPath } from "@/lib/seo/site";

const STATIC_PATHS = [
  "/",
  "/services",
  "/about",
  "/academy",
  "/contact",
  "/blog",
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

  const blogEntries: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const serviceEntries: MetadataRoute.Sitemap = SERVICES.map((service) => ({
    url: absoluteUrl(servicePath(service.slug)),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  let productEntries: MetadataRoute.Sitemap = [];
  try {
    // Never let a slow/unreachable API stall the build — sitemap degrades to
    // static + blog + service entries when the catalog can't be reached.
    const products = await fetchAllStoreProductsForSitemap(2000, AbortSignal.timeout(8000));
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

  return [...staticEntries, ...serviceEntries, ...blogEntries, ...productEntries];
}
