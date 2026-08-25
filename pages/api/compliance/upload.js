/**
 * POST /api/compliance/upload
 *
 * Accepts a STIG file (XML, CSV, or text) as a base64-encoded string.
 * Parses it, stores controls, then triggers async AI mapping pipeline.
 *
 * Request body:
 * {
 *   filename: "U_RHEL_9_STIG_V1R3_Manual-xccdf.xml",
 *   content:  "<base64 encoded file content>",
 *   stigTitle: "optional override title",
 * }
 *
 * Security:
 * - Session auth (analyst+)
 * - CSRF token
 * - File size capped at 5MB
 * - Content sanitised in stigParser.js
 * - Mapping runs async — upload response is immediate
 */

import { requireAuth } from "../../../lib/session.js";
import { validateCsrfToken } from "../../../lib/csrf.js";
import { detectAndParse } from "../../../lib/stigParser.js";
import { createStigUpload, listStigUploads, listControlsForUpload, getMappings, getStigUpload } from "../../../lib/complianceDb.js";
import { runMappingPipeline } from "../../../lib/complianceMapper.js";
import { logger } from "../../../lib/logger.js";
import { ROLES } from "../../../lib/db.js";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, { role: ROLES.ANALYST });
  if (!ctx) return;
  const companyId = ctx.company?.id;
  if (!companyId) return res.status(400).json({ error: "No company scope." });

  // ── GET — list uploads or get specific upload with mappings ──────────────────
  if (req.method === "GET") {
    const { id, controls } = req.query;

    if (id) {
      const upload = getStigUpload(id, companyId);
      if (!upload) return res.status(404).json({ error: "Upload not found." });

      const response = { upload };

      if (controls === "true") {
        response.controls = listControlsForUpload(id, companyId) || [];
      }

      const mappingData = getMappings(id, companyId);
      if (mappingData) response.mappings = mappingData;

      return res.status(200).json(response);
    }

    return res.status(200).json({ uploads: listStigUploads(companyId) });
  }

  // ── POST — upload and parse ──────────────────────────────────────────────────
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const csrf = validateCsrfToken(req);
  if (!csrf.valid) return res.status(403).json({ error: "Invalid CSRF token." });

  const { filename, content, stigTitle: titleOverride } = req.body || {};

  if (!filename || !content) {
    return res.status(400).json({ error: "filename and content (base64) are required." });
  }

  if (typeof filename !== "string" || filename.length > 300) {
    return res.status(400).json({ error: "Invalid filename." });
  }

  // Decode and size-check
  let decoded;
  try {
    decoded = Buffer.from(content, "base64").toString("utf8");
  } catch {
    return res.status(400).json({ error: "content must be valid base64." });
  }

  if (Buffer.byteLength(decoded, "utf8") > MAX_FILE_BYTES) {
    return res.status(413).json({ error: "File too large. Maximum 5MB." });
  }

  // Parse
  let parsed;
  try {
    parsed = detectAndParse(decoded, filename);
  } catch (err) {
    logger.error("STIG_PARSE_ERROR", { userId: ctx.user.id, filename, error: err.message });
    return res.status(422).json({ error: "Could not parse STIG file. Ensure it is valid XML, CSV, or text." });
  }

  if (parsed.controls.length === 0) {
    return res.status(422).json({ error: "No controls found in this file. Check the format." });
  }

  // Store
  const { upload, controlIds } = createStigUpload({
    companyId,
    userId: ctx.user.id,
    filename,
    stigTitle: titleOverride || parsed.stigTitle,
    stigVersion: parsed.stigVersion,
    controls: parsed.controls,
  });

  logger.info("STIG_UPLOAD", {
    userId: ctx.user.id,
    companyId,
    uploadId: upload.id,
    controlCount: parsed.controls.length,
    filename,
  });

  // Trigger async mapping pipeline (non-blocking)
  const controls = parsed.controls; // pass parsed array directly
  setImmediate(async () => {
    try {
      await runMappingPipeline(upload.id, companyId, controls);
    } catch (err) {
      logger.error("STIG_MAPPING_ASYNC_ERROR", { uploadId: upload.id, error: err.message });
    }
  });

  return res.status(201).json({
    success: true,
    upload,
    controlCount: parsed.controls.length,
    mappingStatus: "processing",
    message: `Parsed ${parsed.controls.length} controls from "${parsed.stigTitle}". Cross-framework mapping is running in the background.`,
  });
}

export const config = {
  api: { bodyParser: { sizeLimit: "8mb" } }, // allow for base64 overhead
};
