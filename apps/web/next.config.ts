import type { NextConfig } from "next";

/** e.g. `/operations` on the apex domain. Leave unset for local `/`. */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "")
  .trim()
  .replace(/\/+$/, "");

/** Only when the app is not already mounted at `/operations` — avoids /operations/operations/VS. */
const nestOperationsTenants = basePath !== "/operations";

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
    return [
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
  },
  async rewrites() {
    if (!nestOperationsTenants) return [];
    // VC/VS/VKW public URLs start at /operations/{CODE}; map onto existing [tenant] pages.
    return [
      {
        source: "/operations/VC",
        destination: "/VC",
      },
      {
        source: "/operations/VC/:path*",
        destination: "/VC/:path*",
      },
      {
        source: "/operations/VS",
        destination: "/VS",
      },
      {
        source: "/operations/VS/:path*",
        destination: "/VS/:path*",
      },
      {
        source: "/operations/VKW",
        destination: "/VKW",
      },
      {
        source: "/operations/VKW/:path*",
        destination: "/VKW/:path*",
      },
    ];
  },
};

export default nextConfig;
