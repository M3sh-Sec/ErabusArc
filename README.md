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
[![Multi-Model](https://img.shields.io/badge/Multi--Model-Claude%20%7C%20GPT--4o%20%7C%20Gemini%20%7C%20Mistral%20%7C%20Local-8B5CF6?style=flat-square)](#ai-providers)
[![Active Scanning](https://img.shields.io/badge/Active%20Scan-nmap%20%2B%20nuclei-FF6B35?style=flat-square)](#active-scanning)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Security](https://img.shields.io/badge/Security-SDL%20Hardened-red?style=flat-square)](#security)

*Named for Erebus — primordial god of darkness, where hidden threats dwell before they surface.*

[**Live Demo**](https://erebus-arc-production.up.railway.app) · [**Documentation**](docs/) · [**Request Access**](#) · [**Report a Bug**](.github/ISSUE_TEMPLATE/bug_report.md)

</div>

---

## What is EREBUS ARC?

EREBUS ARC is a unified threat intelligence platform that connects **live active scanning**, **vulnerability intelligence**, **adversary TTPs**, and **compliance controls** in one analyst-grade interface — built for security teams who can't afford gaps between detection, attribution, and remediation.

You type in a target — a URL, IP address, software version, or third-party library — and EREBUS ARC returns:

- **Active reconnaissance** with real nmap port/service detection and nuclei CVE template scanning
- **CVE intelligence** with CVSS v3.1 scores, EPSS exploit probability, and CISA KEV status
- **Named threat actor attribution** per CVE — APT groups, nation-state origin, campaign history
- **MITRE ATT&CK kill chain** from Initial Access to Impact, sub-technique level
- **Cross-framework compliance mapping** — 7 frameworks simultaneously from one STIG upload
- **Automated mitigation tracking** — every finding becomes a tracked, assignable work item

---

## Table of Contents

- [Features](#features)
- [Active Scanning](#active-scanning)
- [AI Providers](#ai-providers)
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

### 🔭 Active Scanning (nmap + nuclei)
- Real port and service discovery via nmap — detects open ports, running services, and version banners
- CVE template scanning via nuclei — 10,000+ templates matching critical/high/medium severity findings
- Results injected as **ground truth** into the AI prompt — the AI interprets real findings, not guesses
- Passive mode (AI-only) always available as fallback
- Scan mode toggle in the UI — switch per-scan without changing config
- Live findings shown in the Attack Surface tab alongside AI analysis

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

### 🤖 Multi-Model AI Engine
- Runs on any frontier or local model — no code changes required
- Per-scan model selection from the UI
- Supported: Anthropic Claude, OpenAI GPT-4o, Google Gemini, Mistral AI, Ollama, LM Studio

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

## Active Scanning

EREBUS ARC supports two scan modes:

| Mode | How it works | Best for |
|---|---|---|
| **Passive** | AI reasons from its training knowledge of CVEs | Software versions, libraries, OS analysis |
| **Active** | nmap + nuclei probe the target, results fed to AI | Live hosts, IPs, URLs, web services |

### How active scanning works

1. **nmap** scans the most common 24 ports for open services and version banners
2. **nuclei** runs CVE and misconfiguration templates against the target URL
3. Both results are injected into the AI prompt as **confirmed ground truth**
4. The AI produces its full CVE/TTP/kill-chain analysis based on what was actually found
5. Raw nmap ports and nuclei findings appear in the **Attack Surface** tab

### Enabling active scanning

Active scanning requires nmap and nuclei to be installed on the host running EREBUS ARC.

```bash
# Install nmap (Debian/Ubuntu)
apt-get install nmap

# Install nuclei
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
# Update templates after install
nuclei -update-templates
```

Then set the environment variable:

```env
ACTIVE_SCAN_ENABLED=true
```

> ⚠️ **Only scan targets you own or have explicit written permission to scan.** Active scanning sends real network probes. Unauthorized scanning may be illegal in your jurisdiction.

> 💡 When `ACTIVE_SCAN_ENABLED=false` (the default), the active scan endpoint returns 503 and the UI only shows the Passive mode toggle — no functionality is lost.

### Railway / cloud deployment

If deploying to Railway or another managed PaaS, install nmap and nuclei via a custom Dockerfile:

```dockerfile
FROM node:18-alpine
RUN apk add --no-cache nmap nmap-scripts
RUN wget -qO /usr/local/bin/nuclei https://github.com/projectdiscovery/nuclei/releases/latest/download/nuclei_linux_amd64 \
    && chmod +x /usr/local/bin/nuclei \
    && nuclei -update-templates
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## AI Providers

EREBUS ARC supports multiple AI providers. Set `AI_PROVIDER` to switch:

| Provider | `AI_PROVIDER` value | Required env var | Default model |
|---|---|---|---|
| Anthropic Claude | `anthropic` (default) | `ANTHROPIC_API_KEY` | claude-sonnet-4-20250514 |
| OpenAI | `openai` | `OPENAI_API_KEY` | gpt-4o |
| Google Gemini | `google` | `GOOGLE_API_KEY` | gemini-2.5-flash |
| Mistral AI | `mistral` | `MISTRAL_API_KEY` | mistral-large-latest |
| Local (Ollama/LM Studio) | `local` | — | llama3 |

Users can also override the provider and model **per scan** from the model picker in the UI — no restart required.

### Local models (Ollama / LM Studio)

```env
AI_PROVIDER=local
LOCAL_MODEL_URL=http://localhost:11434/v1   # optional, defaults to this
LOCAL_MODEL_NAME=llama3                     # optional, defaults to llama3
```

EREBUS ARC uses the OpenAI-compatible API spec for all non-Anthropic providers, so any model that exposes that interface works.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Next.js 14, plain CSS |
| Backend | Next.js API Routes (Node.js) |
| AI Engine | Multi-provider abstraction — Claude, GPT-4o, Gemini, Mistral, Local |
| Active Scanner | nmap (port/service), nuclei (CVE templates) |
| Auth | Session tokens, PBKDF2 password hashing, HMAC-SHA256 CSRF |
| Rate Limiting | `rate-limiter-flexible` (in-memory, Redis-ready) |
| Validation | Zod v3 schemas (input + AI output) |
| Storage | In-memory (structured for DB swap) |
| Language | JavaScript (ES modules throughout) |

---

## Quick Start

### Prerequisites

- Node.js 18 or higher
- An [Anthropic API key](https://console.anthropic.com/) (or another supported provider key)
- Optional: nmap + nuclei for active scanning

### 1. Clone the repository

```bash
git clone https://github.com/M3sh-Sec/ErabusArc.git
cd ErabusArc
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
# AI Provider (default: anthropic — set to openai, google, mistral, or local to switch)
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Optional: other provider keys
# OPENAI_API_KEY=sk-...
# GOOGLE_API_KEY=AIza...
# MISTRAL_API_KEY=...
# LOCAL_MODEL_URL=http://localhost:11434/v1
# LOCAL_MODEL_NAME=llama3

# Active scanning (requires nmap + nuclei installed)
# ACTIVE_SCAN_ENABLED=true

# Required for production (generate: openssl rand -hex 32)
AUTH_SECRET=your-32-character-minimum-secret-here

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
| `ANTHROPIC_API_KEY` | When `AI_PROVIDER=anthropic` | Anthropic API key. Must start with `sk-ant-`. |
| `AI_PROVIDER` | Optional | `anthropic` (default), `openai`, `google`, `mistral`, or `local` |
| `OPENAI_API_KEY` | When `AI_PROVIDER=openai` | OpenAI API key |
| `GOOGLE_API_KEY` | When `AI_PROVIDER=google` | Google AI Studio API key |
| `MISTRAL_API_KEY` | When `AI_PROVIDER=mistral` | Mistral AI API key |
| `LOCAL_MODEL_URL` | Optional | Base URL for Ollama/LM Studio. Default: `http://localhost:11434/v1` |
| `LOCAL_MODEL_NAME` | Optional | Local model name. Default: `llama3` |
| `ACTIVE_SCAN_ENABLED` | Optional | `true` to enable nmap + nuclei active scanning. Default: `false` |
| `AUTH_SECRET` | ✅ Production | 32+ character secret for HMAC CSRF token signing |
| `RATE_LIMIT_MAX` | Optional | Max requests per IP per window. Default: `10` |
| `RATE_LIMIT_WINDOW_MS` | Optional | Rate limit window in milliseconds. Default: `60000` |
| `REDIS_URL` | Optional | Redis URL for distributed rate limiting |
| `NODE_ENV` | Optional | Set to `production` for strict CSP and HTTPS enforcement |

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
│       │   ├── login.js         # POST — authenticate user, issue session cookie
│       │   ├── logout.js        # POST — invalidate session
│       │   └── me.js            # GET  — current session user
│       ├── admin/
│       │   └── companies.js     # GET/POST/PATCH — company management (superadmin)
│       ├── users/
│       │   └── index.js         # GET/POST/PATCH/DELETE — user management
│       ├── scans/
│       │   └── index.js         # GET — company-scoped scan history
│       ├── mitigations/
│       │   └── index.js         # GET/PATCH — mitigation tracker
│       ├── compliance/
│       │   ├── upload.js        # GET/POST — STIG upload and parsing
│       │   └── assessments.js   # GET/POST/PATCH — compliance assessments
│       ├── scan/
│       │   └── active.js        # POST — active scan (nmap + nuclei + AI)
│       ├── scan.js              # POST — passive AI-only vulnerability scan
│       ├── providers.js         # GET  — list AI providers and active scan status
│       ├── csrf-token.js        # GET  — issue CSRF token
│       └── health.js            # GET  — service health check
├── lib/
│   ├── aiProvider.js            # Multi-provider AI abstraction (Claude/OpenAI/Gemini/Mistral/Local)
│   ├── scanner.js               # Active scanner — nmap + nuclei orchestration
│   ├── db.js                    # Multi-tenant in-memory database
│   ├── session.js               # Session middleware and cookie management
│   ├── auth.js                  # API key authentication, timing-safe comparison
│   ├── csrf.js                  # HMAC-SHA256 CSRF token generation/validation
│   ├── env.js                   # Startup environment validation
│   ├── rateLimiter.js           # Per-IP rate limiting
│   ├── validation.js            # Zod input validation + prompt injection detection
│   ├── outputSchema.js          # Zod schema for AI response validation
│   ├── prompt.js                # AI system prompt (server-side only)
│   ├── logger.js                # Structured JSON audit logging
│   ├── complianceDb.js          # Compliance data store
│   ├── complianceFrameworks.js  # Framework catalog and metadata
│   ├── complianceMapper.js      # AI cross-framework mapping engine
│   └── stigParser.js            # STIG file parser (XML/CSV/text)
├── styles/
│   └── globals.css
├── .env.example
├── next.config.js               # Security headers, CSP configuration
└── package.json
```

### Data Flow

```
                        ┌─────────────────────────────────────────────┐
                        │              EREBUS ARC                      │
Browser ──────────────► │                                              │
                        │  /api/csrf-token  → GET token               │
                        │  /api/auth/login  → Session cookie          │
                        │                                              │
                        │  Passive scan:                               │
                        │  /api/scan ──────────────────► AI Provider  │
                        │                                (Claude/GPT/  │
                        │  Active scan:                  Gemini/etc.)  │
                        │  /api/scan/active                            │
                        │    ├─► nmap (port scan)                     │
                        │    ├─► nuclei (CVE templates)               │
                        │    └─► AI Provider (ground truth + enrich)  │
                        │                                              │
                        │  → stored to company scan history           │
                        └─────────────────────────────────────────────┘
```

---

## Security

EREBUS ARC was built following a Security Development Lifecycle (SDL). Key controls:

| Control | Implementation |
|---|---|
| **API Key Protection** | All provider keys are server-side only — no `NEXT_PUBLIC_` prefix, never in browser bundle |
| **Active Scan Safety** | Subprocess args passed as arrays (no shell interpolation); output capped at 64KB; `ACTIVE_SCAN_ENABLED` gate |
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

- [ ] API key set for chosen provider (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc.)
- [ ] `AUTH_SECRET` set to 32+ character random string
- [ ] `NODE_ENV=production` set
- [ ] Default passwords changed for all seed accounts
- [ ] HTTPS enforced (Vercel/Netlify/Railway handle this automatically)
- [ ] Rate limit values tuned for expected traffic
- [ ] Log aggregation configured on stdout
- [ ] Uptime monitoring on `/api/health`
- [ ] `npm audit` run before deployment
- [ ] If `ACTIVE_SCAN_ENABLED=true`: verify only authorized targets are accessible

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
POST /api/scan              — { target, provider?, model? } → passive AI-only analysis
POST /api/scan/active       — { target, provider?, model? } → nmap + nuclei + AI analysis
GET  /api/providers         — list AI providers, configured status, active scan enabled
GET  /api/scans             — list scans for current company
GET  /api/scans?id=X        — get full scan with results
```

#### Scan request body

```json
{
  "target": "nginx 1.24.0",
  "provider": "openai",       // optional — overrides AI_PROVIDER env var
  "model": "gpt-4o-mini"      // optional — overrides provider default
}
```

#### Active scan response includes

```json
{
  "activeScan": {
    "nmapPorts": [{ "port": 80, "proto": "tcp", "service": "http", "version": "nginx 1.24.0" }],
    "nucleiFindings": [{ "severity": "HIGH", "name": "...", "cve": "CVE-...", "matched": "https://..." }],
    "nmapSkipped": false,
    "nucleiSkipped": false
  }
}
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
| Run passive scans | ❌ | ✅ | ✅ | ✅ |
| Run active scans | ❌ | ✅ | ✅ | ✅ |
| Update mitigations | ❌ | ✅ | ✅ | ✅ |
| Upload STIGs | ❌ | ✅ | ✅ | ✅ |
| Create assessments | ❌ | ✅ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ (own company) | ✅ (all) |
| Manage companies | ❌ | ❌ | ❌ | ✅ |
| Cross-company access | ❌ | ❌ | ❌ | ✅ |

---

## Deployment

### Railway (Live)

EREBUS ARC is deployed live at [erebus-arc-production.up.railway.app](https://erebus-arc-production.up.railway.app).

To deploy your own instance:

```bash
# Install Railway CLI
npm i -g @railway/cli
railway login
railway link
railway up

# Set required variables in Railway dashboard → Settings → Variables
ANTHROPIC_API_KEY=sk-ant-...
AUTH_SECRET=...
# Optional: ACTIVE_SCAN_ENABLED=true (requires nmap + nuclei in container)
```

### Docker

```dockerfile
FROM node:18-alpine
# Optional: add active scanning tools
RUN apk add --no-cache nmap nmap-scripts curl
RUN curl -sLO https://github.com/projectdiscovery/nuclei/releases/latest/download/nuclei_linux_amd64.zip \
    && unzip nuclei_linux_amd64.zip && mv nuclei /usr/local/bin/ && rm nuclei_linux_amd64.zip \
    && nuclei -update-templates
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
  -e ACTIVE_SCAN_ENABLED=true \
  erebus-arc
```

### Vercel

```bash
npm i -g vercel
vercel

# Set environment variables
vercel env add ANTHROPIC_API_KEY
vercel env add AUTH_SECRET
```

> ℹ️ Active scanning is not available on Vercel (serverless functions don't support long-running child processes or persistent tools). Use Railway, Docker, or a VPS for active scan support.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
<sub>Built with Claude AI · Active scanning with nmap + nuclei · Multi-model AI engine · Secured by design · Named for the darkness where threats hide</sub>
</div>
