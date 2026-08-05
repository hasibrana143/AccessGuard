# Business Model — AccessGuard

> Status: Draft v1 (2026-08) · Core model: multi-tier SaaS subscription with usage-based page caps, agency white-label, and enterprise expansion.

## 1. Revenue Streams

| Stream | Model | Today | Year-2+ |
|---|---|---|---|
| **Self-serve SaaS** | Monthly/annual subscriptions (Starter, Growth, Agency) | ✅ Live (Stripe) | Core |
| **Enterprise** | Annual contract, custom limits, SSO/SAML, SLA | ⚠️ Landing + contact | Core |
| **Agency white-label** | Paid add-on / Agency tier seats + logo-branded reports | ✅ Agency tier | Expansion |
| **Usage overage / page packs** | Pay-as-you-go pages beyond plan caps | Planned | Expansion |
| **API / CI pipeline access** | Developer-tier API key plan | ✅ API exists (key mgmt), unmonetized | Expansion |
| **Professional services** | Onboarding audits, custom integrations | Not offered | Opportunistic |

**Today:** 100% subscription MRR from Stripe (starter/growth/agency tiers; enterprise = contact).

## 2. Pricing Funnel (as built)

| Tier | Price | Websites | Pages/mo | Scans | Key unlocks |
|---|---|---|---|---|---|
| Starter | $49/mo | 1 | 500 | Weekly | Email reports |
| Growth | $149/mo (popular) | 5 | 5,000 | Daily | AI remediation, GitHub auto-PR, priority support |
| Agency | $399/mo | 15 | 25,000 | Daily+ | White-label reports, team seats |
| Enterprise | Custom | Unlimited | Custom | — | SSO/SAML, CSM, SLA, custom integrations |

Plan limits are **enforced in code** (`plan-limits.ts`): websites count, monthly pages scanned; overrides may only restrict, never raise (downgrade safety).

## 3. Unit Economics (targets)

| Metric | Target | Notes |
|---|---|---|
| CAC (self-serve) | $60–120 | Product-led: content + trial; nearly zero paid acquisition at start |
| CAC (agency/enterprise) | $800–1,500 | Sales-assisted |
| Blended gross margin | 85%+ | Cloud infra + scanner is marginal; no heavy S&M |
| Logo retention | 90%+ annually | Compliance contracts stick (audit trail dependency) |
| Payback period | < 8 months | Self-serve |
| LTV:CAC | 5:1+ (self-serve), 3:1 (enterprise) | |

## 4. Cost Structure

- **Fixed:** infra (Next.js/Postgres/Redis/queue/worker + scanner fleet), ~$150–600/mo at early scale.
- **Variable per scan:** Chromium CPU + crawl volume — keeps CAC flat.
- **Team (assumed):** 2–3 engineers + 0.5 product until Y2; no sales reps until enterprise motion starts.

## 5. Funnel & Growth Loops

1. **Trial → first scan < 5 min** → weekly scan evidence → risk framing.
2. **Agency loop:** agencies embed white-label reports → their clients pay indirectly → expansion to Agency tier.
3. **GitHub loop:** auto-PR surfaces the product in dev orgs (viral channel).
4. **Content loop:** lawsuit/regulation data SEO → inbound trials.

## 6. Expansion Revenue Levers (in order)

1. Growth → Agency upsell (team seats, white-label).
2. Overage page packs for scan-heavy users.
3. Enterprise annual contracts (SSO/SAML + SLA).
4. API/CI monetization.
