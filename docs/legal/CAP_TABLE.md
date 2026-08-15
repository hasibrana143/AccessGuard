# Cap Table Management — AccessGuard

> **Status:** Spec — governance baseline
> **Volume:** V13 — Global SaaS Hardening
> **Owner:** Founder / CFO / Legal

## 1. Cap Table Platform

### Recommended: Carta (preferred) or AngelList
- **Carta:** Industry standard; investor-grade cap table, 409A valuations, stakeholder portal
- **Pricing:** Free until first priced round (~$2k/yr after Series A)
- **Alternative:** Pulley (cheaper), Capbase (all-in-one)

## 2. Initial Cap Table (Formation)

| Holder | Type | Shares | Price | % (post) | Vesting |
|--------|------|--------|-------|----------|---------|
| Founder(s) | Common | 8,000,000 | $0.00001 | 80% | 4yr/1yr cliff |
| Option pool | Reserved common | 2,000,000 | — | 20% | per grant |
| **Total** | — | **10,000,000** | — | **100%** | — |

> Authorized: 10M common, 10M preferred (blank check preferred — gives
> flexibility to negotiate terms with future investors).

## 3. Option Pool & Stock Plans

### 2026 Equity Incentive Plan
| Parameter | Value |
|-----------|-------|
| Plan name | "2026 Equity Incentive Plan" |
| Shares reserved | 2,000,000 (20% post) |
| Plan term | 10 years |
| Administrator | Board of Directors |
| Types supported | NSO, ISO, RSU, stock appreciation rights |

### 409A Valuation
- Required for any stock option grant to US employees
- **Cadence:** Annually, or upon material event (financing, M&A)
- **Cost:** $3,000–$10,000 (Carta's 409A service is ~$3k standalone, free with equity mgmt)
- **Process:** Engage third-party (Carta/Pulley/PricewaterhouseCoopers); they assess
  fair market value of common at grant date

### Standard Option Grant Terms
| Parameter | New hires (L1-L3) | Senior (L4-L5) | Founders |
|-----------|------------------|-----------------|-----------|
| Vesting | 4yr / 1yr cliff | 4yr / 1yr cliff | 4yr / 1yr cliff |
| Exercise window (post-term) | 90 days | 90 days | 10 years (founder stock) |
| Strike price | Last 409A FMV | Last 409A FMV | Par value |
| Refresh grants | After 2-3yr (re-vest) | After 2-3yr | N/A |

## 4. Dilution Modeling

### Pre-Seed SAFE ($500k @ $5M post)
- Instrument: YC SAFE, post-money, cap $5M, no discount
- Pre-money: $4.5M
- Post-money: $5M
- SAFE converts to: 10% ownership at next equity round
- Effective dilution to existing holders: 10% across the board

### Seed Round (forecast: $2M @ $10M pre)
| Series | Raise | Pre | Post | Dilution |
|--------|-------|-----|------|----------|
| Founders + pool | — | — | $10M | — |
| Seed equity (priced) | $2M | $10M | $12M | 16.7% to new investor |
| Option pool top-up (prefinancing) | $1.5M (reserved) | $9M | $12M | 12.5% reserved |

### Series A (forecast: $8M @ $40M pre)
| Series | Raise | Pre | Post | Dilution |
|--------|-------|-----|------|----------|
| Seed cap | $8M | $40M | $48M | 16.7% to Series A |
| Option pool top-up | $2M (reserved) | $38M | $48M | 4.2% reserved |

## 5. Convertible Instruments Tracking

### SAFE / Convertible Note Register
| Issuance | Investor | Amount | Cap | Discount | Triggers to next pric.round |
|----------|----------|--------|-----|----------|------------------------------|
| SAFE #1 (if issued) | Investor A | $250k | $5M post | 0% | Priced equity round ≥$1M |
| SAFE #2 (if issued) | Investor B | $250k | $5M post | 20% | Priced equity round ≥$1M |

> **Discipline:** Track SAFEs in Carta. A SAFE that's not in Captable is invisible at
> dilution time — fatal surprise at the next round.

## 6. Investor Pipeline ↔ Cap Table Reconciliation

| Stage | Action | Frequency |
|-------|--------|-----------|
| Pre-fundraise | Confirm all converts are recorded | Quarter |
| Term sheet | Model dilution in Carta scenario tool | Per round |
| Closing | Issue preferred shares, file 8-K (if any) | Per round |
| Ongoing | Board consents for any grants >1% | Per grant |

## 7. Employee Stock Option Plan (ESOP) Communication

### Onboarding (per new hire with grant)
- Explain: shares, strike price, vesting, exercise window
- Show: ownership %, potential value at exit (waterfall tool)
- 83(b) — only for restricted stock, not options; mention tax basics (AMT, NSO vs ISO)
- GLAMtiger / carta.stakeholder.com / Equity Explorer URL

### Departure Checklist
- [ ] Vested options: notify of 90-day exercise window (NSO) or 90 ISO/3yr NSO disability
- [ ] Unvested: clawback per PIIA/Plan terms
- [ ] Tax docs: 1099-B (NSO with spread), 3921 (ISO)
- [ ] Update Carta / cap table

## 8. Cap Table Governance Documents

| Document | Maintained By |
|----------|---------------|
| Stock Ledger (Form SS-4) | Corporation |
| Board consent (per grant) | Legal |
| Stockholder consent (per major issuance) | Legal |
| Plan document (Equity Incentive Plan) | Legal |
| Sub-plan docs (international employees) | Local counsel |
| 409A reports | Valuation firm |
| 83(b) election filings (employees) | Payroll / Legal |

## Definition of Done
- [ ] Carta (or equivalent) account established
- [ ] Formation cap table recorded (founders + pool)
- [ ] 2026 Equity Incentive Plan adopted by board consent
- [ ] All existing option grants entered into Carta
- [ ] 409A valuation engaged (or deferred until first hire grant)
- [ ] SAFE/note register up-to-date
- [ ] Stock ledger reconciled monthly
