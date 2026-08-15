# FinOps — Revenue Recognition, Fraud, Burn Tracking

> **Status:** Spec — financial operations baseline
> **Volume:** V13 — Global SaaS Hardening
> **Owner:** Founder / CFO / Accountant

## 1. Revenue Recognition (ASC 606)

### Why It Matters
- Public investors require it
- Audit firms (Big 4) will not sign off without compliance
- Stripe Revenue Recognition handles most cases (enable in Stripe dashboard)
- Manual recognition required for: custom contracts, multi-element deals

### ASC 606 5-Step Model Applied to AccessGuard

| Step | AccessGuard Application |
|------|-------------------------|
| 1. Identify contract | Stripe checkout / signed MSA |
| 2. Identify performance obligations | SaaS subscription per tier (one PO); onboarding (one PO) |
| 3. Determine transaction price | Plan price × 12 (annual) or monthly recurring |
| 4. Allocate price to obligations | All allocated to subscription (mostly one PO) |
| 5. Recognize when AS satisfies | Ratably over period (month/annual) |

### Stripe Revenue Recognition (default mode)
- Enable in Stripe Dashboard → Settings → Revenue Recognition
- Choose: **Automated** (Stripe handles PO satisfaction + journal entries)
- Sync to: QuickBooks / Xero (Stripe integration)
- Output: monthly deferred revenue schedule + revenue recognition report

### Manual Cases
| Scenario | Treatment |
|----------|-----------|
| Annual prepay | Debit AR, credit deferred revenue; recognize 1/12 monthly |
| Refund mid-term | Reverse deferred revenue + revenue recognized to date |
| Upgrade mid-month | Prorate + new monthly rate starts next billing cycle |
| Coupon | Treat as discount (reduce transaction price per step 3) |
| Custom implementation fee | Recognize over implementation period (could be point-of-delivery) |

### Deferred Revenue Tracking (Stripe automated)
```
Customer prepays $1,800 annual plan
Month 1: recognize $150 revenue; deferred = $1,650
Month 2: recognize $150; deferred = $1,500
...
Month 12: recognize $150; deferred = $0
```

### Journal Entries (for accounting system)
| Event | Debit | Credit |
|-------|-------|--------|
| Annual prepay | Cash $1,800 | Deferred Rev $1,800 |
| Monthly recognition | Deferred Rev $150 | Subscription Revenue $150 |
| Upgrade (annual diff) | Cash $300 | Deferred Rev $300 |
| Refund | Deferred Rev $900 | Cash $900, Revenue -$X (reverse) |

## 2. Fraud Management

### Types of Fraud to Prevent

| Type | Risk | Detection | Mitigation |
|------|------|-----------|-----------|
| Stolen credit card | High | Stripe Radar (built-in) | Enable Stripe Radar (Premium $0.05/txn) |
| Card testing (rate) | Med | Velocity: many small txn from same IP | Velocity limit, IP-geolocation |
| Free trial abuse | High | Same email domain, many free trials | 1 trial per email + cc hash + IP |
| Chargeback fraud ("friendly") | Med | Track chargeback rate | Dispute via Stripe (win rate ~30%) |
| Promo/coupon abuse | Med | Multiple coupons per org | Limit 1 coupon per org per 90d |
| Refund policy abuse | Low | High refund rate per customer | 30-day refund honored once per customer |

### Stripe Radar Setup
| Setting | Recommendation | Cost |
|---------|----------------|------|
| Radar for Fraud Protection | Standard | Free (Stripe built-in) |
| Radar Premium | Enable when >$10k/mo | $0.05/txn (worth it) |
| 3D Secure (SCA for EU) | Required for EU | Free (mandatory under PSD2) |
| Block if risk_score > 75 | Enable in dashboard | Reduces chargeback rate |

### Velocity Checks (Custom Implementation)
```typescript
// Per-IP velocity: max 10 signup attempts / hour
// Per-credit-card bin hash: max 3 accounts (no card-sharing)
// Same email domain (free email providers): max 5 trials/week
```

