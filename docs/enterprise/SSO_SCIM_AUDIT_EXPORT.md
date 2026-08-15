# Enterprise Readiness — SSO, SCIM, and Audit Export

> **Status:** Spec — implementation roadmap for enterprise sales unlock
> **Volume:** V13 — Global SaaS Hardening
> **Owner:** Engineering + Security

## Why This Matters
Enterprise deals (>$25k ARR) require:
1. **SSO/SAML** — "Our security team requires SSO" is the #1 enterprise blocker
2. **SCIM** — auto-provision/deprovision users (Okta/Azure AD push)
3. **Audit export** — SIEM forwarding for security teams
4. **Security questionnaire** — vendor risk portal (OneTrust/Whistic/Sigma)

## 1. SSO/SAML 2.0 Implementation

### Architecture
```
User → AccessGuard login → SAML redirect → IdP (Okta/Azure AD/Google) → Assertion → AccessGuard → JWT session
```

### IdP Support (must support these providers)
| IdP | Market share | Notes |
|-----|-------------|-------|
| Okta | 22% | Market leader, OIDC + SAML |
| Microsoft Entra ID (Azure AD) | 18% | Enterprise default, OIDC + SAML |
| Google Workspace | 14% | Startups, OIDC + SAML |
| OneLogin | 4% | Mid-market |
| JumpCloud | 2% | Meraki-style directory |
| Custom SAML | — | Generic SAML 2.0 |

### Library Choice
- **Recommended:** `@node-saml/passport-saml` (passport-saml fork, actively maintained)
- Or: NextAuth.js SAML provider (if available for Next 16)
- Or: WorkOS / Auth0 (managed SSO — $1-3/user/month, faster TTM)

### Decision: Build vs Buy
| Option | Time to ship | Cost | Customization |
|--------|-------------|------|---------------|
| Build (passport-saml) | 2-4 weeks | $0 infra | Full control |
| WorkOS | 2 days | $1-3/user/mo + plans from $100/mo | Pre-built IdPs |
| Auth0 | 2 days | $3-5/user/mo | Enterprise-plan gated |
| Stytch | 1-2 days | Usage-based | Modern API |

**Recommendation:** Start with WorkOS for fast enterprise revenue; migrate to passport-saml when SSO is core feature.

### DB Schema Additions (`prisma/schema.prisma`)
```prisma
model Organization {
  // ...existing...
  ssoConfig         Json?    // { idp: 'okta'|'azure'|'google'|'custom', samlEntryPoint, certificate, metadataUrl }
  ssoEnabledAt      DateTime?
  ssoRequired        Boolean @default(false) // when true, all members must use SSO
}

model User {
  // ...existing...
  ssoSubject        String?  // IdP-provided NameID (e.g., user@company.com)
  ssoProvider       String?  // okta | azure | google | custom
  ssoLinkedAt       DateTime?
}
```

### API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sso/metadata` | GET | Service Provider metadata (our SAML metadata XML) |
| `/api/sso/login/:orgId` | GET | Initiate SSO for an org (redirect to IdP) |
| `/api/sso/acs` (Assertion Consumer Service) | POST | Receive IdP assertion, issue our JWT |
| `/api/sso/slo` (Single Logout) | POST/GET | Optional SLO (SP-initiated or IdP-initiated) |
| `/api/admin/sso/config` | GET/PUT | Admin configures SSO for org |

### Admin UI
- Settings → Authentication → Configure SSO:
  - Choose IdP (or upload metadata XML)
  - Paste SAML metadata URL or XML
  - Test connection (button: "Test SSO")
  - Toggle "Require SSO for all members" (forces SSO, disables passwords)

## 2. SCIM 2.0 User Provisioning

### SCIM Endpoints (RFC 7643, 7644)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/scim/v2/Users` | GET | List / filter users (IdP polls) |
| `/scim/v2/Users` | POST | Create user (IdP provision) |
| `/scim/v2/Users/:id` | GET | Get single user |
| `/scim/v2/Users/:id` | PUT | Replace user attributes |
| `/scim/v2/Users/:id` | PATCH | Patch user (e.g., active=false to suspend) |
| `/scim/v2/Users/:id` | DELETE | Delete user (deprovision) |
| `/scim/v2/Groups` | GET/POST/PUT/PATCH/DELETE | Group management (roles mapping) |
| `/scim/v2/ServiceProviderConfig` | GET | Our SCIM capabilities |
| `/scim/v2/ResourceTypes` | GET | Schema |

