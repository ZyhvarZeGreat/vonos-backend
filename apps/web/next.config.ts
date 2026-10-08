import type { NextConfig } from "next";

/** e.g. `/operations` on the apex domain. Leave unset for local `/`. */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "")
  .trim()
  .replace(/\/+$/, "");

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    loader: "custom",
    loaderFile: "./lib/vonosImageLoader.ts",
  },
  transpilePackages: ["@vonos/types"],
  env: {
    NEXT_PUBLIC_SKIP_AUTH:
      process.env.NEXT_PUBLIC_SKIP_AUTH ?? "false",
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  },
  async headers() {
    // Versioned/hashed static assets are immutable — cache for a year so
    // repeat visits never re-hit the Vercel CDN. (R2 serves /images in prod
    // via NEXT_PUBLIC_CDN_URL; these headers cover local/preview + the rest.)
    const immutable = [
      {
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable",
      },
    ];
    return [
      { source: "/images/:path*", headers: immutable },
      { source: "/fonts/:path*", headers: immutable },
      { source: "/brand/:path*", headers: immutable },
      { source: "/upos/:path*", headers: immutable },
    ];
  },
  async redirects() {
    const redirects = [
      {
        source: "/VM/:path*",
        destination: "/VA/:path*",
        permanent: true,
      },
      {
        source: "/VMS/:path*",
        destination: "/VA/:path*",
        permanent: true,
      },
      {
        source: "/VSS/:path*",
        destination: "/VISP/:path*",
        permanent: true,
      },
      {
        source: "/VSS",
        destination: "/VISP",
        permanent: true,
      },
      {
        source: "/institute",
        destination: "/academy",
        permanent: true,
      },
      {
        source: "/institute/:path*",
        destination: "/academy",
        permanent: true,
      },
    ];

    // Apex `/` is the customer marketing site (app/(marketing)/page.tsx).
    // Ops entry remains /login, /VW/…, /operations/… — not redirected from `/`.

    // Only when the app is not already at basePath=/operations — otherwise
    // these would become /operations/operations/VC.
    if (basePath !== "/operations") {
      redirects.push(
        // Legacy double-mount guard (permanent → cached by browsers/CDN,
        // ~zero edge cost after first hit). Replaces the former middleware.ts
        // so the site runs with zero Edge middleware invocations.
        // tenantMount.ts generates correct URLs, so these only serve stale
        // bookmarks.
        {
          source: "/operations/operations/VC/:path*",
          destination: "/operations/VC/:path*",
          permanent: true,
        },
        {
          source: "/operations/operations/VS/:path*",
          destination: "/operations/VS/:path*",
          permanent: true,
        },
        {
          source: "/operations/operations/VKW/:path*",
          destination: "/operations/VKW/:path*",
          permanent: true,
        },
        {
          source: "/operations/VC",
          destination: "/operations/VC/overview",
          permanent: false,
        },
        {
          source: "/operations/VS",
          destination: "/operations/VS/overview",
          permanent: false,
        },
        {
          source: "/operations/VKW",
          destination: "/operations/VKW/overview",
          permanent: false,
        },
      );
    }

    return redirects;
  },
  // VC/VS/VKW live at app/operations/[tenant]/* (no rewrite). Rewrites fought
  // soft client navigations and 404'd when only app/operations/page.tsx existed.
};

export default nextConfig;
