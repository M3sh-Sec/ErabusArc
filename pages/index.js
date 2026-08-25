import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";

// ─── Severity config ──────────────────────────────────────────────────────────
const SEV = {
  CRITICAL: { color: "var(--color-critical)", bg: "rgba(255,45,85,0.09)",  border: "rgba(255,45,85,0.22)"  },
  HIGH:     { color: "var(--color-high)",     bg: "rgba(255,107,53,0.09)", border: "rgba(255,107,53,0.22)" },
  MEDIUM:   { color: "var(--color-medium)",   bg: "rgba(255,214,10,0.07)", border: "rgba(255,214,10,0.22)" },
  LOW:      { color: "var(--color-low)",      bg: "rgba(48,209,88,0.07)",  border: "rgba(48,209,88,0.22)"  },
  INFO:     { color: "var(--color-info)",     bg: "rgba(100,210,255,0.07)",border: "rgba(100,210,255,0.22)"},
  MINIMAL:  { color: "var(--color-info)",     bg: "rgba(100,210,255,0.07)",border: "rgba(100,210,255,0.22)"},
};

const TABS = [
  { id: "overview",    label: "Overview",       icon: "◈" },
  { id: "vulns",       label: "CVEs",           icon: "⬡" },
  { id: "adversaries", label: "Adversaries",    icon: "◭" },
  { id: "mitre",       label: "ATT&CK",         icon: "◎" },
  { id: "surface",     label: "Attack Surface", icon: "◉" },
  { id: "remediation", label: "Remediation",    icon: "◆" },
  { id: "report",      label: "Report",         icon: "▣" },
];

const SCAN_MSGS = [
  "Initializing EREBUS ARC threat engine...",
  "Fingerprinting target components...",
  "Querying NVD CVE database...",
  "Cross-referencing CISA KEV catalog...",
  "Checking Exploit-DB for public PoCs...",
  "Mapping to MITRE ATT&CK framework...",
  "Calculating EPSS exploit probabilities...",
  "Analyzing supply chain exposure...",
  "Running CVSS v3.1 scoring engine...",
  "Correlating active exploitation data...",
  "Generating analyst report...",
];

const EXAMPLES = [
  "wordpress 6.4.2", "log4j 2.14.0", "nginx 1.24",
  "openssl 3.0.1", "apache struts 2.5", "https://example.com",
];

// ─── Micro-components ─────────────────────────────────────────────────────────

function Chip({ label, color, bg, border, small }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontSize: small ? "9px" : "10px", fontWeight: 700,
      letterSpacing: "0.07em",
      color: color || "var(--color-muted)",
      background: bg || "var(--color-surface)",
      border: `1px solid ${border || "var(--color-border)"}`,
      padding: small ? "2px 6px" : "3px 9px",
      borderRadius: "4px", whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function Label({ children }) {
  return (
    <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
      textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "4px" }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
      {icon && <span style={{ color: "var(--color-accent)", fontSize: "14px" }}>{icon}</span>}
      <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>{children}</span>
      <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
    </div>
  );
}

function CVSSBar({ value }) {
  const color = value >= 9 ? "var(--color-critical)" : value >= 7 ? "var(--color-high)"
    : value >= 4 ? "var(--color-medium)" : "var(--color-low)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ flex: 1, height: "3px", background: "rgba(255,255,255,0.07)", borderRadius: "2px" }}>
        <div style={{ width: `${(value / 10) * 100}%`, height: "100%", background: color,
          borderRadius: "2px", transition: "width 1s ease" }} />
      </div>
      <span style={{ fontSize: "11px", color, fontWeight: 700, minWidth: "26px" }}>{value?.toFixed(1)}</span>
    </div>
  );
}

function RingGauge({ score, size = 130 }) {
  const [anim, setAnim] = useState(0);
  const r = size * 0.42;
  const circ = 2 * Math.PI * r;
  useEffect(() => { const t = setTimeout(() => setAnim(score), 150); return () => clearTimeout(t); }, [score]);
  const color = score >= 80 ? "var(--color-critical)" : score >= 60 ? "var(--color-high)"
    : score >= 40 ? "var(--color-medium)" : score >= 20 ? "var(--color-low)" : "var(--color-info)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ filter: `drop-shadow(0 0 10px ${color}50)` }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,255,255,0.05)" strokeWidth="9" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={circ} strokeDashoffset={circ - (anim / 100) * circ}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)" }} />
      <text x={size/2} y={size/2 - 6} textAnchor="middle" fill={color}
        fontSize={size * 0.19} fontWeight="800" fontFamily="var(--font-mono)">{score}</text>
      <text x={size/2} y={size/2 + 12} textAnchor="middle"
        fill="rgba(255,255,255,0.25)" fontSize={size * 0.085} fontFamily="var(--font-mono)">RISK</text>
    </svg>
  );
}

// ─── Vuln Card ────────────────────────────────────────────────────────────────

