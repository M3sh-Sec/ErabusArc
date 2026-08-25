/**
 * EREBUS ARC Compliance Assessments API
 *
 * GET    /api/compliance/assessments           — list assessments
 * GET    /api/compliance/assessments?id=X      — get single assessment + statuses
 * POST   /api/compliance/assessments           — create assessment
 * PATCH  /api/compliance/assessments           — update control status
 * DELETE /api/compliance/assessments           — archive assessment
 */

import { requireAuth } from "../../../lib/session.js";
import { validateCsrfToken } from "../../../lib/csrf.js";
import { ROLES } from "../../../lib/db.js";
import { CONTROL_STATUS, FRAMEWORKS } from "../../../lib/complianceFrameworks.js";
import {
  createAssessment, getAssessment, listAssessments,
  upsertControlStatus, getControlStatusForAssessment, getAssessmentSummary,
} from "../../../lib/complianceDb.js";
import { logger } from "../../../lib/logger.js";

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, { role: ROLES.VIEWER });
  if (!ctx) return;
  const companyId = ctx.company?.id;
  if (!companyId) return res.status(400).json({ error: "No company scope." });

  // ── GET ───────────────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    const { id } = req.query;

    if (id) {
      const assessment = getAssessment(id, companyId);
      if (!assessment) return res.status(404).json({ error: "Assessment not found." });
      const statuses = getControlStatusForAssessment(id, companyId) || [];
      const summary  = getAssessmentSummary(id, companyId);
      return res.status(200).json({ assessment, statuses, summary });
    }

    const list = listAssessments(companyId);
    return res.status(200).json({ assessments: list });
  }

  // Mutations require analyst+
  const csrf = validateCsrfToken(req);
  if (!csrf.valid) return res.status(403).json({ error: "Invalid CSRF token." });

  if (ctx.user.role === ROLES.VIEWER) {
    return res.status(403).json({ error: "Analyst role required." });
  }

  // ── POST — create assessment ──────────────────────────────────────────────────
  if (req.method === "POST") {
    const { framework, name, stigUploadId } = req.body || {};

    if (!framework || !FRAMEWORKS[framework]) {
      return res.status(400).json({ error: `Invalid framework. Valid: ${Object.keys(FRAMEWORKS).join(", ")}` });
    }
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Assessment name required." });
    }

    const assessment = createAssessment({
      companyId,
      userId: ctx.user.id,
      framework,
      name: name.trim().slice(0, 200),
      stigUploadId: stigUploadId || null,
    });

    logger.info("ASSESSMENT_CREATED", { userId: ctx.user.id, assessmentId: assessment.id, framework });
    return res.status(201).json({ assessment });
  }

  // ── PATCH — update control status ─────────────────────────────────────────────
  if (req.method === "PATCH") {
    const { assessmentId, controlId, framework, status, notes, evidence, assignedTo } = req.body || {};

    if (!assessmentId || !controlId || !status) {
      return res.status(400).json({ error: "assessmentId, controlId, and status required." });
    }

    const validStatuses = Object.values(CONTROL_STATUS);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Valid: ${validStatuses.join(", ")}` });
    }

    const record = upsertControlStatus({
      assessmentId,
      companyId,
      controlId: String(controlId).slice(0, 50),
      framework: framework || "",
      status,
      notes: String(notes || "").slice(0, 3000),
      evidence: String(evidence || "").slice(0, 3000),
      assignedTo: assignedTo || null,
      userId: ctx.user.id,
    });

    if (!record) return res.status(404).json({ error: "Assessment not found or access denied." });
    logger.info("CONTROL_STATUS_UPDATED", { userId: ctx.user.id, assessmentId, controlId, status });
    return res.status(200).json({ record, summary: getAssessmentSummary(assessmentId, companyId) });
  }

  res.setHeader("Allow", "GET, POST, PATCH");
  return res.status(405).json({ error: "Method not allowed" });
}

export const config = { api: { bodyParser: { sizeLimit: "16kb" } } };
