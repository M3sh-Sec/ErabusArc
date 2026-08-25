/**
 * GET  /api/scans        — list scans for caller's company
 * GET  /api/scans?id=X   — get full scan result (company-scoped)
 *
 * Tenant isolation: companyId always from session, never from client.
 */
import { requireAuth } from "../../../lib/session.js";
import { listScansForCompany, getScan, ROLES } from "../../../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ctx = await requireAuth(req, res, { role: ROLES.VIEWER });
  if (!ctx) return;

  const companyId = ctx.company?.id;
  if (!companyId) return res.status(400).json({ error: "No company scope." });

  const { id } = req.query;

  if (id) {
    // Fetch a specific scan — getScan enforces tenant isolation internally
    const scan = getScan(id, companyId);
    if (!scan) return res.status(404).json({ error: "Scan not found." });
    return res.status(200).json({ scan });
  }

  const scans = listScansForCompany(companyId);
  return res.status(200).json({ scans });
}
