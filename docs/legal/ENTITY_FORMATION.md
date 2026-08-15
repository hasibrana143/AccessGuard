# Entity Formation — AccessGuard Legal Foundation

> **Status:** Spec — to be executed before incorporation
> **Volume:** V13 — Global SaaS Hardening
> **Owner:** Founder / Legal counsel

## 1. Entity Structure

### Recommended: Delaware C-Corp
AccessGuard is a US-targeted SaaS with global ambition. Delaware C-Corp is the standard for:
- Venture-backed startups (preferred share class, convertible instruments)
- Clear IP assignment chain
- Predictable corporate law (Delaware Court of Chancery)
- Future fundraising (VCs require C-Corp, not LLC)

### Formation Checklist
| Step | Action | Owner | Timeline |
|------|--------|-------|----------|
| 1 | Register Delaware C-Corp (Certificate of Incorporation) | Legal | Week 1 |
| 2 | Obtain EIN from IRS (Form SS-4) | Founder | Week 1 |
| 3 | Foreign-qualify in operating state (e.g., CA, NY, TX) | Legal | Week 2 |
| 4 | Open business bank account (Mercury / SVB / Brex) | Founder | Week 2 |
| 5 | File IRS Form 2553 (S-Corp election) — **NOT recommended** for VC track | Founder | N/A |
| 6 | Register for state taxes (franchise, sales/use) | Accountant | Week 3 |
| 7 | File beneficial ownership report (FinCEN BOI) | Legal | Week 4 |

### Authorized Shares
```
Authorized: 10,000,000 shares of common stock
Authorized: 10,000,000 shares of preferred stock (blank check)
Par value: $0.00001
```

### Cap Table at Formation
| Holder | Shares | Type | Vesting | % (post) |
|--------|--------|------|---------|----------|
| Founder 1 | 8,000,000 | Common | 4yr/1yr cliff | 80% |
| Option pool | 2,000,000 | Common (reserved) | per-grant | 20% |

## 2. Founder Agreements

### IP Assignment Agreement (must sign before incorporation)
Every founder MUST sign a Present Assignment of Inventions:
- Assigns ALL prior IP related to AccessGuard to the corporation
- Includes a future-assignment clause (work done post-formation)
- Includes a moral rights waiver (visual/creative work)
- Includes a covenant to execute further documents

> **Critical:** Without this, investors will not fund the company. A company
> without clear IP ownership has no value.

### Founder Vesting
| Parameter | Value |
|-----------|-------|
| Vesting period | 4 years |
| Cliff | 1 year (no vesting before) |
| Schedule | Monthly after cliff |
| Acceleration | Single-trigger on acquisition (optional) |
| Good-leaver/bad-leaver | Yes (unvested shares clawback on bad-leaver) |

### 83(b) Election
Founders receiving restricted stock MUST file IRC §83(b) within **30 days** of grant:
- Filed with IRS (mail to Cincinnati service center)
- Form: Cover letter + election form + self-addressed stamped envelope
- Retain certified mail receipt
- **If missed:** catastrophic tax consequence (tax on each vesting tranche at FMV)

## 3. Corporate Governance Documents

| Document | Purpose | When |
|----------|---------|------|
| Certificate of Incorporation | Filed with Delaware | Formation |
| Bylaws | Internal governance rules | Formation |
| Stock Ledger | Record of all share transfers | Ongoing |
| Board Consent (initial) | Elect directors, officers, adopt stock plan | Formation |
| Stockholder Consent (initial) | Ratify board actions | Formation |
| Indemnification Agreement | Protect directors/officers | Week 2 |

## 4. Registered Agent & Address

- **Delaware registered agent:** Corporation Service Company / LegalZoom / Harvard Business Services
- **Physical address:** Founder home (for now) → registered office at incorporation
- **Registered office:** State where foreign-qualified

## 5. Tax Registrations

### Federal
- EIN (required for bank, payroll, tax filings)

### State (example: California)
| Tax | Threshold | Filing |
|------|-----------|--------|
| Franchise tax ($800 min) | Day 1 | Annual (Cdtfa.ca.gov) |
| Sales tax | Nexus in CA | Quarterly if selling to CA |
| Payroll tax | First employee | Quarterly (EDD) |

### International (defer until non-US customers)
- VAT registration (EU OSS when >€10k cross-border digital services)
- GST registration (Australia, India when threshold met)
- UK VAT registration (when selling to UK customers >£90k)

## 6. Insurance (post-formation)

| Policy | Purpose | Cost (est.) |
|--------|---------|-------------|
| D&O (Directors & Officers) | Protect board/exec from lawsuits | $3-10k/yr |
| E&O (Errors & Omissions) | Professional liability | $2-5k/yr |
| Cyber Liability | Data breach, security incidents | $2-8k/yr |
| General Liability | Physical/slip-fall | $500-1k/yr |

## 7. Banking & Finance Setup

- **Primary:** Mercury (startup-friendly, no minimums, ACH/wire free)
- **Alt:** SVB (if fundraising track), Brex (corp card + cash mgmt)
- ** Requirements:** EIN, Certificate of Incorporation, bylaws, ID

## 8. Audit & Compliance Cadence

| Cadence | Action |
|---------|--------|
| Annual | Delaware franchise tax (by Mar 1), board/shareholder consents |
| Quarterly | Sales tax filing (if nexus), payroll tax |
| Monthly | Bookkeeping close, bank reconciliation (Xero/QuickBooks) |

## Definition of Done
- [ ] Delaware C-Corp filed
- [ ] EIN obtained
- [ ] IP assignment agreements signed by all founders
- [ ] 83(b) elections filed (if restricted stock issued)
- [ ] Business bank account opened
- [ ] Founder vesting schedules adopted via board consent
- [ ] Stock ledger maintained
