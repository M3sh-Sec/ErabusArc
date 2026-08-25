/**
 * EREBUS ARC Scan History API
 * GET  /api/history  — returns scan history for the calling IP
 * DELETE /api/history — clears scan history for the calling IP
 *
 * Security:
 * - History is scoped to the requesting IP — no cross-user access
 * - No full scan data returned — only summary metadata (no CVE details)
 * - Rate limited via same limiter as scan endpoint
 * - DELETE requires CSRF token to prevent CSRF-based history wiping
 */

import { getClientIp } from "../../lib/rateLimiter";
import { getHistory, clearHistory } from "../../lib/scanHistory";
import { validateCsrfToken } from "../../lib/csrf";
import { logger } from "../../lib/logger";

export default function handler(req, res) {
  const ip = getClientIp(req);

  // GET — return history
  if (req.method === "GET") {
    const history = getHistory(ip);
    logger.debug("HISTORY_FETCHED", { ip, count: history.length });
    return res.status(200).json({ success: true, history });
  }

  // DELETE — clear history (requires CSRF)
  if (req.method === "DELETE") {
    const csrf = validateCsrfToken(req);
    if (!csrf.valid) {
      logger.warn("CSRF_REJECTED", { ip, route: "/api/history", reason: csrf.reason });
      return res.status(403).json({ error: "Invalid or missing CSRF token." });
    }

    clearHistory(ip);
    logger.info("HISTORY_CLEARED", { ip });
    return res.status(200).json({ success: true, message: "Scan history cleared." });
  }

  res.setHeader("Allow", "GET, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
