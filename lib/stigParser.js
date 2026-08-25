/**
 * EREBUS ARC STIG Parser
 *
 * Parses STIG files in three formats:
 *   1. XCCDF XML  — official DoD format (.xml)
 *   2. CSV        — exported from STIG Viewer or similar tools
 *   3. Plain text — space-delimited or free-form
 *
 * Returns an array of normalised control objects ready for storage.
 *
 * SDL: All input is treated as untrusted. Strings are truncated and
 * sanitised before being passed to the AI mapper or stored in the DB.
 */

// ─── Sanitiser ────────────────────────────────────────────────────────────────

function clean(str, maxLen = 5000) {
  if (!str) return "";
  return String(str)
    .replace(/<[^>]*>/g, " ")          // strip HTML/XML tags
    .replace(/javascript:/gi, "")      // strip JS URIs
    .replace(/\s+/g, " ")              // normalise whitespace
    .trim()
    .slice(0, maxLen);
}

// ─── Severity normalisation ───────────────────────────────────────────────────

function normaliseSeverity(raw) {
  const s = String(raw || "").toLowerCase().trim();
  if (s.includes("high")   || s === "cat i"   || s === "i")   return "high";
  if (s.includes("medium") || s === "cat ii"  || s === "ii")  return "medium";
  if (s.includes("low")    || s === "cat iii" || s === "iii") return "low";
  return "medium"; // safe default
}

function catLevel(severity) {
  const s = String(severity || "").toLowerCase();
  if (s === "high")   return "CAT I";
  if (s === "medium") return "CAT II";
  if (s === "low")    return "CAT III";
  return "CAT II";
}

// ─── CCI extractor ────────────────────────────────────────────────────────────

function extractCCIs(text) {
  const matches = String(text || "").match(/CCI-\d{6}/g) || [];
  return [...new Set(matches)].slice(0, 20);
}

// ─── XML / XCCDF parser ───────────────────────────────────────────────────────

export function parseStigXml(xmlText) {
  const controls = [];

  // Extract benchmark title
  const titleMatch = xmlText.match(/<title[^>]*>(.*?)<\/title>/is);
  const stigTitle = clean(titleMatch?.[1] || "STIG", 300);

  const versionMatch = xmlText.match(/<version[^>]*>(.*?)<\/version>/is);
  const stigVersion = clean(versionMatch?.[1] || "", 100);

  // Extract all Rule blocks
  const rulePattern = /<Rule\s[^>]*id="([^"]*)"[^>]*severity="([^"]*)"[^>]*>([\s\S]*?)<\/Rule>/gi;
  let ruleMatch;

  while ((ruleMatch = rulePattern.exec(xmlText)) !== null) {
    const [, ruleId, severityRaw, ruleBody] = ruleMatch;

    const titleM   = ruleBody.match(/<title[^>]*>(.*?)<\/title>/is);
    const descM    = ruleBody.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    const checkM   = ruleBody.match(/<check-content[^>]*>([\s\S]*?)<\/check-content>/i);
    const fixM     = ruleBody.match(/<fixtext[^>]*>([\s\S]*?)<\/fixtext>/i);
    const versionM = ruleBody.match(/<version[^>]*>(.*?)<\/version>/is);
    const cciM     = ruleBody.match(/CCI-\d{6}/g) || [];

    // Extract Vuln_Num from description or version
    const vulnNumM = (descM?.[1] || "").match(/V-\d{6}/) || versionM?.[1]?.match(/V-\d{6}/);
    const vulnId   = clean(vulnNumM?.[0] || ruleId.split("_")[0] || ruleId, 50);

    controls.push({
      vulnId,
      ruleId:      clean(ruleId, 100),
      stigId:      clean(stigTitle, 100),
      title:       clean(titleM?.[1] || ruleId, 300),
      severity:    normaliseSeverity(severityRaw),
      catLevel:    catLevel(normaliseSeverity(severityRaw)),
      description: clean(descM?.[1] || "", 5000),
      checkText:   clean(checkM?.[1] || "", 5000),
      fixText:     clean(fixM?.[1] || "", 5000),
      cciRefs:     [...new Set(cciM)].slice(0, 20),
      iaControls:  [],
    });

    if (controls.length >= 500) break; // hard cap
  }

  // Fallback: try Group-based XCCDF format
  if (controls.length === 0) {
    const groupPattern = /<Group\s[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/Group>/gi;
    let groupMatch;
    while ((groupMatch = groupPattern.exec(xmlText)) !== null) {
      const [, groupId, groupBody] = groupMatch;
      const innerRule = groupBody.match(/<Rule\s[^>]*severity="([^"]*)"[^>]*>([\s\S]*?)<\/Rule>/i);
      const severity  = innerRule ? normaliseSeverity(innerRule[1]) : "medium";
      const titleM    = groupBody.match(/<title[^>]*>(.*?)<\/title>/is);
      const descM     = groupBody.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
      const checkM    = groupBody.match(/<check-content[^>]*>([\s\S]*?)<\/check-content>/i);
      const fixM      = groupBody.match(/<fixtext[^>]*>([\s\S]*?)<\/fixtext>/i);
      const cciM      = groupBody.match(/CCI-\d{6}/g) || [];

      controls.push({
        vulnId:      clean(groupId.replace(/^V_/, "V-").replace(/_/g, "-"), 50),
        ruleId:      clean(groupId, 100),
        stigId:      clean(stigTitle, 100),
        title:       clean(titleM?.[1] || groupId, 300),
        severity,
        catLevel:    catLevel(severity),
        description: clean(descM?.[1] || "", 5000),
        checkText:   clean(checkM?.[1] || "", 5000),
        fixText:     clean(fixM?.[1] || "", 5000),
        cciRefs:     [...new Set(cciM)].slice(0, 20),
        iaControls:  [],
      });
      if (controls.length >= 500) break;
    }
  }

  return { stigTitle, stigVersion, controls };
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCsvRow(row) {
  // Handles quoted fields with embedded commas
  const fields = [];
  let cur = "", inQ = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { fields.push(cur); cur = ""; continue; }
    cur += ch;
  }
  fields.push(cur);
  return fields.map(f => f.trim());
}

export function parseStigCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { stigTitle: "STIG", stigVersion: "", controls: [] };

  const header = parseCsvRow(lines[0]).map(h => h.toLowerCase().replace(/[\s_-]+/g, "_"));
  const idx = (names) => {
    for (const n of names) {
      const i = header.findIndex(h => h.includes(n));
      if (i >= 0) return i;
    }
    return -1;
  };

  const iVuln  = idx(["vuln_id","vuln","v_id","rule_id"]);
  const iTitle = idx(["title","rule_title","finding_name"]);
  const iSev   = idx(["severity","cat","cat_level","risk"]);
  const iDesc  = idx(["description","rule_description","discussion"]);
  const iCheck = idx(["check","check_content","check_text"]);
  const iFix   = idx(["fix","fix_text","fixtext","remediation"]);
  const iCCI   = idx(["cci","cci_ref","cci_reference"]);

  const controls = [];
  for (let i = 1; i < Math.min(lines.length, 501); i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCsvRow(lines[i]);
    const sev  = normaliseSeverity(iSev >= 0 ? cols[iSev] : "medium");
    controls.push({
      vulnId:      clean(iVuln >= 0 ? cols[iVuln] : `CTRL-${i}`, 50),
      ruleId:      clean(iVuln >= 0 ? cols[iVuln] : "", 100),
      stigId:      "",
      title:       clean(iTitle >= 0 ? cols[iTitle] : `Control ${i}`, 300),
      severity:    sev,
      catLevel:    catLevel(sev),
      description: clean(iDesc >= 0 ? cols[iDesc] : "", 5000),
      checkText:   clean(iCheck >= 0 ? cols[iCheck] : "", 5000),
      fixText:     clean(iFix >= 0 ? cols[iFix] : "", 5000),
      cciRefs:     extractCCIs(iCCI >= 0 ? cols[iCCI] : ""),
      iaControls:  [],
    });
  }

  return { stigTitle: "STIG (CSV Import)", stigVersion: "", controls };
}

