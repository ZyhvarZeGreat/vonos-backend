import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/login",
          "/invite",
          "/reset-password",
          "/operations",
          "/operations/",
          "/shop/cart",
          "/shop/checkout",
          "/shop/confirmation",
          "/invoice",
          "/maintenance",
          "/dev",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
