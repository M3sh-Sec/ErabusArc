/**
 * EREBUS ARC Compliance Framework Catalog
 *
 * Authoritative metadata for all supported frameworks.
 * Each framework defines its domain structure (families/categories)
 * and key cross-reference identifiers used by the mapping engine.
 *
 * Frameworks supported:
 *   - STIG (uploaded by user — DoD Security Technical Implementation Guides)
 *   - FedRAMP High / Moderate / Low (based on NIST 800-53r5)
 *   - NIST SP 800-53 Rev 5
 *   - NIST SP 800-171 Rev 2 (CUI protection, 110 controls)
 *   - NERC CIP (Critical Infrastructure Protection)
 *   - ISO/IEC 27001:2022
 */

export const FRAMEWORKS = {
  STIG: {
    id: "STIG",
    name: "DISA STIG",
    fullName: "Defense Information Systems Agency Security Technical Implementation Guide",
    version: "Various",
    color: "#ff6b35",
    bg: "rgba(255,107,53,0.1)",
    border: "rgba(255,107,53,0.25)",
    description: "DoD security configuration checklists for specific technologies",
    controlIdPattern: "V-\\d{6}",
    families: [
      "System and Communications Protection",
      "Access Control",
      "Audit and Accountability",
      "Configuration Management",
      "Identification and Authentication",
      "Risk Assessment",
      "System and Information Integrity",
      "Maintenance",
    ],
    uploadable: true,
  },

  FEDRAMP_HIGH: {
    id: "FEDRAMP_HIGH",
    name: "FedRAMP High",
    fullName: "Federal Risk and Authorization Management Program — High Baseline",
    version: "Rev 5 (2023)",
    color: "#ff2d55",
    bg: "rgba(255,45,85,0.1)",
    border: "rgba(255,45,85,0.25)",
    description: "421 controls for systems processing highly sensitive federal data",
    controlIdPattern: "[A-Z]{2}-\\d+",
    baselineSize: 421,
    families: NIST_FAMILIES,
    uploadable: false,
  },

  FEDRAMP_MODERATE: {
    id: "FEDRAMP_MODERATE",
    name: "FedRAMP Moderate",
    fullName: "Federal Risk and Authorization Management Program — Moderate Baseline",
    version: "Rev 5 (2023)",
    color: "#ff9f0a",
    bg: "rgba(255,159,10,0.1)",
    border: "rgba(255,159,10,0.25)",
    description: "325 controls — most common FedRAMP authorization level",
    controlIdPattern: "[A-Z]{2}-\\d+",
    baselineSize: 325,
    families: NIST_FAMILIES,
    uploadable: false,
  },

  FEDRAMP_LOW: {
    id: "FEDRAMP_LOW",
    name: "FedRAMP Low",
    fullName: "Federal Risk and Authorization Management Program — Low Baseline",
    version: "Rev 5 (2023)",
    color: "#ffd60a",
    bg: "rgba(255,214,10,0.08)",
    border: "rgba(255,214,10,0.25)",
    description: "125 controls for public-facing, low-sensitivity systems",
    controlIdPattern: "[A-Z]{2}-\\d+",
    baselineSize: 125,
    families: NIST_FAMILIES,
    uploadable: false,
  },

  NIST_800_53: {
    id: "NIST_800_53",
    name: "NIST 800-53r5",
    fullName: "NIST Special Publication 800-53 Revision 5",
    version: "Rev 5 (Sep 2020, updated Dec 2020)",
    color: "#3d8bff",
    bg: "rgba(61,139,255,0.1)",
    border: "rgba(61,139,255,0.25)",
    description: "1,007 controls across 20 families — the foundation of US federal security",
    controlIdPattern: "[A-Z]{2}-\\d+(\\.\\d+)?",
    totalControls: 1007,
    families: NIST_FAMILIES,
    uploadable: false,
  },

  NIST_800_171: {
    id: "NIST_800_171",
    name: "NIST 800-171r2",
    fullName: "NIST Special Publication 800-171 Revision 2",
    version: "Rev 2 (Feb 2020)",
    color: "#64d2ff",
    bg: "rgba(100,210,255,0.08)",
    border: "rgba(100,210,255,0.25)",
    description: "110 requirements for protecting Controlled Unclassified Information (CUI)",
    controlIdPattern: "3\\.\\d+\\.\\d+",
    totalControls: 110,
    families: [
      "3.1 Access Control",
      "3.2 Awareness and Training",
      "3.3 Audit and Accountability",
      "3.4 Configuration Management",
      "3.5 Identification and Authentication",
      "3.6 Incident Response",
      "3.7 Maintenance",
      "3.8 Media Protection",
      "3.9 Personnel Security",
      "3.10 Physical Protection",
      "3.11 Risk Assessment",
      "3.12 Security Assessment",
      "3.13 System and Communications Protection",
      "3.14 System and Information Integrity",
    ],
    uploadable: false,
  },

  NERC_CIP: {
    id: "NERC_CIP",
    name: "NERC CIP",
    fullName: "North American Electric Reliability Corporation Critical Infrastructure Protection",
    version: "CIP-002 through CIP-014 (v6/v7)",
    color: "#bf5af2",
    bg: "rgba(191,90,242,0.1)",
    border: "rgba(191,90,242,0.25)",
    description: "Mandatory cybersecurity standards for the bulk electric system",
    controlIdPattern: "CIP-\\d{3}-\\d",
    families: [
      "CIP-002: BES Cyber System Categorization",
      "CIP-003: Security Management Controls",
      "CIP-004: Personnel & Training",
      "CIP-005: Electronic Security Perimeters",
      "CIP-006: Physical Security",
      "CIP-007: Systems Security Management",
      "CIP-008: Incident Reporting & Response",
      "CIP-009: Recovery Plans",
      "CIP-010: Configuration Management",
      "CIP-011: Information Protection",
      "CIP-012: Communications between Control Centers",
      "CIP-013: Supply Chain Risk Management",
      "CIP-014: Physical Security (Transmission)",
    ],
    uploadable: false,
  },

  ISO_27001: {
    id: "ISO_27001",
    name: "ISO 27001:2022",
    fullName: "ISO/IEC 27001:2022 — Information Security Management Systems",
    version: "2022 Edition",
    color: "#30d158",
    bg: "rgba(48,209,88,0.08)",
    border: "rgba(48,209,88,0.25)",
    description: "93 controls across 4 themes — the international ISMS standard",
    controlIdPattern: "[A-Z]\\d+\\.\\d+(\\.\\d+)?",
    totalControls: 93,
    families: [
      "A.5 Organizational Controls (37)",
      "A.6 People Controls (8)",
      "A.7 Physical Controls (14)",
      "A.8 Technological Controls (34)",
    ],
    uploadable: false,
  },
};

