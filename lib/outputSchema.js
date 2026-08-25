/**
 * EREBUS ARC AI Response Output Schema — with full adversary TTP validation
 * SDL principle: Never trust AI output. Validate and sanitize everything.
 */

import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────
const SeverityEnum        = z.enum(["CRITICAL","HIGH","MEDIUM","LOW","INFO"]);
const RiskLevelEnum       = z.enum(["CRITICAL","HIGH","MEDIUM","LOW","MINIMAL"]);
const ImpactEnum          = z.enum(["HIGH","LOW","NONE"]);
const AttackVectorEnum    = z.enum(["NETWORK","ADJACENT","LOCAL","PHYSICAL"]);
const ComplexityEnum      = z.enum(["LOW","HIGH"]);
const PrivilegesEnum      = z.enum(["NONE","LOW","HIGH"]);
const InteractionEnum     = z.enum(["NONE","REQUIRED"]);
const ExploitMaturityEnum = z.enum(["WEAPONIZED","POC","UNPROVEN"]);
const RemActionEnum       = z.enum(["PATCH","MITIGATE","WORKAROUND","MONITOR"]);
const UrgencyEnum         = z.enum(["IMMEDIATE","HIGH","MEDIUM","LOW"]);
const ConfidenceEnum      = z.enum(["HIGH","MEDIUM","LOW"]);
const TargetTypeEnum      = z.enum(["website","software","library","service","os","api","container"]);
const MotivationEnum      = z.enum(["Espionage","Financial","Destructive","Hacktivism","Mixed"]);
const SophEnum            = z.enum(["Advanced","Intermediate","Basic"]);
const FreqEnum            = z.enum(["High","Medium","Low"]);
const DetDiffEnum         = z.enum(["Hard","Medium","Easy"]);
const PriorityEnum        = z.enum(["CRITICAL","HIGH","MEDIUM","LOW"]);
const KillPhaseEnum       = z.enum([
  "Initial Access","Execution","Persistence","Privilege Escalation",
  "Defense Evasion","Credential Access","Discovery","Lateral Movement",
  "Collection","Exfiltration","Impact","Reconnaissance","Resource Development"
]);

// Sanitize: strip HTML/script tags from all AI-generated strings
const S = z.string().transform(s =>
  s.replace(/<[^>]*>/g,"").replace(/javascript:/gi,"").trim()
);

const techniqueIdPattern = /^T\d{4}(\.\d{3})?$/;
const tacticIdPattern    = /^TA\d{4}$/;

// ─── Kill chain step per CVE ──────────────────────────────────────────────────
const KillChainStepSchema = z.object({
  phase:                KillPhaseEnum.or(S.max(60)),
  techniqueId:          S.max(20).refine(v => techniqueIdPattern.test(v) || v === "", "Bad technique ID"),
  techniqueName:        S.max(200),
  description:          S.max(800),
  detectionOpportunity: S.max(500),
});

// ─── Threat actor attached to a CVE ──────────────────────────────────────────
const CveThreatActorSchema = z.object({
  name:             S.max(100),
  aliases:          z.array(S.max(80)).max(10).default([]),
  nationState:      S.max(60).nullable().optional(),
  motivation:       MotivationEnum,
  hasExploitedThis: z.boolean().default(false),
  campaigns:        z.array(S.max(100)).max(10).default([]),
  ttpsUsed:         z.array(S.max(20)).max(20).default([]),
  targetSectors:    z.array(S.max(80)).max(15).default([]),
});

// ─── TTP block embedded in each vulnerability ─────────────────────────────────
const VulnTTPSchema = z.object({
  killChain:        z.array(KillChainStepSchema).max(15).default([]),
  threatActors:     z.array(CveThreatActorSchema).max(10).default([]),
  primaryTactic:    S.max(100).optional(),
  primaryTechnique: S.max(20).optional(),
  subTechniques:    z.array(S.max(20)).max(10).default([]),
  campaignExamples: z.array(S.max(200)).max(8).default([]),
});

