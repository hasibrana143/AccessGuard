# Volume 12 — Product Roadmap (post-launch)

> 12-month roadmap derived from verified gaps recorded across V3–V11 docs. Priorities labelled
> P0 (core promise), P1 (growth), P2 (scale), P3 (explore).

## Q1 — Launch stabilization (P0)
- [ ] Semantic release automation (tags/changelog) — GITHUB_ACTIONS.md
- [x] Trivy container scan + SBOM in docker.yml
- [x] `/api/health/live` + `/api/health/ready` split
- [ ] Prometheus/Grafana SLO dashboards + alerting (V7 MONITORING plan)
- [x] Uptime/status page (`/status`, probes live + ready)
- [ ] Annual billing toggle (PRICING_PLAYBOOK E1)
- [ ] Trial nudge emails (SALES trigger sequence)
- [ ] PostHog analytics wiring (V11 ANALYTICS)
- [ ] Secrets scan (trufflehog) in CI

## Q2 — Growth (P1)
- [ ] SEO technical: metadata, sitemap, robots, /share noindex (SEO.md quick wins)
- [ ] 12-pillar content engine (SEO.md calendar)
- [ ] Agency white-label reports completion (branding toggle)
- [ ] GitHub App webhook integration (V3 honest gaps)
- [ ] Integration test suite (V8 INTEGRATION_TESTING)
- [ ] OpenAPI spec full coverage (63 routes — API_REFERENCE gap)
- [ ] API/CI plan monetization (PRICING_PLAYBOOK E7)

## Q3 — Scale & enterprise (P2)
- [ ] SSO/SAML + SCIM for Enterprise tier
- [ ] Multi-zone / multi-region deployment (KUBERNETES roadmap)
- [ ] WAL archiving + PITR backups (BACKUPS phase 2)
- [x] Load tests k6 in CI weekly + soak test (LOAD_TESTING)
- [ ] Security DAST suite in CI (SECURITY_TESTING)
- [ ] Feature flags UI (admin panel) + flag audit events
- [ ] KPI weekly report automation (KPI_DASHBOARD)

## Q4 — Differentiation & future (P3)
- [ ] WCAG 3.0 (draft) rule support + AI rule-label improvements
- [ ] Accessibility CI/GitHub Action product (public action)
- [ ] Chromium scanner fleet scale-out (queue workers split)
- [ ] Real-time scan progress in UI (polling → websockets/SSE)
- [ ] i18n (EN first; EU compliance orgs: DE/FR)
- [ ] Public SDK + API docs portal

## Roadmap rules
- Each item lands with a volume-style DoD (code + tests + docs + board update).
- Deprioritise freely — this list is opportunity, not commitment.
- Revisit quarterly with beta/GA data (funnel + churn + NPS).

## Immediate post-launch focus (first sprint)
1. Semantic release + Trivy/SBOM (release hygiene).
2. Health endpoints split + uptime page (reliability proof).
3. PostHog funnel (measure what matters).
4. SEO quick wins (organic growth start).