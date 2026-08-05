# Market Analysis — AccessGuard

> Status: Draft v1 (2026-08) · All market figures are directional estimates to validate — no paid syndicated data.

## 1. Market Definition

**Market:** Web accessibility compliance & remediation software (automated testing, monitoring, remediation, reporting) sold to organizations that operate public-facing websites and must comply with accessibility regulations.

## 2. Market Size (Directional)

| Segment | Size (2026 est.) | Growth (CAGR) | Notes |
|---|---|---|---|
| Web accessibility testing/monitoring tools | ~$0.7–1.0B | 16–20% | Axe, Siteimprove, Level Access, audioEye |
| Accessibility professional services (audits) | ~$1.5–2.0B | 8–10% | Partially replaced by automation |
| Overlay/instant-compliance | ~$0.3–0.5B | plateau/decline | Legal risk → shrinking trust |
| **Total TAM (all segments)** | **~$2.5–3.5B** | ~15% | See TAM_SAM_SOM.md |

## 3. Demand Drivers

1. **Litigation:** ~4,000+ ADA digital-accessibility lawsuits/year in US federal courts (2023–2026 trend: steady high volume). A single lawsuit can cost $10k–$300k+ in defense/settlement.
2. **Regulation:** EAA/EN 301 549 enforcement in EU (from 2025 for public sector, rolling out to more of the private sector); Section 508; AODA (Canada); state laws (CA, NY, TX).
3. **Procurement requirements:** enterprise RFPs increasingly require WCAG AA evidence and continuous monitoring.
4. **Dev shift-left:** engineering teams want accessibility checked in CI/CD, not audited quarterly.
5. **AI tailwind:** buyers expect AI to explain and fix violations, not just list them.

## 4. Target Segments & Priority

| Segment | Pain | Willingness to pay | Priority |
|---|---|---|---|
| **Software agencies** (client sites, white-label) | Audits eat margin; clients get sued | High (pass-through) | P0 |
| **Funded SMB SaaS** | ADA suit risk; few eng resources | Medium-High | P0 |
| **Enterprise engineering teams** | Procurement compliance, CI/CD | High (annual contracts) | P1 |
| **Government/education/healthcare** | Legal mandate, strict procurement | High but slow cycles | P2 |
| **E-commerce** | High traffic = high suit exposure | Medium | P2 |

## 5. Buying & GTM

- **Buyers:** CEO/Founder (SMB), Head of Engineering (mid-market), CTO/CISO + legal (enterprise).
- **Champion:** front-end dev or accessibility lead who gets executive cover.
- **Channels (initial):** product-led (free trial → growth), agencies as resellers/white-label (virality), content (lawsuit-data SEO), partnerships (web agencies, dev agencies).
- **Motion:** 14-day trial → weekly scan evidence → lawsuit/risk framing → annual contract.

## 6. Competitive Landscape Snapshot

| Player | Type | Weakness we exploit |
|---|---|---|
| accessiBe / UserWay | Overlay | Legally contested (NAD rulings), no real remediation, no dev workflow |
| audioEye | Overlay + services | Pricey, not engineer-friendly |
| Deque axe | SDK/testing | Dev tool, not a compliance product — no remediation loop, no reports for non-devs |
| Siteimprove / Level Access | Enterprise suite | Heavy, long sales cycles, $30k+ entry, slow setup |
| Lighthouse CI / pa11y (OSS) | Free tools | No managed monitoring, no reports, no support, no AI |

**Differentiators:** scan→fix loop (AI + GitHub auto-PR), defensible evidence trail, agency white-label, per-plan pricing that matches SMB budgets ($49–$399), developer-native but executive-reportable.

## 7. Risks / Watch Items

- Regulatory landscape shifts (EAA timing, overlay litigation outcomes) could change urgency.
- Open-source alternatives improving (axe-core + GH Actions) — keep price-per-value high.
- Compliance itself is table-stakes for enterprises; expansion revenue must come from remediation + white-label + CI integrations.
