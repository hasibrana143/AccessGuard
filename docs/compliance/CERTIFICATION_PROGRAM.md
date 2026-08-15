# Compliance Certifications Program — AccessGuard

> **Status:** Spec — certification roadmap
> **Volume:** V13 — Global SaaS Hardening
> **Owner:** Security / Compliance Officer
> **Existing:** docs/security/SOC2_READINESS.md, docs/security/GDPR_READINESS.md

## 1. Certification Roadmap (Prioritized)

| Certification | When | Why | Cost | Effort |
|---------------|------|-----|------|--------|
| SOC 2 Type I | Year 1 | Enterprise unlock | $15-40k | 4-6 months |
| SOC 2 Type II | Year 2 | Customer trust, audit | $25-60k | 12 months |
| ISO 27001 | Year 2 | International, EU/UK | $20-50k | 6-12 months |
| HIPAA (BAA) | When healthcare tenant | Industry unlock | $30-100k | 3-6 months |
| PCI DSS | **Avoid** (Stripe handles) | If not touched card data | N/A | Stripe SAQ-A only |
| FedRAMP | Year 4+ | If Fed customer | $300k+ | 12-24 months |

## 2. SOC 2 Type II Execution (Top Priority)

### Pre-requisites (already in place per docs/security/SOC2_READINESS.md)
- [x] RBAC + audit logs
- [x] Encryption at rest + in transit
- [x] Access controls + MFA
- [x] Secrets management (env, never committed)
- [ ] Continuous monitoring (Vanta/Drata/Secureframe)

### Tools Selection
| Tool | Cost | Features |
|------|------|----------|
| Vanta | $2k-10k/mo | Continuous SOC 2 monitoring, integrations |
| Drata | $2k-8k/mo | Continuous compliance, evidence collection |
| Secureframe | $1k-5k/mo | Startups focused, easier setup |
| Manual | $0 | High effort, error-prone |

**Recommendation:** Vanta (industry standard), negotiate startup pricing.

### Trust Service Criteria (TSCs) — Common 5 + Healthcare

#### Security (mandatory)
| Control | Implementation | Evidence Source |
|---------|---------------|-----------------|
| Logical access (unique IDs) | NextAuth + RBAC | Audit log; user list |
| Password policy | bcrypt + min length | Code review |
| MFA | TOTP via otplib | User.mfaEnabledAt field |
| Encryption at rest | Postgres AES-256? (verify) | Cloud provider audit |
| Encryption in transit | TLS 1.2+ everywhere | SSL Labs grade |
| Network controls | Vercel/WAF | Cloudflare/Vercel docs |
| Backups | Daily Postgres backup | Backup logs |
| Incident response | docs/ops/INCIDENT_RESPONSE.md | Runbook + tests |

#### Availability
| Control | Implementation | Evidence Source |
|---------|---------------|-----------------|
| Uptime monitoring | Status page /health | UptimeRobot / synthetic |
| DR plan | docs/devops/DISASTER_RECOVERY.md | DR test results |
| Incident recovery | Post-mortems | Past incidents |
| Performance monitoring | Sentry + OpenTelemetry | Dashboards |
| Capacity planning | Quarterly review | Capacity doc |
| Production change mgmt | GitHub PR review process | PR history |

#### Confidentiality
| Control | Implementation | Evidence Source |
|---------|---------------|-----------------|
| Data classification | PI/non-PI; tenant data | Data inventory |
| Encryption key mgmt | Cloud KMS | KMS audit logs |
| Data retention | Per data category (Privacy Policy) | Retention runner |
| Data disposal | Soft-delete first, hard-delete post-30d (or as defined) | Audit log |

#### Privacy (GDPR-aligned)
| Control | Implementation | Evidence Source |
|---------|---------------|-----------------|
| Consent management | Cookie consent (V2 design) | Cookie banner state |
| DSAR workflow | Manual (email /privacy) | DSAR tickets |
| Sub-processor list | /legal/sub-processors | Public page |
| Data transfer mechanism | SCCs (Schrems II) | DPA per sub-processor |

### Auditor Engagement
- Select auditor: A-lister (Deloitte, PwC, BDO) or niche (A-LIGN, Schellman, Prescient)
- Observation window: minimum 3 months for Type I, 6-12 months for Type II
- Safe harbor: engagement letter signed before window starts (lock scope)

