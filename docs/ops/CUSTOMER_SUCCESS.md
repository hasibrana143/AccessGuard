# Customer Success & Churn Prevention — AccessGuard

> **Status:** Spec — retention motion for post-beta SaaS growth
> **Volume:** V13 — Global SaaS Hardening
> **Owner:** Founder / CSM / Support
> **Existing:** docs/ops/SUPPORT_MAIN.md (ticketing) · docs/business/SALES.md (pipeline)

## 1. Why Customer Success Matters

| Metric | Impact |
|--------|--------|
| Churn ↓ 5% | LTV +30-40% (compounding) |
| NPS ↑ 10 | Revenue growth +1-2x |
| Onboarding time ↓ | Activation rate ↑ 3-5x |
| Time-to-first-scan | #1 predictor of 90-day retention |

**AccessGuard churn levers:**
1. First scan success (technical friction)
2. Value shown in first week (report + remediation wins)
3. Billing friction (dunning, failed payments)
4. Feature gaps (enterprise needs)
5. Support response time (docs/ops/SUPPORT_MAIN.md)

## 2. Success Funnels

### Activation Funnel
| Step | Metric | Target |
|------|--------|--------|
| Signup | Visitors → trials | 25%+ |
| Project created | Trials → projects | 80%+ |
| First scan run | Projects → scans | 90%+ |
| Scan completed | Scans → success | 95%+ |
| Report viewed | Success → report | 80%+ |
| Remediation started | Report → fix PR | 40%+ |
| **Activated** | Any 2 of: scan+report+remediation | **40% of trials** |

### Retention Funnel
| Stage | Metric | Target |
|-------|--------|--------|
| Trial → paid | Conversion | 20-30% |
| Paid → 30d | Month-1 churn | <10% |
| Paid → 90d | Quarter retention | >90% |
| Annual renewal | Renewal rate | >85% |

## 3. Success Plays (by lifecycle)

### Onboarding (Day 0-7)
| Play | Channel | Trigger |
|------|---------|---------|
| Welcome email (account creds, docs links) | Email | Signup |
| First-scan helper (guided project setup) | In-app checklist | Post-signup |
| Sample project import (1-click demo) | In-app | No project in 24h |
| Success email (report link + first insights) | Email | First scan done |
| Invite teammate (show collaboration) | In-app + email | 2+ projects |
| Upgrade nudge (plan limits vs usage) | In-app banner | Usage > 60% of plan |

### Growth (Day 8-90)
| Play | Channel | Trigger |
|------|---------|---------|
| Monthly report digest (violations fixed, trends) | Email | Monthly |
| New feature announcement | Email + in-app | Feature launch |
| Webinar / office hours | Email | Quarterly |
| Case study request | Email | 3+ months, high usage |

### Risk & Win-Back
| Play | Channel | Trigger |
|------|---------|---------|
| Failed payment (dunning) | Email day 3, 7, 14 | Stripe `invoice.payment_failed` |
| Usage drop (0 scans 30d) | Email | No activity |
| Plan downgrade intent | Call/email | Downgrade request |
| Win-back offer (30% off) | Email | Churn confirmation |

## 4. Signals & Alerts (implement in code)

### Leading Churn Indicators (SCORE: track in DB)
| Signal | Weight | Source |
|--------|--------|--------|
| 0 scans in 30d | 3 | Project model |
| 0 logins in 30d | 2 | Session log |
| Failed payment 2+ times | 4 | Stripe webhook |
| Support ticket with negative tone | 2 | Ticket text |
| Plan usage at 95%+ | 1 | Usage counter |
| Invited 0 teammates in 60d | 1 | Team model |

Score ≥ 5 → send win-back email; ≥ 8 → manual outreach

### Implementation
- Cron (existing scheduler in instrumentation.ts): weekly score calc per org
- Store: `Organization.churnScore` (int) + `Organization.lastChurnCalcAt`
- Emails via Resend (transactional template)
- Admin dashboard widget: "At-risk orgs" (churnScore ≥ 5)

## 5. KPIs Dashboard (Weekly Review)

| KPI | Definition | Target | Source |
|-----|------------|--------|--------|
| MRR | Monthly recurring revenue | +10% MoM | Stripe |
| ARPU | MRR / paying orgs | $80+ | Stripe |
| CAC | Sales+marketing / new orgs | < 3mo payback | Finance |
| Churn (gross) | (orgs lost) / orgs start | < 5%/mo | Stripe |
| NRR | Revenue after churn+expansion | > 105% | Stripe |
| NPS | Survey (email quarterly) | > 40 | Survey tool |
| Activation | Trials → activated | > 40% | App events |
| Time-to-first-scan | Median | < 5 min | App events |
| Support CSAT | Ticket rating | > 90% | Support |

## 6. Customer Success Tooling

| Stage | Tool | Cost |
|-------|------|------|
| NPS surveys | Typeform / Tally / in-app | $0-30/mo |
| Email automation | Resend (already) + custom flows | ~$20/mo |
| Help center | Mintlify / docs site | $0 (docs/ in repo) |
| Health scoring | Custom (code, per signals above) | $0 |
| CRM (post-Series A) | HubSpot Free → Paid | $0-90/mo |

## 7. Escalation Paths

| Issue | Time | Owner |
|-------|------|-------|
| P1 outage (all customers) | 15 min | On-call engineer |
| P2 degradation | 2h | Engineering |
| Billing issue | 24h | Founder (Stripe) |
| Feature request | Triage weekly | Product |
| Security concern | 24h | CTO |

## Definition of Done
- [ ] Activation funnel implemented: welcome email, guided setup, first-scan helper
- [ ] Churn signals cron: weekly churnScore per org + admin widget
- [ ] Dunning email sequence (Stripe webhook → Resend)
- [ ] Monthly report digest email
- [ ] NPS survey quarterly
- [ ] Win-back email flow on churn
- [ ] KPI dashboard (Stripe + custom events) reviewed weekly
