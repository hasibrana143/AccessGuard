# Volume 6 — OWASP Top 10 Assessment (current state)

Status legend: ✅ implemented / 🟡 partial / ❌ gap. Verified against code (June audit rounds 1–4 + V6 fixes).

| # | Control | Status | Evidence |
| --- | --- | --- | --- |
| A01 | Broken Access Control | ✅/🟡 | RBAC chain (rbac.ts), org-scoped reads, admin gate; UI parity fixes in V6 (bell); **watch**: audit-logs/export paths when new endpoints added |
| A02 | Cryptographic Failures | 🟡 | bcrypt12, AES-GCM tokens, hashed invite/reset tokens, TLS+HSTS; ❌ org settings JSON plaintext; TLS at host layer |
| A03 | Injection (SQL/XSS) | 🟡 | Prisma parameterized; `validateRemediation` sanitizes snippets; `fetch-analysis` regex rules avoid eval; ❌ full CSP deferred |
| A04 | Insecure Design | 🟡 | Tenant isolation by orgId everywhere; threat review each new route; ❌ no formal threat model doc (this doc family covers) |
| A05 | Security Misconfiguration | 🟡 | Security headers added V6 (X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, HSTS); ❌ CSP pending; debug APIs in prod guarded? verify |
| A06 | Vulnerable/Outdated Components | 🟡 | `npm audit --audit-level=high` in CI gates high CVEs; ❌ automated patch cadence + dependabot not enabled |
| A07 | Identification & Auth Failures | ✅ | JWT 7d, MFA (TOTP), 24h verify expiry, rate-limited auth (register/forgot/mfa), bcrypt compare |
| A08 | Software & Data Integrity | 🟡 | GHCR image (immutable tags), standalone build, npm audit; ❌ no SBOM/signature verification, no supply-chain scan in CI |
| A09 | Logging & Monitoring Failures | 🟡 | AuditLog events, error-logger + optional Sentry; ❌ no metrics dashboards, no alerting on abuse (rate-limit spikes) |
| A10 | SSRF | ✅/🟡 | Scanner SSRF controls: same-host crawl cap (20 links), URL validation, redirect cap 5, size caps 2MB, no internal-range allowlist → **add deny-list for loopback/169.254** (V7) |

## Top remediation backlog
1. SSRF internal-range blocklist in scanner URL validation.
2. CSP + dependabot + SBOM (CI supply chain).
3. Rate-limit abuse alerts + metrics.
4. Formal threat model per new surface (github create-pr especially).