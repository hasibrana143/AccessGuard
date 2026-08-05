# PRD — AccessGuard

> Version: 1.0 · Date: 2026-08 · Status: Implemented v1 (see §8)
> Grounding: this PRD describes the product as built and the near-term roadmap.

## 1. Overview

**Product:** AccessGuard — AI-powered automated accessibility (WCAG) compliance platform.
**One-liner:** Scan your site, get WCAG 2.1/2.2 AA violation evidence, and remediate with AI + GitHub auto-PRs, then keep monitoring continuously.
**Category:** Web Accessibility Testing + Remediation SaaS (ADA/EAA/Section 508).
**Primary problem solved:** companies get sued for inaccessible websites; existing tools over-promise (overlays) or under-deliver (no remediation loop). AccessGuard gives a defensible evidence trail **and** a fix loop.

## 2. Goals / Non-Goals

**Goals**
- G1: Deliver actionable WCAG violations with severity + remediation guidance (scan → detect → explain).
- G2: Enable continuous monitoring via scheduled scans + risk-score/trend dashboards + notifications.
- G3: Reduce fix time via AI remediation suggestions that can become GitHub auto-PRs, validated for correctness.
- G4: Provide trippable evidence (PDF/shareable reports, audit logs) for legal/procurement.
- G5: Support team/permission model and org-scoped SaaS security (roles, MFA, rate limits).

**Non-goals (v1)**
- Overlay "instant fix" magic — we do not claim to fix the entire site invisibly.
- Not replacing a formal manual audit; we automate detection & monitoring.
- No self-hosted version.

## 3. Target Users (see USER_PERSONAS.md)
- P1 Founder/SMB · P2 Agency owner · P3 Head of Engineering · P4 Compliance/Procurement · P5 Frontend Developer.

## 4. Use Cases & Requirements

### UC1 — Run an accessibility scan
- **GIVEN** a verified project URL; **WHEN** user starts scan → `POST /api/scans` → enqueue
- Scan crawls pages (configurable), runs axe-core (WCAG 2.1/2.2) over page, records violations
- Result: severity (critical/serious/moderate/minor), WCAG criteria, element selector/html, URL, per-rule remediation
- Scheduled scans (cron: daily, weekly, monthly) run via scheduler daemon; one-off ISO future dates supported
- Failure safety: builds a `Scan.errorMessage` (sanitized) in case of scan failure

### UC5. View violations & manage status
- Filter/sort by project, severity, status; status transitions (open → fixed/ignored/false_positive) with `fixedAt`
- Pagination/limits; org-scoped access; live counts on dashboard
- AI explanations: per-violation AI text + confidence; validated remediation code via `validateFixForRule`

### UC6. GitHub remediation flow
- Connect GitHub org (repos, OAuth-backed token, installation state)
- **Auto-PR:** generate branch from violation, create commit(s) w/ fix, open PR to default branch (create-pr)
- **PR status:** on scan results, post updates/check status to a PR
- **Whitelist** — repos must be in the org's connected list (cross-tenant/prive/reputation)
- Rate/OCI: concurrency-capped to avoid GitHub-rate exhaustion; per-action RBAC (CREATE_PR)

### UC7. Reports & share
- Generate compliance report (MD + PDF), attach shareable link with expiry
- White-labeling for Agency puts agency logo on reports
- Dashboard risk score per project; trends; export

### UC8m. Monitoring & scheduling
- Cron/daily/weekly/monthly scan jobs; scheduler daemon (atomic claims)
- Notification webhooks (Slack/Teams) w/ period/timeouts; per-key alert toggle (criticalViolations/scanCompleted)
- Email (Resend) transactional (verify, invite, scan-complete)
- Push notifications on scan complete (permission-honest)

### UC9. Team & org security
- org-scoped all data (never see another org), RBAC: owner/admin/member/viewer + custom roles
- Invites: (rate-limited), hashed tokens, accept/email; pending listing; accept flow w/ password validation
- MFA (TOTP) + rate limits; audit logs; settings gatekeeping

### UC10. Billing / plans
- Stripe subs; Starter $49/Growth $149/Agency $399/Enterprise custom (limits per `plan-limits.ts`, enforced)
- Plan limits (websites, pages/month) enforced; overrides only restrict on downgrade
- Managed via `/api/billing` + Stripe webhooks; SSRF-safe URLs

## 5. Metrics / KPI

- Activation: trial → first scan ≤ 5m
- Scan completion with job success rate (queue/worker) ≥ 99%
- Remediation: % violations resolved after GitHub auto-PR merge
- Error budget: no hidden failures; rollup test suite (209 vitest unit+contract, 80 e2e)

## 6. Technical Constraints & Principles (as-built)

- Next.js 16 App Router, TypeScript strict
- PostgreSQL + Prisma ORM (indexes on hot paths: orgId, status, createdAt, email)
- BullMQ enqueue + Redis; graceful fallback when Redis down
- Auth: NextAuth (credentials + GitHub/Google OAuth), JWT with org context, MFA
- Security: SSRF-safe fetch, URL validation, XSS escaping, CSV-injection guard, rate limiting, timing-safe secret compares
- API versioning, OpenAPI at `/api/docs`

## 7. Open / Future (post-v1)
1. Annual billing toggle + page-credit packs
2. Enterprise SSO/SAML + CI pipeline (GitHub Actions step) monetized
3. Custom roles guardrails (viewer overallow)
4. Retention/archival jobs for scans/violations/audit logs (unbuilt — tracked in code)

## 8. Implementation Status (2026-08)
All functional reqs above are coded and covered by the automated suite (214 unit/integration tests; Playwright 80/80). See `docs/design/master-implementation-plan` + `docs/design/tdd/TDD.md`.