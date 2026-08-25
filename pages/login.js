import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [csrfToken, setCsrf]    = useState(null);

  useEffect(() => {
    fetch("/api/csrf-token").then(r => r.json()).then(d => setCsrf(d.token)).catch(() => {});
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push("/");
    } catch { setError("Login failed. Please try again."); }
    finally { setLoading(false); }
  }

  const inp = {
    width: "100%", background: "rgba(0,0,0,0.45)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
    padding: "12px 16px", color: "#fff", fontSize: "14px",
    fontFamily: "'IBM Plex Mono','Courier New',monospace",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07090f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono','Courier New',monospace", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3d8bff", boxShadow: "0 0 12px #3d8bff", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: "10px", letterSpacing: "0.2em", color: "#3d8bff", textTransform: "uppercase" }}>Threat Intelligence</span>
          </div>
          <h1 style={{ fontSize: "36px", fontWeight: 800, color: "#fff", letterSpacing: "0.14em", margin: 0 }}>EREBUS ARC</h1>
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "12px", marginTop: "6px" }}>Vulnerability Intelligence Platform</p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "32px" }}>
          <h2 style={{ color: "#fff", fontSize: "16px", fontWeight: 700, marginBottom: "24px", letterSpacing: "0.06em" }}>Sign In</h2>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required style={inp} />
            </div>
            <div>
              <label style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inp} />
            </div>
            {error && (
              <div style={{ background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.25)", borderRadius: "6px", padding: "10px 14px", color: "#ff2d55", fontSize: "12px" }}>⚠ {error}</div>
            )}
            <button type="submit" disabled={loading || !email || !password} style={{
              padding: "13px", borderRadius: "8px", border: "none",
              background: loading ? "rgba(61,139,255,0.1)" : "#3d8bff",
              color: loading ? "#3d8bff" : "#fff",
              fontSize: "12px", fontWeight: 800, letterSpacing: "0.1em",
              cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
              boxShadow: loading ? "none" : "0 0 22px rgba(61,139,255,0.3)",
              transition: "all 0.2s",
            }}>{loading ? "SIGNING IN..." : "▶ SIGN IN"}</button>
          </form>
          <div style={{ marginTop: "20px", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "6px" }}>
            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>Demo Credentials</div>
            {[
              ["admin@erebusarc.local",      "ErebusArcAdmin2025!",  "Platform Admin"],
              ["admin@democorp.example",   "DemoAdmin2025!",     "Company Admin"],
              ["analyst@democorp.example", "DemoAnalyst2025!",   "Analyst"],
              ["viewer@democorp.example",  "DemoViewer2025!",    "Viewer (read-only)"],
            ].map(([e, p, role]) => (
              <button key={e} onClick={() => { setEmail(e); setPassword(p); }} style={{
                display: "block", width: "100%", background: "transparent", border: "none",
                textAlign: "left", padding: "4px 0", cursor: "pointer",
                color: "rgba(255,255,255,0.3)", fontSize: "10px", fontFamily: "inherit",
              }}>
                <span style={{ color: "#3d8bff" }}>{role}</span> — {e}
              </button>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}
