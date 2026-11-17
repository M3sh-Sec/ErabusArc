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

### v2.3.0 — 2026-11-17

**Weekly automated security review**

#### Dependency status note — Next.js 14.2.x is End of Life

Vercel confirmed on 2026-06-02 (GitHub Discussion #93868) that **Next.js 14.x is end-of-life** and no security fixes will be backported. The latest maintained releases are 15.5.29 (Maintenance LTS) and 16.4.5 (Active LTS). A planned migration to Next.js 15.x (or 16.x) is required; this is tracked as a future major upgrade since 14→15 involves breaking API changes (async params/searchParams, React 19 peer requirement) that need regression testing.

#### CVEs patched — code-level mitigation applied

| CVE | Severity | Package | Description | Mitigation applied |
|-----|----------|---------|-------------|-------------------|
| CVE-2026-96889 / GHSA-2464-fhr4-w9xw | Critical (CVSS 9.5) | `next` → `sharp` | Unauthenticated RCE in Image Optimization API via specially crafted SVG image on glibc-based Linux — memory corruption in upstream `sharp` library | Added `"overrides": { "sharp": ">=0.35.5" }` to `package.json` — Vercel-documented workaround; proper fix requires upgrade to `next@15.5.28+` |

#### CVEs found and ruled out as not applicable

| CVE | Severity | Reason not applicable |
|-----|----------|-----------------------|
| CVE-2026-75604 | Critical (CVSS 9.5) | Windows path-traversal incremental cache RCE — explicitly Linux-safe; server runs on glibc Linux |
| GHSA-673q-mjm6-r5xr | Critical | App Router + Cache Components typed-array RCE — Pages Router only, Cache Components not in use |
| GHSA-2xp9-vwfh-vxw4 | Critical (CVSS 9.5) | AVIF Image Optimization RCE — fixed in `next@15.5.24`; mitigated here by no `images.remotePatterns` configured and no `next/image` usage in codebase |
| GHSA-7qx7-33qx-rqx2 | Medium | SVG rejection bypass in Image Optimization — no RCE demonstrated; mitigated by no external image sources configured and no `next/image` usage; fix requires `next@15.5.28+` |
| CVE-2026-44578 | High (CVSS 8.6) | SSRF via WebSocket upgrades — requires WebSocket proxy rewrites; `rewrites()` returns `{}` (no rules) in this app |
| CVE-2026-64645 | High | Rewrites SSRF — requires attacker-controlled rewrite destination; `rewrites()` returns `{}` (no rules) |
| CVE-2026-64649 | High | App Router Server Actions SSRF on custom servers — Pages Router only |
| CVE-2026-94482 | High | App Router Server Actions — Pages Router only |
| GHSA-p3m5-59mp-jv5r | High | App Router Server Actions DoS — Vercel advisory explicitly states Pages Router apps are not vulnerable |
| CVE-2026-44573 | High | Pages Router i18n middleware bypass — project does not configure `i18n` routing |
| GHSA-mfr8-8qww-v76h | High | Cache Components cross-tenant cache disclosure — Cache Components / PPR not in use |
| CVE-2026-64641 | High | App Router Server Actions DoS — Pages Router only |
| CVE-2026-23864 / GHSA-h25m-26qc-wcjf | High | React Server Components DoS — affects `react-server-dom-webpack`/`parcel`/`turbopack`; Pages Router does not use RSC |
| CVE-2026-44579 | High | Cache Components DoS (affects ≥15.0.0 only) — below our version range |
| CVE-2026-44575 | High | App Router middleware bypass (affects ≥15.2.0 only) — below our version range |
| CVE-2026-64647 / CVE-2026-64648 | Medium | Fetch body cache confusion — cache data-path only exercised by App Router data layer |
| CVE-2026-64643 / CVE-2026-64646 | Medium | App Router Server Functions/Server Actions Edge — Pages Router only |
| GHSA-f3mh-rxg3-f5g2 | Medium | Cookie exposure via `x-middleware-set-cookie` in Edge routes — all API routes use Node.js runtime, not Edge runtime |
| GHSA-vc7v-qv4w-wrv8 / GHSA-rhh4-g77r-r9qj + others | Medium | Cache Components / PPR / `use cache` — not in use |
| CVE-2026-44576 / CVE-2026-44582 / GHSA-8h8q-6873-q5fj / GHSA-q4gf-8mx6-v5v3 | Low–High | App Router RSC cache poisoning / RSC DoS — Pages Router only |
| CVE-2026-27977 | Medium | Dev-mode HMR (≥16.0.1 only) — below our version range |
| CVE-2026-34451 / CVE-2026-41686 (`@anthropic-ai/sdk`) | Medium | Affects SDK ≥0.79.0 only; requires `BetaLocalFilesystemMemoryTool` — our version is `^0.39.0` and we do not use that tool |

#### Other dependencies — no new CVEs

- **`helmet@^8.0.0`** — no published CVEs in 2026
- **`zod@^3.24.4`** — CVE-2026-6991 affects v4 (4.3.0–4.3.6) only; v3 is not affected (intentional pin)
- **`rate-limiter-flexible@^5.0.4`** — no published CVEs; latest is 11.5.0 (no security driver to upgrade)
- **`react@^18.3.1` / `react-dom@^18.3.1`** — RSC DoS CVEs affect `react-server-dom-*` packages only; `react-dom` is not affected

---

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
