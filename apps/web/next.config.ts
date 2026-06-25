import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@vonos/types"],
  env: {
    NEXT_PUBLIC_SKIP_AUTH:
      process.env.NEXT_PUBLIC_SKIP_AUTH ?? "false",
  },
  async redirects() {
    return [
      {
        source: "/VA/:path*",
        destination: "/VM/:path*",
        permanent: true,
      },
      {
        source: "/VSS/:path*",
        destination: "/VISP/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
