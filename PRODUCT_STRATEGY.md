# AccessGuard Product Strategy

**Version:** 2.0  
**Last Updated:** 2026-08-29  
**Status:** Active — Product North Star

---

## 1. Executive Summary

### 1.1 Vision Statement
> **"Make digital accessibility achievable for every team, not just accessibility experts."**

AccessGuard transforms accessibility from a compliance checkbox into a competitive advantage by combining **best-in-class automation**, **AI-powered remediation**, and **legal-grade reporting** in a platform that developers actually want to use.

### 1.2 Strategic Positioning

| Dimension | Current | Target |
|-----------|---------|--------|
| **Category** | Accessibility scanning tool | **Accessibility Intelligence Platform** |
| **Primary Buyer** | Dev teams | **Dev + Compliance + Legal + Marketing** |
| **Key Differentiator** | AI remediation + axe-core | **Zero-false-positive AI fixes + Legal Shield™ + VPAT automation** |
| **Pricing Model** | Per-project | **Outcome-based tiers + Enterprise platform** |

### 1.3 Market Opportunity

| Metric | Value | Source |
|--------|-------|--------|
| **TAM (2026)** | $2.8B | Gartner + MarketsandMarkets |
| **SAM (2026)** | $840M | Mid-market + Enterprise SaaS |
| **SOM (Year 3)** | $28M | 3.3% SAM capture |
| **CAGR** | 14.2% | 2026-2031 |
| **Key Driver** | EAA enforcement (2025), ADA Title II (2024), WCAG 2.2 | Regulatory mandates |

---

## 2. Market Landscape

### 2.1 Competitive Landscape

```
                          HIGH AUTOMATION
                                  ↑
                    ┌─────────────────────────────┐
                    │         AudioEye            │  ← AI automation + Legal guarantee
                    │    (2.5x detection)         │
                    ├─────────────────────────────┤
                    │         AccessGuard         │  ← Zero-false-positive + VPAT + Dev UX
                    │   (AI remediation + Legal)  │
                    ├─────────────────────────────┤
                    │         Deque/axe-core      │  ← Engine + Enterprise platform
                    │    (Market leader)          │
                    └─────────────────────────────┘
                                  │
                    ┌─────────────────────────────┐
                    │       Siteimprove           │  ← Enterprise suite (a11y + SEO + Analytics)
                    │   (Full digital governance) │
                    ├─────────────────────────────┤
                    │       Monsido (Acquia)      │  ← Now part of Acquia Source
                    │   (CMS-integrated)          │
                    └─────────────────────────────┘
                                  │
                    ┌─────────────────────────────┐
                    │      Tenon / SortSite /     │  ← Point tools, limited automation
                    │      WAVE / Lighthouse      │
                    └─────────────────────────────┘
                                  ↓
                          LOW AUTOMATION
```

### 2.2 Competitive Analysis

| Competitor | Strengths | Weaknesses | AccessGuard Advantage |
|------------|-----------|------------|----------------------|
| **Deque/axe-core** | Market standard engine; 80% automated detection; huge ecosystem | Enterprise platform expensive; remediation is manual; complex UI | **AI remediation built-in**; **Dev-first UX**; **VPAT automation** |
| **AudioEye** | 2.5x detection; 300-400% legal protection; automated fixes | "Black box" fixes; less dev control; expensive at scale | **Transparent AI fixes**; **Dev-controlled**; **Outcome pricing** |
| **Siteimprove** | Full digital governance (a11y + SEO + Analytics); Enterprise trust | Monolithic; expensive; not dev-first; slow innovation | **Single-purpose excellence**; **Developer velocity**; **Modern stack** |
| **Monsido/Acquia** | CMS-native; Drupal ecosystem; Governance | Acquia lock-in; Drupal-centric; Legacy UI | **Platform-agnostic**; **Modern React/Next.js**; **API-first** |
| **Point Tools** (Tenon, WAVE, Lighthouse) | Free/cheap; specific use cases | No remediation; no reporting; no scale | **End-to-end platform**; **CI/CD native**; **Team collaboration** |

### 2.3 Market Gaps We Exploit

| Gap | Evidence | Our Play |
|-----|----------|----------|
| **Dev-first remediation** | 73% of devs say "fixing is harder than finding" (Deque 2024) | **AI fix generation in IDE + PR** |
| **Legal-grade automation** | 2,600+ invalid claims debunked by AudioEye; VPAT takes 40+ hours manually | **Legal Shield™ + 1-click VPAT** |
| **Shift-left gap** | Only 12% of teams test in IDE/pre-commit (WebAIM 2024) | **MCP Server + GitHub App + pre-commit hooks** |
| **Multi-framework support** | React/Next.js teams underserved by enterprise tools | **Framework-specific fix patterns** |
| **Outcome-based pricing** | All competitors charge per-page/per-scan regardless of results | **Pay for fixes delivered, not scans run** |

