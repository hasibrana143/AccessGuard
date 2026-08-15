# Threat Model — AccessGuard STRIDE Analysis

> **Status:** Spec — security engineering baseline
> **Volume:** V13 — Global SaaS Hardening
> **Owner:** Engineering / Security
> **Methodology:** STRIDE (Microsoft), per-feature analysis

## 1. Trust Boundaries

```
[Internet] ─→ [WAF/Cloudflare] ─→ [Vercel/Next] ─→ [Postgres + Redis] ─→ [Worker]
                                  ↓
                              [GitHub API]  [Stripe API]  [NVIDIA NIM]  [SendGrid]
                              (outbound trust boundaries)
```

| Boundary | Trust Assumption | Monitoring |
|----------|------------------|------------|
| Internet ↔ WAF | Untrusted traffic | WAF logs, rate-limit bans |
| WAF ↔ Next.js | WAF passes legit traffic | Cloudflare audit |
| Next.js ↔ Postgres | Server-only (no client DB access) | Query logs, slow queries |
| Next.js ↔ Redis | Same VPC, no public exposure | Redis monitor |
| Worker ↔ External APIs | Outbound to providers (Stripe, GH, NIM, SendGrid) | Audit log per call |
| Client ↔ Server | JWT (NextAuth) — verify on every request | Auth failure rate |

## 2. STRIDE Per Component

### A. Authentication (`src/lib/auth.ts`, `/api/auth/*`)

| Threat | Type | Risk | Mitigation (current) | Gap |
|--------|------|------|---------------------|-----|
| Password spraying | Spoofing | High | Rate-limit `/api/auth/register`, `/forgot-password` | Add lockout after 5 fails |
| Credential stuffing | Spoofing | High | — | Add HIBP password check on signup |
| JWT theft via XSS | Tampering | Med | HttpOnly cookies | Add X-Frame-Options DENY (done) |
| MFA bypass | Elevation | Med | MFA setup route | Add MFA-enforce on /admin, /billing |
| Session fixation | Spoofing | Med | NextAuth regenerates session | — |
| OAuth state fix | Tampering | High | HMAC-SHA256 signed state (done) | — |

### B. RBAC & Tenant Isolation (`src/lib/rbac.ts`)

| Threat | Type | Risk | Mitigation | Gap |
|--------|------|------|------------|-----|
| IDOR (cross-tenant read) | Info disclosure | **Critical** | requireOrgAccess, requireProjectAccess | Add tenant-isolation tests (done) |
| Privilege escalation | Elevation | High | enforcePermission, role check | Audit custom-role DB sync |
| Permission drift | Repudiation | Med | Audit log for role changes | Reconciliation job (planned) |
| Unverified email writes | Elevation | Med | enforceVerificationOnWrite (exported) | Apply to ALL mutating endpoints |

### C. Scanner (`src/services/scanner/*`)

| Threat | Type | Risk | Mitigation | Gap |
|--------|------|------|------------|-----|
| SSRF via target URL | Spoofing/Info disc | **Critical** | validateTargetUrl | Add blocklist (169.254.0.0/16, metadata API) |
| Puppeteer RCE | Tampering/Elevation | **Critical** | Puppeteer sandbox, no eval | Audit node args, disable Node integration |
| Scan other people's sites | Spoofing/DoS | High | project.isVerified, ownership verif. | Add scan rate-limit per project |
| Worker overflow | DoS | High | BullMQ concurrency + Redis rate | Soak test (planned deferral) |

### D. AI Remediation (`src/ai/*`)

| Threat | Type | Risk | Mitigation | Gap |
|--------|------|------|------------|-----|
| Prompt injection via violation content | Tampering | **High** | Strict parser (markers) | Add: never feed raw HTML to LLM, sanitize |
| Hallucinated code suggestion | Tampering | Med | Template fallback | — |
| Cost abuse | DoS | Med | Rate-limit per-org, model routing | Add monthly token cap per org |
| Provider outage | DoS | Med | Fallback to template (done) | — |
| Data exfiltration via prompt | Info disc | **High** | LLM doesn't see other orgs' data | Add: redact other tenants' code from prompts |
| Jailbreak via prompt | Elevation | Med | System prompt + markers | Add: input sanitization, test jailbreaks |

### E. Billing (Stripe)

