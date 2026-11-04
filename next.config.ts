import type { NextConfig } from "next";
import { SITE_URL } from "./src/data/catalog";

/**
 * Canonical host is the www origin from SITE_URL. When it starts with `www.`,
 * the bare apex host 301s to it. http→https is handled by Vercel by default.
 * (Skipped for previews / staging overrides that don't use a www host.)
 */
const canonicalHost = new URL(SITE_URL).hostname;
const apexHost = canonicalHost.startsWith("www.")
  ? canonicalHost.slice(4)
  : null;

const nextConfig: NextConfig = {
  async redirects() {
    if (!apexHost) return [];
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: apexHost }],
        destination: `${SITE_URL}/:path*`,
        permanent: true,
      },
    ];
  },
  images: {
    // Prefer leaner hero/backdrop downloads; gallery pages still request larger via sizes.
    qualities: [45, 75],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
