<div align="center">

```
███████╗██████╗ ███████╗██████╗ ██╗   ██╗███████╗     █████╗ ██████╗  ██████╗
██╔════╝██╔══██╗██╔════╝██╔══██╗██║   ██║██╔════╝    ██╔══██╗██╔══██╗██╔════╝
█████╗  ██████╔╝█████╗  ██████╔╝██║   ██║███████╗    ███████║██████╔╝██║
██╔══╝  ██╔══██╗██╔══╝  ██╔══██╗██║   ██║╚════██║    ██╔══██║██╔══██╗██║
███████╗██║  ██║███████╗██████╔╝╚██████╔╝███████║    ██║  ██║██║  ██║╚██████╗
╚══════╝╚═╝  ╚═╝╚══════╝╚═════╝  ╚═════╝ ╚══════╝    ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝
```

**Professional Threat Intelligence Platform**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Claude API](https://img.shields.io/badge/Powered%20by-Claude%20API-8B5CF6?style=flat-square)](https://anthropic.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Security](https://img.shields.io/badge/Security-SDL%20Hardened-red?style=flat-square)](#security)

*Named for Erebus — primordial god of darkness, where hidden threats dwell before they surface.*

[**Live Demo**](#) · [**Documentation**](docs/) · [**Request Access**](#) · [**Report a Bug**](.github/ISSUE_TEMPLATE/bug_report.md)

</div>

---

## What is EREBUS ARC?

EREBUS ARC is a unified threat intelligence platform that connects **vulnerability data**, **adversary TTPs**, and **compliance controls** in one analyst-grade interface — built for security teams who can't afford gaps between detection, attribution, and remediation.

You type in a target — a URL, a software version, a third-party library, or an OS — and EREBUS ARC returns:

- **CVE intelligence** with CVSS v3.1 scores, EPSS exploit probability, and CISA KEV status
- **Named threat actor attribution** per CVE — APT groups, nation-state origin, campaign history
- **MITRE ATT&CK kill chain** from Initial Access to Impact, sub-technique level
- **Cross-framework compliance mapping** — 7 frameworks simultaneously from one STIG upload
- **Automated mitigation tracking** — every finding becomes a tracked, assignable work item

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Security](#security)
- [Compliance Frameworks](#compliance-frameworks)
- [API Reference](#api-reference)
- [Roles & Permissions](#roles--permissions)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### 🔍 Vulnerability Intelligence
- AI-powered CVE analysis for any target (URL, software, library, service, OS)
- Real CVE IDs cross-referenced against NVD, CISA KEV, GitHub Advisory, Exploit-DB
- CVSS v3.1 scoring with full vector strings
- EPSS (Exploit Prediction Scoring System) probability
- CIA impact triad, attack vector, complexity, and privilege classification

### ⚔️ Adversary TTP Profiling
- Named threat actor groups mapped per CVE (APT28, Lazarus, FIN7, Scattered Spider, etc.)
- Nation-state attribution with motivation classification
- Full MITRE ATT&CK kill chain — 13 phases, sub-technique notation (T1059.001)
- TTP heatmap across all identified tactics
- Detection opportunities per technique with log source guidance
- Visual attack chain flow diagrams

### 📋 Compliance Engine
- Upload STIG files in any format: XCCDF XML, STIG Viewer CSV, CKL, plain text
- AI-generated cross-framework mappings to **7 frameworks simultaneously**
- Coverage heatmap showing % of STIG controls mapped per framework
- Assessment tracker with per-control status, notes, evidence, and history
- Gap analysis identifying controls without STIG coverage

### ✅ Mitigation Tracker
- Every CVE found automatically creates a tracked mitigation item
- Five-status workflow: Open → In Progress → Mitigated / Risk Accepted / False Positive
- Analyst notes, evidence fields, and full status history per item
- Filter by severity, status, and scan target
- Assignee tracking across your team

### 🏢 Multi-Tenant Platform
- Company-level data isolation — cryptographic tenant separation
- Role-based access: Superadmin, Company Admin, Analyst, Viewer
- Session-based authentication with HttpOnly cookies
- CSRF protection, rate limiting, and full audit logging

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Next.js 14, plain CSS |
| Backend | Next.js API Routes (Node.js) |
| AI Engine | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Auth | Session tokens, PBKDF2 password hashing, HMAC-SHA256 CSRF |
| Rate Limiting | `rate-limiter-flexible` (in-memory, Redis-ready) |
| Validation | Zod schemas (input + AI output) |
| Storage | In-memory (structured for DB swap) |
| Language | JavaScript (ES modules throughout) |

---

## Quick Start

### Prerequisites

- Node.js 18 or higher
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Clone the repository

```bash
git clone https://github.com/your-org/erebus-arc.git
cd erebus-arc
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and set your values:

```env
# Required
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Required for production (generate: openssl rand -hex 32)
AUTH_SECRET=your-32-character-minimum-secret-here

# Optional — enable API key authentication
# Generate: node scripts/generate-key.js
EREBUS_ARC_API_KEY_HASH=sha256-hash-of-your-api-key

# Optional — rate limiting defaults
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MS=60000

# Optional — Redis for multi-instance deployments
REDIS_URL=redis://localhost:6379
```

### 4. Run in development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Sign in

Use the demo credentials shown on the login page, or sign in as the platform admin:

| Email | Password | Role |
|---|---|---|
| `admin@erebusarc.local` | `ErebusArcAdmin2025!` | Superadmin |
| `admin@democorp.example` | `DemoAdmin2025!` | Company Admin |
| `analyst@democorp.example` | `DemoAnalyst2025!` | Analyst |
| `viewer@democorp.example` | `DemoViewer2025!` | Viewer (read-only) |

> ⚠️ **Change all default passwords before any production deployment.**

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ Yes | Your Anthropic API key. Must start with `sk-ant-`. |
| `AUTH_SECRET` | ✅ Production | 32+ character secret for HMAC CSRF token signing. |
| `EREBUS_ARC_API_KEY_HASH` | Optional | SHA-256 hash of an API key to enable bearer token auth. |
| `RATE_LIMIT_MAX` | Optional | Max requests per IP per window. Default: `10`. |
| `RATE_LIMIT_WINDOW_MS` | Optional | Rate limit window in milliseconds. Default: `60000`. |
| `REDIS_URL` | Optional | Redis connection URL for distributed rate limiting. |
| `NODE_ENV` | Optional | Set to `production` to enable strict CSP and HTTPS enforcement. |

### Generating an API Key Hash

```bash
node -e "
const crypto = require('crypto');
const key = crypto.randomBytes(32).toString('hex');
const hash = crypto.createHash('sha256').update(key).digest('hex');
console.log('API Key (share with users):', key);
console.log('Hash (set as EREBUS_ARC_API_KEY_HASH):', hash);
"
```

---

## Architecture

```
erebus-arc/
├── pages/
│   ├── index.js          # Main app shell — scanner, scans, tracker, users
│   ├── login.js          # Authentication page
│   ├── compliance.js     # Compliance engine — STIG upload + framework mapping
│   ├── about.js          # Platform documentation and usage guide
│   └── api/
│       ├── auth/
│       │   ├── login.js     # POST — authenticate user, issue session cookie
│       │   ├── logout.js    # POST — invalidate session
│       │   └── me.js        # GET  — current session user
│       ├── admin/
│       │   └── companies.js # GET/POST/PATCH — company management (superadmin)
│       ├── users/
│       │   └── index.js     # GET/POST/PATCH/DELETE — user management
│       ├── scans/
│       │   └── index.js     # GET — company-scoped scan history
│       ├── mitigations/
│       │   └── index.js     # GET/PATCH — mitigation tracker
│       ├── compliance/
│       │   ├── upload.js    # GET/POST — STIG upload and parsing
│       │   └── assessments.js # GET/POST/PATCH — compliance assessments
│       ├── scan.js          # POST — run vulnerability scan
│       ├── csrf-token.js    # GET  — issue CSRF token
│       └── health.js        # GET  — service health check
├── lib/
│   ├── db.js                # Multi-tenant in-memory database
│   ├── session.js           # Session middleware and cookie management
│   ├── auth.js              # API key authentication, timing-safe comparison
│   ├── csrf.js              # HMAC-SHA256 CSRF token generation/validation
│   ├── env.js               # Startup environment validation
│   ├── rateLimiter.js       # Per-IP rate limiting
│   ├── validation.js        # Zod input validation + prompt injection detection
│   ├── outputSchema.js      # Zod schema for AI response validation
│   ├── prompt.js            # AI system prompt (server-side only)
│   ├── logger.js            # Structured JSON audit logging
│   ├── scanHistory.js       # Legacy IP-keyed scan history
│   ├── complianceDb.js      # Compliance data store
│   ├── complianceFrameworks.js # Framework catalog and metadata
│   ├── complianceMapper.js  # AI cross-framework mapping engine
│   └── stigParser.js        # STIG file parser (XML/CSV/text)
├── styles/
│   └── globals.css
├── .github/
│   ├── workflows/           # CI/CD pipelines
│   └── ISSUE_TEMPLATE/      # Bug report and feature request templates
├── docs/                    # Extended documentation
├── .env.example
├── next.config.js           # Security headers, CSP configuration
└── package.json
```

### Data Flow

```
Browser → /api/csrf-token → GET token
Browser → /api/auth/login (POST + CSRF) → Session cookie
Browser → /api/scan (POST + Cookie + CSRF) → AI analysis → stored to company
Browser → /api/mitigations (PATCH) → update status with audit trail
Browser → /api/compliance/upload (POST) → parse STIG → async AI mapping
```

---

## Security

EREBUS ARC was built following a Security Development Lifecycle (SDL). Key controls:

| Control | Implementation |
|---|---|
| **API Key Protection** | `ANTHROPIC_API_KEY` is server-side only — no `NEXT_PUBLIC_` prefix, never in browser bundle |
| **Authentication** | PBKDF2 (100,000 iterations, SHA-512), session cookies (HttpOnly, SameSite=Strict) |
| **CSRF Protection** | Synchronizer Token Pattern — HMAC-SHA256, 1-hour expiry |
| **Tenant Isolation** | `companyId` always derived from session, never trusted from client |
| **Rate Limiting** | Per-IP, configurable window, Redis-ready for multi-instance |
| **Input Validation** | Zod schema + regex allowlist + prompt injection detection on all inputs |
| **Output Validation** | Full Zod schema on every AI response before it reaches the client |
| **Content Security Policy** | Strict in production (no `unsafe-eval`), relaxed in development for HMR |
| **Security Headers** | HSTS, X-Frame-Options, XCTO, Referrer-Policy, CORP/COEP/COOP |
| **Audit Logging** | Structured JSON logs — all security events, no PII |
| **Error Handling** | No stack traces or internal errors sent to clients |

### Production Checklist

- [ ] `ANTHROPIC_API_KEY` set in environment
- [ ] `AUTH_SECRET` set to 32+ character random string
- [ ] `NODE_ENV=production` set
- [ ] Default passwords changed for all seed accounts
- [ ] HTTPS enforced (Vercel/Netlify handle this automatically)
- [ ] `EREBUS_ARC_API_KEY_HASH` set to enable API key auth
- [ ] Rate limit values tuned for expected traffic
- [ ] Log aggregation configured on stdout
- [ ] Uptime monitoring on `/api/health`
- [ ] `npm audit` run before deployment

---

## Compliance Frameworks

| Framework | ID | Controls | Notes |
|---|---|---|---|
| DISA STIG | `STIG` | Varies | Upload your own — XML, CSV, CKL |
| FedRAMP High | `FEDRAMP_HIGH` | 421 | Rev 5, full enhancement notation |
| FedRAMP Moderate | `FEDRAMP_MODERATE` | 325 | Most common authorization level |
| FedRAMP Low | `FEDRAMP_LOW` | 125 | Public-facing systems |
| NIST 800-53r5 | `NIST_800_53` | 1,007 | All 20 families |
| NIST 800-171r2 | `NIST_800_171` | 110 | CUI, format 3.x.x |
| NERC CIP | `NERC_CIP` | CIP-002–014 | Bulk electric system |
| ISO 27001:2022 | `ISO_27001` | 93 | Themes A.5–A.8 |

---

## API Reference

All endpoints require a valid session cookie (`erebus_arc_session`) and a CSRF token (`X-CSRF-Token` header) unless noted.

### Authentication

```
POST /api/auth/login      — { email, password } → sets session cookie
POST /api/auth/logout     — clears session cookie
GET  /api/auth/me         — returns current user and company
GET  /api/csrf-token      — returns { token } for use in X-CSRF-Token header
```

### Scanning

```
POST /api/scan            — { target: "string" } → analysis result + scan saved
GET  /api/scans           — list scans for current company
GET  /api/scans?id=X      — get full scan with results
```

### Mitigations

```
GET  /api/mitigations              — all mitigations for company
GET  /api/mitigations?scanId=X     — mitigations for a specific scan
PATCH /api/mitigations             — { id, status, notes, assignedTo }
```

### Compliance

```
GET  /api/compliance/upload         — list STIG uploads
POST /api/compliance/upload         — { filename, content (base64) }
GET  /api/compliance/upload?id=X    — get upload with controls and mappings
GET  /api/compliance/assessments    — list assessments
POST /api/compliance/assessments    — { framework, name }
PATCH /api/compliance/assessments   — { assessmentId, controlId, status, notes }
```

### Admin

```
GET    /api/admin/companies    — list all companies (superadmin)
POST   /api/admin/companies    — { name, domain } create company
PATCH  /api/admin/companies    — { id, ...fields } update company
GET    /api/users              — list users in company
POST   /api/users              — { email, password, name, role }
PATCH  /api/users              — { id, role, name, active }
DELETE /api/users              — { id }
GET    /api/health             — service health (no auth required)
```

---

## Roles & Permissions

| Permission | Viewer | Analyst | Company Admin | Superadmin |
|---|---|---|---|---|
| View scans | ✅ | ✅ | ✅ | ✅ |
| Run scans | ❌ | ✅ | ✅ | ✅ |
| Update mitigations | ❌ | ✅ | ✅ | ✅ |
| Upload STIGs | ❌ | ✅ | ✅ | ✅ |
| Create assessments | ❌ | ✅ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ (own company) | ✅ (all) |
| Manage companies | ❌ | ❌ | ❌ | ✅ |
| Cross-company access | ❌ | ❌ | ❌ | ✅ |

---

## Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel

# Set environment variables
vercel env add ANTHROPIC_API_KEY
vercel env add AUTH_SECRET
vercel env add EREBUS_ARC_API_KEY_HASH
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t erebus-arc .
docker run -p 3000:3000 \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e AUTH_SECRET=... \
  erebus-arc
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please read [CONTRIBUTING.md](docs/CONTRIBUTING.md) and follow the [Code of Conduct](docs/CODE_OF_CONDUCT.md).

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
<sub>Built with Claude AI · Secured by design · Named for the darkness where threats hide</sub>
</div>
