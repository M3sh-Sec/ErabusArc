/**
 * EREBUS ARC CSRF Token Endpoint
 * GET /api/csrf-token
 *
 * Issues a signed CSRF token to the frontend.
 * The frontend must include this token in the X-CSRF-Token header
 * on every POST request to /api/scan.
 *
 * Token is valid for 1 hour. Frontend should refresh it on page load.
 */

import { generateCsrfToken } from "../../lib/csrf";
import { getClientIp } from "../../lib/rateLimiter";
import { logger } from "../../lib/logger";

export default function handler(req, res) {
  const ip = getClientIp(req);

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = generateCsrfToken();
    logger.debug("CSRF_TOKEN_ISSUED", { ip });

    // Cache-Control: no-store ensures tokens aren't cached by proxies or browsers
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).json({ token });
  } catch (err) {
    logger.error("CSRF_TOKEN_ERROR", { ip, error: err.message });
    return res.status(500).json({ error: "Failed to generate token" });
  }
}
