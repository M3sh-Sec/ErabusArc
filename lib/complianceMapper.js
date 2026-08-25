/**
 * EREBUS ARC Compliance Mapping Engine
 *
 * Uses Claude to map STIG controls to all target frameworks simultaneously.
 * Processes controls in batches to stay within token limits.
 * Results are cached in complianceDb.js.
 *
 * For each STIG control it produces:
 *   - Control IDs in each target framework
 *   - Rationale for the mapping
 *   - Gap analysis (controls not covered by the STIG)
 *   - Coverage percentage per framework
 */

import Anthropic from "@anthropic-ai/sdk";
import { MAPPABLE_FRAMEWORKS, FRAMEWORKS } from "./complianceFrameworks.js";
import { storeMappings, updateUploadMappingStatus } from "./complianceDb.js";
import { logger } from "./logger.js";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 120_000,
});

const BATCH_SIZE = 15; // controls per AI call
const MODEL = "claude-sonnet-4-20250514";

const MAPPING_SYSTEM_PROMPT = `You are an expert compliance engineer with deep knowledge of:
- DISA STIGs and CCI references
- NIST SP 800-53 Revision 5 (all 20 control families, 1007 controls)
- NIST SP 800-171 Revision 2 (110 CUI requirements, 3.x.x format)
- FedRAMP High (421 controls), Moderate (325 controls), Low (125 controls) baselines
- NERC CIP standards (CIP-002 through CIP-014)
- ISO/IEC 27001:2022 (93 controls, Annex A, themes A.5-A.8)

For each STIG control provided, map it to equivalent controls in ALL target frameworks.
Use authoritative cross-reference sources: NIST SP 800-53A, CNSSI 1253, CCI database, ISO/NIST mapping tables.

Return ONLY valid JSON, no preamble, no markdown fencing.

Output schema for each control:
{
  "vulnId": "V-XXXXXX",
  "mappings": {
    "FEDRAMP_HIGH":     ["AC-2", "AC-3(2)"],
    "FEDRAMP_MODERATE": ["AC-2", "AC-3"],
    "FEDRAMP_LOW":      ["AC-2"],
    "NIST_800_53":      ["AC-2", "AC-2(1)", "AC-3", "AC-3(2)"],
    "NIST_800_171":     ["3.1.1", "3.1.2"],
    "NERC_CIP":         ["CIP-007-6 R4.1", "CIP-007-6 R4.2"],
    "ISO_27001":        ["A.9.2.1", "A.9.2.3", "A.9.4.1"]
  },
  "rationale": "This STIG control addresses privileged account management, directly mapping to AC-2 (Account Management) in NIST 800-53. The CCI-000015 reference confirms AC-2 linkage. FedRAMP High includes AC-2(1)-(11) enhancements not required at lower baselines.",
  "primaryFrameworkControl": "AC-2",
  "coverageNotes": "CUI systems should also assess 3.1.1 and 3.1.2. ISO 27001 A.9.2.1 covers user registration which aligns with account management lifecycle."
}

Be precise with control IDs. Use enhancement notation (AC-2(1)) where appropriate.
If no mapping exists for a framework, use an empty array [].`;

/**
 * Maps a batch of STIG controls to all target frameworks.
 */
async function mapBatch(controls) {
  const controlSummaries = controls.map(c => ({
    vulnId:      c.vulnId,
    title:       c.title.slice(0, 200),
    severity:    c.severity,
    catLevel:    c.catLevel,
    description: c.description.slice(0, 800),
    fixText:     c.fixText.slice(0, 400),
    cciRefs:     c.cciRefs,
    iaControls:  c.iaControls,
  }));

  const prompt = `Map the following ${controls.length} STIG controls to ALL target compliance frameworks.

Target frameworks: ${MAPPABLE_FRAMEWORKS.join(", ")}

STIG Controls:
${JSON.stringify(controlSummaries, null, 2)}

Return a JSON array with one mapping object per control:
[
  { "vulnId": "...", "mappings": {...}, "rationale": "...", "primaryFrameworkControl": "...", "coverageNotes": "..." },
  ...
]`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: MAPPING_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = message.content.filter(b => b.type === "text").map(b => b.text).join("");
  const cleaned = rawText.replace(/```(?:json)?[\s\S]*?```/g, m => m.replace(/```(?:json)?/g, "").trim()).replace(/```/g, "").trim();
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array in mapping response");
  return JSON.parse(jsonMatch[0]);
}

/**
 * Runs the full mapping pipeline for a STIG upload.
 * Called asynchronously after upload — does not block the upload response.
 */
export async function runMappingPipeline(uploadId, companyId, controls) {
  logger.info("COMPLIANCE_MAPPING_START", { uploadId, controlCount: controls.length });
  updateUploadMappingStatus(uploadId, "processing");

  try {
    const allMappings = [];
    const batches = [];
    for (let i = 0; i < controls.length; i += BATCH_SIZE) {
      batches.push(controls.slice(i, i + BATCH_SIZE));
    }

    for (let bi = 0; bi < batches.length; bi++) {
      logger.info("COMPLIANCE_MAPPING_BATCH", { uploadId, batch: bi + 1, total: batches.length });
      const batchResult = await mapBatch(batches[bi]);
      allMappings.push(...batchResult);

      // Small delay between batches to be respectful of rate limits
      if (bi < batches.length - 1) await new Promise(r => setTimeout(r, 500));
    }

    // Compute coverage stats
    const coverageByFramework = {};
    for (const fw of MAPPABLE_FRAMEWORKS) {
      const mapped = allMappings.filter(m => (m.mappings?.[fw] || []).length > 0).length;
      coverageByFramework[fw] = controls.length > 0 ? Math.round((mapped / controls.length) * 100) : 0;
    }

    // Aggregate all unique controls referenced per framework
    const controlsByFramework = {};
    for (const fw of MAPPABLE_FRAMEWORKS) {
      const allControls = new Set();
      for (const m of allMappings) {
        (m.mappings?.[fw] || []).forEach(c => allControls.add(c));
      }
      controlsByFramework[fw] = [...allControls].sort();
    }

    const mappingData = {
      uploadId,
      generatedAt: new Date().toISOString(),
      model: MODEL,
      frameworks: MAPPABLE_FRAMEWORKS,
      controls: allMappings,
      summary: {
        coverageByFramework,
        controlsByFramework,
        totalStigControls: controls.length,
        totalMappings: allMappings.length,
      },
    };

    storeMappings(uploadId, companyId, mappingData);
    logger.info("COMPLIANCE_MAPPING_COMPLETE", { uploadId, totalMappings: allMappings.length });
    return mappingData;
  } catch (err) {
    logger.error("COMPLIANCE_MAPPING_ERROR", { uploadId, error: err.message });
    updateUploadMappingStatus(uploadId, "failed");
    throw err;
  }
}

/**
 * Maps a single control on-demand (for gap analysis or re-mapping).
 */
export async function mapSingleControl(control) {
  const results = await mapBatch([control]);
  return results[0] || null;
}
