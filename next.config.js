/** @type {import('next').NextConfig} */

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
    return [{ source: "/(.*)", headers: securityHeaders }];
  },

  serverExternalPackages: ["@anthropic-ai/sdk", "rate-limiter-flexible"],
};

module.exports = nextConfig;
