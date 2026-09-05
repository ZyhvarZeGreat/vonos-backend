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
    ];

    // Apex `/` is the customer marketing site (app/(marketing)/page.tsx).
    // Ops entry remains /login, /VW/…, /operations/… — not redirected from `/`.

    // Only when the app is not already at basePath=/operations — otherwise
    // these would become /operations/operations/VC.
    if (basePath !== "/operations") {
      redirects.push(
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