// NIST 800-53 control families — shared by FedRAMP and 800-53
function NIST_FAMILIES() {}
const NIST_FAMILIES = [
  "AC — Access Control",
  "AT — Awareness and Training",
  "AU — Audit and Accountability",
  "CA — Assessment, Authorization, and Monitoring",
  "CM — Configuration Management",
  "CP — Contingency Planning",
  "IA — Identification and Authentication",
  "IR — Incident Response",
  "MA — Maintenance",
  "MP — Media Protection",
  "PE — Physical and Environmental Protection",
  "PL — Planning",
  "PM — Program Management",
  "PS — Personnel Security",
  "PT — PII Processing and Transparency",
  "RA — Risk Assessment",
  "SA — System and Services Acquisition",
  "SC — System and Communications Protection",
  "SI — System and Information Integrity",
  "SR — Supply Chain Risk Management",
];

// Reassign after hoisting issue
FRAMEWORKS.FEDRAMP_HIGH.families   = NIST_FAMILIES;
FRAMEWORKS.FEDRAMP_MODERATE.families = NIST_FAMILIES;
FRAMEWORKS.FEDRAMP_LOW.families    = NIST_FAMILIES;
FRAMEWORKS.NIST_800_53.families    = NIST_FAMILIES;

/**
 * Returns all framework IDs the system can map to.
 */
export const MAPPABLE_FRAMEWORKS = Object.keys(FRAMEWORKS).filter(
  f => f !== "STIG"
);

/**
 * Severity mapping for STIG CAT levels.
 */
export const STIG_CAT_TO_SEVERITY = {
  "CAT I":   "CRITICAL",  // High — direct, immediate threat
  "CAT II":  "MEDIUM",    // Medium — significant vulnerabilities
  "CAT III": "LOW",       // Low — degrade security posture
  "high":    "CRITICAL",
  "medium":  "MEDIUM",
  "low":     "LOW",
};

/**
 * Assessment status values for individual controls.
 */
export const CONTROL_STATUS = {
  NOT_ASSESSED:  "not_assessed",
  COMPLIANT:     "compliant",
  NON_COMPLIANT: "non_compliant",
  PARTIAL:       "partial",
  NOT_APPLICABLE:"not_applicable",
  COMPENSATING:  "compensating",
};

export const CONTROL_STATUS_LABELS = {
  not_assessed:   { label: "Not Assessed",   color: "#64d2ff", bg: "rgba(100,210,255,0.08)", border: "rgba(100,210,255,0.2)"  },
  compliant:      { label: "Compliant",      color: "#30d158", bg: "rgba(48,209,88,0.08)",   border: "rgba(48,209,88,0.2)"    },
  non_compliant:  { label: "Non-Compliant",  color: "#ff2d55", bg: "rgba(255,45,85,0.08)",   border: "rgba(255,45,85,0.2)"    },
  partial:        { label: "Partial",        color: "#ff9f0a", bg: "rgba(255,159,10,0.08)",  border: "rgba(255,159,10,0.2)"   },
  not_applicable: { label: "N/A",            color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.1)" },
  compensating:   { label: "Compensating",   color: "#bf5af2", bg: "rgba(191,90,242,0.08)", border: "rgba(191,90,242,0.2)"   },
};
