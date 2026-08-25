import { useState, useEffect } from "react";
import { useRouter } from "next/router";

// ─── Shared primitives ────────────────────────────────────────────────────────

function Badge({ children, color = "#3d8bff" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontFamily: "'IBM Plex Mono','Courier New',monospace",
      fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em",
      textTransform: "uppercase", padding: "3px 9px",
      background: `${color}18`, border: `1px solid ${color}33`,
      color, borderRadius: "4px", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function Code({ children, block = false }) {
  const style = block ? {
    display: "block", background: "#0a0d14",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "8px", padding: "20px 24px",
    fontFamily: "'IBM Plex Mono','Courier New',monospace",
    fontSize: "13px", color: "#c8a84b",
    lineHeight: 1.7, overflowX: "auto",
    whiteSpace: "pre", margin: "12px 0",
  } : {
    fontFamily: "'IBM Plex Mono','Courier New',monospace",
    fontSize: "13px", color: "#c8a84b",
    background: "rgba(200,168,75,0.08)",
    border: "1px solid rgba(200,168,75,0.15)",
    padding: "2px 7px", borderRadius: "4px",
  };
  return <code style={style}>{children}</code>;
}

function Step({ number, title, children }) {
  return (
    <div style={{ display: "flex", gap: "24px", marginBottom: "36px" }}>
      <div style={{
        flexShrink: 0, width: "40px", height: "40px",
        borderRadius: "50%", background: "rgba(232,52,28,0.12)",
        border: "1px solid rgba(232,52,28,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'IBM Plex Mono',monospace", fontSize: "14px",
        fontWeight: 700, color: "#e8341c",
      }}>{number}</div>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#fff", marginBottom: "10px", lineHeight: 1.3 }}>{title}</h3>
        <div style={{ fontSize: "15px", color: "rgba(255,255,255,0.68)", lineHeight: 1.75 }}>{children}</div>
      </div>
    </div>
  );
}

function SectionHeader({ label, title, subtitle }) {
  return (
    <div style={{ marginBottom: "48px" }}>
      <div style={{
        fontFamily: "'IBM Plex Mono',monospace", fontSize: "11px",
        letterSpacing: "0.2em", textTransform: "uppercase",
        color: "#e8341c", marginBottom: "12px",
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        <span style={{ width: "28px", height: "1px", background: "#e8341c", display: "inline-block" }} />
        {label}
      </div>
      <h2 style={{
        fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(36px,5vw,64px)",
        letterSpacing: "0.05em", color: "#fff", lineHeight: 0.95,
        marginBottom: subtitle ? "18px" : 0,
      }}>{title}</h2>
      {subtitle && <p style={{ fontSize: "17px", color: "rgba(255,255,255,0.60)", maxWidth: "640px", lineHeight: 1.7, fontWeight: 400 }}>{subtitle}</p>}
    </div>
  );
}

function Table({ headers, rows }) {
  return (
    <div style={{ overflowX: "auto", margin: "16px 0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'IBM Plex Mono',monospace", fontSize: "13px" }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: "12px 16px", textAlign: "left", color: "rgba(255,255,255,0.50)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "10px", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.025)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: "12px 16px", color: ci === 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)", verticalAlign: "top", lineHeight: 1.55 }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NavAnchor({ id, children }) {
  return <div id={id} style={{ scrollMarginTop: "80px" }}>{children}</div>;
}

function TocLink({ href, children, depth = 0 }) {
  return (
    <a href={href} style={{
      display: "block",
      padding: `6px 0 6px ${depth > 0 ? depth * 16 : 0}px`,
      fontSize: "13px", color: "rgba(255,255,255,0.45)",
      textDecoration: "none", transition: "color 0.15s",
    }}
      onMouseEnter={e => e.target.style.color = "#e8341c"}
      onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.45)"}
    >{children}</a>
  );
}

function Callout({ type = "info", children }) {
  const cfg = {
    info:    { color: "#3d8bff", bg: "rgba(61,139,255,0.08)",  border: "rgba(61,139,255,0.2)",  icon: "ℹ" },
    warning: { color: "#ff9f0a", bg: "rgba(255,159,10,0.08)", border: "rgba(255,159,10,0.2)", icon: "⚠" },
    danger:  { color: "#e8341c", bg: "rgba(232,52,28,0.08)",  border: "rgba(232,52,28,0.2)",  icon: "⛔" },
    tip:     { color: "#30d158", bg: "rgba(48,209,88,0.08)",  border: "rgba(48,209,88,0.2)",  icon: "✦" },
  }[type];
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderLeft: `3px solid ${cfg.color}`, borderRadius: "6px", padding: "14px 18px", margin: "16px 0", display: "flex", gap: "12px" }}>
      <span style={{ color: cfg.color, fontSize: "15px", flexShrink: 0, marginTop: "1px" }}>{cfg.icon}</span>
      <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.70)", lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}

// ─── Main About Page ──────────────────────────────────────────────────────────

export default function AboutPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState(null);
  const [authCompany, setAuthCompany] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(d => { if (d?.user) { setAuthUser(d.user); setAuthCompany(d.company); } });
  }, []);

  const ROLE_COLORS = { superadmin: "#e8341c", company_admin: "#ff9f0a", analyst: "#3d8bff", viewer: "#30d158" };
  const rc = authUser ? { color: ROLE_COLORS[authUser.role] || "#64d2ff", label: authUser.role } : null;

  return (
    <div style={{ minHeight: "100vh", background: "#07090f", color: "#e2e8f0", fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#07090f} ::-webkit-scrollbar-thumb{background:#e8341c;border-radius:2px}
        html{scroll-behavior:smooth;} a{color:#e8341c;text-decoration:none;} a:hover{text-decoration:underline;}
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Nav */}
      <div style={{ position:"sticky",top:0,zIndex:100,background:"rgba(7,9,15,0.97)",borderBottom:"1px solid rgba(255,255,255,0.07)",backdropFilter:"blur(12px)",padding:"0 48px" }}>
        <div style={{ maxWidth:"1300px",margin:"0 auto",display:"flex",alignItems:"center",gap:"20px",height:"58px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:"8px",cursor:"pointer" }} onClick={() => router.push("/")}>
            <svg viewBox="0 0 32 32" style={{ width:28,height:28 }} xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="ab-glow" cx="50%" cy="100%" r="80%"><stop offset="0%" stopColor="#f5d06a" stopOpacity="0.5"/><stop offset="100%" stopColor="#c8a84b" stopOpacity="0"/></radialGradient>
                <linearGradient id="ab-arc" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#7a5c1a"/><stop offset="50%" stopColor="#fde48a"/><stop offset="100%" stopColor="#7a5c1a"/></linearGradient>
              </defs>
              <rect width="32" height="32" fill="#0b0d14"/>
              <ellipse cx="16" cy="22" rx="14" ry="9" fill="url(#ab-glow)"/>
              <line x1="16" y1="21" x2="16" y2="5" stroke="#c8a84b" strokeWidth="0.5" strokeOpacity="0.3"/>
              <path d="M 4,22 A 12,12 0 0,1 28,22" fill="none" stroke="url(#ab-arc)" strokeWidth="2.4" strokeLinecap="round"/>
              <line x1="2" y1="22" x2="30" y2="22" stroke="#c8a84b" strokeWidth="0.5" strokeOpacity="0.3"/>
            </svg>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",letterSpacing:"0.15em",color:"#fff" }}>EREBUS <span style={{ color:"#e8341c" }}>ARC</span></span>
          </div>
          <div style={{ display:"flex",gap:"4px",marginLeft:"8px" }}>
            {[{label:"Scanner",path:"/"},{label:"Compliance",path:"/compliance"},{label:"About",path:"/about",active:true}].map(n => (
              <button key={n.label} onClick={() => router.push(n.path)} style={{ border:"none",background:n.active?"rgba(232,52,28,0.1)":"transparent",borderBottom:n.active?"2px solid #e8341c":"2px solid transparent",color:n.active?"#e8341c":"rgba(255,255,255,0.45)",padding:"0 16px",height:"58px",fontSize:"12px",fontWeight:700,letterSpacing:"0.06em",fontFamily:"'IBM Plex Mono',monospace",cursor:"pointer",textTransform:"uppercase",transition:"all 0.15s" }}>{n.label}</button>
            ))}
          </div>
          <div style={{ flex:1 }} />
          {authUser ? (
            <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"12px",fontWeight:600,color:"#fff" }}>{authUser.name}</div>
                <div style={{ fontSize:"10px",color:rc.color,letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:"monospace" }}>{rc.label}</div>
              </div>
              {authCompany && <div style={{ padding:"4px 10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"5px",fontSize:"11px",color:"rgba(255,255,255,0.45)",fontFamily:"monospace" }}>{authCompany.name}</div>}
              <button onClick={async () => { await fetch("/api/auth/logout",{method:"POST"}); router.push("/login"); }} style={{ background:"rgba(232,52,28,0.08)",border:"1px solid rgba(232,52,28,0.2)",color:"#e8341c",padding:"5px 12px",borderRadius:"5px",fontSize:"11px",fontWeight:700,fontFamily:"monospace",cursor:"pointer" }}>Logout</button>
            </div>
          ) : (
            <button onClick={() => router.push("/login")} style={{ background:"#e8341c",border:"none",color:"#fff",padding:"8px 18px",borderRadius:"6px",fontSize:"12px",fontWeight:700,fontFamily:"monospace",cursor:"pointer",letterSpacing:"0.06em" }}>Sign In</button>
          )}
        </div>
      </div>

      {/* Layout */}
      <div style={{ maxWidth:"1300px",margin:"0 auto",display:"flex",gap:"60px",padding:"60px 48px 120px",alignItems:"flex-start" }}>

        {/* TOC Sidebar */}
        <div style={{ width:"220px",flexShrink:0,position:"sticky",top:"90px",display:"flex",flexDirection:"column",gap:"2px" }}>
          <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:"10px",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(255,255,255,0.25)",marginBottom:"12px" }}>Contents</div>
          <TocLink href="#overview">Overview</TocLink>
          <TocLink href="#stack">Tech Stack</TocLink>
          <TocLink href="#quickstart">Quick Start</TocLink>
          <TocLink href="#signing-in" depth={1}>Signing In</TocLink>
          <TocLink href="#first-scan">Running a Scan</TocLink>
          <TocLink href="#scan-results" depth={1}>Reading Results</TocLink>
          <TocLink href="#adversary" depth={1}>Adversary Tab</TocLink>
          <TocLink href="#mitigations">Mitigation Tracker</TocLink>
          <TocLink href="#updating" depth={1}>Updating Status</TocLink>
          <TocLink href="#compliance">Compliance Engine</TocLink>
          <TocLink href="#uploading" depth={1}>Uploading STIGs</TocLink>
          <TocLink href="#mappings" depth={1}>Reading Mappings</TocLink>
          <TocLink href="#assessments" depth={1}>Assessments</TocLink>
          <TocLink href="#users">User Management</TocLink>
          <TocLink href="#roles" depth={1}>Roles</TocLink>
          <TocLink href="#inviting" depth={1}>Inviting Users</TocLink>
          <TocLink href="#companies">Companies</TocLink>
          <TocLink href="#api">API Reference</TocLink>
          <TocLink href="#security">Security</TocLink>
          <TocLink href="#deployment">Deployment</TocLink>
          <TocLink href="#env" depth={1}>Environment Vars</TocLink>
          <TocLink href="#frameworks">Frameworks</TocLink>
        </div>

        {/* Main content */}
        <div style={{ flex:1,minWidth:0 }}>

          {/* Hero */}
          <div style={{ marginBottom:"72px",animation:"fadeUp 0.5s ease both" }}>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#e8341c",marginBottom:"16px",display:"flex",alignItems:"center",gap:"10px" }}>
              <span style={{ width:"28px",height:"1px",background:"#e8341c",display:"inline-block" }} />
              Platform Documentation
            </div>
            <h1 style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(52px,7vw,96px)",letterSpacing:"0.04em",color:"#fff",lineHeight:0.9,marginBottom:"24px" }}>
              EREBUS ARC<br/>
              <span style={{ color:"rgba(255,255,255,0.22)",fontSize:"0.55em" }}>USAGE GUIDE & DOCUMENTATION</span>
            </h1>
            <p style={{ fontSize:"18px",color:"rgba(255,255,255,0.65)",maxWidth:"640px",lineHeight:1.75,fontWeight:400 }}>
              Everything you need to understand, deploy, and operate EREBUS ARC — from first login to full compliance mapping.
            </p>
            <div style={{ display:"flex",gap:"10px",marginTop:"24px",flexWrap:"wrap" }}>
              {[["Next.js 14","#fff"],["React 18","#61dafb"],["Claude API","#8B5CF6"],["Node.js","#339933"],["JavaScript","#f7df1e"]].map(([l,c]) => <Badge key={l} color={c}>{l}</Badge>)}
            </div>
          </div>

          {/* OVERVIEW */}
          <NavAnchor id="overview">
            <SectionHeader label="01 — Overview" title="WHAT IS EREBUS ARC?" subtitle="A unified threat intelligence platform connecting vulnerability data, adversary TTPs, and compliance controls in one analyst-grade interface." />
            <p style={{ fontSize:"16px",color:"rgba(255,255,255,0.65)",lineHeight:1.8,marginBottom:"20px" }}>
              Security teams face a fragmented landscape. CVE databases, MITRE ATT&CK, SIEM alerts, and compliance spreadsheets live in separate tools. An analyst who finds a vulnerability must manually determine which threat actor exploits it, which kill chain phase it enables, whether it violates a FedRAMP control, and whether anyone is tracking the fix.
            </p>
            <p style={{ fontSize:"16px",color:"rgba(255,255,255,0.65)",lineHeight:1.8,marginBottom:"20px" }}>
              EREBUS ARC solves this by combining four capabilities: <strong style={{ color:"#fff" }}>Vulnerability Intelligence</strong>, <strong style={{ color:"#fff" }}>Adversary TTP Profiling</strong>, <strong style={{ color:"#fff" }}>Compliance Mapping</strong>, and <strong style={{ color:"#fff" }}>Mitigation Tracking</strong> — all scoped to your company with full tenant isolation.
            </p>
            <Callout type="tip">EREBUS ARC is powered by Claude (Anthropic's AI). The AI analyses your targets against its knowledge of CVE databases, threat actor behaviour, and compliance frameworks — returning structured analyst-grade intelligence in seconds.</Callout>
          </NavAnchor>

          <div style={{ height:"60px" }} />

          {/* TECH STACK */}
          <NavAnchor id="stack">
            <SectionHeader label="02 — Architecture" title="TECH STACK" />
            <Table headers={["Layer","Technology","Purpose"]} rows={[
              ["Frontend","React 18 + Next.js 14","UI components and page routing"],
              ["Backend","Next.js API Routes (Node.js)","All server-side logic and AI calls"],
              ["AI Engine","Anthropic Claude API","CVE analysis, TTP mapping, compliance mapping"],
              ["Auth","PBKDF2 + Session Cookies","Password hashing, HttpOnly session management"],
              ["CSRF","HMAC-SHA256 tokens","Cross-site request forgery protection"],
              ["Validation","Zod schemas","Input validation and AI output sanitisation"],
              ["Rate Limiting","rate-limiter-flexible","Per-IP request throttling"],
              ["Storage","In-memory (structured)","Swap for PostgreSQL or Redis in production"],
              ["Language","JavaScript (ES Modules)","Consistent throughout — no TypeScript"],
            ]}/>
          </NavAnchor>

          <div style={{ height:"60px" }} />

          {/* QUICK START */}
          <NavAnchor id="quickstart">
            <SectionHeader label="03 — Setup" title="QUICK START" subtitle="Get EREBUS ARC running locally in under 5 minutes." />
            <Step number="1" title="Clone the repository"><Code block>{`git clone https://github.com/your-org/erebus-arc.git\ncd erebus-arc`}</Code></Step>
            <Step number="2" title="Install dependencies"><Code block>npm install</Code>Requires Node.js 18 or higher. Check with <Code>node --version</Code>.</Step>
            <Step number="3" title="Configure environment variables">
              <Code block>cp .env.example .env.local</Code>
              Open <Code>.env.local</Code> and set at minimum:
              <Code block>{`ANTHROPIC_API_KEY=sk-ant-your-key-here\nAUTH_SECRET=your-32-character-random-string-here`}</Code>
              Get your Anthropic API key at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">console.anthropic.com</a>. Generate AUTH_SECRET with: <Code>openssl rand -hex 32</Code>
            </Step>
            <Step number="4" title="Start the development server"><Code block>npm run dev</Code>Open <a href="http://localhost:3000">http://localhost:3000</a>.</Step>
            <Step number="5" title="Build for production">
              <Code block>{`npm run build\nnpm start`}</Code>
              <Callout type="warning">Set <Code>NODE_ENV=production</Code> in production. This enables strict Content Security Policy and removes <Code>unsafe-eval</Code>.</Callout>
            </Step>

            <NavAnchor id="signing-in">
              <h3 style={{ fontSize:"22px",fontWeight:700,color:"#fff",marginBottom:"16px",marginTop:"8px" }}>Signing In</h3>
              <p style={{ fontSize:"15px",color:"rgba(255,255,255,0.65)",lineHeight:1.75,marginBottom:"16px" }}>Navigate to <Code>/login</Code>. The platform ships with four demo accounts. Click any credential on the login page to auto-fill.</p>
              <Table headers={["Email","Password","Role","Capabilities"]} rows={[
                ["admin@erebusarc.local","ErebusArcAdmin2025!","Superadmin","Everything — all companies"],
                ["admin@democorp.example","DemoAdmin2025!","Company Admin","Manage users and scans in Demo Corp"],
                ["analyst@democorp.example","DemoAnalyst2025!","Analyst","Run scans, update mitigations"],
                ["viewer@democorp.example","DemoViewer2025!","Viewer","Read-only access to all data"],
              ]}/>
              <Callout type="danger">Change all default passwords before deploying to any environment accessible outside your local machine.</Callout>
            </NavAnchor>
          </NavAnchor>

          <div style={{ height:"60px" }} />

          {/* RUNNING A SCAN */}
          <NavAnchor id="first-scan">
            <SectionHeader label="04 — Core Feature" title="RUNNING A SCAN" subtitle="Type any target in plain language and receive full CVE intelligence, adversary profiling, and compliance context." />
            <p style={{ fontSize:"16px",color:"rgba(255,255,255,0.65)",lineHeight:1.8,marginBottom:"20px" }}>From the main Scanner view, type any of the following into the target field and press Enter or click Scan Target:</p>
            <Table headers={["Target Type","Examples"]} rows={[
              ["Software + version","wordpress 6.4.2, apache tomcat 10.1, nginx 1.24"],
              ["Library + version","log4j 2.14.0, openssl 3.0.1, spring framework 5.3"],
              ["URL / domain","https://example.com, app.company.internal"],
              ["Operating system","windows server 2019, ubuntu 22.04, rhel 9"],
              ["Service or product","cisco ios 15.2, microsoft exchange 2019"],
              ["Third-party integrations","salesforce, okta, aws s3, cloudflare workers"],
            ]}/>
            <Callout type="info">The AI identifies the technology fingerprint from your input and cross-references it against multiple CVE sources. You do not need CPE identifiers — plain language works.</Callout>
            <p style={{ fontSize:"16px",color:"rgba(255,255,255,0.65)",lineHeight:1.8,margin:"20px 0" }}>The scan takes 15–60 seconds. A live log shows each intelligence source being queried. Results are automatically saved to your company's scan history and the mitigation tracker is populated.</p>

            <NavAnchor id="scan-results">
              <h3 style={{ fontSize:"22px",fontWeight:700,color:"#fff",marginBottom:"16px",marginTop:"8px" }}>Reading Scan Results</h3>
              <p style={{ fontSize:"15px",color:"rgba(255,255,255,0.65)",lineHeight:1.75,marginBottom:"16px" }}>Results are organised into six tabs:</p>
              <Table headers={["Tab","Contents"]} rows={[
                ["Overview","Risk gauge (0–100), CVE counts by severity, executive summary, analyst notes, EPSS average, CISA KEV count, active exploitation status, target fingerprint, compliance implications"],
                ["CVEs","Full CVE list with CVSS v3.1 scores, EPSS, CWE classification, CIA impact triad. Click any row to expand for full detail, fix guidance, and attack vector breakdown."],
                ["Adversaries","Named threat actor cards, attack chain visualisations, TTP heatmap across all tactics, detection recommendations per technique"],
                ["ATT&CK","MITRE ATT&CK tactic/technique mapping, CVE → technique cross-reference table"],
                ["Attack Surface","Attack vectors, exposed services, authentication weaknesses, supply chain risk"],
                ["Remediation","Phased plan: Immediate (0–24h), Short-term (1–7 days), Long-term strategic, Compensating controls"],
                ["Report","Formatted intelligence report — copy to clipboard for stakeholder distribution"],
              ]}/>
            </NavAnchor>

            <NavAnchor id="adversary">
              <h3 style={{ fontSize:"22px",fontWeight:700,color:"#fff",marginBottom:"16px",marginTop:"32px" }}>The Adversaries Tab</h3>
              <p style={{ fontSize:"15px",color:"rgba(255,255,255,0.65)",lineHeight:1.75,marginBottom:"16px" }}>For each CVE, the platform identifies the specific threat actor groups known to weaponise it:</p>
              <ul style={{ paddingLeft:"20px",display:"flex",flexDirection:"column",gap:"10px",color:"rgba(255,255,255,0.65)",fontSize:"15px",lineHeight:1.7 }}>
                <li><strong style={{ color:"#fff" }}>Threat Actor Cards</strong> — click to expand. Shows aliases, nation-state, sophistication, CVEs exploited, signature TTPs, known campaigns, target sectors, and IOC hints.</li>
                <li><strong style={{ color:"#fff" }}>Attack Chains</strong> — visual kill chain from Initial Access to Impact, with technique IDs and CVE annotations at each step.</li>
                <li><strong style={{ color:"#fff" }}>TTP Heatmap</strong> — all ATT&CK tactics observed, with frequency and detection difficulty per technique.</li>
                <li><strong style={{ color:"#fff" }}>Detection</strong> — prioritised detection rules with log source, indicator pattern, and mapped ATT&CK technique. Use directly in your SIEM.</li>
              </ul>
            </NavAnchor>
          </NavAnchor>

          <div style={{ height:"60px" }} />

          {/* MITIGATION TRACKER */}
          <NavAnchor id="mitigations">
            <SectionHeader label="05 — Workflow" title="MITIGATION TRACKER" subtitle="Every scan automatically populates the tracker. Every CVE becomes a tracked work item for your team." />
            <p style={{ fontSize:"16px",color:"rgba(255,255,255,0.65)",lineHeight:1.8,marginBottom:"20px" }}>Navigate to <strong style={{ color:"#fff" }}>Mitigations</strong> in the top navigation. Select a scan from the dropdown or view all open items across all scans.</p>
            <Table headers={["Status","Meaning","Who Can Set"]} rows={[
              ["Open","Newly found — no action taken yet","Auto-set on scan"],
              ["In Progress","Fix or workaround being implemented","Analyst, Admin"],
              ["Mitigated","Vulnerability patched or fully remediated","Analyst, Admin"],
              ["Risk Accepted","Deliberate decision to accept the risk — documented","Analyst, Admin"],
              ["False Positive","Finding does not apply to this system","Analyst, Admin"],
            ]}/>
            <NavAnchor id="updating">
              <h3 style={{ fontSize:"20px",fontWeight:700,color:"#fff",marginBottom:"14px",marginTop:"28px" }}>Updating a Mitigation Item</h3>
              <Step number="1" title="Click any item row to expand it">The item shows CVE description, remediation guidance, and status panel.</Step>
              <Step number="2" title="Select the new status">Click any status button. The checkbox at the left also toggles between Open and Mitigated.</Step>
              <Step number="3" title="Add analyst notes">Type evidence or decision rationale in the Notes field. Click Save Notes. Notes save independently of status.</Step>
              <Step number="4" title="Review the status history">Every change is logged — who changed it, when, and what they noted. This is your compliance audit trail.</Step>
              <Callout type="info">Viewers can see all mitigations but cannot update them. Analyst role or higher is required to change status or add notes.</Callout>
            </NavAnchor>
          </NavAnchor>

          <div style={{ height:"60px" }} />

          {/* COMPLIANCE ENGINE */}
          <NavAnchor id="compliance">
            <SectionHeader label="06 — Compliance" title="COMPLIANCE ENGINE" subtitle="Upload STIG files. Receive AI-generated cross-mappings to 7 frameworks simultaneously." />
            <p style={{ fontSize:"16px",color:"rgba(255,255,255,0.65)",lineHeight:1.8,marginBottom:"20px" }}>Navigate to <strong style={{ color:"#fff" }}>Compliance</strong> from the navigation bar. Four tabs: STIG Uploads, Upload New, Control Mappings, and Assessments.</p>

            <NavAnchor id="uploading">
              <h3 style={{ fontSize:"20px",fontWeight:700,color:"#fff",marginBottom:"14px" }}>Uploading a STIG File</h3>
              <Step number="1" title="Go to the Upload New tab">Analysts and above can upload files.</Step>
              <Step number="2" title="Select or drag your STIG file">
                <Table headers={["Format","Extension","Source"]} rows={[
                  ["XCCDF XML",".xml","Direct download from DISA (U_*_STIG_V*R*_Manual-xccdf.xml)"],
                  ["STIG Viewer CSV",".csv","Exported from DISA STIG Viewer 2.x or 3.x"],
                  ["Checklist",".ckl","Rename to .txt if needed"],
                  ["Plain text",".txt","Any text file containing V-XXXXXX identifiers"],
                ]}/>
                Maximum file size: 5MB.
              </Step>
              <Step number="3" title="Wait for parsing and mapping">File is parsed immediately. AI mapping to all 7 frameworks runs in the background (1–5 minutes depending on control count). Status shows <Badge color="#3d8bff">Mapping...</Badge> then <Badge color="#30d158">Mapped</Badge>.</Step>
            </NavAnchor>

            <NavAnchor id="mappings">
              <h3 style={{ fontSize:"20px",fontWeight:700,color:"#fff",marginBottom:"14px",marginTop:"28px" }}>Reading the Cross-Framework Mappings</h3>
              <p style={{ fontSize:"15px",color:"rgba(255,255,255,0.65)",lineHeight:1.75,marginBottom:"16px" }}>Click any upload to open Control Mappings view. At the top is a Coverage Heatmap showing what percentage of your STIG controls have a mapped equivalent in each framework.</p>
              <p style={{ fontSize:"15px",color:"rgba(255,255,255,0.65)",lineHeight:1.75,marginBottom:"16px" }}>Click any control card to expand and see: full description and fix text, CCI references, mapped control IDs in every framework (e.g. <Code>AC-2(1)</Code> in NIST 800-53, <Code>3.1.1</Code> in 800-171, <Code>A.9.2.1</Code> in ISO 27001), AI-generated rationale, and coverage notes.</p>
              <Callout type="tip">Controls showing <em>— No direct mapping</em> represent gaps — STIG requirements without a clear framework equivalent. These may need compensating controls or POA&M documentation.</Callout>
            </NavAnchor>

            <NavAnchor id="assessments">
              <h3 style={{ fontSize:"20px",fontWeight:700,color:"#fff",marginBottom:"14px",marginTop:"28px" }}>Creating and Managing Assessments</h3>
              <p style={{ fontSize:"15px",color:"rgba(255,255,255,0.65)",lineHeight:1.75,marginBottom:"16px" }}>Assessments track your compliance posture against a specific framework — for monitoring, pre-audit preparation, or continuous control validation.</p>
              <Step number="1" title="Go to Assessments → New Assessment">Give it a name (e.g. "Q1 2025 FedRAMP Moderate Assessment") and select a framework.</Step>
              <Step number="2" title="Add controls to assess">Click + Add Control. Enter the control ID (e.g. <Code>AC-2</Code>, <Code>3.1.1</Code>, <Code>CIP-007-6 R4</Code>), set initial status, add notes.</Step>
              <Step number="3" title="Track and update status">Options: Not Assessed, Compliant, Non-Compliant, Partial, N/A, Compensating. Compliance rate gauge updates live.</Step>
              <Step number="4" title="Review the summary">The header shows total controls, compliance rate, and breakdown by status for progress reporting and audit readiness.</Step>
            </NavAnchor>
          </NavAnchor>

          <div style={{ height:"60px" }} />

          {/* USER MANAGEMENT */}
          <NavAnchor id="users">
            <SectionHeader label="07 — Administration" title="USER MANAGEMENT" subtitle="Manage who has access to your organisation's data." />
            <NavAnchor id="roles">
              <h3 style={{ fontSize:"20px",fontWeight:700,color:"#fff",marginBottom:"14px" }}>Roles</h3>
              <Table headers={["Role","Scan","View","Mitigations","Upload STIGs","Manage Users","Companies"]} rows={[
                ["Superadmin","✅","All companies","✅","✅","✅ All","✅"],
                ["Company Admin","✅","Own company","✅","✅","✅ Own","❌"],
                ["Analyst","✅","Own company","✅","✅","❌","❌"],
                ["Viewer","❌","Own company","❌","❌","❌","❌"],
              ]}/>
              <Callout type="info">Tenant isolation is enforced server-side at every API endpoint. A user from Company A cannot access data from Company B regardless of their role.</Callout>
            </NavAnchor>
            <NavAnchor id="inviting">
              <h3 style={{ fontSize:"20px",fontWeight:700,color:"#fff",marginBottom:"14px",marginTop:"28px" }}>Inviting a New User</h3>
              <p style={{ fontSize:"15px",color:"rgba(255,255,255,0.65)",lineHeight:1.75,marginBottom:"14px" }}>Company Admin or Superadmin only. Navigate to <strong style={{ color:"#fff" }}>Users</strong> in the nav bar, click <strong>+ Invite User</strong>, enter their email, name, temporary password, and role.</p>
              <Callout type="warning">EREBUS ARC does not send invitation emails. Share the temporary password securely and ask the user to change it on first login.</Callout>
            </NavAnchor>
          </NavAnchor>

          <div style={{ height:"60px" }} />

          {/* COMPANIES */}
          <NavAnchor id="companies">
            <SectionHeader label="08 — Superadmin" title="COMPANY MANAGEMENT" subtitle="Manage multiple organisations from one platform instance." />
            <p style={{ fontSize:"16px",color:"rgba(255,255,255,0.65)",lineHeight:1.8,marginBottom:"20px" }}>Companies are the top-level isolation boundary — every scan, user, STIG upload, and mitigation belongs to exactly one company. Manage via the API:</p>
            <Code block>{`POST /api/admin/companies  { "name": "Acme Corp", "domain": "acme.com" }
GET  /api/admin/companies
PATCH /api/admin/companies { "id": "co_abc123", "name": "Acme Corporation" }`}</Code>
            <p style={{ fontSize:"15px",color:"rgba(255,255,255,0.65)",lineHeight:1.75,marginTop:"16px" }}>As a Superadmin, include the <Code>X-Company-Id</Code> header to scope your session to a specific company.</p>
          </NavAnchor>

          <div style={{ height:"60px" }} />

          {/* API REFERENCE */}
          <NavAnchor id="api">
            <SectionHeader label="09 — Integration" title="API REFERENCE" subtitle="All endpoints require a session cookie and X-CSRF-Token header unless noted." />
            {[
              { group:"Authentication", endpoints:[
                ["POST","/api/auth/login","Authenticate. Body: { email, password }. Returns session cookie."],
                ["POST","/api/auth/logout","Invalidate session. Clears cookie."],
                ["GET", "/api/auth/me","Returns { user, company } for current session."],
                ["GET", "/api/csrf-token","Returns { token }. Include as X-CSRF-Token on all mutations."],
              ]},
              { group:"Scanning", endpoints:[
                ["POST","/api/scan","Run scan. Body: { target }. Auto-saves to company."],
                ["GET", "/api/scans","List company scans. Add ?id=X for full result."],
              ]},
              { group:"Mitigations", endpoints:[
                ["GET", "/api/mitigations","All company mitigations. Add ?scanId=X to filter."],
                ["PATCH","/api/mitigations","Update. Body: { id, status, notes, assignedTo }."],
              ]},
              { group:"Compliance", endpoints:[
                ["GET", "/api/compliance/upload","List uploads. Add ?id=X&controls=true for detail."],
                ["POST","/api/compliance/upload","Upload STIG. Body: { filename, content (base64) }."],
                ["GET", "/api/compliance/assessments","List assessments. Add ?id=X for statuses."],
                ["POST","/api/compliance/assessments","Create. Body: { framework, name }."],
                ["PATCH","/api/compliance/assessments","Update control. Body: { assessmentId, controlId, status, notes }."],
              ]},
              { group:"Users & Admin", endpoints:[
                ["GET",  "/api/users","List users in company."],
                ["POST", "/api/users","Create user. Body: { email, password, name, role }."],
                ["PATCH","/api/users","Update. Body: { id, role, name }."],
                ["DELETE","/api/users","Deactivate. Body: { id }."],
                ["GET",  "/api/admin/companies","List companies (superadmin)."],
                ["POST", "/api/admin/companies","Create company (superadmin). Body: { name, domain }."],
                ["GET",  "/api/health","Service health. No auth required."],
              ]},
            ].map(({ group, endpoints }) => (
              <div key={group} style={{ marginBottom:"32px" }}>
                <h3 style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:"12px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#e8341c",marginBottom:"12px" }}>{group}</h3>
                {endpoints.map(([method, path, desc]) => (
                  <div key={path} style={{ display:"flex",gap:"12px",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.05)",alignItems:"flex-start" }}>
                    <span style={{ fontFamily:"monospace",fontSize:"11px",fontWeight:700,minWidth:"52px",color:{GET:"#30d158",POST:"#3d8bff",PATCH:"#ff9f0a",DELETE:"#ff2d55"}[method]||"#fff" }}>{method}</span>
                    <code style={{ fontFamily:"monospace",fontSize:"13px",color:"#c8a84b",minWidth:"280px" }}>{path}</code>
                    <span style={{ fontSize:"14px",color:"rgba(255,255,255,0.55)",lineHeight:1.5 }}>{desc}</span>
                  </div>
                ))}
              </div>
            ))}
          </NavAnchor>

          <div style={{ height:"60px" }} />

          {/* SECURITY */}
          <NavAnchor id="security">
            <SectionHeader label="10 — Security" title="SECURITY CONTROLS" subtitle="Built following a Security Development Lifecycle." />
            <Table headers={["Control","Implementation"]} rows={[
              ["API Key Protection","ANTHROPIC_API_KEY has no NEXT_PUBLIC_ prefix — never in the browser bundle"],
              ["Session Auth","PBKDF2 (100,000 iterations, SHA-512). HttpOnly, SameSite=Strict cookies"],
              ["CSRF","Synchronizer Token Pattern — HMAC-SHA256, 1-hour expiry, required on all mutations"],
              ["Tenant Isolation","companyId always from session — the client can never supply or override it"],
              ["Rate Limiting","Per-IP, configurable, in-memory (Redis-ready for multi-instance)"],
              ["Input Validation","Zod schema + regex allowlist + prompt injection pattern detection"],
              ["Output Validation","Full Zod schema on every AI response before it reaches the client"],
              ["Content Security Policy","Strict in production (no unsafe-eval). Relaxed in dev for Next.js HMR"],
              ["Security Headers","HSTS, X-Frame-Options, XCTO, Referrer-Policy, CORP/COEP/COOP"],
              ["Audit Logging","Structured JSON on stdout. All auth, scan, and mutation events logged"],
              ["Error Handling","No stack traces or internal errors sent to clients ever"],
              ["Env Validation","Process exits on startup if ANTHROPIC_API_KEY is missing or malformed"],
            ]}/>
          </NavAnchor>

          <div style={{ height:"60px" }} />

          {/* DEPLOYMENT */}
          <NavAnchor id="deployment">
            <SectionHeader label="11 — Deployment" title="DEPLOYMENT" />
            <h3 style={{ fontSize:"20px",fontWeight:700,color:"#fff",marginBottom:"14px" }}>Vercel (Recommended)</h3>
            <Code block>{`npm i -g vercel\nvercel\n\nvercel env add ANTHROPIC_API_KEY production\nvercel env add AUTH_SECRET production\nvercel env add NODE_ENV production`}</Code>
            <h3 style={{ fontSize:"20px",fontWeight:700,color:"#fff",marginBottom:"14px",marginTop:"28px" }}>Docker</h3>
            <Code block>{`FROM node:18-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY . .\nRUN npm run build\nEXPOSE 3000\nCMD ["npm", "start"]`}</Code>
            <Code block>{`docker build -t erebus-arc .\ndocker run -p 3000:3000 \\\n  -e ANTHROPIC_API_KEY=sk-ant-... \\\n  -e AUTH_SECRET=$(openssl rand -hex 32) \\\n  -e NODE_ENV=production \\\n  erebus-arc`}</Code>
            <NavAnchor id="env">
              <h3 style={{ fontSize:"20px",fontWeight:700,color:"#fff",marginBottom:"14px",marginTop:"28px" }}>Environment Variables</h3>
              <Table headers={["Variable","Required","Default","Description"]} rows={[
                ["ANTHROPIC_API_KEY","✅ Yes","—","Anthropic API key. Must start with sk-ant-"],
                ["AUTH_SECRET","✅ Production","dev-fallback","32+ char secret for HMAC CSRF signing"],
                ["EREBUS_ARC_API_KEY_HASH","Optional","—","SHA-256 hash of API key for bearer token auth"],
                ["RATE_LIMIT_MAX","Optional","10","Max requests per IP per window"],
                ["RATE_LIMIT_WINDOW_MS","Optional","60000","Rate limit window in milliseconds"],
                ["REDIS_URL","Optional","—","Redis URL for distributed rate limiting"],
                ["NODE_ENV","Optional","development","Set to production for strict security mode"],
              ]}/>
              <Callout type="warning">Never commit <Code>.env.local</Code> to version control. Use your deployment platform's secret management for production values.</Callout>
            </NavAnchor>
          </NavAnchor>

          <div style={{ height:"60px" }} />

          {/* FRAMEWORKS */}
          <NavAnchor id="frameworks">
            <SectionHeader label="12 — Reference" title="SUPPORTED FRAMEWORKS" />
            <Table headers={["Framework","ID","Controls","Notes"]} rows={[
              ["DISA STIG","STIG","Varies","XCCDF XML, CSV, CKL, plain text — upload required"],
              ["FedRAMP High","FEDRAMP_HIGH","421","Rev 5. Full enhancement notation AC-2(1)"],
              ["FedRAMP Moderate","FEDRAMP_MODERATE","325","Most common federal authorization level"],
              ["FedRAMP Low","FEDRAMP_LOW","125","Public-facing, low-sensitivity systems"],
              ["NIST SP 800-53r5","NIST_800_53","1,007","All 20 families. September 2020 (updated Dec 2020)"],
              ["NIST SP 800-171r2","NIST_800_171","110","CUI protection. Format 3.x.x. Feb 2020"],
              ["NERC CIP","NERC_CIP","CIP-002–014","Bulk electric system. v6/v7 standards"],
              ["ISO/IEC 27001:2022","ISO_27001","93","4 themes: A.5 Org, A.6 People, A.7 Physical, A.8 Tech"],
            ]}/>
          </NavAnchor>

          {/* Footer */}
          <div style={{ marginTop:"80px",paddingTop:"40px",borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"16px" }}>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:"12px",color:"rgba(255,255,255,0.30)" }}>EREBUS ARC v2.1.0 · Built with Claude API · JavaScript / Next.js 14</div>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:"11px",color:"rgba(255,255,255,0.20)",fontStyle:"italic" }}>"In the darkness before creation, Erebus watched — and nothing was hidden from him."</div>
          </div>

        </div>
      </div>
    </div>
  );
}
