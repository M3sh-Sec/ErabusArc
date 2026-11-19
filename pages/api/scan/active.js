/**
 * EREBUS ARC Active Scan API
 * POST /api/scan/active
 *
 * Runs real nmap + nuclei reconnaissance against the target, then
 * feeds those findings to the AI for intelligent interpretation and
 * enrichment with CVE/TTP context.
 *
 * Requires ACTIVE_SCAN_ENABLED=true in the environment. When disabled
 * the endpoint returns 503 so the UI can fall back to passive mode.
 *
 * Security notes:
 * - Target is validated against a strict pattern before being passed to child procs
 * - All subprocess args are passed as array elements (no shell interpolation)
 * - Requires ANALYST role + CSRF token (same as passive scan)
 * - Rate-limited on the same bucket as passive scans
 */

import { validateEnv } from "../../../lib/env.js";
import { applyRateLimit, getClientIp } from "../../../lib/rateLimiter.js";
import { validateScanRequest } from "../../../lib/validation.js";
import { validateCsrfToken } from "../../../lib/csrf.js";
import { requireAuth } from "../../../lib/session.js";
import { logger } from "../../../lib/logger.js";
import { EREBUS_ARC_SYSTEM_PROMPT, MAX_TOKENS } from "../../../lib/prompt.js";
import { callAI } from "../../../lib/aiProvider.js";
import { validateAIResponse } from "../../../lib/outputSchema.js";
import { createScan, ROLES, bootstrap } from "../../../lib/db.js";
import { runActiveScan, formatScanResultsForAI } from "../../../lib/scanner.js";

validateEnv();
bootstrap();

function parseAIText(rawText) {
  const cleaned = rawText
    .replace(/```(?:json)?[\s\S]*?```/g, (m) =>
      m.replace(/```(?:json)?/g, "").trim()
    )
    .replace(/```/g, "")
    .trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in AI response");
  return JSON.parse(jsonMatch[0]);
}

export default async function handler(req, res) {
  const ip = getClientIp(req);
  const startTime = Date.now();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check active scanning is enabled before doing anything else
  if (process.env.ACTIVE_SCAN_ENABLED !== "true") {
    return res.status(503).json({
      error: "Active scanning is not enabled on this instance.",
      hint: "Set ACTIVE_SCAN_ENABLED=true in environment variables.",
    });
  }

  // 1. Auth
  const ctx = await requireAuth(req, res, { role: ROLES.ANALYST });
  if (!ctx) return;

  const companyId = ctx.company?.id;
  if (!companyId)
    return res
      .status(400)
      .json({ error: "No company context." });

  // 2. CSRF
  const csrf = validateCsrfToken(req);
  if (!csrf.valid) {
    logger.warn("CSRF_REJECTED", { ip, userId: ctx.user.id });
    return res.status(403).json({ error: "Invalid CSRF token." });
  }

  // 3. Rate limit
  const rl = await applyRateLimit(req);
  if (rl.limited) {
    res.setHeader("Retry-After", String(rl.retryAfterSeconds));
    return res
      .status(429)
      .json({ error: `Rate limit exceeded. Retry in ${rl.retryAfterSeconds}s.` });
  }
  res.setHeader("X-RateLimit-Remaining", String(rl.remaining ?? 0));

  // 4. Validate input
  const validation = validateScanRequest(req.body);
  if (!validation.success) {
    logger.validationFailed(ip, validation.errors);
    return res
      .status(400)
      .json({ error: "Invalid request", details: validation.errors });
  }

  const { target, provider, model } = validation.data;
  const activeProvider = provider || process.env.AI_PROVIDER || "anthropic";
  logger.info("ACTIVE_SCAN_REQUEST", { ip, target });

  try {
    // 5. Run active scanner tools (nmap + nuclei)
    const scanData = await runActiveScan(target);
    const scanBlock = formatScanResultsForAI(scanData);

    // 6. Build enriched prompt — scanner output prepended as ground truth
    const enrichedPrompt = scanBlock
      ? `${scanBlock}\n\nUsing the active scan results above as confirmed ground truth, perform a comprehensive vulnerability intelligence analysis for: ${target}\n\nCombine the confirmed open ports and nuclei findings with your CVE/TTP knowledge. For each confirmed finding, provide full threat actor and kill chain analysis. Return the complete JSON analysis only.`
      : `Perform a comprehensive vulnerability intelligence analysis for: ${target}\n\nReturn the complete JSON analysis only.`;

    // 7. Call AI
    const rawText = await callAI({
      provider: activeProvider,
      model: model || undefined,
      maxTokens: MAX_TOKENS,
      systemPrompt: EREBUS_ARC_SYSTEM_PROMPT,
      userMessage: enrichedPrompt,
    });

    // 8. Parse + validate
    let parsed;
    try {
      parsed = parseAIText(rawText);
    } catch (e) {
      logger.error("AI_PARSE_ERROR", { ip, error: e.message });
      return res.status(500).json({ error: "Scan failed." });
    }

    const validated = validateAIResponse(parsed);
    if (!validated.success) {
      logger.error("AI_SCHEMA_ERROR", { ip, error: validated.error });
      return res.status(500).json({ error: "Scan failed." });
    }

    const durationMs = Date.now() - startTime;
    logger.info("ACTIVE_SCAN_COMPLETE", { ip, target, durationMs });

    // 9. Persist
    const scan = createScan({
      companyId,
      userId: ctx.user.id,
      target,
      analysisResult: validated.data,
    });

    return res.status(200).json({
      success: true,
      data: validated.data,
      scanId: scan.id,
      activeScan: {
        nmapPorts:      scanData?.nmap?.ports      || [],
        nucleiFindings: scanData?.nuclei?.findings || [],
        nmapSkipped:    scanData?.nmap?.skipped    || false,
        nucleiSkipped:  scanData?.nuclei?.skipped  || false,
      },
      meta: {
        durationMs,
        scannedAt: new Date().toISOString(),
        provider:  activeProvider,
        model:     model || null,
        scanMode:  "active",
      },
    });
  } catch (err) {
    logger.scanError(ip, err);
    return res.status(500).json({ error: "Scan failed. Please try again." });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "8kb" } } };
