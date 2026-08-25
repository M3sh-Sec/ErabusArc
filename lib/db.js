/**
 * EREBUS ARC In-Memory Database
 *
 * Structured as a proper multi-tenant data store.
 * All collections are Maps keyed by entity ID.
 * Tenant isolation is enforced at the query layer — never trust
 * the client to supply a companyId; always derive it from the session.
 *
 * Production: replace each Map with a DB table (Postgres recommended).
 * The query functions below map 1:1 to SQL/ORM equivalents.
 *
 * Data model:
 *   Company  1──* User
 *   Company  1──* Scan
 *   Scan     1──* MitigationItem
 */

import crypto from "crypto";

// ─── Collections ──────────────────────────────────────────────────────────────

const companies = new Map();   // id → Company
const users     = new Map();   // id → User
const scans     = new Map();   // id → Scan
const mitigations = new Map(); // id → MitigationItem
const sessions  = new Map();   // token → Session

// ─── Roles ────────────────────────────────────────────────────────────────────

export const ROLES = {
  SUPERADMIN:    "superadmin",    // cross-company platform admin
  COMPANY_ADMIN: "company_admin", // manage users within their company
  ANALYST:       "analyst",       // run scans, update mitigations
  VIEWER:        "viewer",        // read-only
};

export const ROLE_HIERARCHY = {
  superadmin:    4,
  company_admin: 3,
  analyst:       2,
  viewer:        1,
};

export function hasRole(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 99);
}

// ─── ID generation ────────────────────────────────────────────────────────────

function newId(prefix = "") {
  return prefix + crypto.randomBytes(12).toString("hex");
}

// ─── Password helpers ─────────────────────────────────────────────────────────

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const attempt = crypto.pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  const hashBuf    = Buffer.from(hash,    "hex");
  const attemptBuf = Buffer.from(attempt, "hex");
  if (hashBuf.length !== attemptBuf.length) return false;
  return crypto.timingSafeEqual(hashBuf, attemptBuf);
}

// ─── Company CRUD ─────────────────────────────────────────────────────────────

export function createCompany({ name, domain }) {
  const id = newId("co_");
  const company = {
    id,
    name: String(name).slice(0, 120),
    domain: domain ? String(domain).toLowerCase().slice(0, 100) : null,
    createdAt: new Date().toISOString(),
    active: true,
  };
  companies.set(id, company);
  return company;
}

export function getCompany(id) {
  return companies.get(id) || null;
}

export function listCompanies() {
  return [...companies.values()].filter(c => c.active);
}

export function updateCompany(id, fields) {
  const c = companies.get(id);
  if (!c) return null;
  const updated = { ...c, ...fields, id }; // id immutable
  companies.set(id, updated);
  return updated;
}

// ─── User CRUD ────────────────────────────────────────────────────────────────

export function createUser({ email, password, name, companyId, role = ROLES.ANALYST }) {
  // Validate role
  if (!Object.values(ROLES).includes(role)) role = ROLES.ANALYST;

  // Email uniqueness
  const existing = findUserByEmail(email);
  if (existing) throw new Error("Email already registered");

  const id = newId("usr_");
  const user = {
    id,
    email: String(email).toLowerCase().slice(0, 200),
    passwordHash: hashPassword(password),
    name: String(name).slice(0, 120),
    companyId: role === ROLES.SUPERADMIN ? null : companyId,
    role,
    createdAt: new Date().toISOString(),
    active: true,
    lastLoginAt: null,
  };
  users.set(id, user);
  return sanitizeUser(user);
}

export function findUserByEmail(email) {
  const e = String(email).toLowerCase();
  for (const u of users.values()) {
    if (u.email === e) return u;
  }
  return null;
}

export function getUser(id) {
  return users.get(id) || null;
}

export function listUsersForCompany(companyId) {
  return [...users.values()]
    .filter(u => u.companyId === companyId && u.active)
    .map(sanitizeUser);
}

