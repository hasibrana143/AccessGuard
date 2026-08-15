# IP Assignment & Trademark Strategy — AccessGuard

> **Status:** Spec — critical legal foundation
> **Volume:** V13 — Global SaaS Hardening
> **Owner:** Founder / IP counsel

## 1. IP Assignment Chain

### Why This Matters
A company's value is its IP. If IP ownership is unclear:
- Investors will not fund (due diligence fails on cap table/IP audit)
- Acquirers will discount or walk away
- Co-founders can sue for their "share" of IP

### The Assignment Chain (must be unbroken)
```
Founder/Contributor  →  Corporation (AccessGuard, Inc.)
    (present assignment, signed at incorporation)
                                     ↓
                        All code, designs, docs, brand
                        assets owned by the corporation
```

### Required Agreements
| Agreement | Who Signs | When |
|-----------|-----------|------|
| Present Assignment of Inventions | All founders | Incorporation |
| PIIA (Proprietary Info & Invention Assignment) | All employees/contractors | Start of work |
| Open source contribution policy | All contributors | First PR |
| Consultant IP assignment | Freelancers/agencies | Start of engagement |

### PIIA Key Clauses
1. **Present Assignment** — "Employee hereby assigns to Company all right, title, and interest..."
2. **Future Assignment** — Future inventions within scope of employment
3. **Moral Rights Waiver** — For visual/design work
4. **Cooperation Clause** — Will sign further documents to perfect assignment
5. **Open Source Disclosure** — Disclose all OSS used in work product
6. **Non-solicitation** — 12 months post-employment (jurisdiction dependent)

### AccessGuard-Specific IP Concerns
| Asset | Owner | Notes |
|------|------|-------|
| Source code (git history) | Corporation | All commits assigned via PIIA |
| Design system (docs/design/ux/) | Corporation | Created under PIIA/contractor agreement |
| AI prompts (docs/ai/PROMPT_LIBRARY.md) | Corporation | Built under PIIA; protect as trade secret |
| Customer data | Corporation (custodian) | Customers own their data; DPA governs |
| AI model fine-tunes (if any) | Corporation | Built on provider terms (NVIDIA NIM) |
| Domain (accessguard.) | Corporation | Register via corporateaccount |

## 2. Trademark Strategy

### Brand Assets to Protect
| Mark | Class | Status |
|------|-------|--------|
| "AccessGuard" | Class 9 (software), Class 42 (SaaS) | To file |
| "AccessGuard" logo | Class 9 | To file |
| Tagline (if any) | Class 9 | To file |

### US Filing (USPTO)
| Step | Action | Cost | Timeline |
|------|--------|------|---------|
| 1 | USPTO TE Plus clearance search | $0 (free TESS) | Week 1 |
| 2 | File Intent-to-Use (ITU) application | $350/class (TEAS Plus) | Week 2 |
| 3 | Statement of Use (when launched) | $100/class | Within 24mo of filing |
| 4 | Section 8/9 renewal | $425+ | Years 5-6, 9-10 |

### International Filing (Madrid Protocol)
After US filing, extend to international within 6 months:
| Country/Region | Priority | Class | Why |
|----------------|----------|-------|-----|
| EU (EUIPO) | High | 9, 42 | Primary market |
| UK (IPO) | High | 9, 42 | Post-Brexit, separate filing |
| India | Medium | 9, 42 | Engineering talent, future market |
| Australia | Medium | 9, 42 | Digital economy |
| Japan | Medium | 9, 42 | Enterprise market |
| Canada | Medium | 9, 42 | Nearshore |

### Domain Strategy
| TLD | Action | Priority |
|-----|--------|----------|
| accessguard.com | Acquire (if available/parking) | Highest |
| accessguard.io | Acquire (common dev SaaS) | High |
| accessguard.ai | Acquire (AI positioning) | High |
| accessguard.dev | Acquire (developer trust) | Medium |
| accessguard.co | Acquire | Low |

## 3. Open Source License Compliance

### AccessGuard License
AccessGuard is **proprietary/closed-source**. All rights reserved.

### OSS Used (license audit required)
Run `npm ls --omit=dev --all` and check each dependency's license:
| License | Risk | Action |
|---------|------|--------|
| MIT, BSD, Apache 2.0 | Low (permissive) | Attribute, ship NOTICE file |
| LGPL, MPL | Medium (weak copyleft) | Keep separate, don't link statically |
| GPL, AGPL | **High** (strong copyleft) | Never use in proprietary SaaS |
| SSPL | **High** | Avoid (MongoDB clause) |
| Unlicensed | **High** | Remove (can't use legally) |

### SBOM (Software Bill of Materials)
- Generate via: `npx cyclonedx-bom -o sbom.json` (or post-build step)
- Track in `docs/compliance/SBOM_POLICY.md`
- Required for SOC 2 and customer security questionnaires

## 4. Copyright Registration

| Work | Registration | Cost | Why |
|------|--------------|------|-----|
| Source code | USCO Form CO (fee $65) | $65 | Statutory damages eligibility |
| Design system | Form CO (visual arts) | $65 | Same |
| Marketing copy | Form CO (literal works) | $65 | Same |

> Note: Copyright exists on creation; registration unlocks statutory damages
> (up to $150k per infringement) + attorney fees.

## 5. Trade Secrets

### AccessGuard Trade Secrets (protect!)
- AI prompt library (`src/ai/prompts.ts`) — the differentiation
- Customer list / pricing data
- Internal security architecture
- Vendor pricing terms

### Protection Measures
| Measure | Implementation |
|----------|----------------|
| Access controls | RBAC (already in place via `src/lib/rbac.ts`) |
| NDA | All employees/contractors sign NDA |
| Confidential marking | Mark internal docs "CONFIDENTIAL" |
| Audit log | AuditLog model already logs sensitive actions |
| Repo access | GitHub: org-only, branch protection on |
| Onboarding | Train new hires on trade secret scope |

## Definition of Done
- [ ] IP assignments signed by all contributors
- [ ] PIIA template created for future hires
- [ ] USPTO trademark clearance search done
- [ ] Intent-to-Use trademark application filed (US)
- [ ] International trademark plan documented
- [ ] OSS license audit completed (npm ls + review)
- [ ] SBOM generation step in CI
- [ ] "All rights reserved" + copyright header in code
