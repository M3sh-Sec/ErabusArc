/**
 * EREBUS ARC Secure Scan API — v2 with multi-tenant support
 * POST /api/scan
 *
 * Changes from v1:
 * - Auth via session cookie (not global API key)
 * - Scan saved to company-scoped store (not IP-keyed)
 * - Mitigation items auto-created for every vulnerability
 * - companyId always from session — never trusted from client
 */

import Anthropic from "@anthropic-ai/sdk";
import { validateEnv } from "../../lib/env.js";
import { applyRateLimit, getClientIp } from "../../lib/rateLimiter.js";
import { validateScanRequest } from "../../lib/validation.js";
import { validateCsrfToken } from "../../lib/csrf.js";
import { requireAuth } from "../../lib/session.js";
import { logger } from "../../lib/logger.js";
import { EREBUS_ARC_SYSTEM_PROMPT, MODEL, MAX_TOKENS } from "../../lib/prompt.js";
import { validateAIResponse } from "../../lib/outputSchema.js";
import { createScan, ROLES, bootstrap } from "../../lib/db.js";

validateEnv();
bootstrap();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 60_000,
  maxRetries: 1,
});

function parseAIText(rawText) {
  const cleaned = rawText.replace(/```(?:json)?[\s\S]*?```/g, m =>
    m.replace(/```(?:json)?/g, "").trim()
  ).replace(/```/g, "").trim();
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

  // 1. Session auth — analysts and above can scan
  const ctx = await requireAuth(req, res, { role: ROLES.ANALYST });
  if (!ctx) return;

  const companyId = ctx.company?.id;
  if (!companyId) return res.status(400).json({ error: "No company context. Superadmins must supply X-Company-Id." });

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
    return res.status(429).json({ error: `Rate limit exceeded. Retry in ${rl.retryAfterSeconds}s.` });
  }
  res.setHeader("X-RateLimit-Remaining", String(rl.remaining ?? 0));

  // 4. Input validation
  const validation = validateScanRequest(req.body);
  if (!validation.success) {
    logger.validationFailed(ip, validation.errors);
    return res.status(400).json({ error: "Invalid request", details: validation.errors });
  }

  const { target } = validation.data;
  logger.scanRequest(ip, target);

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: EREBUS_ARC_SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Perform a comprehensive vulnerability intelligence analysis for: ${target}\n\nReturn the complete JSON analysis only.` }],
    });

    const rawText = message.content.filter(b => b.type === "text").map(b => b.text).join("");

    let parsed;
    try { parsed = parseAIText(rawText); }
    catch (e) { logger.error("AI_PARSE_ERROR", { ip, error: e.message }); return res.status(500).json({ error: "Scan failed." }); }

    const validated = validateAIResponse(parsed);
    if (!validated.success) { logger.error("AI_SCHEMA_ERROR", { ip, error: validated.error }); return res.status(500).json({ error: "Scan failed." }); }

    const durationMs = Date.now() - startTime;
    logger.scanComplete(ip, durationMs);

    // 5. Persist scan to company store — auto-creates mitigation items
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
      meta: { durationMs, scannedAt: new Date().toISOString() },
    });
  } catch (err) {
    logger.scanError(ip, err);
    return res.status(500).json({ error: "Scan failed. Please try again." });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "8kb" } } };
