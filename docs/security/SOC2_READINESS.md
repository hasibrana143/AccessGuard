# Volume 6 — SOC 2 Readiness

## 1. Scope & trust criteria
Scope: Type I/II readiness narrative map to the actual control set. Key criteria:

| Trust Service Criteria | Current state | Gap → owner |
| --- | --- | --- |
| **CC1** Organisation & communication | Security policies informal; roles documented in RBAC doc | formal security policy doc (V11) |
| **CC2** Risk assessment | OWASP assessment per surface; threat model pending | add threat-model doc |
| **CC3** Information system | RBAC + encryption + scanning gate (hardcoded secret removed V6) | — |
| **CC4** System operations | audit logs + error-logger + Sentry; backups exist (`db-backup`) | **DR drill + restore test cadence** |
| **CC5** Change management | CI/CD (lint/tsc/vitest/build), 2 workflows, PR reviews | add prod-change approval gate |
| **CC6** Logical & physical access | Session JWT, MFA (optional), org gating, role gates | **src-user access review**; MFA enforce policy |
| **CC7** System monitoring | health + logs; **no metrics/alerting** | telemetry + abuse alerts |
| **CC8** Confidentiality / **CC9** privacy | AES-GCM, GDPR map, encryption doc | retention purge |

## 2. Evidenced facts (this build)
- Tenant isolation enforced + unit-tested (`tenant-isolation`, RBAC vitest).
- Password hashing bcrypt12; invite/reset tokens hashed at rest; MFA; rate limits keyed by IP.
- Immutable image build (GHCR), `npm audit` gate, HSTS + security headers.
- Audit log events on every critical action; API no-store; CSRF token helper.

## 3. Implementation checklist (before any SOC2 assertion)
1. MFA & SSO policy documented + enforcement flag for orgs.
2. Quarterly access reviews + revocation runbook.
3. Monitoring/alerts (uptime, rate-limit abuse, failed-login thresholds).
4. Data retention + destruction SOP.
5. Incident response + breach notification SOP.
6. Vendor/subprocessor list + DPAs (Redis/PG/Stripe/Resend/NVIDIA/GA).
7. Security training/proof, backup restore drill, DR test record.

**Verdict**: technology base largely satisfies CC/security criteria; the **ops/evidence layer**
(V11) is what remains — no code blocker identified in this audit.