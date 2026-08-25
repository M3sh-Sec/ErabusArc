/**
 * EREBUS ARC Compliance Database
 *
 * Multi-tenant store for:
 *   - STIG uploads (parsed controls from uploaded files)
 *   - Compliance assessments (company-scoped evaluation against a framework)
 *   - Control status records (per-control compliance status + evidence)
 *   - Cross-framework mappings (AI-generated, cached per upload)
 *
 * Data model:
 *   Company  1──* StigUpload
 *   StigUpload 1──* StigControl
 *   StigControl 1──* ControlMapping  (→ many target frameworks)
 *   Company  1──* ComplianceAssessment
 *   ComplianceAssessment 1──* ControlStatus
 *
 * Tenant isolation: ALL queries require companyId from session.
 */

import crypto from "crypto";

// ─── Collections ──────────────────────────────────────────────────────────────
const stigUploads   = new Map(); // id → StigUpload
const stigControls  = new Map(); // id → StigControl
const mappings      = new Map(); // uploadId → MappingResult (cached)
const assessments   = new Map(); // id → ComplianceAssessment
const controlStatus = new Map(); // id → ControlStatusRecord

function newId(prefix = "") {
  return prefix + crypto.randomBytes(10).toString("hex");
}

// ─── STIG Upload ──────────────────────────────────────────────────────────────

/**
 * Creates a STIG upload record and its parsed controls.
 * @param {string} companyId
 * @param {string} userId
 * @param {string} filename
 * @param {string} stigTitle  — e.g. "Red Hat Enterprise Linux 9 STIG"
 * @param {string} stigVersion
 * @param {Array}  controls   — parsed control objects [{vulnId, title, severity, description, checkText, fixText, cciRefs}]
 */
export function createStigUpload({ companyId, userId, filename, stigTitle, stigVersion, controls }) {
  const uploadId = newId("stig_");
  const now = new Date().toISOString();

  const upload = {
    id: uploadId,
    companyId,
    uploadedBy: userId,
    filename: String(filename).slice(0, 300),
    stigTitle: String(stigTitle || "Unnamed STIG").slice(0, 300),
    stigVersion: String(stigVersion || "").slice(0, 100),
    controlCount: controls.length,
    uploadedAt: now,
    mappingStatus: "pending", // pending | processing | complete | failed
    mappingCompletedAt: null,
  };
  stigUploads.set(uploadId, upload);

  // Store each parsed control
  const controlIds = [];
  for (const ctrl of controls) {
    const ctrlId = newId("ctrl_");
    const control = {
      id: ctrlId,
      uploadId,
      companyId,
      vulnId:      String(ctrl.vulnId || "").slice(0, 50),
      ruleId:      String(ctrl.ruleId || "").slice(0, 100),
      title:       String(ctrl.title || "").slice(0, 300),
      severity:    String(ctrl.severity || "medium").toLowerCase(),
      catLevel:    String(ctrl.catLevel || "CAT II").slice(0, 20),
      description: String(ctrl.description || "").slice(0, 5000),
      checkText:   String(ctrl.checkText || "").slice(0, 5000),
      fixText:     String(ctrl.fixText || "").slice(0, 5000),
      cciRefs:     Array.isArray(ctrl.cciRefs) ? ctrl.cciRefs.slice(0, 20) : [],
      iaControls:  Array.isArray(ctrl.iaControls) ? ctrl.iaControls.slice(0, 20) : [],
      stigId:      String(ctrl.stigId || "").slice(0, 100),
    };
    stigControls.set(ctrlId, control);
    controlIds.push(ctrlId);
  }

  return { upload, controlIds };
}

export function getStigUpload(id, companyId) {
  const u = stigUploads.get(id);
  if (!u || u.companyId !== companyId) return null;
  return u;
}

