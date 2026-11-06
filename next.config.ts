import type { NextConfig } from "next";

const privateHeaders = [
  { key: "Cache-Control", value: "no-store" },
  { key: "X-Robots-Tag", value: "noindex" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: "/i/:path*", headers: privateHeaders },
      { source: "/api/invite/:path*", headers: privateHeaders },
    ];
  },
};

export default nextConfig;