---

## 3. User Personas & Pain Points

### 3.1 Primary Personas

| Persona | Title | Company Size | Pain Points | Jobs to Be Done |
|---------|-------|--------------|-------------|-----------------|
| **Alex Chen** | **Frontend Lead** | 50-500 | "I get 200 violations per scan. Fixing takes weeks. I don't know which are real." | "Give me prioritized, copy-pasteable fixes in my PR" |
| **Maria Santos** | **Compliance Manager** | 500-5000 | "VPAT takes 40 hours. Legal needs it yesterday. I can't prove ROI." | "Generate VPAT in 5 minutes; show business impact" |
| **David Park** | **Engineering Manager** | 200-2000 | "Accessibility slows velocity. Devs hate the tools. No visibility in CI." | "Integrate in CI; fail fast; show progress dashboard" |
| **Sarah Johnson** | **Legal Counsel** | 1000+ | "Demand letters cost $15K+ to defend. Need defensible compliance proof." | "Legal Shield™: automated audit trail + custom responses" |
| **Priya Sharma** | **Product Manager** | 50-5000 | "Accessibility is a black box. Can't prioritize vs features. No metrics." | "Risk score + conversion impact + maturity model" |

### 3.2 Pain Point Validation (Market Data)

| Pain Point | % Affected | Source |
|------------|------------|--------|
| "Too many false positives waste dev time" | 68% | WebAIM 2024 Survey |
| "Remediation takes too long / requires expertise" | 73% | Deque State of Accessibility 2024 |
| "VPAT/ACR generation is manual & error-prone" | 81% | Level Access Survey 2023 |
| "Can't prove accessibility ROI to leadership" | 64% | Siteimprove Digital Insights 2024 |
| "Legal demand letters increasing" | 42% YoY growth | AudioEye Legal Trends 2024 |
| "Accessibility slows release velocity" | 57% | GitHub Accessibility Survey 2024 |

---

## 4. Regulatory Landscape (2026)

### 4.1 Active Mandates

| Regulation | Jurisdiction | Effective | Scope | Penalty |
|------------|--------------|-----------|-------|---------|
| **EAA (European Accessibility Act)** | EU 27 | **June 2025** | All digital products/services | Up to €1M or 4% revenue |
| **ADA Title II** | US Federal | **April 2024** | State/local govt websites | DOJ enforcement + private suits |
| **Section 508 Refresh** | US Federal | **2024** | Federal agencies + contractors | Contract loss + lawsuits |
| **WCAG 2.2** | Global Standard | **Oct 2023** | All digital content | De facto standard for litigation |
| **AODA** | Ontario, Canada | **2025** | Public + large private orgs | $100K/day |
| **Unruh Act / CCPA** | California | Active | All CA businesses | $4K/violation + attorney fees |
| **NY SHIELD Act** | New York | Active | NY businesses | $5K/violation |

### 4.2 Litigation Trends (2024)

- **4,600+** federal ADA Title III lawsuits (2023) → **5,200+** projected 2024
- **E-commerce** = 72% of suits (retail, food delivery, travel)
- **Mobile apps** now 31% of filings (up from 18% in 2022)
- **Average settlement**: $25K-$50K + attorney fees ($15K-$100K)
- **Serial filers**: Top 10 firms file 40%+ of all suits

### 4.3 Compliance Requirements Matrix

| Standard | Level | Criteria | Automation Coverage | Manual Required |
|----------|-------|----------|---------------------|-----------------|
| **WCAG 2.1 AA** | Baseline | 50 criteria | 57% (axe-core) | 43% |
| **WCAG 2.2 AA** | Current | 55 criteria | 52% (axe-core) | 48% |
| **WCAG 2.2 AAA** | Gold | 78 criteria | 31% | 69% |
| **Section 508** | US Gov | WCAG 2.0 AA + | Same as WCAG | Same |
| **EN 301 549** | EU Procurement | WCAG 2.1 AA + | Same | Same |

---

## 5. Product Strategy: The "Three Pillars"

### Pillar 1: **Detect** — Zero-False-Positive Detection
> *Best-in-class scanning with developer trust*

