/**
 * POST /api/auth/login
 * Authenticates a user and creates a session cookie.
 *
 * Security:
 * - PBKDF2 password verification (100k iterations)
 * - Constant-time comparison (no timing attacks)
 * - HttpOnly, SameSite=Strict session cookie
 * - Generic error messages (don't reveal if email exists)
 * - Rate limited via existing limiter
 */

import { findUserByEmail, verifyPassword, createSession, bootstrap, sanitizeUser, getCompany } from "../../../lib/db.js";
import { buildSessionCookie } from "../../../lib/session.js";
import { applyRateLimit, getClientIp } from "../../../lib/rateLimiter.js";
import { validateCsrfToken } from "../../../lib/csrf.js";
import { logger } from "../../../lib/logger.js";

bootstrap(); // ensure seed data exists

export default async function handler(req, res) {
  const ip = getClientIp(req);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const csrf = validateCsrfToken(req);
  if (!csrf.valid) return res.status(403).json({ error: "Invalid CSRF token." });

  const rl = await applyRateLimit(req);
  if (rl.limited) {
    res.setHeader("Retry-After", String(rl.retryAfterSeconds));
    return res.status(429).json({ error: `Too many attempts. Retry in ${rl.retryAfterSeconds}s.` });
  }

  const { email, password } = req.body || {};
  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Email and password are required." });
  }

  // Generic delay to neutralise timing attacks even on unknown emails
  const user = findUserByEmail(email.trim());
  const DUMMY_HASH = "0000000000000000:0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
  const valid = user
    ? verifyPassword(password, user.passwordHash)
    : (verifyPassword(password, DUMMY_HASH), false); // always run crypto even for unknown email

  if (!valid || !user || !user.active) {
    logger.warn("LOGIN_FAILED", { ip, email: email.slice(0, 80) });
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const session = createSession(user.id);
  logger.info("LOGIN_SUCCESS", { ip, userId: user.id, role: user.role });

  res.setHeader("Set-Cookie", buildSessionCookie(session.token));
  return res.status(200).json({
    success: true,
    user: sanitizeUser(user),
    company: user.companyId ? getCompany(user.companyId) : null,
  });
}

export const config = { api: { bodyParser: { sizeLimit: "4kb" } } };