export function updateUser(id, fields, requestingUserId) {
  const u = users.get(id);
  if (!u) return null;
  // Prevent role escalation beyond own role
  const requester = users.get(requestingUserId);
  if (fields.role && requester) {
    if ((ROLE_HIERARCHY[fields.role] || 0) > (ROLE_HIERARCHY[requester.role] || 0)) {
      throw new Error("Cannot assign a role higher than your own");
    }
  }
  const updated = { ...u, ...fields, id, email: u.email, passwordHash: u.passwordHash };
  users.set(id, updated);
  return sanitizeUser(updated);
}

export function deleteUser(id) {
  const u = users.get(id);
  if (!u) return false;
  users.set(id, { ...u, active: false });
  // Invalidate all sessions for this user
  for (const [token, session] of sessions) {
    if (session.userId === id) sessions.delete(token);
  }
  return true;
}

// Strip sensitive fields before sending to client
export function sanitizeUser(u) {
  const { passwordHash, ...safe } = u;
  return safe;
}

// ─── Session management ───────────────────────────────────────────────────────

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const session = {
    token,
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  sessions.set(token, session);
  // Update lastLoginAt
  const u = users.get(userId);
  if (u) users.set(userId, { ...u, lastLoginAt: new Date().toISOString() });
  return session;
}

export function getSession(token) {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return s;
}

export function deleteSession(token) {
  sessions.delete(token);
}

export function pruneExpiredSessions() {
  const now = Date.now();
  for (const [token, s] of sessions) {
    if (now > s.expiresAt) sessions.delete(token);
  }
}

// ─── Scan CRUD (company-scoped) ───────────────────────────────────────────────

export function createScan({ companyId, userId, target, analysisResult, scanId }) {
  const id = scanId || newId("scn_");
  const r = analysisResult.reportSummary || {};
  const vulns = (analysisResult.vulnerabilities || []).map(v => ({
    cveId:        v.cveId,
    title:        v.title,
    severity:     v.severity,
    cvssV3:       v.cvssV3,
    remediation:  v.remediation,
  }));

  const scan = {
    id,
    companyId,
    userId,
    target: String(target).slice(0, 200),
    targetType:   analysisResult.meta?.targetType || "unknown",
    riskScore:    analysisResult.riskProfile?.overallScore || 0,
    riskLevel:    analysisResult.riskProfile?.riskLevel || "UNKNOWN",
    totalVulns:   r.totalVulns || 0,
    criticalCount:r.criticalCount || 0,
    highCount:    r.highCount || 0,
    mediumCount:  r.mediumCount || 0,
    lowCount:     r.lowCount || 0,
    fullResult:   analysisResult, // full data stored server-side
    vulnSummaries: vulns,
    scannedAt:    new Date().toISOString(),
    scannedBy:    userId,
  };
  scans.set(id, scan);

  // Auto-create open mitigation items for every vulnerability
  for (const v of vulns) {
    createMitigationItem({
      scanId: id,
      companyId,
      cveId:    v.cveId,
      title:    v.title,
      severity: v.severity,
      cvssV3:   v.cvssV3,
      remediationDetail: v.remediation?.detail || "",
      urgency:  v.remediation?.urgency || "MEDIUM",
    });
  }

  return scan;
}

export function getScan(id, companyId) {
  const s = scans.get(id);
  // TENANT ISOLATION: reject if scan doesn't belong to company
  if (!s || s.companyId !== companyId) return null;
  return s;
}

export function listScansForCompany(companyId, { limit = 50 } = {}) {
  return [...scans.values()]
    .filter(s => s.companyId === companyId)
    .sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt))
    .slice(0, limit)
    .map(s => {
      const { fullResult, ...summary } = s; // don't send full result in list
      return summary;
    });
}

// ─── Mitigation tracker ───────────────────────────────────────────────────────

export const MITIGATION_STATUS = {
  OPEN:           "open",
  MITIGATING:     "mitigating",
  MITIGATED:      "mitigated",
  RISK_ACCEPTED:  "risk_accepted",
  FALSE_POSITIVE: "false_positive",
};