// ─── Vulnerability ────────────────────────────────────────────────────────────
const VulnerabilitySchema = z.object({
  cveId:             z.string().max(40),
  title:             S.max(200),
  severity:          SeverityEnum,
  cvssV3:            z.number().min(0).max(10).nullable().optional(),
  cvssVector:        z.string().max(200).nullable().optional(),
  epss:              z.number().min(0).max(1).nullable().optional(),
  cweId:             z.string().max(20).nullable().optional(),
  cweName:           S.max(200).nullable().optional(),
  affectedVersions:  S.max(300),
  patchedVersion:    S.max(100).nullable().optional(),
  description:       S.max(2000),
  exploitScenario:   S.max(2000),
  impact: z.object({
    confidentiality: ImpactEnum,
    integrity:       ImpactEnum,
    availability:    ImpactEnum,
  }).optional(),
  attackVector:       AttackVectorEnum.optional(),
  attackComplexity:   ComplexityEnum.optional(),
  privilegesRequired: PrivilegesEnum.optional(),
  userInteraction:    InteractionEnum.optional(),
  ttps:               VulnTTPSchema.optional(),
  inCisaKev:          z.boolean().default(false),
  publicExploit:      z.boolean().default(false),
  exploitMaturity:    ExploitMaturityEnum.default("UNPROVEN"),
  remediation: z.object({
    action:  RemActionEnum,
    detail:  S.max(1000),
    urgency: UrgencyEnum,
  }).optional(),
  published: S.max(50).optional(),
});

// ─── Adversary profile — full section ─────────────────────────────────────────
const SignatureTTPSchema = z.object({
  techniqueId:   S.max(20),
  techniqueName: S.max(200),
  phase:         S.max(80),
});

const FullThreatActorSchema = z.object({
  name:               S.max(100),
  aliases:            z.array(S.max(80)).max(10).default([]),
  nationState:        S.max(60).nullable().optional(),
  motivation:         MotivationEnum,
  sophistication:     SophEnum.default("Intermediate"),
  activeYears:        S.max(40).optional(),
  knownCVEsExploited: z.array(S.max(40)).max(20).default([]),
  signatureTTPs:      z.array(SignatureTTPSchema).max(20).default([]),
  targetSectors:      z.array(S.max(80)).max(15).default([]),
  campaigns:          z.array(S.max(100)).max(10).default([]),
  iocHints:           z.array(S.max(200)).max(10).default([]),
});

const HeatmapTechniqueSchema = z.object({
  id:                  S.max(20),
  name:                S.max(200),
  actorsUsing:         z.array(S.max(100)).max(10).default([]),
  cvesMapped:          z.array(S.max(40)).max(10).default([]),
  frequency:           FreqEnum.default("Medium"),
  detectionDifficulty: DetDiffEnum.default("Medium"),
});

const HeatmapTacticSchema = z.object({
  tactic:     S.max(80),
  tacticId:   z.string().regex(tacticIdPattern).optional().or(S.max(10)),
  techniques: z.array(HeatmapTechniqueSchema).max(15).default([]),
});

const AttackChainStepSchema = z.object({
  order:         z.number().int().min(1).max(20),
  phase:         S.max(80),
  techniqueId:   S.max(20),
  techniqueName: S.max(200),
  cveUsed:       S.max(40).nullable().optional(),
  description:   S.max(500),
});

const AttackChainSchema = z.object({
  name:  S.max(150),
  actor: S.max(100).nullable().optional(),
  steps: z.array(AttackChainStepSchema).max(15).default([]),
});

const DetectionRecSchema = z.object({
  priority:       PriorityEnum,
  rule:           S.max(400),
  logSource:      S.max(200),
  indicator:      S.max(300),
  mitreTechnique: S.max(20),
});