### Auth & Rate Limiting
- SCIM tokens (separate from user JWT): `scim_<orgId>_<random>`
- Stored hashed in DB (`Organization.scimTokenHash`)
- Per-IdP rate limit (60 req/min default per SCIM client)
- Validate `Content-Type: application/scim+json`

### Behavior on Deprovision
- IdP sends `PATCH /Users/:id` with `active=false`:
  - Set `User.ssoActive=false`
  - Revoke JWT sessions (clear `User.sessionVersion`)
  - Keep user record (soft delete for audit)

### DB Schema Additions
```prisma
model Organization {
  // ...existing...
  scimTokenHash     String?  // SCIM bearer token, hashed
  scimEnabledAt     DateTime?
}

model User {
  // ...existing...
  scimExternalId    String?  // IdP's unique ID
  scimActive        Boolean @default(true)
}
```

## 3. Audit Log Export (SIEM Forwarding)

### Why?
Enterprise customers want to ship AccessGuard audit logs to their SIEM (Splunk, Datadog, Sumo Logic, Elastic) for centralized monitoring + compliance.

### Implementation
| Option | Implementation | Complexity |
|--------|----------------|-------------|
| **API export** | `/api/audit-logs/export?since=...&format=json\|csv\|cef` | Low |
| **Webhook** | HTTP POST to customer URL on each event | Medium (retry, idempotency) |
| **S3/Azure Blob sink** | Push to customer's bucket | Medium |
| **Splunk HEC** | Direct HTTP Event Collector integration | Low |

### API Endpoint
```
GET /api/audit-logs/export?since=2026-01-01T00:00:00Z&until=...&format=json
Authorization: Bearer <export_token>
```

### Webhook Approach (preferred for real-time)
- Admin configures webhook URL + signing secret
- On AuditLog.create, enqueue webhook delivery (BullMQ job)
- POST: headers `X-AccessGuard-Signature: sha256=...`
- Retry: up to 5 attempts, exponential backoff (Lindsey-style)
- Dedupe via audit event `id` (already unique)

### DB Schema Additions
```prisma
model Organization {
  // ...existing...
  auditWebhookUrl       String?
  auditWebhookSecret    String?  // hashed; HMAC signs payload
  auditWebhookEnabled   Boolean @default(false)
}
```

## 4. Security Questionnaire Program

### Templates to Anticipate
| Questionnaire | Source | When |
|---------------|--------|------|
| SIG (Standardized Information Gathering) | Shared Assessments | Procurement |
| CAIQ (Consensus Assessments Initiative Questionnaire) | Cloud Security Alliance | Procurement |
| Custom buyer questionnaire | Each enterprise | Procurement |
| Vendor risk portal | OneTrust / Whistic / RiskRecon | Procurement |

### Maintenance Cadence
| Artifact | Owner | Update |
|----------|-------|--------|
| Pre-filled SIG | Security | Quarterly |
| Pre-filled CAIQ | Security | Quarterly |
| SOC 2 bridge letter | Auditor | Annual |
| Pen test summary | Security | Annual |
| Status: ISO 27001 / HIPAA | Compliance | Annual |

## 5. Implementation Phasing

| Phase | Deliverable | Timeline |
|-------|-------------|----------|
| 1 | SSO/SAML via WorkOS (Okta + Azure + Google) | 2 weeks |
| 2 | Audit log export (JSON API + webhook) | 1 week |
| 3 | SCIM 2.0 (Users only, no Groups) | 2 weeks |
| 4 | SSO require-toggle + admin UI | 1 week |
| 5 | SCIM Groups + role mapping | 1 week |
| 6 | Migrate SSO off WorkOS to passport-saml (when ARR > $500k) | 3 weeks |

## Definition of Done
- [ ] SSO/SAML works for Okta + Azure AD + Google Workspace
- [ ] Admin UI: Configure SSO, Require SSO toggle
- [ ] SCIM 2.0 /Users endpoints (GET/POST/PATCH/DELETE)
- [ ] Audit export API: JSON + Webhook (signed)
- [ ] Pre-filled SIG + CAIQ questionnaires
- [ ] Security questionnaire response SLA: 5 business days