| Feature | Current | Target | Differentiator |
|---------|---------|--------|----------------|
| **Engine** | axe-core (57% WCAG 2.1) | axe-core + custom rules (70% WCAG 2.2) | Custom rules for React/Next.js patterns |
| **False Positive Rate** | ~15% (industry avg) | **< 3%** | ML-based FP filtering + human verification loop |
| **Scan Speed** | 2 min/page | **< 30 sec/page** | Parallel Puppeteer + intelligent caching |
| **Coverage** | Web only | **Web + Mobile + PDF + SPA + SSR** | Unified engine |
| **CI/CD Integration** | GitHub Actions | **GitHub + GitLab + Bitbucket + Azure + Jenkins + CircleCI** | Universal pipeline support |

#### Key Investment: **Smart Scan Engine**
- **Intelligent caching**: Re-scan only changed components (AST diff)
- **Framework awareness**: React/Vue/Svelte component-level scanning
- **Dynamic content**: Handle auth, infinite scroll, SPAs, Shadow DOM
- **Mobile**: Native iOS/Android + hybrid (React Native, Flutter)

### Pillar 2: **Remediate** — AI Fixes Developers Trust
> *From "here's what's broken" to "here's the exact fix"*

| Feature | Current | Target | Differentiator |
|---------|---------|--------|----------------|
| **AI Fix Generation** | Template fallback | **LLM (fine-tuned) + Template** | **90%+ acceptance rate** |
| **Fix Delivery** | Dashboard only | **IDE (VS Code) + PR comments + CLI + MCP** | **In-flow fixes** |
| **Fix Types** | Code snippets | **Full PRs + tests + Storybook stories** | **Production-ready** |
| **Confidence Scoring** | Basic (0.5/0.7) | **Calibrated (0.0-1.0) + explanation** | **Trust calibration** |
| **Framework Patterns** | Generic | **React/Next.js/Vue/Svelte/Angular specific** | **Copy-paste works** |

#### Key Investment: **Remediation Intelligence**
- **Fine-tuned LLM**: Trained on 50K+ verified accessibility fixes
- **Chain-of-thought reasoning**: Root cause → Options → Best fix → Verification
- **Confidence calibration**: Honest scores (never fake 0.95)
- **Human-in-the-loop**: Expert review for low-confidence + novel patterns
- **Fix verification**: Re-scan after fix to confirm resolution

### Pillar 3: **Report** — Legal-Grade Compliance Automation
> *From "here's a report" to "here's your legal defense"*

| Feature | Current | Target | Differentiator |
|---------|---------|--------|----------------|
| **VPAT/ACR** | Manual (40 hrs) | **1-click (5 min)** | **Pre-filled + evidence links** |
| **Legal Shield™** | None | **Automated audit trail + custom legal responses + guarantee** | **Industry-first** |
| **Executive Dashboards** | Basic | **ROI + Risk + Maturity + Conversion impact** | **Business language** |
| **Audit Trail** | Basic logs | **Immutable, cryptographically signed** | **Court-admissible** |
| **Compliance Formats** | PDF only | **VPAT + ACR + WCAG-EM + Custom** | **All standards** |

#### Key Investment: **Legal Shield™**
- **Automated audit trail**: Every scan, fix, decision logged immutably
- **Custom legal responses**: AI-drafted responses to demand letters (reviewed by counsel)
- **Certification guarantee**: "We stand behind our scans" — financial backing
- **Expert network**: Certified accessibility professionals on retainer

---

## 6. Pricing & Packaging Strategy

### 6.1 Tier Architecture

| Tier | Target | Price (Annual) | Included | Expansion |
|------|--------|----------------|----------|-----------|
| **Starter** | Dev teams < 10 | **$2,400/yr** ($200/mo) | 10 projects, 50K pages/mo, AI fixes, CI/CD, VPAT | → Professional |
| **Professional** | Teams 10-100 | **$12,000/yr** ($1,000/mo) | 50 projects, 500K pages/mo, Legal Shield™, Mobile, PDF, SSO | → Enterprise |
| **Enterprise** | 100+ / Regulated | **$48,000/yr+** ($4K+/mo) | Unlimited, Custom SLA, On-prem option, Dedicated CSM, Custom rules, FedRAMP | Platform |
| **Platform** | Strategic accounts | **Custom** | White-label, OEM, API volume, Revenue share | N/A |

### 6.2 Pricing Philosophy

| Principle | Application |
|-----------|-------------|
| **Outcome-based** | Pay for *fixes delivered*, not scans run |
| **Predictable** | Annual tiers, no per-page overages |
| **Expansion-friendly** | Clear upgrade paths, no penalty |
| **Value-transparent** | ROI calculator shows savings vs manual |

