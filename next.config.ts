import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";
const https = (process.env.APP_URL ?? "").startsWith("https:");

/**
 * Content-Security-Policy. Everything Vettly loads is its own (fonts are self-hosted by next/font), so every
 * source is 'self'. Scripts still allow inline because Next.js inlines its bootstrap scripts; per-request
 * nonces would make every page dynamically rendered (see docs/BACKEND_PLAN.md). The parts that matter most
 * hold either way: no plugins, no framing by other sites, no foreign form targets or base URLs.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws:" : ""}`,
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(https ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // HSTS only when the app is really served over HTTPS, so local HTTP development keeps working.
  ...(https ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Candidate files open in Vettly's own preview frame, so Vettly (and only Vettly) may frame them.
      {
        source: "/api/files/:id",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
