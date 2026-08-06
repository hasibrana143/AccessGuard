# Volume 12 — Future & Vision

> Where AccessGuard goes beyond a compliance tool. Basis: product strengths verified in code —
> scanning depth, AI remediation, GitHub-native workflow, org/audit-grade evidence.

## 1. Product vision statement
> **"Continuous accessibility compliance that fixes itself."**
> Not a quarterly audit — a background guard for every site, wired into the dev loop, that scans,
> ranks, fixes, and proves compliance continuously.

## 2. Strategic pillars
### Pillar A — From scanning to fixing (already shipping)
- 2026: AI remediation (llm/template) + GitHub auto-PR. ✅
- Next: batch-fix flows, fix validation gate (tests exist in V5 VALIDATION_ENGINE), PR quality KPI.

### Pillar B — From compliance to governance (platform)
- HVAC-style "accessibility cloud": every site a monitored endpoint.
- Evidence chain deepens: digital signatures on reports, blue-image hash, time-stamped proof-of-scan.
- Multi-standard: WCAG 2.2 → draft 3.0, EN 301 549 (EU), AODA, Section 508.
- Expand to **security & performance hygiene** alongside a11y (shared scanner infrastructure).

### Pillar C — From dev tool to developer platform
- **CI/CD product**: GitHub Action / native pipeline step; PR checks policy ("no new critical regressions").
- **API + SDK**: programmatic scans, webhook results, billing metering (V9 API_REFERENCE + V10 E7).
- **Developer community**: open-source scanner strategy module; plugin market.

### Pillar D — From SMB to enterprise & agencies
- SSO/SAML/SCIM, audit exports (SOC2), custom data residency, SLA (V11).
- Agency white-label as a product (own dashboard, client reports, bulk management).

### Pillar E — From manual to intelligent operations
- ML on scan data: rule-cohort triage, cost forecasting, model calibration (docs/ai/EVALS).
- Automated regression detection across crawls (stats/regression exists — productise into alerts).

## 3. Ten-year horizon (illustrative)
| Year | Theme | North star |
|---|---|---|
| 2026 | Launch | 100+ paying orgs, £25k ARR |
| 2027 | Scale | 1,000+ orgs; enterprise SSO; SOC2 |
| 2028 | Platform | Accessibility cloud (continuous monitoring plane) |
| 2029 | Ecosystem | Public SDK/API + agency marketplace |
| 2030 | Intelligence | Autonomous remediation majority; standards-driven |

## 4. What we will NOT do (anti-strategy)
- No "overlay plugin" magic widget that claims instant compliance (industry discredited; we position on real evidence).
- No pivot to generic SEO audits — scanner remains accessibility-first.
- No on-prem forks (SSO/residency via enterprise tier instead; keep single codebase).

## 5. Signals to watch (validate/reject)
| Signal | If true | If false |
|---|---|---|
| Agencies with 10+ client sites upgrade | Double down white-label | Re-focus self-serve |
| Dev igs adopt CI/API | API plan + action | Keep browser-only |
| Regulations expand (EN 301 549, WCAG 3.0) | Standards support roadmap | Stay on 2.2 |
| AI fix quality (validated post-merge) | Batch automation | Keep human-in-loop |

## 6. Continuous operation
The 12-volume system doesn't end at launch: every roadmap item (ROADMAP.md) will ship as a
volume with docs + DoD + board update + `vol:` commit — keeping the codebase's contract honest.