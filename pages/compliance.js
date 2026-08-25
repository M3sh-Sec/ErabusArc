import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";

// ─── Framework metadata (client-side copy) ────────────────────────────────────
const FW = {
  STIG:             { name: "DISA STIG",      color: "#ff6b35", short: "STIG" },
  FEDRAMP_HIGH:     { name: "FedRAMP High",   color: "#ff2d55", short: "FED-H" },
  FEDRAMP_MODERATE: { name: "FedRAMP Mod",    color: "#ff9f0a", short: "FED-M" },
  FEDRAMP_LOW:      { name: "FedRAMP Low",    color: "#ffd60a", short: "FED-L" },
  NIST_800_53:      { name: "NIST 800-53r5",  color: "#3d8bff", short: "800-53" },
  NIST_800_171:     { name: "NIST 800-171r2", color: "#64d2ff", short: "800-171" },
  NERC_CIP:         { name: "NERC CIP",       color: "#bf5af2", short: "NERC" },
  ISO_27001:        { name: "ISO 27001:2022",  color: "#30d158", short: "ISO" },
};

const MAPPABLE = ["FEDRAMP_HIGH","FEDRAMP_MODERATE","FEDRAMP_LOW","NIST_800_53","NIST_800_171","NERC_CIP","ISO_27001"];

const SEV_COLORS = {
  high:   { color: "#ff2d55", bg: "rgba(255,45,85,0.1)",   border: "rgba(255,45,85,0.25)",   label: "CAT I" },
  medium: { color: "#ff9f0a", bg: "rgba(255,159,10,0.1)",  border: "rgba(255,159,10,0.25)",  label: "CAT II" },
  low:    { color: "#ffd60a", bg: "rgba(255,214,10,0.08)", border: "rgba(255,214,10,0.25)",  label: "CAT III" },
};

const CTRL_STATUS = {
  not_assessed:   { label: "Not Assessed",  color: "#64d2ff", bg: "rgba(100,210,255,0.08)", border: "rgba(100,210,255,0.2)" },
  compliant:      { label: "Compliant",     color: "#30d158", bg: "rgba(48,209,88,0.08)",   border: "rgba(48,209,88,0.2)"  },
  non_compliant:  { label: "Non-Compliant", color: "#ff2d55", bg: "rgba(255,45,85,0.08)",   border: "rgba(255,45,85,0.2)"  },
  partial:        { label: "Partial",       color: "#ff9f0a", bg: "rgba(255,159,10,0.08)",  border: "rgba(255,159,10,0.2)" },
  not_applicable: { label: "N/A",           color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.1)" },
  compensating:   { label: "Compensating",  color: "#bf5af2", bg: "rgba(191,90,242,0.08)", border: "rgba(191,90,242,0.2)" },
};

// ─── Shared primitives ────────────────────────────────────────────────────────

function Chip({ label, color, bg, border, small }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontSize: small ? "9px" : "10px", fontWeight: 700, letterSpacing: "0.07em", color: color || "rgba(255,255,255,0.4)", background: bg || "rgba(255,255,255,0.05)", border: `1px solid ${border || "rgba(255,255,255,0.1)"}`, padding: small ? "2px 6px" : "3px 9px", borderRadius: "4px", whiteSpace: "nowrap" }}>{label}</span>
  );
}

