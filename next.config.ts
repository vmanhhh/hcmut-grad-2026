import type { NextConfig } from "next";

const privateHeaders = [
  { key: "Cache-Control", value: "no-store" },
  { key: "X-Robots-Tag", value: "noindex" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The link-preview images read these assets with fs (lib/og-card.tsx), so tracing must ship them to the server bundle.
  outputFileTracingIncludes: {
    "/i/[code]/opengraph-image": ["./lib/fonts/*"],
    "/g/[slug]/opengraph-image": ["./lib/fonts/*"],
  },
  async headers() {
    return [
      { source: "/i/:path*", headers: privateHeaders },
      { source: "/api/invite/:path*", headers: privateHeaders },
      { source: "/g/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
};

export default nextConfig;
