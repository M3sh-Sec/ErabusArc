# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.2.x   | ✅ Active  |
| 2.1.x   | ❌ EOL     |
| < 2.1   | ❌ EOL     |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report vulnerabilities privately via GitHub's Security Advisories:
`https://github.com/M3sh-Sec/ErabusArc/security/advisories/new`

We aim to respond within **48 hours** and issue a patch within **7 days** for critical issues.

---

## Security Patch Log

### v2.2.0 — 2026-10-29

**Dependency upgrades — security patches**

| CVE | Severity | Package | Description | Fixed In |
|-----|----------|---------|-------------|----------|
| CVE-2025-29927 | Critical (CVSS 9.1) | `next` | Middleware authorization bypass via forged `x-middleware-subrequest` header — allows unauthenticated access to protected routes | `next@14.2.35` + server-side header strip in `requireAuth` |
| CVE-2025-67779 | High | `next` | Incomplete fix for RSC denial-of-service via crafted HTTP request causing infinite loop | `next@14.2.35` |
| CVE-2025-55184 | High | `next` | React Server Components DoS — specially crafted request hangs server process | `next@14.2.35` |
| CVE-2025-55183 | Medium | `next` | RSC source code exposure — Server Function compiled source returned to attacker | `next@14.2.35` (Pages Router mitigated; patch applied proactively) |

**Additional hardening (no assigned CVE)**

- `@anthropic-ai/sdk` upgraded `^0.20.0` → `^0.39.0` — resolves transitive dependency advisories in older SDK versions
- `helmet` upgraded `7.1.0` → `^8.0.0` — aligns with Node 18+ LTS; removes deprecated configuration options
- `zod` upgraded `^3.23.8` → `^3.24.4` — latest patch release; CVE-2026-6991 affects zod v4 (4.3.0–4.3.6) only, v3 is not affected
- `react` / `react-dom` pinned to `^18.3.1` — latest patch release
- `eslint` upgraded `^8` → `^9`; `eslint-config-next` matched to `14.2.35`
- `rate-limiter-flexible` upgraded to `^5.0.4`

**Code-level hardening**

- `lib/session.js`: Added deletion of `x-middleware-subrequest` and `x-middleware-invoke` headers in `requireAuth()` — defense-in-depth for CVE-2025-29927
- `lib/validation.js`: Expanded prompt injection detection patterns (12 → 20 patterns) to cover DAN jailbreak, template injection delimiters, and additional disclosed bypass phrases

---

## Security Architecture

EREBUS ARC is built SDL-first. See the full security controls documentation in [`pages/about.js`](pages/about.js) or the running application at `/about`.

Key controls:
- PBKDF2 password hashing (100,000 iterations)
- HttpOnly, SameSite=Strict session cookies
- HMAC-SHA256 CSRF tokens on all state-changing requests
- Zod input + output validation on every API route
- Prompt injection detection on all user-supplied strings
- Full CSP, HSTS, XCTO, CORP, COEP, COOP headers
- Multi-tenant data isolation enforced at the data layer (not UI)
- Structured JSON audit logging of all auth and data events
- Per-IP rate limiting (configurable; Redis-backed for multi-instance)
- ANTHROPIC_API_KEY server-side only — never exposed to the client