| Threat | Type | Risk | Mitigation | Gap |
|--------|------|------|------------|-----|
| Webhook forgery | Spoofing | **Critical** | Stripe signature verification (done) | — |
| Webhook replay | Repudiation | Med | WebhookEvent dedupe (done) | — |
| Cross-tenant subscription read | Info disc | High | getPlanFromPriceId tenant-scoped (done) | — |
| Coupon abuse | DoS | Med | Demo coupon codes | Add: 1 coupon per org per 90d |
| Trial abuse | DoS | Med | — | Add: 1 trial per email / card hash |
| Chargeback fraud | Repudiation | Med | — | Add: Stripe Radar, velocity checks |

### F. GitHub Integration

| Threat | Type | Risk | Mitigation | Gap |
|--------|------|------|------------|-----|
| Stolen OAuth token | Spoofing | High | AES-GCM encryption (done) | Add: token expiry 90d, rotation alert |
| PR spam via automated fix | Repudiation | High | Approval required, branch protection | Audit: track automated PR rate per org |
| Webhook secret exposure | Info disc | High | Removed hardcoded secret (done) | — |
| Cross-tenant repo access | Info disc | Med | orgId scoping on token | Add: validate repo belongs to user's org |

### G. File/CSV Import (`/api/projects/import`)

| Threat | Type | Risk | Mitigation | Gap |
|--------|------|------|------------|-----|
| CSV injection (formula injection) | Tampering | **High** | — | Add: prefix `=`, `+`, `-`, `@` with single quote on export |
| Oversized payload DoS | DoS | Med | — | Add: max 1000 rows, max 1MB |
| SSRF via imported URLs | Spoofing | **High** | validateTargetUrl | Add: blocklist for private IPs |
| Mass create scans | DoS | Med | Rate-limit (done) | Add: scan limit per plan tier |

## 3. Threat Models Per Critical Flow

### TM-01: Scan Execution
```
1. User POST /api/scans (project ID)
2. requireAuth → requireProjectAccess → rateLimit
3. Enqueue BullMQ job → worker
4. Worker: Puppeteer launches → axe-core scans page
5. Worker: violations saved to DB
6. (Optional) /api/remediate → LLM analysis
```

**Risks:**
- SSRF: validateTargetUrl prevents 169.254.x.x (AWS metadata), but misses DNS rebinding
- Puppeteer: if target page has compromised content (XSS), it could affect the worker
- LLM: violation content (HTML snippets) could contain prompt injection

**Mitigations (prioritized):**
1. **M01:** Add DNS rebinding guard (resolve DNS, check IP, then connect to resolved IP)
2. **M02:** Disable Puppeteer's `allowRunningInsecureContent`, enable `bypassCSP=false`
3. **M03:** Sanitize violation snippets before LLM prompt (remove `<script>`, HTML entities)

### TM-02: Billing Webhook
```
1. Stripe POST /api/stripe/webhook (signed)
2. Verify signature → parse event → idempotency check (WebhookEvent)
3. Update org.subscriptionStatus, plan
4. Emit audit log
```

**Risks:**
- Signature verification bypass (Stripe API version drift) — low, Stripe-stable
- Event replay (handled by dedupe)
- Org-laundry: customer updates their subscription to drain their access — handled by subscription status check

### TM-03: GitHub PR Pipeline
```
1. User selects a violation → Generate fix
2. LLM produces diff → /api/github/create-pr
3. Decrypted token → Octokit → Open PR
```

**Risks:**
- PR to unauthorized repo (token from user A applied to user B's repo) — mitigate by scoping token to user's GitHub identity
- LLM-generated diff with malicious code — mitigate by LLM system prompt + code review required
- Token theft → mass repo updates — mitigate by GitHub's own rate-limiting + audit

## 4. Top Priorities (Roadmap)

| Rank | Threat | Mitigation | Effort | Priority |
|------|--------|-----------|--------|----------|
| 1 | SSRF in scanner | DNS rebinding guard + IP blocklist | 1 day | P0 |
| 2 | CSV injection | Sanitize export prefix | 0.5 day | P0 |
| 3 | Prompt injection | LLM input sanitization | 1 day | P0 |
| 4 | LLM cost abuse | Per-org monthly token cap | 2 days | P1 |
| 5 | Trial/coupon abuse | Velocity limits | 1 day | P1 |
| 6 | Filename/path traversal in file upload | Validate, sandbox | 1 day | P1 |

## Definition of Done
- [ ] Threat model reviewed by engineering + security
- [ ] Mitigations M01-M03 implemented (coding tasks)
- [ ] Penetration test scheduled (annual external)
- [ ] Bug bounty program (HackerOne private → public at scale)
- [ ] Threat model updated on new feature releases (add to PR template)
