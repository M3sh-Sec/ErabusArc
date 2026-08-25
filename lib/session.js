/**
 * EREBUS ARC Session Middleware
 *
 * Extracts and validates the session token from every API request.
 * Returns the authenticated user and their company, or rejects the request.
 *
 * Token is passed as a cookie: erebus_arc_session=<token>
 * (HttpOnly, Secure, SameSite=Strict — no JS access)
 *
 * Security properties:
 * - Token never exposed to JS (HttpOnly cookie)
 * - Session validated server-side on every request — no JWT trust
 * - Company context always derived from the session user record
 *   → client can NEVER supply a companyId and have it trusted
 * - Superadmins can optionally scope to a company via X-Company-Id header,
 *   but only if that company actually exists
 */

import { getSession, getUser, getCompany, ROLES, hasRole } from "./db.js";
import { logger } from "./logger.js";

const COOKIE_NAME = "erebus_arc_session";

/**
 * Extracts the session token from cookies.
 */
function extractToken(req) {
  const cookieHeader = req.headers.cookie || "";
  for (const part of cookieHeader.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === COOKIE_NAME && v) return decodeURIComponent(v);
  }
  return null;
}

/**
 * Builds the Set-Cookie header for the session token.
 */
export function buildSessionCookie(token, maxAgeSeconds = 28800) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Max-Age=${maxAgeSeconds}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

/**
 * Builds a cookie that clears the session.
 */
export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict`;
}

/**
 * requireAuth(req, res, { role }) → { user, company } or sends 401/403 and returns null
 *
 * Usage:
 *   const ctx = await requireAuth(req, res);
 *   if (!ctx) return; // response already sent
 *   const { user, company } = ctx;
 */
export async function requireAuth(req, res, { role = ROLES.VIEWER } = {}) {
  const token = extractToken(req);
  if (!token) {
    logger.warn("SESSION_MISSING", { path: req.url });
    res.status(401).json({ error: "Authentication required." });
    return null;
  }

  const session = getSession(token);
  if (!session) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    res.status(401).json({ error: "Session expired. Please log in again." });
    return null;
  }

  const user = getUser(session.userId);
  if (!user || !user.active) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    res.status(401).json({ error: "Account not found or deactivated." });
    return null;
  }

  // Role check
  if (!hasRole(user.role, role)) {
    logger.warn("INSUFFICIENT_ROLE", { userId: user.id, required: role, actual: user.role });
    res.status(403).json({ error: "Insufficient permissions." });
    return null;
  }

  // Resolve company context
  let company = null;
  if (user.role === ROLES.SUPERADMIN) {
    // Superadmins may scope to a specific company via header
    const scopedId = req.headers["x-company-id"];
    if (scopedId) {
      company = getCompany(scopedId);
      if (!company) {
        res.status(404).json({ error: "Company not found." });
        return null;
      }
    }
    // If no scope, company stays null — superadmin sees all
  } else {
    // Regular users: company always from their record — client cannot override
    company = getCompany(user.companyId);
    if (!company || !company.active) {
      res.status(403).json({ error: "Your company account is not active." });
      return null;
    }
  }

  return { user, company, session };
}
