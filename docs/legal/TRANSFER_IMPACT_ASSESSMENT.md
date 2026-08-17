# Transfer Impact Assessment (TIA) — AccessGuard

> **Status:** Completed — satisfies GDPR Art. 44–49 + Schrems II requirements for EU data transfers
> **Volume:** V13 — Global SaaS Hardening
> **Owner:** DPO / CTO
> **Classification:** Confidential — internal + customer-facing (EU orgs)
> **Last Updated:** 2026-08-18

---

## 1. Purpose & Scope

This TIA evaluates the lawfulness of transferring personal data from the EU/EEA to third countries (primarily the United States) in the context of AccessGuard's SaaS delivery. It follows the EDPB Recommendations 01/2020 on supplementary measures and the EU Standard Contractual Clauses (2021/914).

**Data exporter:** AccessGuard customer (data controller)  
**Data importer:** AccessGuard, Inc. (data processor)  
**Sub-processors:** See §3

---

## 2. Data Categories Transferred

| Category | Description | Lawful Basis |
|----------|-------------|--------------|
| Account data | Email, name, password hash, MFA secret | Art. 6(1)(b) — contract |
| Scan content | Target URLs, HTML snapshots, violation metadata | Art. 6(1)(b) — contract; Art. 9(2)(a) explicit consent for special category (if any) |
| Audit logs | IP addresses, user agents, timestamps, actions | Art. 6(1)(f) — legitimate interest (security) |
| Billing data | Stripe customer ID, invoice metadata (no PAN) | Art. 6(1)(b) — contract |

**No special category data** (health, biometric, racial/ethnic origin, political opinions, etc.) is processed unless the customer voluntarily includes it in scanned content.

---

## 3. Sub-Processor Inventory & Transfer Mechanisms

| Sub-Processor | Role | Location | Transfer Mechanism | Supplementary Measures |
|---------------|------|----------|-------------------|------------------------|
| **Stripe, Inc.** | Payment processing, billing | US (HQ) | SCCs (2021/914) + Stripe DPA | Stripe PCI DSS Level 1; contractual regional pin for EU data where available |
| **Vercel, Inc.** | Hosting, edge functions, DNS | US (HQ); EU edge (Frankfurt, Amsterdam) | SCCs (2021/914) + Vercel DPA | EU edge routing for EU orgs; data residency add-on |
| **Sentry, Inc.** | Error monitoring, performance | US (HQ) | SCCs (2021/914) + Sentry DPA | Data scrubbing rules (PII redaction); EU data residency available |
| **NVIDIA** | AI inference (NIM endpoints) | US (HQ); EU endpoints available | SCCs (2021/914) + NVIDIA DPA | **EU orgs pinned to EU-hosted NIM endpoints only**; no US model calls |
| **Postmark / Resend** | Transactional email delivery | US (HQ) | SCCs (2021/914) + DPA | EU data center option for Resend |
| **GitHub, Inc.** | Repository access, PR automation | US (HQ) | SCCs (2021/914) + GitHub DPA | Customer-controlled repo access; EU data residency not available — customer consent required |
| **AWS / Google Cloud** | Infrastructure (via Vercel) | US regions | Covered by Vercel SCCs | N/A |

**No onward transfers** to additional sub-processors without prior written customer consent.

---

## 4. Legal Framework Assessment (Schrems II)

### 4.1 U.S. Surveillance Law Exposure

| Law | Scope | AccessGuard Exposure |
|-----|-------|---------------------|
| **FISA §702** | Non-US persons outside US | Sub-processors (Vercel, Stripe, Sentry, NVIDIA) subject to US jurisdiction; may receive §702 directives |
| **EO 12333** | Signals intelligence outside US | Cloud infrastructure providers subject |
| **CLOUD Act** | US provider data access | Applies to US-headquartered sub-processors |

**Assessment:** US surveillance laws create a *theoretical* access risk. However:
- AccessGuard is not an electronic communication service provider (ECSP) — customer content is not "communications content" under FISA
- AI inference content (HTML, violation metadata) is not "stored communications" under SCA
- No US government direct access to AccessGuard systems (no US nexus for AccessGuard, Inc. itself)

