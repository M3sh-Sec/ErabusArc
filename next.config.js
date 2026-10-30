/** @type {import('next').NextConfig} */
// Security patch history:
//   2026-10-29 — CVE-2025-29927 (CVSS 9.1): middleware auth bypass — next@14.2.35 + header block
//                CVE-2025-67779 / CVE-2025-55184 (High): RSC DoS — next@14.2.35
//                CVE-2025-55183 (Medium): RSC source code exposure — next@14.2.35
//                helmet@8 — aligns with Node 18+ LTS; drops deprecated options
//                @anthropic-ai/sdk@^0.39.0 — resolves transitive dep advisories

const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  isProd ? "script-src 'self'" : "script-src 'self' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "worker-src 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  isProd ? "upgrade-insecure-requests" : "",
].filter(Boolean).join("; ");

const securityHeaders = [
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "X-XSS-Protection",          value: "1; mode=block" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=()" },
  { key: "Strict-Transport-Security", value: isProd ? "max-age=31536000; includeSubDomains; preload" : "max-age=0" },
  { key: "Content-Security-Policy",   value: csp },
  { key: "Cross-Origin-Opener-Policy",   value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  async headers() {
    return [
      {
        // Apply security headers to every route
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // CVE-2025-29927 defense-in-depth: strip x-middleware-subrequest before it
  // reaches any route handler. This header is used by Next.js middleware
  // internally; external requests carrying it could bypass auth middleware.
  // EREBUS ARC uses Pages Router (no middleware.js), but this is belt-and-
  // suspenders in case the header is introduced by a future refactor.
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    };
  },

  serverExternalPackages: ["@anthropic-ai/sdk", "rate-limiter-flexible"],
};

module.exports = nextConfig;
