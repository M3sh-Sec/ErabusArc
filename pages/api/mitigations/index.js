/**
 * EREBUS ARC Mitigation Tracker API
 *
 * GET    /api/mitigations?scanId=X  — list mitigations for a scan
 * GET    /api/mitigations            — list all open mitigations for company
 * PATCH  /api/mitigations            — update mitigation status/notes/assignee
 *
 * Security:
 * - All queries scoped to company from session — client cannot supply companyId
 * - Viewers can read; analysts+ can update
 * - Full status history tracked with userId and timestamp
 */
import { requireAuth } from "../../../lib/session.js";
import {
  listMitigationsForScan,
  listMitigationsForCompany,
  updateMitigationItem,
  getMitigationItem,
  ROLES,
  MITIGATION_STATUS,
} from "../../../lib/db.js";
import { validateCsrfToken } from "../../../lib/csrf.js";
import { logger } from "../../../lib/logger.js";

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, { role: ROLES.VIEWER });
  if (!ctx) return;
  const companyId = ctx.company?.id;
  if (!companyId) return res.status(400).json({ error: "No company scope." });

  // GET
  if (req.method === "GET") {
    const { scanId, status, severity } = req.query;
    if (scanId) {
      const items = listMitigationsForScan(scanId, companyId);
      if (items === null) return res.status(404).json({ error: "Scan not found." });
      return res.status(200).json({ mitigations: items });
    }
    const items = listMitigationsForCompany(companyId, { status, severity });
    return res.status(200).json({ mitigations: items });
  }

  // PATCH — analysts and above can update
  if (req.method === "PATCH") {
    if (ctx.user.role === ROLES.VIEWER) {
      return res.status(403).json({ error: "Analysts or above can update mitigations." });
    }
    const csrf = validateCsrfToken(req);
    if (!csrf.valid) return res.status(403).json({ error: "Invalid CSRF token." });

    const { id, status, notes, assignedTo } = req.body || {};
    if (!id) return res.status(400).json({ error: "Mitigation ID required." });

    const validStatuses = Object.values(MITIGATION_STATUS);
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Valid: ${validStatuses.join(", ")}` });
    }

    try {
      const updated = updateMitigationItem(id, companyId, ctx.user.id, { status, notes, assignedTo });
      if (!updated) return res.status(404).json({ error: "Mitigation not found." });
      logger.info("MITIGATION_UPDATED", { by: ctx.user.id, mitigationId: id, status, companyId });
      return res.status(200).json({ mitigation: updated });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  }

  res.setHeader("Allow", "GET, PATCH");
  return res.status(405).json({ error: "Method not allowed" });
}

export const config = { api: { bodyParser: { sizeLimit: "8kb" } } };