### 4.2 Supplementary Measures Implemented

| Measure | Description | Effectiveness |
|---------|-------------|---------------|
| **Contractual** | SCCs (2021/914) + DPAs with all sub-processors | High — contractual obligation to resist unlawful access |
| **Technical: EU Pinning** | EU orgs → EU Vercel edge, EU NVIDIA NIM, EU Resend | High — data never leaves EU for EU orgs |
| **Technical: Encryption** | AES-256 at rest, TLS 1.3 in transit | High — renders data unintelligible without keys |
| **Technical: Pseudonymization** | User IDs hashed in audit logs; email not in violation payloads | Medium — reduces identifiability |
| **Organizational: DPO** | Designated DPO; annual TIA review | Medium — governance |
| **Organizational: Resistance** | Sub-processor DPAs require notification + challenge of government access requests | Medium — depends on sub-processor cooperation |

**Overall Assessment:** For EU orgs with EU pinning enabled, **adequate protection achieved** (data does not leave EU). For US orgs or EU orgs without pinning, residual risk remains but is mitigated by contractual + technical measures per EDPB 01/2020.

---

## 5. Data Subject Rights Enforcement

| Right | Mechanism | Cross-Border Enforcement |
|-------|-----------|--------------------------|
| Access (Art. 15) | `GET /api/org/data-export` (ZIP) | Sub-processor DPAs require cooperation |
| Rectification (Art. 16) | `PATCH /api/settings` + user profile | Propagated via sub-processor APIs |
| Erasure (Art. 17) | `DELETE /api/account` (user), `DELETE /api/org/data` (org admin) | Sub-processor DPAs require 30-day cascade |
| Restriction (Art. 18) | `PATCH /api/settings/region` → freeze | Sub-processor DPAs require restriction flag |
| Portability (Art. 20) | `GET /api/org/data-export` (machine-readable ZIP) | N/A — data exporter responsibility |
| Objection (Art. 21) | Cookie consent API (`POST /api/consent`) | N/A — processing stops locally |

---

## 6. Risk Matrix & Residual Risk

| Risk | Likelihood | Impact | Mitigation | Residual |
|------|------------|--------|------------|----------|
| US govt accesses Stripe billing data via §702 | Low | Medium (payment metadata only) | Stripe DPA + minimization | Low |
| US govt accesses Sentry error samples via §702 | Low | Low (scrubbed, no PII) | Sentry scrubbing + SCCs | Very Low |
| US govt accesses NVIDIA inference logs | Low | Medium (scan content) | **EU pinning prevents** for EU orgs | None (EU orgs) |
| Vercel subpoena for edge logs | Medium | Low (IP, path, timing) | Vercel DPA + minimization | Low |
| GitHub repo access via CLOUD Act | Low | High (source code) | Customer consent required; no EU pinning | Medium — customer choice |

**Conclusion:** With EU pinning enabled, residual risk is **acceptable** per EDPB 01/2020. Without pinning, customers must accept residual risk or request on-prem/alternative deployment.

---

## 7. Review & Governance

| Item | Frequency | Owner |
|------|-----------|-------|
| TIA full review | Annual (or on sub-processor change) | DPO |
| Sub-processor audit | Annual | CTO + DPO |
| Supplementary measures test | Quarterly | Security |
| Data subject request SLA | Monthly report | Support + Legal |
| Regulatory monitoring (CJEU, EDPB, NCSA) | Continuous | DPO |

---

## 8. Annexes

- **Annex A:** Sub-Processor DPAs (on file)
- **Annex B:** SCCs (2021/914) — Controller-to-Processor module
- **Annex C:** Customer TIA Addendum Template (for EU org onboarding)
- **Annex D:** Encryption & Key Management Policy
- **Annex E:** Incident Response Plan (incl. government access notification)

---

*This TIA is a living document. Next scheduled review: 2027-08-18.*