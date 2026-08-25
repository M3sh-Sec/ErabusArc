/**
 * EREBUS ARC CSRF Protection
 *
 * Implements the Synchronizer Token Pattern (STP) for CSRF protection.
 *
 * Flow:
 * 1. Client calls GET /api/csrf-token to receive a signed token
 * 2. Client includes the token in all POST requests: X-CSRF-Token header
 * 3. Server validates the token signature before processing the request
 *
 * SDL principle: Defense in depth — even with CORS, CSRF tokens prevent
 * cross-site request forgery from authenticated browser sessions.
 *
 * The token is an HMAC-SHA256 signature of a random nonce + timestamp,
 * signed with AUTH_SECRET. It expires after TOKEN_TTL_MS.
 */

import crypto from "crypto";

const SECRET = process.env.AUTH_SECRET || "dev-secret-change-in-production-min-32-chars";
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generates a CSRF token.
 * Format: base64(nonce:timestamp:hmac)
 */
export function generateCsrfToken() {
  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now().toString();
  const payload = `${nonce}:${timestamp}`;
  const hmac = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex");

  const token = Buffer.from(`${payload}:${hmac}`).toString("base64url");
  return token;
}

/**
 * Validates a CSRF token from a request.
 * Returns { valid: true } or { valid: false, reason: string }
 */
export function validateCsrfToken(req) {
  // In development, skip CSRF validation to reduce friction
  if (process.env.NODE_ENV === "development") {
    return { valid: true, mode: "dev-bypass" };
  }

  const token = req.headers["x-csrf-token"];
  if (!token) {
    return { valid: false, reason: "Missing X-CSRF-Token header" };
  }

  let decoded;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return { valid: false, reason: "Malformed CSRF token" };
  }

  const parts = decoded.split(":");
  if (parts.length !== 3) {
    return { valid: false, reason: "Invalid CSRF token format" };
  }

  const [nonce, timestamp, receivedHmac] = parts;

  // Check expiry
  const tokenAge = Date.now() - parseInt(timestamp, 10);
  if (isNaN(tokenAge) || tokenAge > TOKEN_TTL_MS || tokenAge < 0) {
    return { valid: false, reason: "CSRF token expired or invalid timestamp" };
  }

  // Verify HMAC — constant-time comparison
  const expectedHmac = crypto
    .createHmac("sha256", SECRET)
    .update(`${nonce}:${timestamp}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expectedHmac, "hex");
  const receivedBuf = Buffer.from(receivedHmac, "hex");

  if (expectedBuf.length !== receivedBuf.length) {
    return { valid: false, reason: "Invalid CSRF token signature" };
  }

  const valid = crypto.timingSafeEqual(expectedBuf, receivedBuf);
  if (!valid) {
    return { valid: false, reason: "CSRF token signature mismatch" };
  }

  return { valid: true };
}
