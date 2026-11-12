import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Product photos are served from the GEM International shop CDN (gem.mn).
    remotePatterns: [{ protocol: "https", hostname: "cdnp.cody.mn", pathname: "/spree/images/**" }],
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    // /api/* is the Python API (api/index.py, a Vercel Python function on Postgres).
    // Locally, point KHUJIRT_API_DEV_URL at a running copy of it, e.g. http://127.0.0.1:8000
    const dev = process.env.NODE_ENV === "development";
    const target = dev ? process.env.KHUJIRT_API_DEV_URL : "";
    if (dev && !target) return [];
    return [
      {
        source: "/api/:path*",
        destination: dev ? `${target!.replace(/\/$/, "")}/api/:path*` : "/api/index?_path=:path*",
      },
    ];
  },
  async redirects() {
    return [{ source: "/", destination: "/mn", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/models/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/media/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