export function createMitigationItem({ scanId, companyId, cveId, title, severity, cvssV3, remediationDetail, urgency }) {
  const id = newId("mit_");
  const item = {
    id,
    scanId,
    companyId,
    cveId,
    title:             String(title).slice(0, 200),
    severity,
    cvssV3:            cvssV3 || null,
    remediationDetail: String(remediationDetail).slice(0, 1000),
    urgency,
    status:            MITIGATION_STATUS.OPEN,
    assignedTo:        null,  // userId
    notes:             "",
    statusHistory:     [],
    createdAt:         new Date().toISOString(),
    updatedAt:         new Date().toISOString(),
    resolvedAt:        null,
  };
  mitigations.set(id, item);
  return item;
}

export function getMitigationItem(id, companyId) {
  const m = mitigations.get(id);
  if (!m || m.companyId !== companyId) return null; // TENANT ISOLATION
  return m;
}

export function listMitigationsForScan(scanId, companyId) {
  // Verify scan belongs to company first
  const scan = scans.get(scanId);
  if (!scan || scan.companyId !== companyId) return null; // TENANT ISOLATION
  return [...mitigations.values()].filter(m => m.scanId === scanId);
}

export function listMitigationsForCompany(companyId, { status, severity } = {}) {
  let items = [...mitigations.values()].filter(m => m.companyId === companyId);
  if (status)   items = items.filter(m => m.status === status);
  if (severity) items = items.filter(m => m.severity === severity);
  return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function updateMitigationItem(id, companyId, userId, { status, notes, assignedTo }) {
  const m = mitigations.get(id);
  if (!m || m.companyId !== companyId) return null; // TENANT ISOLATION

  const validStatuses = Object.values(MITIGATION_STATUS);
  if (status && !validStatuses.includes(status)) throw new Error("Invalid status");

  const historyEntry = {
    from:      m.status,
    to:        status || m.status,
    by:        userId,
    at:        new Date().toISOString(),
    notes:     notes || "",
  };

  const updated = {
    ...m,
    status:     status     || m.status,
    notes:      notes      !== undefined ? String(notes).slice(0, 2000) : m.notes,
    assignedTo: assignedTo !== undefined ? assignedTo : m.assignedTo,
    updatedAt:  new Date().toISOString(),
    resolvedAt: (status === MITIGATION_STATUS.MITIGATED ||
                 status === MITIGATION_STATUS.RISK_ACCEPTED ||
                 status === MITIGATION_STATUS.FALSE_POSITIVE)
                ? new Date().toISOString() : m.resolvedAt,
    statusHistory: [...m.statusHistory, historyEntry],
  };
  mitigations.set(id, updated);
  return updated;
}

// ─── Bootstrap: create default superadmin + demo company ─────────────────────

let bootstrapped = false;
export function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  // Default superadmin (change password immediately in production)
  try {
    createUser({
      email: "admin@erebusarc.local",
      password: "ErebusArcAdmin2025!",
      name: "Platform Admin",
      companyId: null,
      role: ROLES.SUPERADMIN,
    });
  } catch {} // already exists

  // Demo company + users
  let demo = [...companies.values()].find(c => c.name === "Demo Corp");
  if (!demo) {
    demo = createCompany({ name: "Demo Corp", domain: "democorp.example" });
    try {
      createUser({ email: "admin@democorp.example", password: "DemoAdmin2025!", name: "Demo Admin",   companyId: demo.id, role: ROLES.COMPANY_ADMIN });
      createUser({ email: "analyst@democorp.example", password: "DemoAnalyst2025!", name: "Demo Analyst", companyId: demo.id, role: ROLES.ANALYST });
      createUser({ email: "viewer@democorp.example",  password: "DemoViewer2025!",  name: "Demo Viewer",  companyId: demo.id, role: ROLES.VIEWER });
    } catch {}
  }
}
