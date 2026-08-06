# Volume 6 — GDPR Readiness

## 1. Product scope
AccessGuard processes: account data (email/name), org/project/scan data, and **personal data
within crawled sites** (metadata strings, element HTML that may contain personal info), plus
billing data via Stripe (Stripe acts as processor). No EU data residency promise yet.

## 2. Data subject rights — implemented
| Right | Mechanism | Status |
| --- | --- | --- |
| Access | `/api/account/export` (personal data download) | ✅ |
| Erasure | `/api/account/delete` (+ consent) | ✅ |
| Rectification | profile/settings PATCH | ✅ |
| Portability | export JSON | ✅ |
| Restriction/Objection | (contact-based) | 🟡 operational |

## 3. Controller obligations
- **Lawful basis**: performance of contract (subscription) + consent for cookie (CookieConsent)
  / push notifications / email alerts.
- **Data minimization**: org-scoped; soft-deletes (`deletedAt`) hide but retain — retention
  cleanup runbook pending (V7/V11) to schedule hard purge.
- **Security**: encryption at rest/transit, RBAC, audit logs (see ENCRYPTION/RBAC/AUDIT_LOGS).
- **Breach response**: incident response runbook (V11) + audit evidence; alerting gap noted.

## 4. Processor relationships
- Subprocessors to disclose: Postgres host, Redis host, NVIDIA NIM (remediation content),
  Stripe, Resend, GitHub, Sentry (optional). **DPA list + records of processing** pending (V11 ops).

## 5. To-dos before EU launch
1. Retention + hard-erasure scheduler (per org plan purge after cancel).
2. Data Processing Agreement register + processor review.
3. Cookie banner EU consent mode (existing CookieConsent covers basic, not ads).
4. DPO/contact point + privacy contact in `/api/legal/privacy` copy.
5. EU data residency option / region selection.

**Verdict**: functionally ready for basic rights (export/delete present); contractual + retention
layers are the remaining gap. Track in V11 Operations.