Add to `/api/auth/register` and `/api/stripe/checkout`:
- IP count via Redis (setex, KEYS auth-attempt:ip:<ip>:<ts>)
- Card hash (first 6 + last 4 + expiry HMAC'd with secret)

### Chargeback Management Procedure
1. **Detection:** Stripe webhook `charge.dispute.created`
2. **Timeline:** 7 days to submit evidence
3. **Evidence:** Payment receipt, IP, user agent, TOS accept date, login logs
4. **Auto-collect:** Automate evidence gathering (template + log lookup)
5. **Outcome:** ~30% win-rate (industry avg for SaaS); accept losses on rest

## 3. Burn Rate & Runway Tracking

### Definitions
- **Gross burn:** Total monthly expense (including one-time items)
- **Net burn:** Gross burn - monthly recurring revenue (MRR)
- **Runway:** Cash / net burn → months until out of cash
- **Cash:** Total liquid (checking + savings + treasury bills)

### Burn Calculation (Monthly Close)
| Line Item | Source | Notes |
|-----------|--------|-------|
| Payroll | Gustav/Deel + Stripe Payroll | All employees + contractors |
| Cloud (AWS/Vercel/Cloudflare) | Per provider billing | + marginal extra |
| SaaS tools | Credit card stmt | (look at categorization) |
| Marketing | Credit card stmt | (meta, LinkedIn, Google Ads) |
| Legal/professional | Bank statement | (engaged law firms) |
| Other | Bank statement | (travel, equipment) |
| **Gross Burn** | Sum | |
| MRR | Stripe + manual (annual/12) | |
| **Net Burn** | Gross - MRR | Negative = profitable ✓ |
| **Runway** | Cash / Net Burn | Months |

### Cadence
| Report | Frequency | Audience |
|--------|-----------|---------|
| Burn snapshot | Monthly | Founders + investors (after Series A) |
| Cash forecast | Weekly | Founders + CFO |
| 13-week cash flow | Monthly | Founders + board |
| Annual P&L + balance sheet | Annual | Tax / audit |
| MRR + cohort report | Monthly | Founders + revenue ops |

### Tools
| Tool | Purpose | Cost |
|------|---------|------|
| QuickBooks / Xero | Bookkeeping | $30/mo (basic) |
| Stripe + QBO sync | Auto-import transactions | $0 (Stripe) |
| Pry / Runway / Mosaic | Burn dashboard, modeling | $100-500/mo |
| Excel / Google Sheets | Founder tracking | $0 (start here) |

### Founder Dashboard (Google Sheet template)
| Metric | Formula | Source |
|--------|---------|--------|
| Cash今日 | =SUM(...) | Bank balance API |
| Monthly run rate | AVERAGE last 3 months gross burn | QuickBooks |
| Net burn | Run rate - MRR | QuickBooks + Stripe |
| Runway (months) | Cash / Net burn | Sheet calc |
| MRR today | Stripe /api + manual | Stripe daily |
| New customers (this month) | Stripe | Stripe dashboard |
| Churned customers | Stripe | Stripe dashboard |
| CAC | Marketing spend / new customers | Credit card |
| LTV | Avg ACV × gross margin / churn | Derive |

### Healthy Runway Targets
| Stage | Min Runway | Healthy |
|-------|------------|--------|
| Pre-seed (post-funding) | 6 months | 12-18 months |
| Seed (post-funding) | 12 months | 18-24 months |
| Series A | 18 months | 24-36 months |

## Definition of Done
- [ ] Stripe Revenue Recognition enabled (automated mode → QBO sync)
- [ ] Deferred revenue schedule validated monthly
- [ ] Stripe Radar (standard or premium) enabled
- [ ] Velocity check code deployed at /auth/register + /stripe/checkout
- [ ] Chargeback evidence template ready
- [ ] Burn rate dashboard (Sheets or Mosaic/Pry)
- [ ] 13-week cash flow forecast updated monthly
- [ ] Runway tracked at every board meeting
- [ ] Monthly close process documented