function SectionTitle({ children, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
      {icon && <span style={{ color: "#3d8bff", fontSize: "15px" }}>{icon}</span>}
      <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>{children}</span>
      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

function ProgressBar({ pct, color = "#3d8bff", height = 6 }) {
  return (
    <div style={{ width: "100%", height, background: "rgba(255,255,255,0.06)", borderRadius: height }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: height, transition: "width 1s ease" }} />
    </div>
  );
}

// ─── Upload panel ─────────────────────────────────────────────────────────────

function UploadPanel({ csrfToken, onUploaded }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const fileRef = useRef();

  async function processFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErr("File too large — max 5MB."); return; }
    setUploading(true); setErr(null); setMsg(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = btoa(unescape(encodeURIComponent(e.target.result)));
      try {
        const r = await fetch("/api/compliance/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
          body: JSON.stringify({ filename: file.name, content: base64 }),
        });
        const d = await r.json();
        if (!r.ok) { setErr(d.error); return; }
        setMsg(`✓ Uploaded ${d.controlCount} controls from "${file.name}". Mapping in progress...`);
        onUploaded && onUploaded(d.upload);
      } catch { setErr("Upload failed. Please try again."); }
      finally { setUploading(false); }
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#3d8bff" : "rgba(255,255,255,0.12)"}`,
          borderRadius: "12px", padding: "48px 24px", textAlign: "center",
          background: dragging ? "rgba(61,139,255,0.05)" : "rgba(255,255,255,0.02)",
          cursor: "pointer", transition: "all 0.2s",
        }}
      >
        <div style={{ fontSize: "36px", marginBottom: "12px", opacity: 0.5 }}>📄</div>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: "6px" }}>
          {uploading ? "Uploading..." : "Drop STIG file here or click to browse"}
        </div>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
          Supports: XCCDF XML (.xml) · CSV from STIG Viewer (.csv) · Plain text (.txt, .ckl)
        </div>
        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", marginTop: "6px" }}>Max 5MB</div>
        <input ref={fileRef} type="file" accept=".xml,.csv,.txt,.ckl" style={{ display: "none" }} onChange={e => processFile(e.target.files[0])} />
      </div>

      {msg && <div style={{ background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.25)", borderRadius: "8px", padding: "12px 16px", color: "#30d158", fontSize: "12px", lineHeight: 1.6 }}>{msg}</div>}
      {err && <div style={{ background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.25)", borderRadius: "8px", padding: "12px 16px", color: "#ff2d55", fontSize: "12px" }}>⚠ {err}</div>}

      <div style={{ background: "rgba(61,139,255,0.05)", border: "1px solid rgba(61,139,255,0.15)", borderRadius: "8px", padding: "14px 16px" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "8px" }}>Supported Formats</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "8px" }}>
          {[
            ["XCCDF XML", "Official DoD STIG format from DISA — U_*_STIG_V*R*_Manual-xccdf.xml"],
            ["STIG Viewer CSV", "Exported checklists from DISA STIG Viewer 2.x/3.x"],
            ["CKL Files", "Checklist files — rename to .txt if needed"],
            ["Plain Text", "Free-form control lists with V-XXXXXX identifiers"],
          ].map(([fmt, desc]) => (
            <div key={fmt} style={{ padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "6px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#3d8bff", marginBottom: "2px" }}>{fmt}</div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Upload list ──────────────────────────────────────────────────────────────

function UploadsList({ uploads, onSelect, pollTick }) {
  if (!uploads.length) return (
    <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.15)", fontSize: "13px" }}>No STIG uploads yet. Use the Upload tab to get started.</div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {uploads.map((u, i) => (
        <div key={u.id} onClick={() => onSelect(u.id)} style={{
          background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "10px", padding: "14px 18px", cursor: "pointer", transition: "all 0.15s",
          animation: `fadeUp 0.3s ease ${i*0.04}s both`,
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <Chip label={FW.STIG.name} color={FW.STIG.color} bg="rgba(255,107,53,0.1)" border="rgba(255,107,53,0.25)" />
            <span style={{ flex: 1, fontSize: "13px", fontWeight: 700, color: "#fff" }}>{u.stigTitle}</span>
            <Chip
              label={u.mappingStatus === "complete" ? "Mapped" : u.mappingStatus === "processing" ? "Mapping..." : u.mappingStatus === "failed" ? "Map Failed" : "Pending"}
              color={u.mappingStatus === "complete" ? "#30d158" : u.mappingStatus === "processing" ? "#3d8bff" : u.mappingStatus === "failed" ? "#ff2d55" : "#ffd60a"}
            />
          </div>
          <div style={{ display: "flex", gap: "14px", marginTop: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{u.controlCount} controls</span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>{u.filename}</span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>{new Date(u.uploadedAt).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Coverage heatmap ─────────────────────────────────────────────────────────

function CoverageHeatmap({ summary }) {
  if (!summary?.coverageByFramework) return null;
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "18px" }}>
      <SectionTitle icon="◈">Cross-Framework Coverage</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {MAPPABLE.map(fwId => {
          const fw = FW[fwId];
          const pct = summary.coverageByFramework[fwId] ?? 0;
          return (
            <div key={fwId} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ minWidth: "100px", fontSize: "11px", fontWeight: 700, color: fw.color }}>{fw.short}</div>
              <div style={{ flex: 1 }}><ProgressBar pct={pct} color={fw.color} /></div>
              <div style={{ minWidth: "36px", fontSize: "12px", fontWeight: 800, color: fw.color, textAlign: "right" }}>{pct}%</div>
              <div style={{ minWidth: "120px", fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>{fw.name}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: "12px", fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>
        Coverage = percentage of STIG controls with at least one equivalent control in each framework
      </div>
    </div>
  );
}

// ─── Control mapping detail ───────────────────────────────────────────────────

function ControlMappingCard({ ctrl, mappingData, idx }) {
  const [open, setOpen] = useState(false);
  const sev = SEV_COLORS[ctrl.severity] || SEV_COLORS.medium;
  const mapping = mappingData?.controls?.find(m => m.vulnId === ctrl.vulnId);

  return (
    <div style={{ border: `1px solid ${open ? sev.border : "rgba(255,255,255,0.07)"}`, borderRadius: "10px", background: open ? sev.bg : "rgba(255,255,255,0.02)", transition: "all 0.2s", animation: `fadeUp 0.3s ease ${idx*0.03}s both` }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <Chip label={sev.label} color={sev.color} bg={sev.bg} border={sev.border} />
        <span style={{ color: sev.color, fontSize: "11px", fontFamily: "monospace", fontWeight: 700, minWidth: "80px" }}>{ctrl.vulnId}</span>
        <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{ctrl.title}</span>
        {mapping ? (
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {MAPPABLE.filter(fw => (mapping.mappings?.[fw] || []).length > 0).slice(0, 4).map(fw => (
              <Chip key={fw} label={FW[fw].short} color={FW[fw].color} small />
            ))}
          </div>
        ) : (
          <Chip label="Mapping pending" small />
        )}
        <span style={{ color: "rgba(255,255,255,0.2)", transform: open ? "rotate(90deg)" : "none", transition: "0.2s" }}>›</span>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${sev.border}`, padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {ctrl.description && (
            <div>
              <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "4px" }}>Description</div>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "12px", lineHeight: 1.65 }}>{ctrl.description.slice(0, 600)}</p>
            </div>
          )}
          {ctrl.fixText && (
            <div>
              <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "4px" }}>Fix Text</div>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: "12px", lineHeight: 1.65 }}>{ctrl.fixText.slice(0, 500)}</p>
            </div>
          )}
          {ctrl.cciRefs?.length > 0 && (
            <div>
              <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "4px" }}>CCI References</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {ctrl.cciRefs.map(c => <Chip key={c} label={c} color="#64d2ff" bg="rgba(100,210,255,0.07)" border="rgba(100,210,255,0.2)" small />)}
              </div>
            </div>
          )}

          {/* Cross-framework mappings */}
          {mapping ? (
            <div>
              <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "10px" }}>Cross-Framework Mappings</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {MAPPABLE.map(fwId => {
                  const fw = FW[fwId];
                  const ctrls = mapping.mappings?.[fwId] || [];
                  return (
                    <div key={fwId} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "6px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: fw.color, minWidth: "80px" }}>{fw.short}</span>
                      {ctrls.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                          {ctrls.map(c => <Chip key={c} label={c} color={fw.color} bg={`${fw.color}18`} border={`${fw.color}33`} small />)}
                        </div>
                      ) : (
                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>— No direct mapping</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {mapping.rationale && (
                <div style={{ marginTop: "10px", padding: "10px 14px", background: "rgba(61,139,255,0.05)", border: "1px solid rgba(61,139,255,0.15)", borderRadius: "6px" }}>
                  <div style={{ fontSize: "9px", color: "#3d8bff", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>Mapping Rationale</div>
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "12px", lineHeight: 1.6 }}>{mapping.rationale}</p>
                </div>
              )}
              {mapping.coverageNotes && (
                <div style={{ marginTop: "8px", padding: "10px 14px", background: "rgba(255,159,10,0.05)", border: "1px solid rgba(255,159,10,0.15)", borderRadius: "6px" }}>
                  <div style={{ fontSize: "9px", color: "#ff9f0a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>Coverage Notes</div>
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: "12px", lineHeight: 1.6 }}>{mapping.coverageNotes}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "12px" }}>Cross-framework mapping is still processing. Refresh in a moment.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Assessment tracker ───────────────────────────────────────────────────────

function AssessmentPanel({ csrfToken, canEdit }) {
  const [assessments, setAssessments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", framework: "NIST_800_53" });
  const [filterStatus, setFilterStatus] = useState("all");
  const [controlSearch, setControlSearch] = useState("");

  useEffect(() => {
    fetch("/api/compliance/assessments").then(r => r.json()).then(d => { if (d.assessments) setAssessments(d.assessments); });
  }, []);

  async function loadAssessment(id) {
    const r = await fetch(`/api/compliance/assessments?id=${id}`);
    const d = await r.json();
    if (d.assessment) { setSelected(d.assessment); setStatuses(d.statuses || []); setSummary(d.summary); }
  }

  async function createAssessment(e) {
    e.preventDefault();
    const r = await fetch("/api/compliance/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    if (d.assessment) {
      setAssessments(p => [d.assessment, ...p]);
      setSelected(d.assessment); setStatuses([]); setSummary({ total: 0, compliant: 0, non_compliant: 0, complianceRate: 0 });
      setCreating(false);
    }
  }

  async function updateControl(controlId, framework, status, notes) {
    if (!selected || !canEdit) return;
    const r = await fetch("/api/compliance/assessments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ assessmentId: selected.id, controlId, framework, status, notes }),
    });
    const d = await r.json();
    if (d.record) {
      setStatuses(p => { const existing = p.findIndex(s => s.controlId === controlId); return existing >= 0 ? p.map((s, i) => i === existing ? d.record : s) : [...p, d.record]; });
      if (d.summary) setSummary(d.summary);
    }
  }

  if (selected) {
    const fw = FW[selected.framework] || FW.NIST_800_53;
    const assessedControls = statuses.filter(s => filterStatus === "all" || s.status === filterStatus);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace" }}>← Back</button>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>{selected.name}</span>
          <Chip label={fw.name} color={fw.color} bg={`${fw.color}18`} border={`${fw.color}33`} />
        </div>

        {/* Summary stats */}
        {summary && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: "8px" }}>
            {[
              { v: summary.complianceRate + "%", l: "Compliance Rate", c: summary.complianceRate >= 80 ? "#30d158" : summary.complianceRate >= 50 ? "#ff9f0a" : "#ff2d55" },
              { v: summary.compliant, l: "Compliant", c: "#30d158" },
              { v: summary.non_compliant, l: "Non-Compliant", c: "#ff2d55" },
              { v: summary.partial, l: "Partial", c: "#ff9f0a" },
              { v: summary.not_assessed, l: "Not Assessed", c: "#64d2ff" },
              { v: summary.not_applicable, l: "N/A", c: "rgba(255,255,255,0.3)" },
            ].map(({ v, l, c }) => (
              <div key={l} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "12px 14px" }}>
                <div style={{ fontSize: "22px", fontWeight: 800, color: c, fontFamily: "monospace" }}>{v}</div>
                <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", marginTop: "3px", letterSpacing: "0.08em", textTransform: "uppercase" }}>{l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filter + add control */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <input value={controlSearch} onChange={e => setControlSearch(e.target.value)} placeholder="Search control ID or notes..." style={{ flex: 1, minWidth: "180px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "8px 12px", color: "#fff", fontSize: "12px", fontFamily: "monospace", outline: "none" }} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "8px 12px", color: "#fff", fontSize: "12px", fontFamily: "monospace" }}>
            <option value="all">All Statuses</option>
            {Object.entries(CTRL_STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {canEdit && <AddControlRow framework={selected.framework} onAdd={(controlId, status, notes) => updateControl(controlId, selected.framework, status, notes)} />}
        </div>

        {/* Control list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {assessedControls
            .filter(s => !controlSearch || s.controlId.toLowerCase().includes(controlSearch.toLowerCase()) || s.notes.toLowerCase().includes(controlSearch.toLowerCase()))
            .map((s, i) => {
              const st = CTRL_STATUS[s.status] || CTRL_STATUS.not_assessed;
              return (
                <div key={s.id} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${st.border}`, borderRadius: "8px", padding: "12px 16px", animation: `fadeUp 0.3s ease ${i*0.03}s both` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ color: fw.color, fontWeight: 700, fontFamily: "monospace", fontSize: "12px", minWidth: "80px" }}>{s.controlId}</span>
                    <Chip label={st.label} color={st.color} bg={st.bg} border={st.border} />
                    <span style={{ flex: 1, color: "rgba(255,255,255,0.4)", fontSize: "11px" }}>{s.notes?.slice(0, 80) || "—"}</span>
                    {canEdit && (
                      <select value={s.status} onChange={e => updateControl(s.controlId, selected.framework, e.target.value, s.notes)} style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "5px", padding: "4px 8px", color: "#fff", fontSize: "10px", fontFamily: "monospace", cursor: "pointer" }}>
                        {Object.entries(CTRL_STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    )}
                  </div>
                  {s.updatedAt && <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", marginTop: "4px" }}>Updated {new Date(s.updatedAt).toLocaleString()}</div>}
                </div>
              );
            })}
          {assessedControls.length === 0 && (
            <div style={{ textAlign: "center", padding: "30px", color: "rgba(255,255,255,0.15)", fontSize: "13px" }}>
              {canEdit ? 'No controls assessed yet. Use "Add Control" to begin.' : "No controls recorded."}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setCreating(!creating)} style={{ background: "#3d8bff", border: "none", color: "#fff", padding: "8px 18px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, fontFamily: "monospace", cursor: "pointer" }}>+ New Assessment</button>
      </div>

      {creating && (
        <form onSubmit={createAssessment} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>New Compliance Assessment</div>
          <div>
            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>Assessment Name</div>
            <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Q1 2025 FedRAMP Assessment" required style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "9px 12px", color: "#fff", fontSize: "12px", fontFamily: "monospace", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>Framework</div>
            <select value={form.framework} onChange={e => setForm(p => ({...p, framework: e.target.value}))} style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "9px 12px", color: "#fff", fontSize: "12px", fontFamily: "monospace" }}>
              {Object.entries(FW).filter(([k]) => k !== "STIG").map(([k,v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" style={{ flex: 1, background: "#3d8bff", border: "none", color: "#fff", padding: "9px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, fontFamily: "monospace", cursor: "pointer" }}>Create Assessment</button>
            <button type="button" onClick={() => setCreating(false)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", padding: "9px 14px", borderRadius: "6px", fontSize: "11px", fontFamily: "monospace", cursor: "pointer" }}>Cancel</button>
          </div>
        </form>
      )}

      {assessments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.15)", fontSize: "13px" }}>No assessments yet. Create one to start tracking compliance posture.</div>
      ) : assessments.map((a, i) => {
        const fw = FW[a.framework] || FW.NIST_800_53;
        return (
          <div key={a.id} onClick={() => loadAssessment(a.id)} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "14px 18px", cursor: "pointer", transition: "all 0.15s", animation: `fadeUp 0.3s ease ${i*0.04}s both` }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <Chip label={fw.name} color={fw.color} bg={`${fw.color}18`} border={`${fw.color}33`} />
              <span style={{ flex: 1, fontSize: "13px", fontWeight: 700, color: "#fff" }}>{a.name}</span>
              <Chip label={a.status === "complete" ? "Complete" : "In Progress"} color={a.status === "complete" ? "#30d158" : "#ff9f0a"} />
            </div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "5px" }}>Created {new Date(a.createdAt).toLocaleString()}</div>
          </div>
        );
      })}
    </div>
  );
}

function AddControlRow({ framework, onAdd }) {
  const [open, setOpen] = useState(false);
  const [controlId, setControlId] = useState("");
  const [status, setStatus] = useState("not_assessed");
  const [notes, setNotes] = useState("");

  if (!open) return <button onClick={() => setOpen(true)} style={{ background: "rgba(61,139,255,0.08)", border: "1px solid rgba(61,139,255,0.25)", color: "#3d8bff", padding: "7px 14px", borderRadius: "6px", fontSize: "10px", fontWeight: 700, fontFamily: "monospace", cursor: "pointer" }}>+ Add Control</button>;

  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", padding: "8px", background: "rgba(61,139,255,0.05)", border: "1px solid rgba(61,139,255,0.15)", borderRadius: "8px" }}>
      <input value={controlId} onChange={e => setControlId(e.target.value)} placeholder="Control ID e.g. AC-2" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "5px", padding: "6px 10px", color: "#fff", fontSize: "11px", fontFamily: "monospace", outline: "none", width: "120px" }} />
      <select value={status} onChange={e => setStatus(e.target.value)} style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "5px", padding: "6px 8px", color: "#fff", fontSize: "10px", fontFamily: "monospace" }}>
        {Object.entries(CTRL_STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" style={{ flex: 1, minWidth: "120px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "5px", padding: "6px 10px", color: "#fff", fontSize: "11px", fontFamily: "monospace", outline: "none" }} />
      <button onClick={() => { if (controlId.trim()) { onAdd(controlId.trim(), status, notes); setControlId(""); setNotes(""); setStatus("not_assessed"); setOpen(false); } }} style={{ background: "#3d8bff", border: "none", color: "#fff", padding: "6px 12px", borderRadius: "5px", fontSize: "10px", fontWeight: 700, fontFamily: "monospace", cursor: "pointer" }}>Add</button>
      <button onClick={() => setOpen(false)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)", padding: "6px 10px", borderRadius: "5px", fontSize: "10px", fontFamily: "monospace", cursor: "pointer" }}>✕</button>
    </div>
  );
}

// ─── Main compliance page ─────────────────────────────────────────────────────

export default function CompliancePage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState(null);
  const [authCompany, setAuthCompany] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("uploads");
  const [uploads, setUploads] = useState([]);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [uploadDetail, setUploadDetail] = useState(null);
  const [pollTick, setPollTick] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/csrf-token").then(r => r.json()).catch(() => null),
    ]).then(([me, csrf]) => {
      if (!me?.user) { router.push("/login"); return; }
      setAuthUser(me.user); setAuthCompany(me.company);
      if (csrf?.token) setCsrfToken(csrf.token);
      setLoading(false);
    });
  }, []);

  const loadUploads = useCallback(async () => {
    const r = await fetch("/api/compliance/upload");
    const d = await r.json();
    if (d.uploads) setUploads(d.uploads);
  }, []);

  useEffect(() => { if (authUser) loadUploads(); }, [authUser, loadUploads]);

  // Poll for mapping status updates every 5s when any upload is processing
  useEffect(() => {
    const hasProcessing = uploads.some(u => u.mappingStatus === "processing" || u.mappingStatus === "pending");
    if (!hasProcessing) return;
    const t = setInterval(() => { loadUploads(); setPollTick(p => p + 1); }, 5000);
    return () => clearInterval(t);
  }, [uploads, loadUploads]);

  async function loadUploadDetail(id) {
    const r = await fetch(`/api/compliance/upload?id=${id}&controls=true`);
    const d = await r.json();
    setUploadDetail(d);
    setSelectedUpload(id);
    setTab("controls");
  }

  const canEdit = authUser && ["superadmin","company_admin","analyst"].includes(authUser.role);

  if (loading) return <div style={{ minHeight: "100vh", background: "#07090f", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontFamily: "monospace", fontSize: "12px" }}>Loading EREBUS ARC...</div>;

  const rc = { superadmin: { color: "#ff2d55", label: "Superadmin" }, company_admin: { color: "#ff9f0a", label: "Admin" }, analyst: { color: "#3d8bff", label: "Analyst" }, viewer: { color: "#30d158", label: "Viewer" } }[authUser?.role] || { color: "#30d158", label: "Viewer" };

  const tabs = [
    { id: "uploads",    label: "STIG Uploads",   icon: "📤" },
    { id: "upload",     label: "Upload New",      icon: "➕", hide: !canEdit },
    { id: "controls",   label: "Control Mappings",icon: "◈", hide: !selectedUpload },
    { id: "assessment", label: "Assessments",     icon: "◆" },
  ].filter(t => !t.hide);

  return (
    <div style={{ minHeight: "100vh", background: "#07090f", fontFamily: "'IBM Plex Mono','Courier New',monospace", color: "#e2e8f0" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.2)!important}
        select option { background: #1a1d2e; }
      `}</style>

      {/* Nav */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(7,9,15,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", padding: "0 20px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", gap: "16px", height: "56px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "8px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#3d8bff", boxShadow: "0 0 10px #3d8bff" }} />
            <span style={{ fontSize: "14px", fontWeight: 800, letterSpacing: "0.12em", color: "#fff" }}>EREBUS ARC</span>
          </div>
          <button onClick={() => router.push("/")} style={{ border: "none", background: "transparent", color: "rgba(255,255,255,0.3)", fontSize: "11px", fontWeight: 700, fontFamily: "monospace", cursor: "pointer", letterSpacing: "0.06em" }}>◈ Scanner</button>
          <button style={{ border: "none", background: "rgba(61,139,255,0.12)", borderBottom: "2px solid #3d8bff", color: "#3d8bff", fontSize: "11px", fontWeight: 700, fontFamily: "monospace", padding: "0 14px", height: "100%", letterSpacing: "0.06em" }}>◆ Compliance</button>
          <button onClick={() => router.push("/about")} style={{ border: "none", background: "transparent", borderBottom: "2px solid transparent", color: "rgba(255,255,255,0.35)", fontSize: "11px", fontWeight: 700, fontFamily: "monospace", padding: "0 14px", height: "100%", letterSpacing: "0.06em", cursor: "pointer" }}>◈ About</button>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#fff" }}>{authUser?.name}</div>
            <div style={{ fontSize: "9px", color: rc.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>{rc.label}</div>
          </div>
          {authCompany && <div style={{ padding: "4px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "5px", fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>{authCompany.name}</div>}
          <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); }} style={{ background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.2)", color: "#ff2d55", padding: "5px 12px", borderRadius: "5px", fontSize: "10px", fontWeight: 700, fontFamily: "monospace", cursor: "pointer" }}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 20px 80px" }}>
        {/* Page header */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, color: "#fff", letterSpacing: "0.06em", margin: "0 0 6px" }}>Compliance Intelligence</h1>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", margin: 0 }}>
            Upload STIG requirements · AI-powered cross-framework mapping · NIST 800-53r5 · 800-171r2 · FedRAMP · NERC CIP · ISO 27001:2022
          </p>
        </div>

        {/* Framework badges */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "24px" }}>
          {Object.entries(FW).map(([k, v]) => (
            <div key={k} style={{ padding: "4px 12px", background: `${v.color}12`, border: `1px solid ${v.color}33`, borderRadius: "20px", fontSize: "10px", fontWeight: 700, color: v.color, letterSpacing: "0.05em" }}>{v.name}</div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "2px", background: "rgba(255,255,255,0.025)", padding: "3px", borderRadius: "10px", marginBottom: "20px", width: "fit-content" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              border: "none", padding: "8px 18px", borderRadius: "8px", fontSize: "11px", fontWeight: 700,
              letterSpacing: "0.06em", fontFamily: "monospace", whiteSpace: "nowrap", transition: "all 0.15s",
              background: tab === t.id ? "rgba(61,139,255,0.14)" : "transparent",
              color: tab === t.id ? "#3d8bff" : "rgba(255,255,255,0.28)",
              borderBottom: tab === t.id ? "1px solid rgba(61,139,255,0.35)" : "1px solid transparent",
            }}>{t.icon} {t.label}</button>
          ))}
        </div>

        {/* Content */}
        {tab === "upload" && canEdit && (
          <UploadPanel csrfToken={csrfToken} onUploaded={u => { loadUploads(); setSelectedUpload(u.id); setTab("uploads"); }} />
        )}

        {tab === "uploads" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <UploadsList uploads={uploads} onSelect={loadUploadDetail} pollTick={pollTick} />
          </div>
        )}

        {tab === "controls" && uploadDetail && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>{uploadDetail.upload?.stigTitle}</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{uploadDetail.controls?.length || 0} controls · {uploadDetail.upload?.filename}</div>
              </div>
              {uploadDetail.upload?.mappingStatus === "complete" && uploadDetail.mappings && (
                <Chip label="Mapping Complete" color="#30d158" bg="rgba(48,209,88,0.1)" border="rgba(48,209,88,0.25)" />
              )}
              {uploadDetail.upload?.mappingStatus === "processing" && (
                <Chip label="Mapping in Progress..." color="#3d8bff" bg="rgba(61,139,255,0.1)" border="rgba(61,139,255,0.25)" />
              )}
            </div>

            {uploadDetail.mappings && <CoverageHeatmap summary={uploadDetail.mappings.summary} />}

            <SectionTitle icon="⬡">STIG Controls with Cross-Framework Mappings</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {(uploadDetail.controls || []).map((ctrl, i) => (
                <ControlMappingCard key={ctrl.id} ctrl={ctrl} mappingData={uploadDetail.mappings} idx={i} />
              ))}
            </div>
          </div>
        )}

        {tab === "assessment" && (
          <AssessmentPanel csrfToken={csrfToken} canEdit={canEdit} />
        )}
      </div>
    </div>
  );
}