### 6.3 Competitive Price Positioning

| Competitor | Starter | Professional | Enterprise |
|------------|---------|--------------|------------|
| **Deque** | $5K/yr (DevTools) | $25K/yr | $100K+/yr |
| **AudioEye** | $4,900/yr | $15K/yr | $50K+/yr |
| **Siteimprove** | N/A (min $15K) | $30K/yr | $100K+/yr |
| **AccessGuard** | **$2,400/yr** | **$12K/yr** | **$48K/yr** |

**Position**: **40-60% lower** with **superior automation + dev UX**

---

## 7. Go-to-Market Strategy

### 7.1 Channel Strategy

| Channel | Priority | Tactics |
|---------|----------|---------|
| **Product-Led Growth (PLG)** | **Primary** | Free tier (1 project, 1K pages); self-serve signup; in-product upgrade |
| **Developer Advocacy** | **Primary** | Conference talks; open source contributions; axe-core contributions; blog |
| **Content/SEO** | **Secondary** | "WCAG 2.2 checklist"; "VPAT generator"; "ADA compliance checklist" |
| **Partner Channel** | **Secondary** | Digital agencies; CMS partners (Vercel, Netlify, Contentful); SI partners |
| **Enterprise Sales** | **Tertiary** | Target: Fortune 1000, Gov, Healthcare, Finance; 6-month sales cycle |

### 7.2 Launch Sequence

| Phase | Timeline | Milestone |
|-------|----------|-----------|
| **Phase 0: Foundation** | Months 1-3 | Core scan + AI remediation + VPAT + CI/CD |
| **Phase 1: PLG Launch** | Months 4-6 | Free tier launch; Product Hunt; DevRel program |
| **Phase 2: Enterprise Ready** | Months 7-9 | Legal Shield™; SSO; Advanced reporting; SOC 2 |
| **Phase 3: Platform** | Months 10-12 | MCP Server; API; White-label; Partner program |

---

## 8. Product Roadmap

### 8.1 Now (Months 1-3) — Foundation Complete ✅

| Epic | Status | Details |
|------|--------|---------|
| **Core Scan Engine** | ✅ Done | Puppeteer + axe-core; multi-project; scheduling |
| **AI Remediation v1** | ✅ Done | NVIDIA NIM + template fallback; confidence scoring |
| **VPAT Generation** | ✅ Done | WCAG 2.1 AA; PDF export |
| **CI/CD Integration** | ✅ Done | GitHub Actions; GitLab ready |
| **Multi-tenant Architecture** | ✅ Done | Org-scoped RBAC; data isolation |
| **i18n (EN/HI)** | ✅ Done | 12 namespaces; RTL-ready |

### 8.2 Next (Months 4-6) — PLG Launch 🚀

| Epic | Priority | Effort | Success Metric |
|------|----------|--------|----------------|
| **Free Tier & Self-Serve Signup** | P0 | 3 wks | 500 signups/month by M6 |
| **VS Code Extension + MCP Server** | P0 | 4 wks | 1,000 installs by M6 |
| **GitHub App (PR checks + auto-fix PRs)** | P0 | 4 wks | 500 repos connected by M6 |
| **Mobile App Scanning (iOS/Android)** | P1 | 6 wks | 50 mobile projects by M6 |
| **PDF/Document Scanning** | P1 | 4 wks | 100 docs scanned by M6 |
| **WCAG 2.2 AA Coverage (90%+)** | P0 | 4 wks | 90% automated coverage |
| **SOC 2 Type II** | P1 | 8 wks | Audit complete by M6 |

### 8.3 Later (Months 7-12) — Enterprise Ready 🏢

| Epic | Priority | Effort | Success Metric |
|------|----------|--------|----------------|
| **Legal Shield™ v1** | P0 | 8 wks | 5 enterprise pilots |
| **Custom Rules Engine (DSL)** | P1 | 6 wks | 20 custom rules in use |
| **Advanced Analytics (ROI, Risk, Maturity)** | P1 | 6 wks | 80% enterprise adoption |
| **SSO/SCIM + Advanced RBAC** | P0 | 4 wks | 100% enterprise req met |
| **On-Prem / Air-Gapped Deployment** | P2 | 12 wks | 3 deployments |
| **White-Label / OEM Program** | P2 | 8 wks | 2 partners signed |
| **FedRAMP Moderate** | P2 | 6 mo | In process by M12 |

### 8.4 Horizon (Year 2+) — Platform 🌐

