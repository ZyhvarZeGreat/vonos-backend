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
        destination: "/VSP/:path*",
        permanent: true,
      },
      {
        source: "/VISP/:path*",
        destination: "/VSP/:path*",
        permanent: true,
      },
      {
        source: "/VISP",
        destination: "/VSP",
        permanent: true,
      },
      {
        source: "/VSS",
        destination: "/VSP",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
