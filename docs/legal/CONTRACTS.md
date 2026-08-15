# Contracts & Legal Agreements — AccessGuard

> **Status:** Spec — required before commercial launch
> **Volume:** V13 — Global SaaS Hardening
> **Owner:** Founder / Legal counsel

## 1. Contract Inventory

| Contract | Counterparty | When | Source |
|----------|-------------|------|--------|
| Master Services Agreement (MSA) | Customer | On signup (clickwrap) | docs/legal/templates/MSA.md |
| Terms of Service (ToS) | End user | On signup (clickwrap) | `/legal/tos` |
| Privacy Policy | End user | On signup (clickwrap) | `/legal/privacy` |
| Data Processing Agreement (DPA) | Customer (EU/GDPR) | On request / contract | docs/legal/templates/DPA.md |
| Acceptable Use Policy (AUP) | End user | On signup | docs/legal/templates/AUP.md |
| Sub-processor list | Public | Disclosure | docs legal |
| NDA | Employees, contractors, vendors | On start | Template |
| PIIA | Employees, contractors | On start | Template |
| Vendor Agreement | Vendors (Stripe, SendGrid, etc.) | Their terms | Per vendor |

## 2. Clickwrap vs Signed Contracts

### Self-serve (PLG) flow — Clickwrap
At signup (verified email required), user must:
1. Check "I agree to the Terms of Service"
2. Check "I agree to the Privacy Policy"
3. (If EU/UK) Check "I consent to data processing per GDPR"
4. (If paid) Click-through MSA on Stripe checkout
- **Storage:** `User.tosAcceptedAt`, `User.privacyAcceptedAt` in DB (add fields if missing)
- **BaaS:** Use Termly or iubenda if you don't want to manage versions

### Enterprise flow — Signed contract
- Sales-driven workflow (DocuSign / PandaDoc)
- Custom MSA redlines (engineering hours, pricing modules)
- Required documents: MSA, Order Form, DPA, SOW

## 3. Terms of Service — AccessGuard-Specific Provisions

### Required Clauses
| Clause | Why |
|--------|-----|
| Service description | AccessGuard is a11y compliance scanning SaaS |
| Acceptable use | No scanning sites you don't own/permission |
| User responsibilities | Own their site; we scan on their behalf |
| Payment terms | Net 30 (or pre-pay); billing explained |
| Refund policy | 30-day money back (consumer protection) |
| Term & termination | Either party 30 days notice (annual prepaids honored) |
| IP ownership | Customer owns their data; AccessGuard owns platform |
| Warranty disclaimer | "As-is" service; no warranties except uptime SLA tier-gated |
| Liability cap | Fees paid in prior 12 months (or $10k floor) |
| Arbitration clause | JAMS, California (or mutual state) — for US users |
| Class action waiver | For US (debate; some states protect consumer right) |
| GDPR/CCPA terms | DPA referenced; rights honored |
| API usage terms | Rate limits, no reverse engineering |
| Open source disclosure | List components used (SBOM ref) |
| Sub-processors list | Updated list at /legal/sub-processors |
| AI tools | Disclosure that AI is used for remediation; no content rights assigned to generated suggestions |

### AccessGuard-Specific Warranties
| Warranted | Not Warranted |
|-----------|--------------|
| Service uptime per SLA tier | Compliance with specific a11y laws |
| Security per SOC 2 (when achieved) | Legal advice on a11y obligations |
| Audit log integrity | Specific WCAG violations found |
| Data encryption at rest + in transit | Customer's site a11y compliance status |

> **Caveat:** AccessGuard scans for violations; we do NOT provide legal advice on
> ADA / Section 508 / EN 301 549. Disclaim that explicitly in ToS.

## 4. Privacy Policy — GDPR/CCPA Compliance

### Required Sections
1. What data we collect (PII categories)
2. Why we collect it (lawful bases under GDPR)
3. Where it's stored (region — US, EU, etc.)
4. Who has access (employees, sub-processors)
5. How long we retain (per category)
6. International transfers (SCCs sub-processor-level)
7. User rights (access, deletion, portability, etc.)
8. Children's data (COPPA: under 16 in GDPR / 13 COPPA US — disallow under 16)
9. Cookies / tracking (cookie consent with separate widgets)
10. Contact for DPO / privacy team

### AccessGuard Data Categories
| Category | Example | Retention | Basis |
|----------|---------|-----------|-------|
| Account | Email, name, org | Account life + 90d | Contract |
| Billing | Stripe customer ID, invoices | 7yr (tax) | Legitimate interest |
| Audit logs | Org activity | 1yr | Legitimate interest |
| Scans/results | Per-project a11y findings | Project life + 30d | Contract |
| GH integration | OAuth token (encrypted) | User-controlled | Contract |
| Web traffic | Cookie analytics | 30d | Consent (consent banner) |

## 5. Data Processing Agreement (DPA) — GDPR

### Required Clauses (per Art. 28 GDPR)
1. Subject matter, duration, nature, purpose of processing
2. Type of personal data + categories of data subjects
3. Processing only on documented instructions from controller (customer)
4. Confidentiality obligations on AccessGuard staff
5. Security measures (Art. 32 — encryption, access controls)
6. Sub-processors — list, notification of changes (30d), right to object
7. Assist controller with DSAR, breach notification, DPIA
8. Deletion or return of data at end of service
9. Audit rights for controller (limited frequency, scope)
10. SCC (Standard Contractual Clauses) for international transfers (Schrems II)

### Schrems II Requirements
- SCCs (2021 Module 2) signed with each sub-processor
- Transfer Impact Assessment (TIA) for each non-adequate country (US sub-processors)
- Supplementary measures (encryption at rest, EU data residency if offered)
- Public commitment to challenge government surveillance requests

## 6. SLA Tiers (Contract Tier-Gated)

| Tier | Uptime | Response | Remedies |
|------|--------|----------|----------|
| Free | Best effort | Community | None |
| Pro | 99.5% | Email (24h) | Service credit 10% of monthly |
| Enterprise | 99.9% | Email + phone (4h) | 25% monthly fee, SLA breach remedies |

## Definition of Done
- [ ] ToS live at `/legal/tos` with version number + last-updated date
- [ ] Privacy Policy at `/legal/privacy` (GDPR + CCPA compliant)
- [ ] DPA template ready (downloadable + on DocuSign)
- [ ] AUP live
- [ ] Sub-processor list published at `/legal/sub-processors`
- [ ] Clickwrap acceptance saved (DB fields `tosAcceptedAt`, `privacyAcceptedAt`)
- [ ] Contract versioning scheme documented
- [ ] NDA + PIIA templates ready for hiring