function VulnCard({ v, idx }) {
  const [open, setOpen] = useState(false);
  const s = SEV[v.severity] || SEV.INFO;
  return (
    <div onClick={() => setOpen(!open)} style={{
      border: `1px solid ${open ? s.border : "var(--color-border)"}`,
      borderRadius: "var(--radius)", overflow: "hidden",
      background: open ? s.bg : "var(--color-surface)",
      cursor: "pointer", transition: "all 0.2s",
      animation: `fadeUp 0.35s ease ${idx * 0.05}s both`,
    }}>
      <div style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <Chip label={v.severity} color={s.color} bg={s.bg} border={s.border} />
          {v.inCisaKev && <Chip label="KEV" color="var(--color-critical)" bg="rgba(255,45,85,0.1)" border="rgba(255,45,85,0.3)" />}
          {v.publicExploit && <Chip label={v.exploitMaturity} color="var(--color-high)" bg="rgba(255,107,53,0.1)" border="rgba(255,107,53,0.3)" />}
          <span style={{ color: s.color, fontSize: "12px", fontWeight: 700 }}>{v.cveId}</span>
          <span style={{ flex: 1, color: "rgba(255,255,255,0.8)", fontSize: "13px", fontWeight: 600 }}>{v.title}</span>
          {v.cvssV3 && <span style={{ color: s.color, fontWeight: 800, fontSize: "13px" }}>{v.cvssV3}</span>}
          <span style={{ color: "rgba(255,255,255,0.2)", transform: open ? "rotate(90deg)" : "none", transition: "0.2s" }}>›</span>
        </div>
        {v.cvssV3 && <div style={{ marginTop: "8px" }}><CVSSBar value={v.cvssV3} /></div>}
        <div style={{ display: "flex", gap: "10px", marginTop: "5px", flexWrap: "wrap" }}>
          {v.cweName && <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>{v.cweId} · {v.cweName}</span>}
          {v.published && <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>{v.published}</span>}
        </div>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${s.border}`, padding: "18px",
          display: "flex", flexDirection: "column", gap: "14px" }}>
          <div><Label>Technical Description</Label>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", lineHeight: 1.65 }}>{v.description}</p></div>
          <div><Label>Exploit Scenario</Label>
            <p style={{ color: s.color, fontSize: "13px", lineHeight: 1.65 }}>{v.exploitScenario}</p></div>
          {v.cvssVector && <div><Label>CVSS Vector</Label>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>{v.cvssVector}</p></div>}
          {v.mitreAttack?.techniqueId && (
            <div><Label>MITRE ATT&CK</Label>
              <p style={{ color: "var(--color-accent)", fontSize: "12px" }}>
                {v.mitreAttack.tactic} → {v.mitreAttack.technique} ({v.mitreAttack.techniqueId})</p></div>
          )}
          {v.impact && (
            <div><Label>CIA Impact</Label>
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                {["confidentiality","integrity","availability"].map(k => {
                  const c = v.impact[k] === "HIGH" ? "var(--color-critical)" : v.impact[k] === "LOW" ? "var(--color-medium)" : "rgba(255,255,255,0.2)";
                  return (
                    <div key={k} style={{ textAlign: "center", padding: "8px 12px",
                      background: "rgba(255,255,255,0.03)", borderRadius: "6px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: c }}>{v.impact[k]}</div>
                      <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", marginTop: "2px",
                        textTransform: "uppercase" }}>{k.charAt(0)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {v.ttps?.killChain?.length > 0 && (
            <div style={{ background: "rgba(61,139,255,0.05)", border: "1px solid rgba(61,139,255,0.15)", borderRadius: "var(--radius-sm)", padding: "14px" }}>
              <Label>Kill Chain — ATT&amp;CK TTPs</Label>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                {v.ttps.killChain.map((step, ki) => (
                  <div key={ki} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "8px", background: "rgba(255,255,255,0.02)", borderRadius: "5px" }}>
                    <span style={{ color: "var(--color-accent)", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: "11px", minWidth: "75px", paddingTop: "1px" }}>{step.techniqueId}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: "6px", marginBottom: "3px", flexWrap: "wrap" }}>
                        <Chip label={step.phase} color="rgba(255,255,255,0.4)" small />
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{step.techniqueName}</span>
                      </div>
                      <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: "12px", lineHeight: 1.5 }}>{step.description}</p>
                      {step.detectionOpportunity && (
                        <p style={{ margin: "4px 0 0", color: "#30d158", fontSize: "11px", fontFamily: "var(--font-mono)" }}>
                          <span style={{ opacity: 0.6, marginRight: "6px" }}>Detect:</span>{step.detectionOpportunity}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {v.ttps?.threatActors?.length > 0 && (
                <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(61,139,255,0.12)" }}>
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>
                    Threat Actors Known to Exploit This
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {v.ttps.threatActors.map((a, ai) => {
                      const mm = MOTIV[a.motivation] || MOTIV.Mixed;
                      return (
                        <div key={ai} style={{ background: mm.bg, border: `1px solid ${mm.border}`, borderRadius: "5px", padding: "5px 10px" }}>
                          <span style={{ color: mm.color, fontSize: "11px", fontWeight: 700 }}>{a.name}</span>
                          {a.hasExploitedThis && <span style={{ color: "var(--color-critical)", fontSize: "9px", marginLeft: "5px" }}>&#x2713; CONFIRMED</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <div style={{ background: "rgba(48,209,88,0.06)", border: "1px solid rgba(48,209,88,0.18)",
            borderRadius: "var(--radius-sm)", padding: "14px" }}>
            <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
              <Chip label={v.remediation?.urgency} color="var(--color-low)" bg="rgba(48,209,88,0.1)" border="rgba(48,209,88,0.25)" />
              <Chip label={v.remediation?.action} color="var(--color-low)" bg="rgba(48,209,88,0.1)" border="rgba(48,209,88,0.25)" />
            </div>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: "13px", lineHeight: 1.6 }}>{v.remediation?.detail}</p>
            {v.patchedVersion && <p style={{ margin: "6px 0 0", color: "var(--color-low)", fontSize: "12px" }}>&#x2713; Patched: {v.patchedVersion}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab Panels ───────────────────────────────────────────────────────────────

function OverviewPanel({ data }) {
  const { meta, riskProfile, reportSummary } = data;
  const s = SEV[riskProfile.riskLevel] || SEV.INFO;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <RingGauge score={riskProfile.overallScore} />
          <Chip label={`${riskProfile.riskLevel} RISK`} color={s.color} bg={s.bg} border={s.border} />
        </div>
        <div style={{ flex: 1, minWidth: "220px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "10px" }}>
            <span style={{ fontSize: "18px", fontWeight: 800, color: "#fff" }}>{meta.target}</span>
            <Chip label={meta.targetType?.toUpperCase()} />
            <Chip label={`Confidence: ${meta.confidence}`}
              color={meta.confidence === "HIGH" ? "var(--color-low)" : "var(--color-medium)"} />
          </div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.7, marginBottom: "14px" }}>{riskProfile.executiveSummary}</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[
              { v: reportSummary.totalVulns,   l: "Total CVEs", c: "#fff" },
              { v: reportSummary.criticalCount, l: "Critical",   c: "var(--color-critical)" },
              { v: reportSummary.highCount,     l: "High",       c: "var(--color-high)" },
              { v: reportSummary.mediumCount,   l: "Medium",     c: "var(--color-medium)" },
              { v: reportSummary.lowCount,      l: "Low",        c: "var(--color-low)" },
            ].map(({ v, l, c }) => (
              <div key={l} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)", padding: "12px 16px" }}>
                <div style={{ fontSize: "26px", fontWeight: 800, color: c, lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginTop: "4px",
                  letterSpacing: "0.08em", textTransform: "uppercase" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", padding: "18px" }}>
        <SectionTitle icon="◈">Analyst Notes</SectionTitle>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.75 }}>{riskProfile.analystNotes}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "10px" }}>
        {[
          { label: "EPSS Average",      value: riskProfile.epssAverage != null ? (riskProfile.epssAverage * 100).toFixed(1) + "%" : "N/A", color: "var(--color-high)" },
          { label: "CISA KEV Matches",  value: riskProfile.kevCount ?? 0,   color: "var(--color-critical)" },
          { label: "Exploited in Wild", value: riskProfile.exploitedInWild ? "YES" : "NO", color: riskProfile.exploitedInWild ? "var(--color-critical)" : "var(--color-low)" },
          { label: "Data Sources",      value: (meta.dataSource || []).length, color: "var(--color-info)" },
        ].map(item => (
          <div key={item.label} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)", padding: "14px 16px" }}>
            <div style={{ fontSize: "22px", fontWeight: 800, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginTop: "4px",
              letterSpacing: "0.08em", textTransform: "uppercase" }}>{item.label}</div>
          </div>
        ))}
      </div>

      {meta.fingerprint?.length > 0 && (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)", padding: "18px" }}>
          <SectionTitle icon="◉">Target Fingerprint</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {meta.fingerprint.map((f, i) => <Chip key={i} label={f} />)}
          </div>
        </div>
      )}

      {reportSummary.complianceNotes && (
        <div style={{ background: "rgba(61,139,255,0.05)", border: "1px solid rgba(61,139,255,0.18)",
          borderRadius: "var(--radius)", padding: "18px" }}>
          <SectionTitle icon="▣">Compliance Implications</SectionTitle>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.65 }}>{reportSummary.complianceNotes}</p>
        </div>
      )}
    </div>
  );
}

function VulnsPanel({ vulns }) {
  const [filter, setFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("severity");
  const sevOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
  const filtered = (vulns || [])
    .filter(v => filter === "ALL" || v.severity === filter)
    .sort((a, b) => sortBy === "severity"
      ? sevOrder[a.severity] - sevOrder[b.severity]
      : (b.cvssV3 || 0) - (a.cvssV3 || 0));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "3px", background: "var(--color-surface)", padding: "3px", borderRadius: "var(--radius-sm)" }}>
          {["ALL","CRITICAL","HIGH","MEDIUM","LOW"].map(f => (
            <button key={f} onClick={e => { e.stopPropagation(); setFilter(f); }} style={{
              border: "none", padding: "5px 11px", borderRadius: "5px",
              fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em", fontFamily: "var(--font-mono)",
              background: filter === f ? (SEV[f]?.bg || "rgba(255,255,255,0.08)") : "transparent",
              color: filter === f ? (SEV[f]?.color || "#fff") : "rgba(255,255,255,0.3)",
              transition: "all 0.15s",
            }}>{f}</button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center" }}>
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>Sort:</span>
          {["severity","cvss"].map(s => (
            <button key={s} onClick={e => { e.stopPropagation(); setSortBy(s); }} style={{
              border: `1px solid ${sortBy === s ? "rgba(61,139,255,0.35)" : "var(--color-border)"}`,
              background: sortBy === s ? "rgba(61,139,255,0.08)" : "transparent",
              color: sortBy === s ? "var(--color-accent)" : "rgba(255,255,255,0.3)",
              padding: "4px 10px", borderRadius: "5px", fontSize: "10px",
              fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
            }}>{s.toUpperCase()}</button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>{filtered.length} vulnerabilities · click any row to expand</div>
      {filtered.map((v, i) => <VulnCard key={`${v.cveId}-${i}`} v={v} idx={i} />)}
    </div>
  );
}

function MitrePanel({ data }) {
  const { mitreMapping = [], vulnerabilities = [] } = data;
  const mapped = vulnerabilities.filter(v => v.mitreAttack?.techniqueId);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ background: "rgba(61,139,255,0.05)", border: "1px solid rgba(61,139,255,0.15)",
        borderRadius: "var(--radius)", padding: "14px 16px" }}>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.35)", fontSize: "12px", lineHeight: 1.65 }}>
          MITRE ATT&CK® mapping links detected vulnerabilities to adversary tactics and techniques — use to prioritise detection rules and threat hunt hypotheses.
        </p>
      </div>
      {mitreMapping.map((t, i) => (
        <div key={i} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)", padding: "16px", animation: `fadeUp 0.3s ease ${i*0.07}s both` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <div style={{ width: "7px", height: "7px", background: "var(--color-accent)", borderRadius: "50%" }} />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-accent)",
              textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.tactic}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {(t.techniques || []).map((tech, j) => (
              <div key={j} style={{ background: "rgba(61,139,255,0.07)", border: "1px solid rgba(61,139,255,0.18)",
                borderRadius: "5px", padding: "5px 11px", fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{tech}</div>
            ))}
          </div>
        </div>
      ))}
      {mapped.length > 0 && (
        <div>
          <SectionTitle icon="◎">CVE → ATT&CK Cross-Reference</SectionTitle>
          {mapped.map((v, i) => (
            <div key={i} style={{ display: "flex", gap: "12px", padding: "9px 0",
              borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center",
              animation: `fadeUp 0.3s ease ${i*0.04}s both` }}>
              <span style={{ color: (SEV[v.severity]||SEV.INFO).color, fontSize: "11px", fontWeight: 700, minWidth: "140px" }}>{v.cveId}</span>
              <span style={{ color: "var(--color-accent)", fontSize: "11px", minWidth: "60px" }}>{v.mitreAttack.techniqueId}</span>
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px" }}>{v.mitreAttack.tactic} → {v.mitreAttack.technique}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SurfacePanel({ data }) {
  const { attackSurface = {} } = data;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {[
        { title: "Attack Vectors",            items: attackSurface.vectors,         icon: "◉", color: "var(--color-high)" },
        { title: "Exposed Ports / Services",  items: attackSurface.exposedPorts,    icon: "◈", color: "var(--color-medium)" },
        { title: "Authentication Weaknesses", items: attackSurface.authWeaknesses,  icon: "⬡", color: "var(--color-critical)" },
      ].filter(s => s.items?.length).map(({ title, items, icon, color }) => (
        <div key={title} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)", padding: "18px" }}>
          <SectionTitle icon={icon}>{title}</SectionTitle>
          {items.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", padding: "7px 0",
              borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <span style={{ color, fontSize: "13px" }}>▸</span>
              <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px", lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>
      ))}
      {attackSurface.supplyChainRisk && (
        <div style={{ background: "rgba(255,45,85,0.06)", border: "1px solid rgba(255,45,85,0.18)",
          borderRadius: "var(--radius)", padding: "18px" }}>
          <SectionTitle icon="◆">Supply Chain Risk</SectionTitle>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.65 }}>{attackSurface.supplyChainRisk}</p>
        </div>
      )}
    </div>
  );
}


// ─── Motivation colours ───────────────────────────────────────────────────────
const MOTIV = {
  Espionage:   { color: "#bf5af2", bg: "rgba(191,90,242,0.1)",  border: "rgba(191,90,242,0.25)" },
  Financial:   { color: "#ffd60a", bg: "rgba(255,214,10,0.08)", border: "rgba(255,214,10,0.22)" },
  Destructive: { color: "#ff2d55", bg: "rgba(255,45,85,0.09)",  border: "rgba(255,45,85,0.22)"  },
  Hacktivism:  { color: "#30d158", bg: "rgba(48,209,88,0.08)",  border: "rgba(48,209,88,0.22)"  },
  Mixed:       { color: "#ff6b35", bg: "rgba(255,107,53,0.09)", border: "rgba(255,107,53,0.22)" },
};
const SOPHIS = { Advanced: "#ff2d55", Intermediate: "#ffd60a", Basic: "#30d158" };
const FREQ   = { High: "var(--color-critical)", Medium: "var(--color-medium)", Low: "var(--color-low)" };

function ActorCard({ actor, idx }) {
  const [open, setOpen] = useState(false);
  const m = MOTIV[actor.motivation] || MOTIV.Mixed;
  const sc = SOPHIS[actor.sophistication] || SOPHIS.Intermediate;
  return (
    <div onClick={() => setOpen(!open)} style={{
      border: `1px solid ${open ? m.border : "var(--color-border)"}`,
      borderRadius: "var(--radius)", background: open ? m.bg : "var(--color-surface)",
      padding: "14px 18px", cursor: "pointer", transition: "all 0.2s",
      animation: `fadeUp 0.3s ease ${idx * 0.06}s both`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <Chip label={actor.motivation} color={m.color} bg={m.bg} border={m.border} />
        <Chip label={actor.sophistication} color={sc} />
        {actor.nationState && <Chip label={actor.nationState} />}
        <span style={{ flex: 1, fontSize: "14px", fontWeight: 700, color: "#fff" }}>{actor.name}</span>
        {actor.aliases?.length > 0 && (
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>aka {actor.aliases.slice(0,2).join(", ")}</span>
        )}
        <span style={{ color: "rgba(255,255,255,0.2)", transform: open ? "rotate(90deg)" : "none", transition: "0.2s" }}>&#x203A;</span>
      </div>
      {actor.activeYears && (
        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginTop: "5px" }}>Active: {actor.activeYears}</div>
      )}
      {open && (
        <div style={{ borderTop: `1px solid ${m.border}`, marginTop: "14px", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {actor.knownCVEsExploited?.length > 0 && (
            <div>
              <Label>CVEs Exploited</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                {actor.knownCVEsExploited.map((c,i) => (
                  <Chip key={i} label={c} color="var(--color-critical)" bg="rgba(255,45,85,0.08)" border="rgba(255,45,85,0.2)" small />
                ))}
              </div>
            </div>
          )}
          {actor.signatureTTPs?.length > 0 && (
            <div>
              <Label>Signature TTPs</Label>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                {actor.signatureTTPs.map((t,i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", fontSize: "12px" }}>
                    <span style={{ color: "var(--color-accent)", fontWeight: 700, minWidth: "80px", fontFamily: "var(--font-mono)" }}>{t.techniqueId}</span>
                    <span style={{ color: "rgba(255,255,255,0.35)", minWidth: "120px" }}>{t.phase}</span>
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>{t.techniqueName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {actor.campaigns?.length > 0 && (
            <div>
              <Label>Known Campaigns</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                {actor.campaigns.map((c,i) => <Chip key={i} label={c} />)}
              </div>
            </div>
          )}
          {actor.targetSectors?.length > 0 && (
            <div>
              <Label>Target Sectors</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                {actor.targetSectors.map((s,i) => <Chip key={i} label={s} />)}
              </div>
            </div>
          )}
          {actor.iocHints?.length > 0 && (
            <div>
              <Label>IOC Hints</Label>
              {actor.iocHints.map((h,i) => (
                <div key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-mono)", marginTop: "3px" }}>
                  <span style={{ color: m.color, marginRight: "8px" }}>&#x25B8;</span>{h}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AttackChainViz({ chain }) {
  const PCOLORS = {
    "Initial Access":"#ff2d55","Execution":"#ff4d00","Persistence":"#ff6b35",
    "Privilege Escalation":"#ff9f0a","Defense Evasion":"#ffd60a","Credential Access":"#ffe066",
    "Discovery":"#34c759","Lateral Movement":"#30d158","Collection":"#64d2ff",
    "Exfiltration":"#0a84ff","Impact":"#bf5af2","Reconnaissance":"#ff375f",
    "Resource Development":"#ff6961",
  };
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", padding: "18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>{chain.name}</span>
        {chain.actor && <Chip label={chain.actor} />}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0" }}>
        {chain.steps?.map((step, i) => {
          const c = PCOLORS[step.phase] || "#64d2ff";
          return (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ background: `${c}15`, border: `1px solid ${c}40`, borderRadius: "6px", padding: "8px 12px", minWidth: "120px" }}>
                <div style={{ fontSize: "9px", color: c, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "2px" }}>{step.phase}</div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-mono)" }}>{step.techniqueId}</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginTop: "2px", lineHeight: 1.3 }}>{step.techniqueName}</div>
                {step.cveUsed && <div style={{ fontSize: "9px", color: "var(--color-critical)", marginTop: "3px", fontFamily: "var(--font-mono)" }}>{step.cveUsed}</div>}
              </div>
              {i < chain.steps.length - 1 && (
                <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "16px", padding: "0 3px" }}>&#x2192;</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TTPHeatmap({ heatmap }) {
  if (!heatmap?.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {heatmap.map((tac, ti) => (
        <div key={ti} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", padding: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            {tac.tacticId && <Chip label={tac.tacticId} color="var(--color-accent)" bg="rgba(61,139,255,0.08)" border="rgba(61,139,255,0.2)" small />}
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{tac.tactic}</span>
          </div>
          {tac.techniques?.map((tech, i) => {
            const fc = FREQ[tech.frequency] || "var(--color-low)";
            const dd = tech.detectionDifficulty;
            const dc = dd === "Hard" ? "var(--color-critical)" : dd === "Medium" ? "var(--color-medium)" : "var(--color-low)";
            return (
              <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center", padding: "6px 8px",
                background: "rgba(255,255,255,0.02)", borderRadius: "5px", marginBottom: "4px", flexWrap: "wrap" }}>
                <span style={{ color: "var(--color-accent)", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: "11px", minWidth: "90px" }}>{tech.id}</span>
                <span style={{ flex: 1, color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>{tech.name}</span>
                <Chip label={tech.frequency} color={fc} small />
                <Chip label={"Detect: " + dd} color={dc} small />
                {tech.actorsUsing?.length > 0 && <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>{tech.actorsUsing.length} actor{tech.actorsUsing.length!==1?"s":""}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function AdversariesPanel({ data }) {
  const ap = data.adversaryProfile;
  const [subTab, setSubTab] = useState("actors");
  if (!ap) return (
    <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.2)", fontSize: "13px" }}>No adversary intelligence available.</div>
  );
  const subTabs = [
    { id: "actors",    label: "Threat Actors" },
    { id: "chains",    label: "Attack Chains" },
    { id: "heatmap",   label: "TTP Heatmap" },
    { id: "detection", label: "Detection" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "10px" }}>
        {[
          { v: ap.totalActorsIdentified,        l: "Threat Actors",  c: "var(--color-critical)" },
          { v: ap.nationStateThreats?.length??0, l: "Nation-States", c: "#bf5af2" },
          { v: ap.criminalGroups?.length??0,     l: "Criminal Groups",c: "var(--color-high)" },
          { v: data.reportSummary?.totalTTPsMapped??0, l: "TTPs Mapped", c: "var(--color-accent)" },
        ].map(({ v, l, c }) => (
          <div key={l} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
            <div style={{ fontSize: "24px", fontWeight: 800, color: c, fontFamily: "var(--font-mono)", lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginTop: "4px", letterSpacing: "0.08em", textTransform: "uppercase" }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "rgba(191,90,242,0.06)", border: "1px solid rgba(191,90,242,0.18)", borderRadius: "var(--radius)", padding: "16px 18px" }}>
        <Label>Threat Landscape</Label>
        <p style={{ margin: "6px 0 8px", color: "rgba(255,255,255,0.55)", fontSize: "13px", lineHeight: 1.7 }}>{ap.summary}</p>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {ap.nationStateThreats?.map((n,i) => <Chip key={i} label={n} color="#bf5af2" bg="rgba(191,90,242,0.1)" border="rgba(191,90,242,0.25)" />)}
        </div>
      </div>
      <div style={{ display: "flex", gap: "2px", background: "var(--color-surface)", padding: "3px", borderRadius: "var(--radius-sm)", width: "fit-content" }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            border: "none", padding: "6px 14px", borderRadius: "5px",
            fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", transition: "all 0.15s",
            background: subTab === t.id ? "rgba(61,139,255,0.14)" : "transparent",
            color: subTab === t.id ? "var(--color-accent)" : "rgba(255,255,255,0.28)",
          }}>{t.label}</button>
        ))}
      </div>
      {subTab === "actors" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {ap.threatActors?.length
            ? ap.threatActors.map((a,i) => <ActorCard key={i} actor={a} idx={i} />)
            : <div style={{ color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "28px" }}>No actors identified.</div>}
        </div>
      )}
      {subTab === "chains" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {ap.attackChains?.length
            ? ap.attackChains.map((c,i) => <AttackChainViz key={i} chain={c} />)
            : <div style={{ color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "28px" }}>No attack chains modelled.</div>}
        </div>
      )}
      {subTab === "heatmap" && <TTPHeatmap heatmap={ap.ttpHeatmap} />}
      {subTab === "detection" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {ap.detectionRecommendations?.length ? ap.detectionRecommendations.map((d,i) => {
            const p = SEV[d.priority] || SEV.INFO;
            return (
              <div key={i} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", padding: "14px 18px", animation: `fadeUp 0.3s ease ${i*0.05}s both` }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                  <Chip label={d.priority} color={p.color} bg={p.bg} border={p.border} />
                  <Chip label={d.mitreTechnique} color="var(--color-accent)" bg="rgba(61,139,255,0.08)" border="rgba(61,139,255,0.2)" />
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{d.logSource}</span>
                </div>
                <p style={{ margin: "0 0 5px", color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 600 }}>{d.rule}</p>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.35)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
                  <span style={{ color: "rgba(255,255,255,0.2)", marginRight: "6px" }}>Indicator:</span>{d.indicator}
                </p>
              </div>
            );
          }) : <div style={{ color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "28px" }}>No detection rules generated.</div>}
        </div>
      )}
    </div>
  );
}

function RemediationPanel({ data }) {
  const { remediationPlan = {} } = data;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {[
        { key: "immediate",            label: "Immediate — 0 to 24 Hours",  color: "var(--color-critical)", icon: "⚑" },
        { key: "shortTerm",            label: "Short-Term — 1 to 7 Days",   color: "var(--color-high)",     icon: "◆" },
        { key: "longTerm",             label: "Long-Term — Strategic",       color: "var(--color-low)",      icon: "◈" },
        { key: "compensatingControls", label: "Compensating Controls",       color: "var(--color-info)",     icon: "◎" },
      ].filter(p => remediationPlan[p.key]?.length).map(({ key, label, color, icon }, pi) => (
        <div key={key} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)", padding: "18px", animation: `fadeUp 0.3s ease ${pi*0.1}s both` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{ color, fontSize: "15px" }}>{icon}</span>
            <span style={{ fontSize: "11px", fontWeight: 700, color, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
          </div>
          {remediationPlan[key].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: "12px", padding: "9px 0",
              borderBottom: i < remediationPlan[key].length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <span style={{ color, fontWeight: 800, fontSize: "11px", minWidth: "22px" }}>{String(i+1).padStart(2,"0")}</span>
              <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px", lineHeight: 1.6 }}>{item}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ReportPanel({ data }) {
  const { reportSummary, riskProfile, meta } = data;
  const s = SEV[riskProfile.riskLevel] || SEV.INFO;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ") + " UTC";
  const [copied, setCopied] = useState(false);

  const buildReportText = () => `
EREBUS ARC VULNERABILITY INTELLIGENCE REPORT
==========================================
Generated : ${now}
Version   : 1.0.0

TARGET ASSESSMENT
-----------------
Target       : ${meta.target}
Type         : ${meta.targetType}
Risk Level   : ${riskProfile.riskLevel} (Score: ${riskProfile.overallScore}/100)
Confidence   : ${meta.confidence}
Exploited    : ${riskProfile.exploitedInWild ? "YES — ACTIVE EXPLOITATION DETECTED" : "No confirmed exploitation"}
CISA KEV     : ${riskProfile.kevCount} matching entries
EPSS Average : ${riskProfile.epssAverage != null ? (riskProfile.epssAverage * 100).toFixed(1) + "%" : "N/A"}

VULNERABILITY SUMMARY
---------------------
Total CVEs : ${reportSummary.totalVulns}
Critical   : ${reportSummary.criticalCount}
High       : ${reportSummary.highCount}
Medium     : ${reportSummary.mediumCount}
Low        : ${reportSummary.lowCount}

TOP RISK
--------
${reportSummary.topRisk}

EXECUTIVE SUMMARY
-----------------
${riskProfile.executiveSummary}

ANALYST NOTES
-------------
${riskProfile.analystNotes}

COMPLIANCE
----------
${reportSummary.complianceNotes || "N/A"}

VULNERABILITIES
---------------
${(data.vulnerabilities || []).map(v =>
`[${v.severity}] ${v.cveId} — ${v.title}
  CVSS : ${v.cvssV3 || "N/A"} | CWE: ${v.cweId || "N/A"} | Published: ${v.published}
  KEV  : ${v.inCisaKev ? "YES" : "No"} | Public Exploit: ${v.publicExploit ? v.exploitMaturity : "None"}
  ${v.description}
  Remediation: ${v.remediation?.detail}
  Urgency    : ${v.remediation?.urgency}
`).join("\n")}

REMEDIATION PLAN
----------------
IMMEDIATE (0–24h):
${(data.remediationPlan?.immediate || []).map((r,i) => `  ${i+1}. ${r}`).join("\n")}

SHORT-TERM (1–7 days):
${(data.remediationPlan?.shortTerm || []).map((r,i) => `  ${i+1}. ${r}`).join("\n")}

LONG-TERM:
${(data.remediationPlan?.longTerm || []).map((r,i) => `  ${i+1}. ${r}`).join("\n")}

---
Generated by EREBUS ARC v1.0.0 — Professional Vulnerability Intelligence Platform
DISCLAIMER: AI-generated report based on known vulnerability databases.
Always validate with real-time scanning tools and vendor advisories.
  `.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(buildReportText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={handleCopy} style={{
          background: copied ? "rgba(48,209,88,0.1)" : "rgba(61,139,255,0.1)",
          border: `1px solid ${copied ? "rgba(48,209,88,0.3)" : "rgba(61,139,255,0.3)"}`,
          color: copied ? "var(--color-low)" : "var(--color-accent)",
          padding: "8px 18px", borderRadius: "var(--radius-sm)",
          fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.08em",
        }}>{copied ? "✓ Copied!" : "⬡ Copy Report"}</button>
      </div>

      <div style={{ background: "#080b12", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius)", padding: "32px", fontFamily: "var(--font-mono)" }}>
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "20px", marginBottom: "24px" }}>
          <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.2em", marginBottom: "6px" }}>THREAT INTELLIGENCE REPORT</div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#fff", letterSpacing: "0.1em", fontFamily: "var(--font-display)" }}>EREBUS ARC</div>
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", marginTop: "4px" }}>v1.0.0 · {now}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "22px" }}>
          {[
            ["Target",          meta.target],
            ["Type",            meta.targetType?.toUpperCase()],
            ["Risk Level",      riskProfile.riskLevel],
            ["Risk Score",      `${riskProfile.overallScore}/100`],
            ["Confidence",      meta.confidence],
            ["Exploited",       riskProfile.exploitedInWild ? "YES ⚠" : "Not confirmed"],
            ["CISA KEV",        riskProfile.kevCount],
            ["EPSS Average",    riskProfile.epssAverage != null ? (riskProfile.epssAverage * 100).toFixed(1) + "%" : "N/A"],
          ].map(([k, v]) => (
            <div key={k} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "6px" }}>
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.22)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{k}</div>
              <div style={{ fontSize: "13px", fontWeight: 700, marginTop: "3px",
                color: k === "Risk Level" ? s.color : "#fff" }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "8px", marginBottom: "22px" }}>
          {[["TOTAL",reportSummary.totalVulns,"#fff"],["CRITICAL",reportSummary.criticalCount,"var(--color-critical)"],
            ["HIGH",reportSummary.highCount,"var(--color-high)"],["MEDIUM",reportSummary.mediumCount,"var(--color-medium)"],
            ["LOW",reportSummary.lowCount,"var(--color-low)"]].map(([l,v,c]) => (
            <div key={l} style={{ textAlign: "center", padding: "12px 6px",
              background: "rgba(255,255,255,0.02)", borderRadius: "6px" }}>
              <div style={{ fontSize: "22px", fontWeight: 800, color: c }}>{v}</div>
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.22)", marginTop: "2px", letterSpacing: "0.07em" }}>{l}</div>
            </div>
          ))}
        </div>

        {reportSummary.topRisk && (
          <div style={{ background: "rgba(255,45,85,0.06)", border: "1px solid rgba(255,45,85,0.18)",
            borderRadius: "var(--radius-sm)", padding: "14px 16px", marginBottom: "14px" }}>
            <div style={{ fontSize: "9px", color: "var(--color-critical)", letterSpacing: "0.12em",
              textTransform: "uppercase", marginBottom: "5px" }}>Top Risk Finding</div>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: "13px" }}>{reportSummary.topRisk}</p>
          </div>
        )}

        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.22)", letterSpacing: "0.12em",
            textTransform: "uppercase", marginBottom: "6px" }}>Executive Summary</div>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.7 }}>{riskProfile.executiveSummary}</p>
        </div>

        {reportSummary.complianceNotes && (
          <div style={{ background: "rgba(61,139,255,0.04)", border: "1px solid rgba(61,139,255,0.14)",
            borderRadius: "var(--radius-sm)", padding: "14px 16px" }}>
            <div style={{ fontSize: "9px", color: "var(--color-accent)", letterSpacing: "0.12em",
              textTransform: "uppercase", marginBottom: "5px" }}>Compliance Notes</div>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: "13px", lineHeight: 1.65 }}>{reportSummary.complianceNotes}</p>
          </div>
        )}

        <div style={{ marginTop: "24px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.05)",
          fontSize: "10px", color: "rgba(255,255,255,0.18)", lineHeight: 1.6 }}>
          Generated by EREBUS ARC v1.0.0 · AI-powered vulnerability intelligence · Always validate with live scanning tools and vendor advisories.
        </div>
      </div>
    </div>
  );
}

// ─── History Panel ────────────────────────────────────────────────────────────

function HistoryPanel({ history, onRescan, onClear }) {
  if (!history.length) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px",
        color: "rgba(255,255,255,0.15)", fontSize: "13px" }}>
        No previous scans in this session.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "4px" }}>
        <button onClick={onClear} style={{
          background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.2)",
          color: "var(--color-critical)", padding: "6px 14px", borderRadius: "var(--radius-sm)",
          fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.07em",
        }}>Clear History</button>
      </div>
      {history.map((entry) => {
        const s = SEV[entry.riskLevel] || SEV.INFO;
        return (
          <div key={entry.id} style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)", padding: "14px 18px",
            display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap",
            animation: "fadeUp 0.3s ease both",
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px",
              color: "rgba(255,255,255,0.2)", minWidth: "70px" }}>{entry.id}</span>
            <span style={{ flex: 1, color: "rgba(255,255,255,0.75)", fontSize: "13px",
              fontWeight: 600, minWidth: "120px" }}>{entry.target}</span>
            <Chip label={entry.riskLevel} color={s.color} bg={s.bg} border={s.border} />
            <span style={{ color: s.color, fontWeight: 800, fontFamily: "var(--font-mono)",
              fontSize: "14px" }}>{entry.riskScore}</span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>
              {entry.totalVulns} CVEs
            </span>
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "11px" }}>
              {new Date(entry.scannedAt).toLocaleTimeString()}
            </span>
            <button onClick={() => onRescan(entry.target)} style={{
              background: "rgba(61,139,255,0.08)", border: "1px solid rgba(61,139,255,0.2)",
              color: "var(--color-accent)", padding: "4px 10px", borderRadius: "5px",
              fontSize: "10px", fontWeight: 700, fontFamily: "var(--font-mono)",
            }}>Re-scan</button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT PANEL
// ═══════════════════════════════════════════════════════════════════════════════

const ROLE_COLORS = {
  superadmin:    { color: "#ff2d55", label: "Superadmin" },
  company_admin: { color: "#ff9f0a", label: "Admin" },
  analyst:       { color: "#3d8bff", label: "Analyst" },
  viewer:        { color: "#30d158", label: "Viewer" },
};

function UserManagementPanel({ currentUser, company, csrfToken }) {
  const [users, setUsers] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "analyst" });
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState(null);

  const loadUsers = useCallback(async () => {
    const r = await fetch("/api/users");
    const d = await r.json();
    if (d.users) setUsers(d.users);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const canManage = ["superadmin","company_admin"].includes(currentUser.role);

  async function inviteUser(e) {
    e.preventDefault();
    setErr(null);
    const r = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    if (!r.ok) { setErr(d.error); return; }
    setMsg("User created successfully"); setShowInvite(false);
    setForm({ email: "", name: "", password: "", role: "analyst" });
    loadUsers();
    setTimeout(() => setMsg(null), 3000);
  }

  async function deactivateUser(id) {
    if (!confirm("Deactivate this user?")) return;
    await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ id }),
    });
    loadUsers();
  }

  async function changeRole(id, role) {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ id, role }),
    });
    loadUsers();
  }

  const inp = { background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "9px 12px", color: "#fff", fontSize: "12px", fontFamily: "var(--font-mono)", outline: "none", width: "100%" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>{company?.name}</div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{users.length} users</div>
        </div>
        {canManage && (
          <button onClick={() => setShowInvite(!showInvite)} style={{ background: "rgba(61,139,255,0.1)", border: "1px solid rgba(61,139,255,0.3)", color: "#3d8bff", padding: "7px 16px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-mono)", cursor: "pointer" }}>
            + Invite User
          </button>
        )}
      </div>

      {msg && <div style={{ background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.25)", borderRadius: "6px", padding: "10px 14px", color: "#30d158", fontSize: "12px" }}>✓ {msg}</div>}

      {showInvite && canManage && (
        <form onSubmit={inviteUser} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>Invite New User</div>
          {[["email","Email","email"],["name","Full Name","text"],["password","Temporary Password","password"]].map(([k,l,t]) => (
            <div key={k}>
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>{l}</div>
              <input type={t} value={form[k]} onChange={e => setForm(p => ({...p,[k]:e.target.value}))} required style={inp} />
            </div>
          ))}
          <div>
            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>Role</div>
            <select value={form.role} onChange={e => setForm(p => ({...p,role:e.target.value}))} style={{ ...inp }}>
              <option value="viewer">Viewer (read-only)</option>
              <option value="analyst">Analyst (scan + mitigate)</option>
              <option value="company_admin">Admin (manage users)</option>
              {currentUser.role === "superadmin" && <option value="superadmin">Superadmin</option>}
            </select>
          </div>
          {err && <div style={{ color: "#ff2d55", fontSize: "11px" }}>⚠ {err}</div>}
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" style={{ flex: 1, background: "#3d8bff", border: "none", color: "#fff", padding: "9px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-mono)", cursor: "pointer" }}>Create User</button>
            <button type="button" onClick={() => setShowInvite(false)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", padding: "9px 14px", borderRadius: "6px", fontSize: "11px", fontFamily: "var(--font-mono)", cursor: "pointer" }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {users.map(u => {
          const rc = ROLE_COLORS[u.role] || ROLE_COLORS.viewer;
          const isMe = u.id === currentUser.id;
          return (
            <div key={u.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: `${rc.color}22`, border: `1px solid ${rc.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 800, color: rc.color, flexShrink: 0 }}>
                {u.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: "120px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>{u.name} {isMe && <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>(you)</span>}</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{u.email}</div>
                {u.lastLoginAt && <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", marginTop: "2px" }}>Last login: {new Date(u.lastLoginAt).toLocaleString()}</div>}
              </div>
              <Chip label={rc.label} color={rc.color} bg={`${rc.color}18`} border={`${rc.color}33`} />
              {canManage && !isMe && (
                <div style={{ display: "flex", gap: "6px" }}>
                  <select value={u.role} onChange={e => changeRole(u.id, e.target.value)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", padding: "4px 8px", borderRadius: "5px", fontSize: "10px", fontFamily: "var(--font-mono)", cursor: "pointer" }}>
                    <option value="viewer">Viewer</option>
                    <option value="analyst">Analyst</option>
                    <option value="company_admin">Admin</option>
                  </select>
                  <button onClick={() => deactivateUser(u.id)} style={{ background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.2)", color: "#ff2d55", padding: "4px 10px", borderRadius: "5px", fontSize: "10px", fontFamily: "var(--font-mono)", cursor: "pointer" }}>Remove</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MITIGATION TRACKER
// ═══════════════════════════════════════════════════════════════════════════════

const MIT_STATUS = {
  open:           { label: "Open",           color: "#ff2d55", bg: "rgba(255,45,85,0.1)",   border: "rgba(255,45,85,0.25)"   },
  mitigating:     { label: "In Progress",    color: "#ff9f0a", bg: "rgba(255,159,10,0.1)",  border: "rgba(255,159,10,0.25)"  },
  mitigated:      { label: "Mitigated",      color: "#30d158", bg: "rgba(48,209,88,0.1)",   border: "rgba(48,209,88,0.25)"   },
  risk_accepted:  { label: "Risk Accepted",  color: "#ffd60a", bg: "rgba(255,214,10,0.08)", border: "rgba(255,214,10,0.25)"  },
  false_positive: { label: "False Positive", color: "#64d2ff", bg: "rgba(100,210,255,0.08)",border: "rgba(100,210,255,0.25)" },
};

function MitigationTrackerPanel({ scanId, companyScans, currentUser, csrfToken }) {
  const [mitigations, setMitigations] = useState([]);
  const [selectedScan, setSelectedScan] = useState(scanId || "");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSev, setFilterSev] = useState("all");
  const [updating, setUpdating] = useState(null);
  const [notes, setNotes] = useState({});
  const [expanded, setExpanded] = useState(null);

  const canUpdate = ["superadmin","company_admin","analyst"].includes(currentUser.role);

  const loadMitigations = useCallback(async (sid) => {
    const url = sid ? `/api/mitigations?scanId=${sid}` : "/api/mitigations";
    const r = await fetch(url);
    const d = await r.json();
    if (d.mitigations) setMitigations(d.mitigations);
  }, []);

  useEffect(() => { loadMitigations(selectedScan); }, [selectedScan, loadMitigations]);

  async function updateStatus(id, status) {
    if (!canUpdate) return;
    setUpdating(id);
    const r = await fetch("/api/mitigations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ id, status, notes: notes[id] || undefined }),
    });
    const d = await r.json();
    if (d.mitigation) {
      setMitigations(prev => prev.map(m => m.id === id ? d.mitigation : m));
    }
    setUpdating(null);
  }

  async function saveNotes(id) {
    if (!canUpdate) return;
    await fetch("/api/mitigations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ id, notes: notes[id] }),
    });
    setMitigations(prev => prev.map(m => m.id === id ? { ...m, notes: notes[id] } : m));
    setExpanded(null);
  }

  const filtered = mitigations.filter(m => {
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    if (filterSev !== "all" && m.severity !== filterSev) return false;
    return true;
  });

  const counts = Object.keys(MIT_STATUS).reduce((acc, k) => {
    acc[k] = mitigations.filter(m => m.status === k).length;
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Scan selector */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <Label>Scan</Label>
          <select value={selectedScan} onChange={e => setSelectedScan(e.target.value)} style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "9px 12px", color: "#fff", fontSize: "12px", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
            <option value="">— All scans —</option>
            {companyScans.map(s => (
              <option key={s.id} value={s.id}>{s.target} ({new Date(s.scannedAt).toLocaleDateString()})</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Status</Label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "9px 12px", color: "#fff", fontSize: "12px", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
            <option value="all">All</option>
            {Object.entries(MIT_STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <Label>Severity</Label>
          <select value={filterSev} onChange={e => setFilterSev(e.target.value)} style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "9px 12px", color: "#fff", fontSize: "12px", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
            <option value="all">All</option>
            {["CRITICAL","HIGH","MEDIUM","LOW"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Status summary pills */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {Object.entries(MIT_STATUS).map(([k, v]) => (
          <button key={k} onClick={() => setFilterStatus(filterStatus === k ? "all" : k)} style={{
            background: filterStatus === k ? v.bg : "rgba(255,255,255,0.03)",
            border: `1px solid ${filterStatus === k ? v.border : "rgba(255,255,255,0.07)"}`,
            borderRadius: "20px", padding: "5px 14px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "6px",
          }}>
            <span style={{ fontSize: "13px", fontWeight: 800, color: v.color }}>{counts[k] || 0}</span>
            <span style={{ fontSize: "10px", color: filterStatus === k ? v.color : "rgba(255,255,255,0.3)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>{v.label.toUpperCase()}</span>
          </button>
        ))}
        <div style={{ marginLeft: "auto", fontSize: "11px", color: "rgba(255,255,255,0.25)", alignSelf: "center" }}>
          {filtered.length} / {mitigations.length} shown
        </div>
      </div>

      {/* Mitigation items */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.15)", fontSize: "13px" }}>
          No mitigations found. Run a scan to populate the tracker.
        </div>
      ) : filtered.map((m, i) => {
        const sev = SEV[m.severity] || SEV.INFO;
        const stat = MIT_STATUS[m.status] || MIT_STATUS.open;
        const isOpen = expanded === m.id;
        const done = ["mitigated","risk_accepted","false_positive"].includes(m.status);
        return (
          <div key={m.id} style={{ background: done ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.03)", border: `1px solid ${isOpen ? stat.border : "rgba(255,255,255,0.07)"}`, borderRadius: "10px", overflow: "hidden", animation: `fadeUp 0.3s ease ${i*0.03}s both`, opacity: done ? 0.7 : 1 }}>
            {/* Header row */}
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {/* Checkbox-style status toggle */}
              {canUpdate && (
                <button onClick={() => updateStatus(m.id, m.status === "open" ? "mitigated" : "open")} disabled={updating === m.id} style={{
                  width: "20px", height: "20px", borderRadius: "4px", flexShrink: 0,
                  background: done ? "#30d158" : "rgba(255,255,255,0.05)",
                  border: `2px solid ${done ? "#30d158" : "rgba(255,255,255,0.2)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                  {done && <span style={{ color: "#000", fontSize: "11px", fontWeight: 800 }}>✓</span>}
                </button>
              )}
              <Chip label={m.severity} color={sev.color} bg={sev.bg} border={sev.border} />
              <span style={{ color: sev.color, fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{m.cveId}</span>
              <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: done ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.85)", textDecoration: done ? "line-through" : "none" }}>{m.title}</span>
              <Chip label={stat.label} color={stat.color} bg={stat.bg} border={stat.border} />
              {m.cvssV3 && <span style={{ color: sev.color, fontSize: "12px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{m.cvssV3}</span>}
              <button onClick={() => setExpanded(isOpen ? null : m.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: "16px", transform: isOpen ? "rotate(90deg)" : "none", transition: "0.2s" }}>›</button>
            </div>

            {/* Expanded controls */}
            {isOpen && (
              <div style={{ borderTop: `1px solid ${stat.border}`, padding: "16px", display: "flex", flexDirection: "column", gap: "14px", background: "rgba(0,0,0,0.2)" }}>
                <div>
                  <Label>Remediation Guidance</Label>
                  <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "12px", lineHeight: 1.6 }}>{m.remediationDetail}</p>
                </div>

                {canUpdate && (
                  <div>
                    <Label>Update Status</Label>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                      {Object.entries(MIT_STATUS).map(([k, v]) => (
                        <button key={k} onClick={() => updateStatus(m.id, k)} disabled={m.status === k || updating === m.id} style={{
                          background: m.status === k ? v.bg : "rgba(255,255,255,0.04)",
                          border: `1px solid ${m.status === k ? v.border : "rgba(255,255,255,0.08)"}`,
                          color: m.status === k ? v.color : "rgba(255,255,255,0.35)",
                          padding: "5px 12px", borderRadius: "5px", fontSize: "10px", fontWeight: 700,
                          fontFamily: "var(--font-mono)", cursor: m.status === k ? "default" : "pointer",
                          letterSpacing: "0.06em", transition: "all 0.15s",
                        }}>{v.label}</button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label>Analyst Notes</Label>
                  {canUpdate ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                      <textarea value={notes[m.id] !== undefined ? notes[m.id] : (m.notes || "")}
                        onChange={e => setNotes(p => ({...p,[m.id]:e.target.value}))}
                        placeholder="Add notes, workarounds, evidence of mitigation..."
                        rows={3}
                        style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "10px", color: "#fff", fontSize: "12px", fontFamily: "var(--font-mono)", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                      />
                      <button onClick={() => saveNotes(m.id)} style={{ alignSelf: "flex-start", background: "rgba(61,139,255,0.1)", border: "1px solid rgba(61,139,255,0.3)", color: "#3d8bff", padding: "6px 14px", borderRadius: "5px", fontSize: "10px", fontWeight: 700, fontFamily: "var(--font-mono)", cursor: "pointer" }}>Save Notes</button>
                    </div>
                  ) : (
                    <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>{m.notes || "No notes."}</p>
                  )}
                </div>

                {m.statusHistory?.length > 0 && (
                  <div>
                    <Label>Status History</Label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                      {m.statusHistory.map((h, hi) => {
                        const from = MIT_STATUS[h.from] || MIT_STATUS.open;
                        const to   = MIT_STATUS[h.to]   || MIT_STATUS.open;
                        return (
                          <div key={hi} style={{ display: "flex", gap: "8px", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                            <span style={{ color: "rgba(255,255,255,0.15)" }}>{new Date(h.at).toLocaleString()}</span>
                            <span style={{ color: from.color }}>{from.label}</span>
                            <span>→</span>
                            <span style={{ color: to.color }}>{to.label}</span>
                            {h.notes && <span style={{ color: "rgba(255,255,255,0.2)" }}>— {h.notes.slice(0,60)}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPANY SCANS PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function ScansListPanel({ scans, onSelectScan, onNewScan }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onNewScan} style={{ background: "#3d8bff", border: "none", color: "#fff", padding: "8px 18px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", cursor: "pointer", boxShadow: "0 0 18px rgba(61,139,255,0.3)" }}>▶ New Scan</button>
      </div>
      {scans.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px", color: "rgba(255,255,255,0.15)", fontSize: "13px" }}>No scans yet. Start a new scan to populate this list.</div>
      ) : scans.map((s, i) => {
        const sev = SEV[s.riskLevel] || SEV.INFO;
        return (
          <div key={s.id} onClick={() => onSelectScan(s.id)} style={{
            background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "10px", padding: "14px 18px", cursor: "pointer",
            transition: "all 0.15s", animation: `fadeUp 0.3s ease ${i*0.04}s both`,
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <Chip label={s.riskLevel} color={sev.color} bg={sev.bg} border={sev.border} />
              <span style={{ flex: 1, fontSize: "14px", fontWeight: 700, color: "#fff" }}>{s.target}</span>
              <span style={{ color: sev.color, fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-mono)" }}>{s.riskScore}</span>
            </div>
            <div style={{ display: "flex", gap: "14px", marginTop: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>{new Date(s.scannedAt).toLocaleString()}</span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>{s.targetType}</span>
              {s.criticalCount > 0 && <span style={{ fontSize: "11px", color: "#ff2d55", fontWeight: 700 }}>{s.criticalCount} Critical</span>}
              {s.highCount > 0 && <span style={{ fontSize: "11px", color: "#ff6b35", fontWeight: 700 }}>{s.highCount} High</span>}
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>{s.totalVulns} CVEs total</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}


export default function ErebusArcPage() {
  const router = useRouter();
  const [authUser, setAuthUser]     = useState(null);
  const [authCompany, setAuthCompany] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [csrfToken, setCsrfToken]   = useState(null);

  // App views: "scanner" | "scans" | "tracker" | "users"
  const [view, setView]             = useState("scanner");
  const [companyScans, setCompanyScans] = useState([]);
  const [selectedScanId, setSelectedScanId] = useState(null);

  // Scanner state
  const [target, setTarget]         = useState("");
  const [scanning, setScanning]     = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState(null);
  const [activeTab, setActiveTab]   = useState("overview");
  const [scanLog, setScanLog]       = useState([]);
  const [logDone, setLogDone]       = useState(false);
  const [rateLimitMsg, setRateLimitMsg] = useState(null);
  const logRef = useRef();

  // Boot: check auth and CSRF
  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/csrf-token").then(r => r.json()).catch(() => null),
    ]).then(([me, csrf]) => {
      if (me?.user) { setAuthUser(me.user); setAuthCompany(me.company); }
      else router.push("/login");
      if (csrf?.token) setCsrfToken(csrf.token);
      setAuthLoading(false);
    });
  }, []);

  const loadScans = useCallback(async () => {
    const r = await fetch("/api/scans");
    const d = await r.json();
    if (d.scans) setCompanyScans(d.scans);
  }, []);

  useEffect(() => { if (authUser) loadScans(); }, [authUser, loadScans]);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [scanLog]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", headers: { "X-CSRF-Token": csrfToken || "" } });
    router.push("/login");
  }

  async function runScan(overrideTarget) {
    const t = (overrideTarget || target).trim();
    if (!t || scanning) return;
    if (overrideTarget) setTarget(overrideTarget);
    setScanning(true); setResult(null); setError(null);
    setRateLimitMsg(null); setScanLog([]); setLogDone(false);

    let idx = 0;
    const iv = setInterval(() => {
      if (idx < SCAN_MSGS.length) setScanLog(p => [...p, SCAN_MSGS[idx++]]);
      else clearInterval(iv);
    }, 750);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) },
        body: JSON.stringify({ target: t }),
      });
      clearInterval(iv);

      if (res.status === 429) { const d = await res.json(); setRateLimitMsg(d.error); return; }
      if (res.status === 403) {
        fetch("/api/csrf-token").then(r => r.json()).then(d => setCsrfToken(d.token));
        throw new Error("Session expired. Please try again.");
      }
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Scan failed"); }

      const { data } = await res.json();
      setScanLog(p => [...p, "✓ Analysis complete — parsing intelligence report..."]);
      setLogDone(true);
      setTimeout(async () => { setResult(data); setActiveTab("overview"); await loadScans(); }, 500);
    } catch (err) { setError(err.message || "Scan failed."); }
    finally { setScanning(false); }
  }

  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: "#07090f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>
      Initializing EREBUS ARC...
    </div>
  );

  if (!authUser) return null;

  const rc = ROLE_COLORS[authUser.role] || ROLE_COLORS.viewer;
  const canScan = ["superadmin","company_admin","analyst"].includes(authUser.role);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(61,139,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(61,139,255,0.022) 1px,transparent 1px)",
        backgroundSize: "48px 48px" }} />

      {/* ── Top navigation bar ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(7,9,15,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", padding: "0 20px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", gap: "16px", height: "56px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "8px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--color-accent)", boxShadow: "0 0 10px var(--color-accent)" }} />
            <span style={{ fontSize: "14px", fontWeight: 800, letterSpacing: "0.12em", color: "#fff" }}>EREBUS ARC</span>
          </div>

          {/* Nav links */}
          {[
            { id: "scanner",  label: "Scanner",   icon: "◈", show: canScan },
            { id: "scans",    label: "Scans",     icon: "⬡", show: true },
            { id: "tracker",  label: "Mitigations",icon: "◆", show: true },
            { id: "users",    label: "Users",     icon: "◉", show: true },
          ].filter(n => n.show).map(n => (
            <button key={n.id} onClick={() => { setView(n.id); setResult(null); }} style={{
              border: "none", background: view === n.id ? "rgba(61,139,255,0.12)" : "transparent",
              borderBottom: view === n.id ? "2px solid var(--color-accent)" : "2px solid transparent",
              color: view === n.id ? "var(--color-accent)" : "rgba(255,255,255,0.35)",
              padding: "0 14px", height: "100%", fontSize: "11px", fontWeight: 700,
              letterSpacing: "0.07em", fontFamily: "var(--font-mono)", cursor: "pointer", transition: "all 0.15s",
            }}><span style={{ marginRight: "5px" }}>{n.icon}</span>{n.label}</button>
          ))}
          <button onClick={() => router.push("/compliance")} style={{ border: "none", background: "transparent", borderBottom: "2px solid transparent", color: "rgba(255,255,255,0.35)", padding: "0 14px", height: "100%", fontSize: "11px", fontWeight: 700, letterSpacing: "0.07em", fontFamily: "var(--font-mono)", cursor: "pointer", transition: "all 0.15s" }}>
            <span style={{ marginRight: "5px" }}>📋</span>Compliance
          </button>
          <button onClick={() => router.push("/about")} style={{ border: "none", background: "transparent", borderBottom: "2px solid transparent", color: "rgba(255,255,255,0.35)", padding: "0 14px", height: "100%", fontSize: "11px", fontWeight: 700, letterSpacing: "0.07em", fontFamily: "var(--font-mono)", cursor: "pointer", transition: "all 0.15s" }}>
            <span style={{ marginRight: "5px" }}>◈</span>About
          </button>

          <div style={{ flex: 1 }} />

          {/* User badge + logout */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#fff" }}>{authUser.name}</div>
              <div style={{ fontSize: "9px", color: rc.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>{rc.label}</div>
            </div>
            {authCompany && (
              <div style={{ padding: "4px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "5px", fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>
                {authCompany.name}
              </div>
            )}
            <button onClick={handleLogout} style={{ background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.2)", color: "#ff2d55", padding: "5px 12px", borderRadius: "5px", fontSize: "10px", fontWeight: 700, fontFamily: "var(--font-mono)", cursor: "pointer" }}>Logout</button>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: "1100px", margin: "0 auto", padding: "28px 20px 80px" }}>

        {/* ─ USERS VIEW ─ */}
        {view === "users" && (
          <div>
            <SectionTitle icon="◉">User Management</SectionTitle>
            <UserManagementPanel currentUser={authUser} company={authCompany} csrfToken={csrfToken} />
          </div>
        )}

        {/* ─ SCANS VIEW ─ */}
        {view === "scans" && (
          <div>
            <SectionTitle icon="⬡">Company Scans</SectionTitle>
            <ScansListPanel
              scans={companyScans}
              onSelectScan={async (id) => {
                setSelectedScanId(id);
                const r = await fetch(`/api/scans?id=${id}`);
                const d = await r.json();
                if (d.scan?.fullResult) {
                  setResult(d.scan.fullResult);
                  setActiveTab("overview");
                  setView("scanner");
                }
              }}
              onNewScan={() => setView("scanner")}
            />
          </div>
        )}

        {/* ─ TRACKER VIEW ─ */}
        {view === "tracker" && (
          <div>
            <SectionTitle icon="◆">Mitigation Tracker</SectionTitle>
            <MitigationTrackerPanel
              scanId={selectedScanId}
              companyScans={companyScans}
              currentUser={authUser}
              csrfToken={csrfToken}
            />
          </div>
        )}

        {/* ─ SCANNER VIEW ─ */}
        {view === "scanner" && (
          <>
            {!canScan && (
              <div style={{ background: "rgba(255,214,10,0.07)", border: "1px solid rgba(255,214,10,0.2)", borderRadius: "10px", padding: "16px 20px", color: "var(--color-medium)", fontSize: "13px", marginBottom: "20px" }}>
                ⚠ Your role (Viewer) is read-only. Contact an admin to request Analyst access to run scans.
              </div>
            )}

            {canScan && (
              <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", padding: "22px", marginBottom: "18px", position: "relative", overflow: "hidden" }}>
                {scanning && <div style={{ position: "absolute", left: 0, right: 0, height: "1px", background: "linear-gradient(90deg,transparent,var(--color-accent),transparent)", animation: "scanBeam 2.5s linear infinite", zIndex: 5 }} />}
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.22)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "10px" }}>Target — URL · Software · Library · Service · OS</div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <input value={target} onChange={e => setTarget(e.target.value)} onKeyDown={e => e.key === "Enter" && runScan(null)}
                    placeholder="e.g.  wordpress 6.4  ·  log4j 2.14.0  ·  https://target.com"
                    style={{ flex: 1, minWidth: "220px", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "var(--radius-sm)", padding: "12px 16px", color: "#fff", fontSize: "13px", fontFamily: "var(--font-mono)", outline: "none" }} />
                  <button onClick={() => runScan(null)} disabled={scanning || !target.trim()} style={{
                    padding: "12px 28px", borderRadius: "var(--radius-sm)", border: "none",
                    background: scanning ? "rgba(61,139,255,0.1)" : "var(--color-accent)", color: scanning ? "var(--color-accent)" : "#fff",
                    fontSize: "12px", fontWeight: 800, fontFamily: "var(--font-mono)", letterSpacing: "0.1em", whiteSpace: "nowrap",
                    boxShadow: scanning ? "none" : "0 0 22px rgba(61,139,255,0.3)", opacity: !target.trim() ? 0.4 : 1, cursor: scanning || !target.trim() ? "not-allowed" : "pointer",
                  }}>{scanning ? "SCANNING..." : "▶ SCAN TARGET"}</button>
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "12px", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.18)", marginRight: "4px" }}>TRY:</span>
                  {EXAMPLES.map(ex => (
                    <button key={ex} onClick={() => setTarget(ex)} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px", padding: "3px 9px", color: "rgba(255,255,255,0.28)", fontSize: "10px", fontFamily: "var(--font-mono)", cursor: "pointer" }}>{ex}</button>
                  ))}
                </div>
              </div>
            )}

            {rateLimitMsg && <div style={{ background: "rgba(255,214,10,0.07)", border: "1px solid rgba(255,214,10,0.22)", borderRadius: "var(--radius-sm)", padding: "12px 16px", color: "var(--color-medium)", fontSize: "12px", marginBottom: "16px" }}>⏱ {rateLimitMsg}</div>}

            {(scanning || logDone) && scanLog.length > 0 && (
              <div ref={logRef} style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(61,139,255,0.1)", borderRadius: "var(--radius-sm)", padding: "14px 18px", marginBottom: "18px", maxHeight: "180px", overflowY: "auto" }}>
                {scanLog.map((msg, i) => (
                  <div key={i} style={{ fontSize: "11px", marginBottom: "3px", color: i === scanLog.length - 1 ? "var(--color-accent)" : "rgba(61,139,255,0.35)" }}>
                    <span style={{ color: "rgba(61,139,255,0.28)", marginRight: "8px" }}>›</span>{msg}
                    {i === scanLog.length - 1 && !logDone && <span style={{ animation: "blink 1s step-end infinite" }}> ▌</span>}
                  </div>
                ))}
              </div>
            )}

            {error && <div style={{ background: "rgba(255,45,85,0.07)", border: "1px solid rgba(255,45,85,0.2)", borderRadius: "var(--radius-sm)", padding: "12px 16px", color: "var(--color-critical)", fontSize: "12px", marginBottom: "16px" }}>⚠ {error}</div>}

            {result && (
              <div>
                {/* Jump to mitigation tracker for this scan */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "14px", alignItems: "center" }}>
                  <button onClick={() => { setView("tracker"); }} style={{ background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.25)", color: "#30d158", padding: "7px 16px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-mono)", cursor: "pointer" }}>
                    ◆ Open Mitigation Tracker
                  </button>
                  <button onClick={() => { setView("scans"); setResult(null); }} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)", padding: "7px 16px", borderRadius: "6px", fontSize: "11px", fontFamily: "var(--font-mono)", cursor: "pointer" }}>
                    ⬡ All Scans
                  </button>
                </div>

                <div style={{ display: "flex", gap: "2px", background: "var(--color-surface)", padding: "4px", borderRadius: "var(--radius)", marginBottom: "18px", overflowX: "auto" }}>
                  {TABS.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                      border: "none", padding: "8px 16px", borderRadius: "var(--radius-sm)",
                      fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", fontFamily: "var(--font-mono)", whiteSpace: "nowrap", transition: "all 0.15s",
                      background: activeTab === t.id ? "rgba(61,139,255,0.14)" : "transparent",
                      color: activeTab === t.id ? "var(--color-accent)" : "rgba(255,255,255,0.28)",
                      borderBottom: activeTab === t.id ? "1px solid rgba(61,139,255,0.35)" : "1px solid transparent",
                    }}><span style={{ marginRight: "5px" }}>{t.icon}</span>{t.label}</button>
                  ))}
                </div>

                {activeTab === "overview"    && <OverviewPanel data={result} />}
                {activeTab === "vulns"       && <VulnsPanel vulns={result.vulnerabilities} />}
                {activeTab === "adversaries" && <AdversariesPanel data={result} />}
                {activeTab === "mitre"       && <MitrePanel data={result} />}
                {activeTab === "surface"     && <SurfacePanel data={result} />}
                {activeTab === "remediation" && <RemediationPanel data={result} />}
                {activeTab === "report"      && <ReportPanel data={result} />}
              </div>
            )}

            {!result && !scanning && (
              <div style={{ textAlign: "center", padding: "70px 20px", color: "rgba(255,255,255,0.1)" }}>
                <div style={{ fontSize: "52px", marginBottom: "14px" }}>◈</div>
                <p style={{ fontSize: "12px", letterSpacing: "0.1em" }}>{canScan ? "Enter a target above to begin threat analysis" : "You have view-only access. Ask an admin to run scans."}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
