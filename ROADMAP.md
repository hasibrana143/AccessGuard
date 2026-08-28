# AccessGuard Product Roadmap

**Version:** 2.0  
**Last Updated:** 2026-08-29  
**Planning Horizon:** 18 Months (Q3 2026 - Q4 2027)  
**Status:** Active — Sprint-Planning Ready

---

## Roadmap Overview

```
Q3 2026          Q4 2026          Q1 2027          Q2 2027          Q3 2027
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│  FOUNDATION   │   PLG LAUNCH   │  ENTERPRISE    │   PLATFORM     │
│  (Done)       │   (M4-6)       │   (M7-9)       │   (M10-12)     │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Current Status: **Foundation Complete** → **Entering PLG Launch**

---

## Phase 1: PLG Launch (Months 4-6) 🚀
**Theme:** "Developer-First Accessibility" — Self-serve adoption, dev tools, free tier

### Sprint 1-2 (Weeks 1-4): Free Tier & Self-Serve

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| PLG-1 | Free tier: 1 project, 1K pages/mo, basic scan + AI fix | 8 | Backend | User signs up → gets API key → runs scan in < 5 min |
| PLG-2 | Self-serve signup: email verification + org creation | 5 | Fullstack | Email → verify → landing in dashboard with first project |
| PLG-3 | Usage meter + upgrade prompts in UI | 5 | Frontend | Shows pages used; "Upgrade" CTA at 80% quota |
| PLG-4 | Stripe integration: subscription management | 8 | Backend | Starter/Pro/Enterprise tiers; proration; cancel anytime |
| PLG-5 | Email onboarding sequence (5 emails) | 3 | Marketing | Welcome → First scan → First fix → VPAT → Upgrade |

### Sprint 3-4 (Weeks 5-8): Developer Tools

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| PLG-6 | VS Code Extension: scan current file/project; show inline fixes | 13 | Frontend | Install → auth → "Scan File" → inline diagnostics with fix actions |
| PLG-7 | MCP Server (stdio + HTTP): scan, fix, vpat, compliance check | 13 | Backend | `npx @accessguard/mcp` works with Claude Code, Cursor, Copilot |
| PLG-8 | GitHub App: install → PR checks + auto-fix PRs + violation comments | 13 | Fullstack | Install on repo → push → check runs → violations as annotations → "Fix" button creates PR |
| PLG-9 | Pre-commit hook + Husky integration | 5 | Frontend | `npx accessguard-precommit` blocks commit on critical violations |

### Sprint 5-6 (Weeks 9-12): Mobile & Docs + Quality

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| PLG-10 | Mobile scanning: iOS (XCUITest) + Android (Espresso) + React Native | 21 | Backend | Upload .ipa/.apk → scan → violations with device screenshots |
| PLG-11 | PDF/Document scanning (tagged PDF, WCAG 2.1) | 13 | Backend | Upload PDF → violations with page numbers + element highlights |
| PLG-11b | WCAG 2.2 AA coverage: 90% automated (50/55 criteria) | 13 | Backend | axe-core 4.8+ + custom rules for 2.2 criteria (focus-appearance, drag-drop, etc.) |
| PLG-12 | SOC 2 Type II readiness: policies, logging, encryption, access control | 8 | Security | Audit complete; report available for enterprise prospects |
| PLG-13 | Performance: scan 50 pages/min; AI fix < 3s p95 | 8 | Platform | Load test: 100 concurrent scans; p95 latency targets met |

### Phase 1 Success Metrics (Month 6)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Weekly Active Orgs** | 200 | Dashboard analytics |
| **Free Tier Signups** | 500/mo | Auth logs |
| **VS Code Installs** | 1,000 | Marketplace analytics |
| **GitHub App Installs** | 500 repos | GitHub API |
| **AI Fix Acceptance Rate** | 85% | Telemetry |
| **NPS (free tier)** | > 40 | In-app survey |

---

## Phase 2: Enterprise Ready (Months 7-9) 🏢
**Theme:** "Compliance at Scale" — Legal Shield, SSO, Advanced Analytics, Custom Rules

### Sprint 7-8 (Weeks 13-16): Legal Shield™ v1

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| ENT-1 | Immutable audit trail: every scan/fix/decision → append-only log | 13 | Backend | Tamper-evident; cryptographic signing; queryable by date/org/action |
| ENT-2 | AI-drafted demand letter responses (counsel-reviewed template) | 13 | Legal+Backend | Input: demand letter PDF → output: response draft with citations |
| ENT-3 | VPAT/ACR with evidence links (scan ID, violation ID, fix PR) | 8 | Backend | 1-click VPAT → PDF with live links to scan/fix evidence |
| ENT-4 | Legal Shield™ guarantee page + terms + insurance binder | 5 | Legal | Published on site; insurance cert uploaded; FAQ |
| ENT-5 | Expert network portal: 5 certified a11y pros on retainer | 8 | Operations | Portal for ticket assignment; SLA: 4hr response; monthly hours tracking |

### Sprint 9-10 (Weeks 17-20): Enterprise Features

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| ENT-6 | SSO (SAML/OIDC) + SCIM provisioning (Okta, Azure AD, Google) | 13 | Backend | Enterprise org enables SSO → users login via IdP; SCIM syncs users/groups |
| ENT-7 | Advanced RBAC: custom roles + resource-level permissions | 8 | Backend | Org admin creates "Scanner" role (scan only, no fixes); assigns to team |
| ENT-8 | Custom Rules Engine (DSL): `rule "color-contrast-custom" when ... then ...` | 21 | Backend | DSL editor in UI; test against sample HTML; deploy to org scans |
| ENT-9 | Advanced Analytics: Risk Score + ROI + Maturity Model + Conversion Impact | 13 | Frontend+Backend | Executive dashboard: risk trend, $ saved, maturity level (1-5), conversion lift |
| ENT-10 | Scheduled Scans v2: cron + webhook triggers + smart scheduling (skip unchanged) | 8 | Backend | Cron expression + "only if changed" + webhook for CI completion |

### Sprint 11-12 (Weeks 21-24): Enterprise Polish

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| ENT-11 | On-prem / Air-gapped deployment: Docker + Helm + offline license | 21 | Platform | Helm chart deploys to k8s; license server; no external calls |
| ENT-12 | White-label / OEM: custom domain, branding, email templates | 13 | Platform | Partner configures logo/colors/domain; end-users see partner brand |
| ENT-13 | API v2: GraphQL + Webhooks + Rate limiting + API keys per service | 13 | Backend | GraphQL playground; webhook signatures; per-key quotas |
| ENT-14 | FedRAMP Moderate: documentation + controls mapping + 3PAO engagement | 21 | Security | SSP complete; POA&M; 3PAO selected; continuous monitoring plan |
| ENT-15 | Customer Success: onboarding playbook + health scores + quarterly reviews | 8 | CS | Playbook doc; health score algorithm; 5 pilot customers onboarded |

### Phase 2 Success Metrics (Month 9)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **ARR** | $150K | Stripe |
| **Enterprise Customers** | 5 pilots + 2 paid | CRM |
| **Legal Shield™ Activated** | 3 orgs | Feature flag |
| **SSO/SCIM Enabled** | 100% enterprise | Admin panel |
| **Custom Rules in Use** | 20 rules | Telemetry |
| **SOC 2 Type II** | Audit complete | Auditor report |

---

## Phase 3: Platform (Months 10-12) 🌐
**Theme:** "Accessibility Intelligence Platform" — Ecosystem, AI Agent, Marketplace

### Sprint 13-14 (Weeks 25-28): Platform Foundations

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| PLT-1 | Accessibility App Store: community rules, fix patterns, integrations | 21 | Platform | Submit → review → publish → install from UI; revenue share 70/30 |
| PLT-2 | AI Accessibility Agent: autonomous scan → fix → verify → PR loop | 21 | AI/Backend | "Fix all critical in this repo" → creates PRs with fixes + tests |
| PLT-3 | Design System Integration: Figma plugin → scan design → sync to code | 13 | Frontend | Figma: select frame → "Check Accessibility" → violations → "Sync to AccessGuard" |
| PLT-4 | Public API v2: GraphQL + Webhooks + SDKs (TS, Python, Go) | 13 | Backend | GraphQL playground; webhook retry + signature; SDKs published to npm/PyPI |

### Sprint 15-16 (Weeks 29-32): Ecosystem & Intelligence

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| PLT-5 | Accessibility Maturity Model: 5 levels + benchmarking + roadmap generator | 13 | Frontend | Org answers 20 questions → maturity score (1-5) + peer benchmark + 90-day plan |
| PLT-6 | ROI Calculator: $ saved = (manual hours × rate) - platform cost | 8 | Frontend | Inputs: team size, scan freq, fix time → output: annual savings + payback period |
| PLT-7 | Competitive Intelligence: "Your risk score vs industry avg" | 8 | Backend | Anonymized benchmarking; percentile ranking; trend alerts |
| PLT-8 | Partner Program: agency reseller + platform partner tiers + rev share | 8 | Sales/Ops | Portal: deal reg, MDF, training, certifications; 2 partners signed |

### Sprint 17-18 (Weeks 33-36): Platform Polish

| ID | Story | Points | Owner | Acceptance Criteria |
|----|-------|--------|-------|---------------------|
| PLT-9 | Multi-region: EU (Frankfurt) + US (Virginia) + data residency | 13 | Platform | Deploy to eu-central-1; data never leaves region; GDPR compliant |
| PLT-10 | Advanced AI: Fine-tuned model v2 (100K fixes); RAG for custom rules | 21 | AI | Model v2: 92% acceptance; RAG: answers custom rule questions |
| PLT-11 | Accessibility for AI agents: optimize content for AI search (AEO) | 8 | Frontend | Scan → "AI Search Score" → recommendations for LLM citations |
| PLT-12 | Acquisition scouting: mobile testing / PDF remediation specialists | 5 | Corp Dev | 3 targets identified; LOI ready |

### Phase 3 Success Metrics (Month 12)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **ARR** | $1.2M | Stripe |
| **Weekly Active Orgs** | 1,000 | Analytics |
| **Marketplace Items** | 50+ | App Store |
| **AI Agent Adoption** | 200 orgs | Feature flag |
| **Partner Revenue** | $50K | Partner portal |
| **Net Revenue Retention** | > 120% | Stripe |

---

## Phase 4: Horizon (Year 2+) 🔭

| Initiative | Hypothesis | Validation |
|------------|------------|------------|
| **AI Accessibility Agent v2** | Autonomous "fix my repo" with 95% acceptance | Beta with 10 design partners |
| **Design System Loop** | Figma → Code → Test → Fix in one flow | 5 design system teams pilot |
| **Accessibility for LLMs** | "Make my site AI-readable" → structured data + semantic HTML | 10 enterprise sites |
| **Acquisition** | Mobile testing or PDF remediation specialist | 2 LOIs by Q2 2027 |
| **International** | Japan (JIS X 8341), Germany (BITV), Brazil (LBI) | 3 localized versions |

---

## Resource Allocation

### Team Structure (Target: 25 FTE by Month 12)

| Team | Current | Month 6 | Month 12 | Focus |
|------|---------|---------|----------|-------|
| **Core Platform** | 4 | 6 | 8 | Scan engine, infra, multi-region |
| **AI/ML** | 2 | 3 | 5 | LLM fine-tuning, fix generation, agent |
| **Frontend/UX** | 3 | 4 | 6 | Dashboard, VS Code, Figma, analytics |
| **Backend/API** | 3 | 5 | 7 | API, GitHub App, MCP, custom rules |
| **DevRel/Community** | 1 | 2 | 3 | VS Code, MCP, open source, content |
| **Security/Compliance** | 1 | 2 | 3 | SOC 2, FedRAMP, Legal Shield, pen testing |
| **Sales/CS** | 1 | 2 | 4 | Enterprise, PLG conversion, partners |
| **Product/Design** | 2 | 2 | 3 | Strategy, UX research, roadmap |

**Total:** 17 → 27 → 39

---

## Budget Allocation (Annual)

| Category | Year 1 | Year 2 | Notes |
|----------|--------|--------|-------|
| **Engineering (Salaries)** | $2.1M | $3.5M | 60% of budget |
| **AI/ML (Compute + Data)** | $180K | $400K | GPU, labeling, eval |
| **Infrastructure** | $120K | $300K | AWS/GCP, Puppeteer fleet, Redis |
| **Security/Compliance** | $150K | $300K | SOC 2, FedRAMP, pen tests, insurance |
| **Legal Shield™ Insurance** | $50K | $100K | E&O + guarantee reserve |
| **DevRel/Marketing** | $200K | $400K | Conferences, content, events |
| **Sales/CS** | $300K | $800K | AE + CSM + partner program |
| **Operations** | $200K | $400K | Tools, office, admin |
| **Contingency (15%)** | $500K | $900K | Buffer |

**Total Year 1:** ~$3.8M  
**Total Year 2:** ~$6.5M

---

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| **axe-core 5.0 release** | Breaking changes | Maintain fork; abstraction layer; contribute upstream |
| **NVIDIA NIM availability** | Single provider risk | Add fallback: Together.ai, Anyscale, self-hosted vLLM |
| **Puppeteer/Chrome updates** | Breaking scans | Pin versions; automated regression suite (500 test pages) |
| **Legal Shield™ claims** | Financial exposure | Cap at 2x ARR; E&O insurance; expert review gate |
| **SOC 2 / FedRAMP timeline** | Delays block enterprise | Start Month 1; dedicated compliance engineer |
| **AI model quality regression** | Fix acceptance drops | Continuous eval (1000 golden set); canary deploy |

---

## Definition of Ready (DoR) for Sprints

- [ ] Story has clear acceptance criteria
- [ ] Designs approved (Figma link)
- [ ] Dependencies identified + resolved
- [ ] Test plan written
- [ ] Security review (if data/auth/infra)
- [ ] Performance budget defined
- [ ] Docs outline created

---

## Definition of Done (DoD) for Stories

- [ ] Code reviewed + approved (2 approvals)
- [ ] Unit tests > 80% coverage
- [ ] Integration tests pass
- [ ] E2E tests pass (Playwright)
- [ ] Accessibility test passes (axe + keyboard)
- [ ] Performance budget met
- [ ] Security scan clean (SAST/DAST)
- [ ] Docs updated (API, user guide, changelog)
- [ ] Deployed to staging + verified
- [ ] Feature flag configured

---

## Communication Cadence

| Meeting | Frequency | Attendees | Purpose |
|---------|-----------|-----------|---------|
| **Sprint Planning** | Bi-weekly (Mon) | Full team | Commit to sprint goal |
| **Daily Standup** | Daily (9:30 AM) | Team | Sync + blockers |
| **Backlog Refinement** | Weekly (Wed) | PM + Tech Lead + 2 devs | Ready next sprint |
| **Sprint Review** | Bi-weekly (Fri) | Full team + Stakeholders | Demo + feedback |
| **Retrospective** | Bi-weekly (Fri) | Team | Process improvement |
| **Roadmap Review** | Monthly | PM + Tech Lead + CTO | Strategic alignment |
| **All-Hands** | Monthly | Company | Vision + metrics + celebrate |

---

*This roadmap is a living document. Update bi-weekly in sprint planning. Major changes require PM + Tech Lead + CTO approval. All dates are targets, not commitments.*