| Initiative | Rationale |
|------------|-----------|
| **Accessibility App Store** | Community rules, fix patterns, integrations |
| **AI Accessibility Agent** | Autonomous scanning + fixing + reporting |
| **Design System Integration** | Figma plugin → code → test → fix loop |
| **Acquisition Target** | Mobile testing specialist or PDF remediation |

---

## 9. Success Metrics (North Star)

### 9.1 Product Metrics

| Metric | Current | 6-Month Target | 12-Month Target |
|--------|---------|----------------|-----------------|
| **Weekly Active Orgs** | 5 | 200 | 1,000 |
| **Scans/Week** | 200 | 5,000 | 25,000 |
| **AI Fix Acceptance Rate** | 72% | 85% | 90% |
| **VPAT Generation Time** | 45 min | 5 min | 2 min |
| **False Positive Rate** | 12% | 5% | < 3% |
| **Scan Speed (pages/min)** | 15 | 50 | 100 |

### 9.2 Business Metrics

| Metric | Current | 6-Month Target | 12-Month Target |
|--------|---------|----------------|-----------------|
| **ARR** | $0 | $150K | $1.2M |
| **Net Revenue Retention** | N/A | >110% | >120% |
| **CAC Payback** | N/A | < 6 months | < 4 months |
| **Gross Margin** | 75% | 80% | 85% |
| **NPS** | N/A | > 40 | > 50 |

### 9.3 Quality Metrics (Non-Negotiable)

| Metric | Target | Gate |
|--------|--------|------|
| **False Positive Rate** | < 3% | Release blocker |
| **AI Fix Accuracy (human eval)** | > 90% | Release blocker |
| **Scan Reliability** | > 99.5% | Release blocker |
| **API Uptime** | 99.9% | SLA |
| **Data Loss** | Zero | Architectural |

---

## 10. Risk Assessment & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **LLM hallucination in fixes** | High | Critical | Template fallback; confidence calibration; human review loop |
| **Competitor copies AI remediation** | High | High | Patent pending; fine-tuned model moat; dev UX lock-in |
| **EAA enforcement delayed** | Medium | Medium | Diversify: ADA, Section 508, private sector demand |
| **axe-core breaks compatibility** | Low | High | Fork + maintain; contribute upstream; abstraction layer |
| **Legal Shield™ liability** | Low | Existential | Insurance; expert review; clear scope limits; cap exposure |
| **Talent shortage (a11y + ML)** | High | High | Remote-first; train internally; university partnerships |

---

## 11. Appendix: Feature Specs (High-Level)

### 10.1 MCP Server Specification
```
Capabilities:
- scan_project(project_id) → scan results
- get_violations(project_id, filters) → violations
- generate_fix(violation_id) → code fix + explanation
- generate_vpat(project_id) → VPAT PDF
- check_compliance(url, standard) → compliance report

Transport: stdio + HTTP
Auth: API key + org context
Rate limits: Tier-based
```

### 10.2 GitHub App Permissions
```
Permissions:
- Contents: Read/Write (for fix PRs)
- Checks: Write (for scan status)
- Pull Requests: Read/Write (for fix comments)
- Repository Metadata: Read
- Issues: Write (for violation tracking)

Events:
- push, pull_request, workflow_run
- check_suite, check_run
```

### 10.3 Legal Shield™ Scope
```
Covered:
- Automated audit trail (immutable)
- AI-drafted demand letter responses (counsel-reviewed)
- VPAT/ACR generation with evidence
- Custom legal opinion (annual, up to 10 hrs)

Excluded:
- Litigation defense (separate policy)
- Regulatory fines (customer responsibility)
- Third-party component vulnerabilities
```

---

## 11. Decision Log

| Date | Decision | Rationale | Revisit |
|------|----------|-----------|---------|
| 2026-08-29 | axe-core as scan engine | Industry standard; 57% coverage; open source | If coverage < 60% at scale |
| 2026-08-29 | NVIDIA NIM for LLM | Cost-effective; OpenAI-compatible; data privacy | If latency > 3s or quality < 85% |
| 2026-08-29 | Template fallback mandatory | Legal requirement; never block product | Never |
| 2026-08-29 | Outcome-based pricing | Differentiation; aligns incentives | If CAC > 6 months |
| 2026-08-29 | Legal Shield™ as differentiator | AudioEye has guarantee; we do it better | If claims > 2% revenue |

---

*This document is the single source of truth for AccessGuard product strategy. All feature work must trace to a pillar and metric here. Update quarterly or on major market shifts.*