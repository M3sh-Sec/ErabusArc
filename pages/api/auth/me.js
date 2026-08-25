/**
 * GET /api/auth/me
 * Returns the current authenticated user and company.
 */
import { requireAuth } from "../../../lib/session.js";
import { sanitizeUser } from "../../../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  return res.status(200).json({
    user: sanitizeUser(ctx.user),
    company: ctx.company,
  });
}