const AdversaryProfileSchema = z.object({
  summary:              S.max(1000),
  totalActorsIdentified: z.number().int().min(0).default(0),
  nationStateThreats:   z.array(S.max(60)).max(15).default([]),
  criminalGroups:       z.array(S.max(100)).max(15).default([]),
  primaryMotivation:    MotivationEnum,
  targetedSectors:      z.array(S.max(80)).max(15).default([]),
  threatActors:         z.array(FullThreatActorSchema).max(15).default([]),
  ttpHeatmap:           z.array(HeatmapTacticSchema).max(14).default([]),
  attackChains:         z.array(AttackChainSchema).max(5).default([]),
  detectionRecommendations: z.array(DetectionRecSchema).max(15).default([]),
});

// ─── Remaining schemas ────────────────────────────────────────────────────────
const MetaSchema = z.object({
  target:      S.max(200),
  targetType:  TargetTypeEnum.default("software"),
  fingerprint: z.array(S.max(100)).max(20).default([]),
  confidence:  ConfidenceEnum.default("MEDIUM"),
  dataSource:  z.array(S.max(60)).max(10).default([]),
});

const RiskProfileSchema = z.object({
  overallScore:     z.number().min(0).max(100).transform(Math.round),
  riskLevel:        RiskLevelEnum,
  epssAverage:      z.number().min(0).max(1).nullable().optional(),
  kevCount:         z.number().int().min(0).default(0),
  exploitedInWild:  z.boolean().default(false),
  executiveSummary: S.max(1000),
  analystNotes:     S.max(2000),
});

const AttackSurfaceSchema = z.object({
  vectors:         z.array(S.max(200)).max(20).default([]),
  exposedPorts:    z.array(S.max(100)).max(20).default([]),
  authWeaknesses:  z.array(S.max(200)).max(20).default([]),
  supplyChainRisk: S.max(500).nullable().optional(),
});

const MitreTechniqueSchema = z.object({
  id:           S.max(20),
  name:         S.max(200),
  cvesMapped:   z.array(S.max(40)).max(10).default([]),
  actorsUsing:  z.array(S.max(100)).max(10).default([]),
});

const MitreMappingSchema = z.array(z.object({
  tactic:     S.max(80),
  tacticId:   S.max(10).optional(),
  techniques: z.array(MitreTechniqueSchema).max(15).default([]),
})).max(14).default([]);

const RemediationPlanSchema = z.object({
  immediate:            z.array(S.max(500)).max(10).default([]),
  shortTerm:            z.array(S.max(500)).max(10).default([]),
  longTerm:             z.array(S.max(500)).max(10).default([]),
  compensatingControls: z.array(S.max(500)).max(10).default([]),
});

const ReportSummarySchema = z.object({
  targetScanned:    S.max(200),
  totalVulns:       z.number().int().min(0),
  criticalCount:    z.number().int().min(0),
  highCount:        z.number().int().min(0),
  mediumCount:      z.number().int().min(0),
  lowCount:         z.number().int().min(0),
  topRisk:          S.max(500),
  complianceNotes:  S.max(1000).optional(),
  totalThreatActors: z.number().int().min(0).default(0),
  totalTTPsMapped:   z.number().int().min(0).default(0),
});

// ─── Root schema ──────────────────────────────────────────────────────────────
export const AnalysisResponseSchema = z.object({
  meta:             MetaSchema,
  riskProfile:      RiskProfileSchema,
  vulnerabilities:  z.array(VulnerabilitySchema).max(50),
  attackSurface:    AttackSurfaceSchema,
  adversaryProfile: AdversaryProfileSchema,
  mitreMapping:     MitreMappingSchema,
  remediationPlan:  RemediationPlanSchema,
  reportSummary:    ReportSummarySchema,
});

export function validateAIResponse(parsed) {
  const result = AnalysisResponseSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`);
    return { success: false, error: `Invalid AI response: ${issues.slice(0,3).join("; ")}` };
  }
  return { success: true, data: result.data };
}
