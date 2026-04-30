import type { NextConfig } from "next";

function getAdminRouteHeaderSource() {
  const raw = process.env.ADMIN_ROUTE_BASE?.trim() || "/admin-archive-portal";
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  const normalized = withLeadingSlash.replace(/\/+$/g, "");

  return /^\/[a-zA-Z0-9/_-]{6,80}$/.test(normalized)
    ? `${normalized}/:path*`
    : "/admin-archive-portal/:path*";
}

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
      {
        source: getAdminRouteHeaderSource(),
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/data/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/content/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
