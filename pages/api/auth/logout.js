/**
 * POST /api/auth/logout
 */
import { deleteSession } from "../../../lib/db.js";
import { clearSessionCookie } from "../../../lib/session.js";
import { logger } from "../../../lib/logger.js";
import { getClientIp } from "../../../lib/rateLimiter.js";

const COOKIE_NAME = "erebus_arc_session";

function extractToken(req) {
  const h = req.headers.cookie || "";
  for (const p of h.split(";")) {
    const [k, v] = p.trim().split("=");
    if (k === COOKIE_NAME && v) return decodeURIComponent(v);
  }
  return null;
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const token = extractToken(req);
  if (token) {
    deleteSession(token);
    logger.info("LOGOUT", { ip: getClientIp(req) });
  }
  res.setHeader("Set-Cookie", clearSessionCookie());
  return res.status(200).json({ success: true });
}
