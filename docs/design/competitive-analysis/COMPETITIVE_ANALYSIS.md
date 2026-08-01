# Competitive Analysis — AccessGuard

Phase 0 (Research / Product Discovery) deliverable per MASTER_IMPLEMENTATION_PLAN Section 4.

**Last updated:** 2026-08-01
**Market context:** Web accessibility compliance (WCAG 2.1 AA), driven by ADA Title III lawsuits, EU EAA enforcement, and growing procurement requirements.

---

## 1. Competitive Landscape

The accessibility space splits into four segments:

| Segment | Players | AccessGuard positioning |
|---|---|---|
| **Automated scanners (developer tools)** | axe DevTools (Deque), Lighthouse, Pa11y, WAVE, Tenon | Overlap: scanning. Differentiator: continuous monitoring + AI remediation + org-level workflow |
| **Full-service compliance platforms** | Siteimprove, Deque axe Platform, Level Access, eSSENTIAL Accessibility | Differentiator: SMB pricing + self-serve, no long contracts/sales calls |
| **Overlay/widget providers** | accessiBe, audioEye, UserWay, EqualWeb | Differentiator: AccessGuard makes real source-code fixes; overlays patch at runtime and are increasingly legally challenged (e.g., 2023–2025 ADA cases against overlay-only approaches) |
| **AI remediation** | accessiBe (automated), Deque (ML on platform), OpenAI-assisted tools | Differentiator: rule-gated AI fixes with confidence scoring, PR-based review, WCAG-rule-aware validation |

---

## 2. Feature-by-Feature Comparison

| Capability | AccessGuard | axe DevTools / Deque axe Platform | Siteimprove | accessiBe / audioEye / UserWay | Google Lighthouse | Pa11y |
|---|---|---|---|---|---|---|
| **Core scanning** | Playwright + axe-core | axe-core | Proprietary crawler | Overlay JS injection | Chrome DevTools | axe-core wrapper |
| **Continuous monitoring** | Yes (scheduler + scheduled scans) | Deque Monitor (enterprise) | Yes | Yes | No | No (CI-triggered) |
| **AI-generated remediation code** | Yes (confidence-gated, rule-validated) | Limited ML suggestions | Limited | Automated claims (runtime patches) | No | No |
| **Fixes in real source code** | Yes (GitHub PR with real file edits) | Partial (exports) | No | No (DOM overlay) | No | No |
| **Confidence scoring + gating** | Yes (≥0.7 to apply) | No | No | No | No | No |
| **Fix validation** | Syntax/safety + rule-aware WCAG checks | Manual review | Manual review | Runtime only | Manual | N/A |
| **GitHub PR workflow** | Native (branch, PR, summary, source edits) | Some integrations | None | None | None | CI output |
| **Dashboard / reporting** | Full (WCAG progress, PDF compliance reports) | Enterprise dashboards | Strong (analytics) | Basic | Reports | CLI output |
| **Plan-based limits (SaaS)** | Yes (starter/agency/enterprise) | Per-seat enterprise | Per-seat contracts | Per-website | Free | Free/OSS |
| **RBAC / team management** | Yes (owner/admin/member/viewer, invites) | Enterprise | Yes | Basic | N/A | N/A |
| **Self-serve onboarding** | Yes (14-day trial, no sales call) | Sales-led | Sales-led | Self-serve | Free | Free |
| **Compliance reporting** | PDF (WCAG 2.1 AA + ADA) | Yes | Yes | Claims | No | No |

---

## 3. Pricing Model Comparison

| Product | Model | Entry price (approx.) |
|---|---|---|
| AccessGuard | Monthly SaaS per plan (starter free / agency / enterprise) | Freemium → ~$79/mo agency tier |
| Deque axe Platform | Annual enterprise contract | $5k–$50k+/yr |
| Siteimprove | Annual contract | $3k–$100k+/yr |
| accessiBe | Per-website subscription | ~$490/yr per site |
| audioEye | Annual contract | ~$1k+/yr per site |
| Lighthouse | Free | $0 |
| Pa11y | Open source | $0 |

**Takeaway:** AccessGuard competes on the "developer-first, compliance-grade" gap between free scanners (no monitoring, no remediation, no reporting) and enterprise platforms (sales-led, expensive, remediation not source-level).

---

## 4. Legal/Strategy Context

1. **Overlay liability:** Multiple 2023–2025 US ADA settlements/opinions question overlays' sufficiency. Source-code fixes are the defensible path — AccessGuard's core differentiator.
2. **EAA (European Accessibility Act):** Enforcement began June 2025; expands the market beyond US ADA → global monitoring demand.
3. **Procurement:** Federal (Section 508) and state VPAT requests drive enterprise demand; AccessGuard's WCAG 2.1 AA compliance reports address this.

---

## 5. AccessGuard Differentiators (summary)

1. **Real code fixes, not overlays** — GitHub PRs edit actual source files.
2. **AI with guardrails** — confidence gating + WCAG-rule-aware validation before any fix is applied.
3. **Continuous autonomous monitoring** — scheduler daemon, no manual re-scans.
4. **Self-serve SaaS economics** — SMB pricing without enterprise sales cycles.
5. **Enterprise-grade foundation** — RBAC, audit logs, plan limits, encrypted secrets, backups.

## 6. Risks / Watch Items

- axe-core rule coverage is detection-only; AI fixes must keep up with rule updates.
- Free tiers (Lighthouse/Pa11y + CI) are strong low-end competitors; AccessGuard must keep the 10-minute onboarding promise.
- Overlay vendors outspend on marketing; counter with compliance-grade positioning and developer trust.
- AI confidence gating may skip fixes for ambiguous cases — keep human review path (PRs) prominent.

## Implementation Status (2026-08-01)

- Core scanning implemented: Playwright browser strategy + server-side fetch analysis, continuous monitoring via cron scheduler daemon.
- Severity triage and violation management implemented (filtering, bulk status, evidence).
- AI remediation implemented with confidence gating and WCAG-rule-aware validation — matches the "AI with guardrails" differentiator.
- Fixes delivered in real source code via GitHub auto-PR (branch, PR summary, source edits) with HTML injection validation — differentiator #1 is live.
- Plan-based limits (starter/agency/enterprise) enforced via monthly pages quota; self-serve onboarding with trial implemented.
- RBAC / team management implemented (owner/admin/member roles, invites) — differentiator #5 foundation live.
- Compliance reporting implemented: WCAG 2.1 AA + VPAT PDF reports.
- Not yet implemented: white-labeling (differentiator for agency market) and SSO (relevant to enterprise sales cycles).
