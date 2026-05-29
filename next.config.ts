import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Conservative CSP: app is first-party only (no external scripts/CDNs).
// 'unsafe-inline' is required for Next.js bootstrap/runtime inline scripts and
// Tailwind's inline styles; data: is needed for base64 logos/attachment previews.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "script-src 'self' 'unsafe-inline'" + (isProd ? "" : " 'unsafe-eval'"),
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@react-pdf/renderer", "pino", "pino-pretty"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
