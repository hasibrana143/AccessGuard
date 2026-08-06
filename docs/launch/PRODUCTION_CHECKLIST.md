# Volume 12 — Production Readiness & Launch Checklist

> Final gate before public launch. Every item maps to code/docs that exist (or a documented gap).
> State = ✅ verified · ⚠️ partial/roadmap.

## 1. Application & data
- [x] Feature-set complete fat the documented surfaces (V1–V11)
- [x] **DB**: 13 models; `migrate deploy` automated in entrypoint; constraints applied (`db:constraints`)
- [x] **Seeds**: admin/orgs/projects — sanitised, no production secrets in repo
- [x] **Backups**: `db-backup` script + retention (7); automate schedule + offsite (V7 gap)
- [x] **Scanner**: Puppeteer + axe-core 4.8.4 + fallback strategies; puppeteer Chromium in image
- [x] **AI**: model routing + template fallback; cost audit events; confidence-gated auto-PR

## 2. Security
- [x] **Auth**: fail-closed OAuth state (V6), MFA, password reset w/ token, rate limits
- [x] **RBAC**: 14 permissions, guard chain, per-org scoping; query cache cleared on switch
- [x] **Headers**: X-Frame-Options/nosniff/Referrer-Policy/Permissions-Policy/HSTS (next.config)
- [x] **Secrets**: `.env` gitignored; CI uses test creds; secret scan in CI (V7/V8 plan)
- [x] **Audit**: `AuditLog` whitelist + admin UI; `remediation.ai_cost` events
- [x] **Input validation / SSRF guards** on scan URLs (`url-validation`)
- [ ] **TLS in prod** (termination at LB/Ingress — cert-manager or managed cert)
- [ ] **Dependency CVEs**: `npm audit` gates CI; container scan (Trivy) roadmap
- [ ] **Pen-test** (external) — post-GA optional

## 3. Reliability & observability
- [x] `/api/health` (DB connectivity) — extend to liveness/readiness
- [x] Sentry server/client/edge (DSN-gated)
- [ ] Uptime monitoring + status page
- [ ] Prometheus/Grafana SLO dashboards + alerting (V7 plan)
- [ ] Log aggregation (Loki/CloudWatch) — V7 plan
- [ ] Queue (BullMQ) health monitoring

## 4. Release & deployment
- [x] docker.yml → GHCR (`v*`, `latest`, `sha`); multi-arch
- [x] `docker-entrypoint` runs migrate on boot
- [x] Rolling deploy + rollback path (RB01)
- [ ] **Tag `v1.0.0`** + GH release (semantic release automation — V7 plan)
- [ ] **Pin `latest`** only after smoke pass

## 5. Product/legal/business
- [x] Pricing live in Stripe (4 tiers); coupons + invoices
- [x] TOS + privacy endpoints (`/api/legal/*`)
- [x] User/admin/dev guides + runbooks
- [ ]  Empirica-company registration/invoice details (ops)
- [x] Support email + SLA tiers defined
- [ ] PH launch asset pack (V10 PRODUCT_HUNT)

## 6. Launch-day run (final checklist)
1. `git tag v1.0.0 && git push origin v1.0.0` → docker.yml build+push
2. Deploy with RB01; run beta smoke (login → scan → report → PR).
3. Enable monitoring dashboard + status page.
4. Enable launch coupon; test checkout end-to-end (test card).
5. Watch Sentry + error rate for 1h; peer check queues.
6. Open GA (PH launch per V10).

## 7. Post-launch (48h)
- [ ] Verify no SEV-1/2; capture first 24h metrics (signups, activation, trial→paid).
- [ ] Ship 2–3 visible improvements as planned changelog.
- [ ] Publish postmortem/launch retrospective.