### Continuous Monitoring Controls (Vanta/Drata)
| Control | Tool | Frequency |
|---------|------|-----------|
| User onboarding/offboarding | Vanta ↔ HRIS | Continuous |
| MFA enforcement | Vanta ↔ IdP | Continuous |
| Access certification reviews | Manager attest | Quarterly |
| Vulnerability scans | Vanta ↔ Snyk | Continuous |
| Pen test | Annual | Annual |
| Background checks | HRIS | At hire |

## 3. ISO 27001

### Why (Complementary to SOC 2)
- **International recognition** — EU/UK/APAC customers ask for ISO 27001 vs SOC 2
- **ISMS scope** — broader than SOC 2 (covers non-IT: physical, HR, vendor)
- **Certification** (not report) — pre-recognized globally
- **Annex A controls** — 93 controls mapped; about 30-40 applicable to SaaS startup

### ISMS Scope Statement (per A.4.1)
- In-scope: AccessGuard SaaS application, supporting infrastructure (Vercel, Postgres, Redis, Workers)
- Out-of-scope: physical offices (remote-first, BYOD)

### Risk Register (A.8.1)
Each risk has likelihood (1-5) × impact (1-5) = score (1-25). Top 10 risks:
| # | Risk | L | I | Score | Mitigation |
|---|------|---|---|-------|-----------|
| 1 | Data breach via API vuln | 2 | 5 | 10 | Pen test, WAF, RBAC |
| 2 | Sub-processor breach | 2 | 5 | 10 | DPAs, monitoring |
| 3 | Insider data exfil | 2 | 5 | 10 | Audit logs, access reviews |
| 4 | Cost abuse AI | 3 | 3 | 9 | Token cap, rate-limit |
| 5 | Stripe webhook failure | 1 | 5 | 5 | Idempotency, retries (done) |
| ... continue to 10 | | | | | |

### Statement of Applicability (SoA) — Annex A Control Mapping
Per ISO 27001:2022 Annex A (new version, 93 controls):
- A.5.1: Policies for info sec — APPROVED (security policy doc)
- A.5.2: Information security roles — APPROVED (RACI matrix)
- A.5.3: Segregation of duties — LIMITED for small team, acknowledge
- A.8.1: Risk assessment — adopted (risk register above)
- A.8.2: Risk treatment — adopted (risk treatment plan per row)
- A.8.7: Pen testing / vuln mgmt — adopted (annual pen test)
- (etc.)

### Phasing
| Phase | Months | Deliverable |
|-------|--------|-------------|
| Planning | 1-2 | Scope, gap assessment |
| Implementation | 3-6 | Policies, controls, training |
| Internal audit | 7 | Internal audit report |
| Stage 1 audit | 8 | Auditor review of ISMS scope + documents |
| Stage 2 audit | 9-10 | On-site assessment |
| Certification | 11-12 | Certificate issued |

## 4. HIPAA (Only If Healthcare Customers)

### Decision Gate
Only pursue HIPAA + BAA if you have **signed LOI/contract from healthcare customer**.
Don't pursue speculatively — it's cost + operational burden.

### Requirements (BAA = Business Associate Agreement)
- Encrypted PHI at rest (Postgres AES-256 — verify)
- Encrypted PHI in transit (TLS 1.2+ — done)
- Access logs (current AuditLog — already covers)
- Per-role access (RBAC already in place)
- Breach notification contract (60 days to OCR if PHI breach)
- BAA template (DHHS published model; adopt verbatim)
- Sub-processors must sign BAA chain (Stripe, OpenAI, etc.)
- Annual risk assessment + remediation plan
- Designated Security Official (audit trail of appointment)

### HIPAA Tech Additions (over SOC 2 + ISO)
- PHI access logging (extend audit log with field `contains_phi: true`)
- PHI export restriction (signed BAA-required flag on org)
- Auto-purge PHI on contract end (60 days)
- Encrypted backups with PHI tag

## Definition of Done
- [ ] Compliance tool (Vanta/Drata) onboarded
- [ ] SOC 2 Type I auditor engaged (with start date)
- [ ] Risk register published (ISO 27001 A.8.1)
- [ ] Annex A SoA documented (ISO 27001)
- [ ] HIPAA decision gate documented
- [ ] Continuous monitoring integrating with all cloud providers
- [ ] Compliance roadmap reviewed by board (quarterly)
