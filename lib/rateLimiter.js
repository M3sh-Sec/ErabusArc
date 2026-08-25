/**
 * EREBUS ARC Rate Limiter
 *
 * Server-side only. Uses rate-limiter-flexible for in-memory rate limiting.
 * In production with multiple instances, swap the in-memory store for Redis.
 *
 * Security purpose:
 * - Prevents API key abuse via spamming the /api/scan endpoint
 * - Limits each IP to RATE_LIMIT_MAX requests per RATE_LIMIT_WINDOW_MS
 * - Returns 429 Too Many Requests when exceeded
 */

import { RateLimiterMemory } from "rate-limiter-flexible";

const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX || "10", 10);
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);
const WINDOW_SECONDS = Math.floor(WINDOW_MS / 1000);

// Singleton — one limiter instance for the process lifetime
const rateLimiter = new RateLimiterMemory({
  points: MAX_REQUESTS,       // number of requests allowed
  duration: WINDOW_SECONDS,   // per window (seconds)
  blockDuration: WINDOW_SECONDS, // block for one full window if exceeded
});

/**
 * Extracts the real client IP, respecting common reverse proxy headers.
 * Falls back to socket address.
 */
export function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; first is the client
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

/**
 * Applies rate limiting to a request.
 * Returns { limited: false, remaining, resetMs } or { limited: true, retryAfterMs }
 */
export async function applyRateLimit(req) {
  const ip = getClientIp(req);

  try {
    const result = await rateLimiter.consume(ip);
    return {
      limited: false,
      remaining: result.remainingPoints,
      resetMs: result.msBeforeNext,
    };
  } catch (rejection) {
    return {
      limited: true,
      retryAfterMs: rejection.msBeforeNext,
      retryAfterSeconds: Math.ceil(rejection.msBeforeNext / 1000),
    };
  }
}