export function listStigUploads(companyId) {
  return [...stigUploads.values()]
    .filter(u => u.companyId === companyId)
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

export function listControlsForUpload(uploadId, companyId) {
  const upload = stigUploads.get(uploadId);
  if (!upload || upload.companyId !== companyId) return null;
  return [...stigControls.values()].filter(c => c.uploadId === uploadId);
}

export function updateUploadMappingStatus(uploadId, status, completedAt = null) {
  const u = stigUploads.get(uploadId);
  if (!u) return;
  stigUploads.set(uploadId, { ...u, mappingStatus: status, mappingCompletedAt: completedAt });
}

// ─── Cross-Framework Mappings ─────────────────────────────────────────────────

/**
 * Stores AI-generated cross-framework mappings for a STIG upload.
 *
 * mappingData shape:
 * {
 *   uploadId,
 *   generatedAt,
 *   frameworks: ["FEDRAMP_HIGH", "NIST_800_53", ...],
 *   controls: [
 *     {
 *       vulnId: "V-257777",
 *       mappings: {
 *         FEDRAMP_HIGH:   ["AC-2", "AC-3", "IA-5"],
 *         NIST_800_53:    ["AC-2", "AC-2(1)", "AC-3", "IA-5"],
 *         NIST_800_171:   ["3.1.1", "3.1.2"],
 *         NERC_CIP:       ["CIP-007-6 R4"],
 *         ISO_27001:      ["A.9.2.1", "A.9.4.1"],
 *         FEDRAMP_MODERATE: ["AC-2", "AC-3"],
 *         FEDRAMP_LOW:    [],
 *       },
 *       rationale: "string — why this mapping was made",
 *       gapAnalysis: "string — controls without a STIG equivalent",
 *     }
 *   ],
 *   summary: { coverageByFramework: {FEDRAMP_HIGH: 0.72, ...} },
 * }
 */
export function storeMappings(uploadId, companyId, mappingData) {
  mappings.set(uploadId, { ...mappingData, companyId, storedAt: new Date().toISOString() });
  updateUploadMappingStatus(uploadId, "complete", new Date().toISOString());
}

export function getMappings(uploadId, companyId) {
  const m = mappings.get(uploadId);
  if (!m || m.companyId !== companyId) return null;
  return m;
}

// ─── Compliance Assessments ───────────────────────────────────────────────────

/**
 * A compliance assessment tracks the organization's posture against a framework.
 * It can be linked to a STIG upload (auto-populated) or manually assessed.
 */
export function createAssessment({ companyId, userId, framework, name, stigUploadId = null }) {
  const id = newId("asmnt_");
  const assessment = {
    id,
    companyId,
    createdBy: userId,
    framework,                                          // e.g. "NIST_800_53"
    name: String(name).slice(0, 200),
    stigUploadId,                                       // if populated from a STIG upload
    status: "in_progress",                              // in_progress | complete | archived
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };
  assessments.set(id, assessment);
  return assessment;
}

export function getAssessment(id, companyId) {
  const a = assessments.get(id);
  if (!a || a.companyId !== companyId) return null;
  return a;
}

export function listAssessments(companyId) {
  return [...assessments.values()]
    .filter(a => a.companyId === companyId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ─── Control Status Records ────────────────────────────────────────────────────

/**
 * Records the compliance status of an individual control within an assessment.
 */
export function upsertControlStatus({
  assessmentId, companyId, controlId, framework, status, notes, evidence, assignedTo, userId
}) {
  // Verify assessment belongs to company
  const assessment = assessments.get(assessmentId);
  if (!assessment || assessment.companyId !== companyId) return null;

  // Find existing record for this assessment+control
  let existing = null;
  for (const r of controlStatus.values()) {
    if (r.assessmentId === assessmentId && r.controlId === controlId) {
      existing = r;
      break;
    }
  }

  const id = existing?.id || newId("cstat_");
  const now = new Date().toISOString();

  const record = {
    id,
    assessmentId,
    companyId,
    controlId,
    framework,
    status:     String(status).slice(0, 50),
    notes:      String(notes || "").slice(0, 3000),
    evidence:   String(evidence || "").slice(0, 3000),
    assignedTo: assignedTo || null,
    updatedBy:  userId,
    createdAt:  existing?.createdAt || now,
    updatedAt:  now,
    history: [
      ...(existing?.history || []),
      { status, by: userId, at: now, notes: notes || "" },
    ].slice(-20), // keep last 20 history entries
  };

  controlStatus.set(id, record);

  // Update assessment updatedAt
  assessments.set(assessmentId, { ...assessment, updatedAt: now });

  return record;
}

export function getControlStatusForAssessment(assessmentId, companyId) {
  const assessment = assessments.get(assessmentId);
  if (!assessment || assessment.companyId !== companyId) return null;
  return [...controlStatus.values()].filter(r => r.assessmentId === assessmentId);
}

/**
 * Computes summary stats for an assessment.
 */
export function getAssessmentSummary(assessmentId, companyId) {
  const statuses = getControlStatusForAssessment(assessmentId, companyId);
  if (!statuses) return null;

  const counts = {
    total: statuses.length,
    compliant:      statuses.filter(s => s.status === "compliant").length,
    non_compliant:  statuses.filter(s => s.status === "non_compliant").length,
    partial:        statuses.filter(s => s.status === "partial").length,
    not_applicable: statuses.filter(s => s.status === "not_applicable").length,
    compensating:   statuses.filter(s => s.status === "compensating").length,
    not_assessed:   statuses.filter(s => s.status === "not_assessed").length,
  };

  const assessed = counts.total - counts.not_assessed - counts.not_applicable;
  counts.complianceRate = assessed > 0
    ? Math.round(((counts.compliant + counts.compensating) / assessed) * 100)
    : 0;

  return counts;
}
