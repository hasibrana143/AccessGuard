# Pricing Strategy — AccessGuard

> Status: Live (matches `src/lib/stripe.ts` `PRICING_PLANS`). This file is the strategy behind the shipped numbers.

## 1. Objectives

1. **Self-serve conversion:** a trial user must hit a clear, niche "compliance risk" moment and convert to $49 easily.
2. **Agency motion:** make white-label/Agency tier the high-profit expansion path.
3. **Enterprise escalation:** keep an obvious "contact sales" escape hatch for $10k+ deals.
4. **Defensible limits:** enforce pages/month & websites server-side so pricing scales with cost (CPU/browser scans) — prevents abuse ACCT.

## 2. The 4-Tier Structure (as shipped)

| Tier | Price/mo | Anchor role | Load-bearing limits |
|---|---|---|---|
| **Starter** $49 | Single-site, 500 pgs/mo, weekly — "individual site owner" | Website: 1 · Pages: 500 |
| **Growth** $149 ⭐ | The main self-serve SKU: 5 sites, 5k pgs, daily scans, AI remediation, GitHub auto-PR | Websites: 5 · Pages: 5,000 |
| **Agency** $399 | White-label reports + team seats — targets agencies managing many client sites | Websites: 15 · Pages: 25,000 |
| **Enterprise** Custom | Unlimited + SSO/SAML + CSM + SLA via Contact Sales | Websites: -1 · Pages: -1 (custom) |

**Strategy:** $49 is cheap (impulse for a single sued site). $149 captures the funded-SaaS + multi-site default. $399 captures the agency pass-through economics. Enterprise line acts as the price discovery anchor that makes $399 feel reasonable.

## 3. Pricing Decisions & Rationale

| Decision | Why |
|---|---|
| No free tier (14-day trial instead) | Scans cost CPU + the funnel is trial→(weekly evidence)→paid, not "free forever" |
| `popular` flag on Growth | Directs defaults; most buyers self-select mid-tier on compliance tools |
| Usage caps at plan level, enforced in API | Prevents someone crawling 500k pages on $49; aligns cost & revenue |
| Blacked-in "custom" for Enterprise | Keeps enterprise pricing uncertainty off the public page |
| Annual discount | Standard SaaS churn lever (not yet UI-wired — see open items) |

## 5. Usage & Expansion

- Pages/month is the **cost engine** (CPU/browser) → caps protect margin.
- Overage/credit packs are the natural expansion lever.
- API key exists in-product but is not paywalled — plan to gate by tier (Growth API access, Agency higher quota).

## 6. Competitor Pricing (reference)

Per COMPETITIVE_ANALYSIS: overlay players ~$30–100/mo (audit: legal risk); enterprise suites $30k+/yr; free OSS (axe/pa11y/Lighthouse) = $0. We sit between: dev-native tool + compliance product at SMB price.

## 7. Open Items (code-grounded)

- [ ] Annual/monthly toggle UI + Stripe recurring annual.
- [ ] Trial countdown UX + email nudge after 14 days.
- [ ] Overage/credit-pack SKU.
- [ ] Price psychology tests (page A/B: $499 agency?).