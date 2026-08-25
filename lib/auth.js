/**
 * EREBUS ARC API Authentication
 *
 * Protects the /api/scan endpoint using API key authentication.
 * Keys are passed via the Authorization header: Bearer <key>
 *
 * In production, keys are stored hashed (SHA-256) in an environment variable
 * or a database — never in plaintext.
 *
 * SDL principles applied:
 * - Constant-time comparison to prevent timing attacks
 * - Keys hashed at rest — even if env vars leak, raw keys aren't exposed
 * - Clear error messages that don't reveal system internals
 *
 * Setup:
 * 1. Generate a key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * 2. Hash it:        node -e "const c=require('crypto');console.log(c.createHash('sha256').update('YOUR_KEY').digest('hex'))"
 * 3. Set env var:    EREBUS_ARC_API_KEY_HASH=<the hash>
 *    Set env var:    AUTH_SECRET=<32+ char random string for HMAC>
 */

import crypto from "crypto";

/**
 * Constant-time string comparison to prevent timing attacks.
 * A naive === comparison leaks timing information about how many chars matched.
 */
function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");

  // Buffers must be the same length for timingSafeCompare
  if (bufA.length !== bufB.length) {
    // Still do a comparison to prevent timing leaks about length
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Hashes a raw API key using SHA-256.
 */
function hashKey(rawKey) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Extracts the Bearer token from the Authorization header.
 * Returns null if the header is missing or malformed.
 */
function extractBearerToken(req) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Validates the API key from the request.
 * Returns { authenticated: true } or { authenticated: false, reason: string }
 *
 * If AUTH_SECRET / EREBUS_ARC_API_KEY_HASH are not configured,
 * auth is DISABLED and all requests are allowed (with a warning logged).
 * This allows local development without setup friction.
 */
export function authenticate(req) {
  const keyHash = process.env.EREBUS_ARC_API_KEY_HASH;

  // Auth is optional — if not configured, allow all (warn in env.js)
  if (!keyHash) {
    return { authenticated: true, mode: "open" };
  }

  const rawKey = extractBearerToken(req);

  if (!rawKey) {
    return {
      authenticated: false,
      reason: "Missing Authorization header. Use: Authorization: Bearer <your-api-key>",
    };
  }

  // Hash the incoming key and compare to stored hash
  const incomingHash = hashKey(rawKey);
  const valid = timingSafeEqual(incomingHash, keyHash);

  if (!valid) {
    return { authenticated: false, reason: "Invalid API key." };
  }

  return { authenticated: true, mode: "key" };
}

/**
 * Generates a new random API key and its SHA-256 hash.
 * Run with: node -e "require('./lib/auth').generateKeyPair()"
 */
export function generateKeyPair() {
  const rawKey = crypto.randomBytes(32).toString("hex");
  const hash = hashKey(rawKey);
  console.log("Raw API key (give to users):", rawKey);
  console.log("SHA-256 hash (store in EREBUS_ARC_API_KEY_HASH):", hash);
  return { rawKey, hash };
}
