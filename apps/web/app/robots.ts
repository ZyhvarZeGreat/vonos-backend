import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/seo/site";

/**
 * Tenant app workspaces (ops tool — authenticated, never indexable) and their
 * dynamic routes are the #1 source of crawler-driven edge renders.
 * Keep this in sync with APP_PREFIXES in middleware.ts.
 */
const APP_PREFIXES = [
  "/VA",
  "/VW",
  "/VISP",
  "/VSP",
  "/VC",
  "/VS",
  "/VKW",
  "/VP",
  "/admin",
  "/operations",
  "/dev",
  "/maintenance",
];

/** Scrapers/AI crawlers that ignore crawl-delay and hammer dynamic routes. */
const AI_AND_SCRAPER_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "CCBot",
  "PerplexityBot",
  "Google-Extended",
  "Bytespider",
  "Amazonbot",
  "Applebot-Extended",
  "Diffbot",
  "Omgilibot",
  "FacebookBot",
  "ImagesiftBot",
  "SemrushBot",
  "AhrefsBot",
  "DataForSeoBot",
  "MJ12bot",
  "DotBot",
  "PetalBot",
];

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          ...APP_PREFIXES,
          ...APP_PREFIXES.map((p) => `${p}/`),
          "/login",
          "/invite",
          "/reset-password",
          "/shop/cart",
          "/shop/checkout",
          "/shop/confirmation",
          "/invoice",
        ],
      },
      {
        userAgent: AI_AND_SCRAPER_BOTS,
        disallow: "/",
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
