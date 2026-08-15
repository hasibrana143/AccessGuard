# Vendor Management & SBOM Policy — AccessGuard

> **Status:** Spec — third-party risk + software supply chain
> **Volume:** V13 — Global SaaS Hardening
> **Owner:** CTO / DevOps
> **Existing:** SBOM via Trivy in docker.yml (V7)

## 1. Why Vendor Management Matters

1. **Supply chain attacks** (SolarWinds, Codecov, 3CX) — one vendor compromise = your customers exposed
2. **Compliance** — SOC 2 requires vendor risk assessment (Trust Service Criteria CC9.2)
3. **Regulatory** — GDPR/DORA/ISO 27001 require sub-processor oversight
4. **Business continuity** — single-vendor lock-in = concentration risk

## 2. Vendor Inventory (Current)

| Vendor | Purpose | Data Shared | Risk | Assessment |
|--------|---------|-------------|------|-----------|
| Vercel | Hosting (Next.js) | App code, env vars, traffic | Medium | Annual SOC 2 review |
| Vercel Postgres (Neon) | Database | Customer data (encrypted at rest) | High | Annual SOC 2 + ISO 27001 |
| Upstash Redis | Cache/queues | Session data, rate-limit keys | Medium | Annual SOC 2 |
| Stripe | Billing | Customer emails, amounts, IDs | High | Annual SOC 1/2 (already DPA) |
| GitHub | OAuth + PR creation | GitHub tokens (encrypted), login | Medium | Annual SOC 2 |
| Puppeteer/Chrome | Scanning (embedded) | URL content fetched | Medium | None (own process) |
| NVIDIA NIM (LLM) | AI remediation | Violation content (prompt) | High | Contract review |
| Sentry | Error monitoring | Error stack traces, sample data | Medium | Data scrubbing |
| Resend | Email | User emails, email content | Low | Annual review |
| Postmark (alt) | Email | User emails | Low | Annual review |
| Cloudflare | CDN/DNS | Traffic metadata | Low | Annual review |
| OpenZeppelin (lib) | Contracts (future) | None | Low | Version pin |
| Auth.js/NextAuth | Auth | Session cookies | Medium | Version pin + security list |

## 3. Vendor Risk Assessment Process

### Quarterly Review
1. Verify vendor is on current `VENDOR_REGISTRY` (below)
2. Check vendor's security posture (SOC 2 report, ISO cert, pen test)
3. Confirm data processing per our DPA annex
4. Check for major security incidents (vendor's security page / news)
5. Update `docs/security/SOC2_READINESS.md` TSC CC9.2 section
6. Record findings in audit log (`vendor_review` action — add to whitelist)

### New Vendor Checklist
```
□ Business need documented (vendor name, purpose, cost, owner)
□ Security review: SOC 2 / ISO 27001 / pen-test evidence
□ DPA (data processing agreement) signed if PII involved
□ Sub-processor clause added to our DPA annex
□ Contact + incident response path established
□ Approval: CTO (code infra) / COO (business tools)
□ Added to VENDOR_REGISTRY below
□ NDA in place (if strategic)
```

## 4. SBOM (Software Bill of Materials)

### What We Already Have (V7)
- `docker.yml` generates SBOM via Trivy (`trivy fs --format sbom` → `sbom.json` artifact)
- Dependabot enabled (GitHub native, PR-based dependency updates)
- Docker multi-arch builds + provenance attestation

### Extend To
| Layer | Tool | Status |
|-------|------|--------|
| Node deps | Dependabot (npm) | ✅ Enabled |
| Docker image | Trivy image scan + SBOM | ✅ Enabled |
| Python (scripts) | pip-audit | ⬜ Add |
| Terraform/K8s (future) | Trivy IaC scan | ⬜ Add |
| SBOM artifact | Trivy `--format sbom` | ✅ Enabled |
| Signature | cosign (optional) | ⬜ Deferred |

### SBOM Policy
| Item | Policy |
|------|--------|
| Generate frequency | Every build (docker.yml) + weekly scheduled |
| Retention | 90 days (public artifacts only for releases) |
| Deliverable | Attach SBOM to every GitHub Release (V7 release.yml) |
| Review cadence | Monthly: review Dependabot PRs + security alerts |
| CVSS threshold | Fix CVSS ≥ 7.0 within 30 days; ≥ 9.0 within 7 days |
| Supply-chain lock | `package-lock.json` committed; `npm ci` in CI (already) |

## 5. VENDOR_REGISTRY (Source of Truth)

```yaml
# docs/devops/VENDOR_REGISTRY.yaml (new file — this spec)
vendors:
  - name: Vercel
    category: hosting
    data: app, env, traffic
    risk: medium
    soc2: true
    iso27001: true
    dpa: true
    reviewDate: 2026-08-01
    nextReview: 2027-08-01
  - name: Neon (Postgres)
    category: database
    data: customer-data
    risk: high
    soc2: true
    iso27001: true
    dpa: true
    reviewDate: 2026-08-01
  - name: Stripe
    category: billing
    data: customer-billing
    risk: high
    soc2: true
    iso27001: true
    dpa: true
    reviewDate: 2026-08-01
  - name: Upstash
    category: cache
    data: sessions, limits
    risk: medium
    soc2: true
    reviewDate: 2026-08-01
  - name: NVIDIA NIM
    category: ai
    data: violation-content
    risk: high
    reviewDate: 2026-08-01   # NEW — confirm DPA + regional pinning
  - name: Sentry
    category: monitoring
    data: errors, samples
    risk: medium
    soc2: true
    reviewDate: 2026-08-01
  - name: Resend
    category: email
    data: user-email
    risk: low
    soc2: true
    reviewDate: 2026-08-01
```

## 6. Incident Handling (Vendor Compromise)

Per docs/ops/INCIDENT_RESPONSE.md:
1. Detect (Sentry alerts, Dependabot, news feed)
2. Assess impact (do we use affected component?)
3. Communicate (customers if PII exposed — 72h GDPR)
4. Contain (block access, rotate keys, deploy fix)
5. Recover (revert to pinned safe version, patch)
6. Learn (update registry risk rating)

### Key Rotation on Vendor Compromise
- AWS/Neon DATABASE_URL → rotate
- Upstash Redis token → rotate
- Stripe keys → rotate
- NEXTAUTH_SECRET → rotate (breaks sessions — communicate)

## 7. Third-Party Data Access Audit

| Access Type | Who | Revocation |
|-------------|-----|------------|
| Sentry (errors) | Engineers via org admin | Remove member from Sentry org |
| Neon (DB console) | CTO + DevOps | IAM policy |
| Vercel dashboard | CTO + DevOps | Team removal |
| Stripe dashboard | Founders | Team removal |
| NVIDIA NIM key | Env var (code) | Rotate + redeploy |
| GitHub (code) | Engineers | GitHub org removal |

## Definition of Done
- [ ] VENDOR_REGISTRY.yaml created (all vendors above)
- [ ] NVIDIA NIM DPA + regional pinning confirmed (EU orgs)
- [ ] pip-audit added to CI (if Python scripts exist in repo)
- [ ] SBOM attached to releases (V7 release.yml — verify)
- [ ] Vendor review workflow documented (quarterly + new-vendor checklist)
- [ ] `vendor_review` audit action added to whitelist (src/lib/audit.ts)