// ─── Plain text parser ────────────────────────────────────────────────────────

export function parseStigText(text) {
  const controls = [];
  // Split on common STIG section delimiters
  const sections = text.split(/(?=\bV-\d{4,}|\bRule\s+ID:|\bVulnID:)/i).filter(s => s.trim().length > 20);

  for (let i = 0; i < Math.min(sections.length, 200); i++) {
    const section = sections[i];
    const vulnM   = section.match(/\b(V-\d{6})\b/);
    const sevM    = section.match(/Severity[:\s]+(high|medium|low|cat\s*i{1,3})/i);
    const titleM  = section.match(/Rule\s+Title[:\s]+(.+?)[\n\r]/i) || section.match(/Title[:\s]+(.+?)[\n\r]/i);
    const descM   = section.match(/Vulnerability\s+Discussion[:\s]+([\s\S]+?)(?=Check Content:|Fix Text:|$)/i);
    const checkM  = section.match(/Check\s+Content[:\s]+([\s\S]+?)(?=Fix Text:|$)/i);
    const fixM    = section.match(/Fix\s+Text[:\s]+([\s\S]+?)(?=\n\n|$)/i);

    const sev = normaliseSeverity(sevM?.[1] || "medium");
    controls.push({
      vulnId:      clean(vulnM?.[1] || `CTRL-${i + 1}`, 50),
      ruleId:      "",
      stigId:      "",
      title:       clean(titleM?.[1] || section.slice(0, 80), 300),
      severity:    sev,
      catLevel:    catLevel(sev),
      description: clean(descM?.[1] || section.slice(0, 500), 5000),
      checkText:   clean(checkM?.[1] || "", 5000),
      fixText:     clean(fixM?.[1] || "", 5000),
      cciRefs:     extractCCIs(section),
      iaControls:  [],
    });
  }

  if (controls.length === 0) {
    // Last resort: treat each paragraph as a control
    const paras = text.split(/\n{2,}/).filter(p => p.trim().length > 30).slice(0, 50);
    for (let i = 0; i < paras.length; i++) {
      const sev = normaliseSeverity("medium");
      controls.push({
        vulnId: `CTRL-${String(i + 1).padStart(3, "0")}`,
        ruleId: "", stigId: "", severity: sev, catLevel: catLevel(sev),
        title:       clean(paras[i].slice(0, 80), 300),
        description: clean(paras[i], 5000),
        checkText: "", fixText: "", cciRefs: [], iaControls: [],
      });
    }
  }

  return { stigTitle: "STIG (Text Import)", stigVersion: "", controls };
}

// ─── Format detector ──────────────────────────────────────────────────────────

export function detectAndParse(content, filename = "") {
  const ext = filename.split(".").pop().toLowerCase();
  const firstBytes = content.slice(0, 200).trim();

  if (ext === "xml" || firstBytes.startsWith("<?xml") || firstBytes.includes("<Benchmark") || firstBytes.includes("<xccdf")) {
    return parseStigXml(content);
  }
  if (ext === "csv" || (firstBytes.includes(",") && firstBytes.split("\n")[0].split(",").length > 3)) {
    return parseStigCsv(content);
  }
  return parseStigText(content);
}
