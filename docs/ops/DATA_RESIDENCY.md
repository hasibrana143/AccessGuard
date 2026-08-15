# Data Residency & Multi-Region — AccessGuard

> **Status:** Spec — EU/US data residency + multi-region deployment
> **Volume:** V13 — Global SaaS Hardening
> **Owner:** DevOps / CTO + DPO

## 1. Regulatory Drivers

| Requirement | Region | Trigger |
|-------------|--------|---------|
| GDPR Art. 44-49 | EU/EEA | Data transfers outside EU/EEA need SCCs or adequacy |
| Schrems II (CJEU 2020) | EU/EEA | Invalidated Privacy Shield → SCCs + transfer impact assessments |
| Personal Information Protection Law (PIPL) | China | Data localization requirements |
| LGPD | Brazil | Cross-border transfer restrictions |
| Health data residency | US states | HIPAA / state laws for PHI |

**AccessGuard data classes:**
1. **Customer content** — URLs scanned, violation metadata, HTML snapshots (PII-adjacent)
2. **User accounts** — email, name, password hashes, MFA secrets
3. **Billing** — Stripe customer IDs, invoices (PCI never touches us directly)
4. **Audit logs** — org activity, IP addresses, user agents (PII)

## 2. Data Residency Architecture (Target)

### Current State
- Single region (default US East via Vercel/AWS)
- Postgres in one region
- Redis in one region
- Backups in same region (see BACKUPS.md)

### Target State (Enterprise tiers)
| Tier | Data Region | Storage Location |
|------|------------|-----------------|
| Free / Pro | US (default) | US East (us-east-1) |
| Business (new) | EU (Frankfurt eu-central-1) | EU region |
| Enterprise | US + EU + custom | Multi-region per contract |

### Region Selection at Signup
- Select "data region" during org setup (US/EU, EU needs DPA + SCCs signed)
- Store on `Organization.dataRegion` (default: 'us')
- Postgres per region OR single DB with region column (v1: single DB + region tag; v2: regional shards)

### Where Data Lives Per Region
| System | US | EU |
|--------|----|----|
| Postgres (primary) | us-east-1 | eu-central-1 |
| Postgres (replica) | us-west-2 | eu-west-1 |
| Redis | us-east-1 | eu-central-1 |
| Object storage (HTML snapshots) | us-east-1 | eu-central-1 |
| Backups (separate bucket) | us-west-2 | eu-west-1 |
| AI inference (NVIDIA NIM) | us-east-1 | eu-central-1 (EU-hosted model endpoint) |

### Data Flow Rules
1. **Write path:** User's request lands in region of `Organization.dataRegion`
2. **Read path:** Reads always hit the org's home region (no cross-region reads at runtime)
3. **Replication:** Backups replicate cross-region ONLY if data is classed "backup-eligible" (no PHI/PII beyond account email) — email + account metadata replicate; violation snapshots do not (unless org opts in)
4. **AI calls:** Inference endpoint selected by region; EU orgs never send content to US models

### Region Detection & Routing
```text
DNS (Cloudflare) → nearest edge → routing by org slug → region:
  us-east-1, eu-central-1
```
Implementation (v1):
- `Organization.dataRegion` enum (`us`, `eu`)
- `next.config.ts` multi-region deploy: two Vercel projects (one per region)
- Regional Prisma client: `DATABASE_URL_*` env vars, select by org
- Regional queue: BullMQ queue name prefixed `us:` / `eu:`
- Consent screen at org creation when EU selected (GDPR: explicit data transfer consent)

## 3. EU Transfer Compliance

### Required for EU orgs
| Document | Where | Status |
|----------|-------|--------|
| DPA (Data Processing Agreement) | docs/legal/CONTRACTS.md (DPA section) | Drafted |
| SCCs (EU Standard Contractual Clauses, 2021/914) | Signed at org setup (electronic signature) | Spec |
| Transfer Impact Assessment (TIA) | docs/legal/TRANSFER_IMPACT_ASSESSMENT.md | New |
| Sub-processor list (Google, Stripe, OpenAI/NVIDIA, Vercel, Sentry) | Privacy policy + DPA annex | Spec |

### Sub-processor TIA (example)
| Sub-processor | Role | Transfers | Safeguard |
|---------------|------|-----------|-----------|
| Stripe | Payment processing | US (GDPR SCCs + DPA) | Stripe DPA |
| Vercel | Hosting | US (GDPR SCCs) | Vercel DPA |
| Sentry | Error monitoring (sample data) | US | Sentry DPA + data scrubbing |
| NVIDIA NIM | AI inference (EU orgs: EU endpoint) | EU-only for EU orgs | Contractual regional pin |
| Postmark/Resend | Email delivery | US | DPA + SCCs |

## 4. Right to Erasure (GDPR Art. 17)

### Delete Flow
| Data Class | Deletion |
|-----------|----------|
| Account (profile, auth, sessions) | Hard delete immediately (30d retention window for fraud) |
| Violations + HTML snapshots | Hard delete within 30d of org deletion |
| Audit logs | 90-day retention, then delete (align with SLA docs) |
| Backups | Delete on next backup prune cycle (max 35d) |
| Stripe data | Stripe keeps 4-year tax records (legal obligation — disclose) |
| AI logs | No retention (inference is stateless) or 24h truncated |

### API for EU Users
- `DELETE /api/account` (exists) — full account erase
- Add: `DELETE /api/org/data` (org-level erasure request, admin only) — NEW
- Add: Data export (GDPR Art. 20 portability): `GET /api/org/data-export` — NEW

## 5. Data Portability (GDPR Art. 20)

### Export Format
```json
{
  "user": { "email": "...", "name": "...", "createdAt": "..." },
  "organization": { "name": "...", "plan": "...", "createdAt": "..." },
  "projects": [ { "id": "...", "name": "...", "url": "..." } ],
  "violations": [ { "id": "...", "ruleId": "...", "severity": "...", "url": "...", "createdAt": "..." } ],
  "auditLogs": [ { "action": "...", "createdAt": "..." } ],
  "usage": { "scansThisMonth": 120, "aiCallsThisMonth": 45 }
}
```
- Format: JSON (structured, machine-readable), delivered as ZIP
- Delivery: email link (expires 24h) OR direct download if signed in

## 6. Multi-Region Migration Path

| Phase | What | When |
|-------|------|------|
| P0 | Single region + dataRegion tag on org | Now |
| P1 | EU endpoint deploy (Vercel project + EU Postgres replica) | After 10 EU enterprise deals |
| P2 | Regional sharding (schema-based, org-id hash) | After 25 EU orgs |
| P3 | Multi-primary (active-active) | After enterprise contracts require |

### Rollback Plan
- If EU region fails: failover to US with notice (except for EU legal orgs — those get isolated failover)

## Definition of Done
- [ ] `Organization.dataRegion` field + migration
- [ ] EU selection consent screen at org setup
- [ ] Regional DATABASE_URL routing (Prisma client factory)
- [ ] `GET /api/org/data-export` (GDPR Art. 20 portability)
- [ ] `DELETE /api/org/data` (erasure, admin only)
- [ ] TIA + sub-processor annex in docs/legal
- [ ] Regional AI endpoint pinning for EU orgs
- [ ] Backup policy per region (no PII cross-region unless opted in)
