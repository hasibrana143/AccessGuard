# AccessGuard Product Specifications

**Version:** 2.0  
**Last Updated:** 2026-08-29  
**Status:** Active — Implementation Ready

---

## Spec Index

| Spec ID | Title | Priority | Phase | Status |
|---------|-------|----------|-------|--------|
| SPEC-001 | Free Tier & Self-Serve Onboarding | P0 | PLG Launch | Ready |
| SPEC-002 | VS Code Extension | P0 | PLG Launch | Ready |
| SPEC-003 | MCP Server (stdio + HTTP) | P0 | PLG Launch | Ready |
| SPEC-004 | GitHub App (PR Checks + Auto-Fix) | P0 | PLG Launch | Ready |
| SPEC-005 | Mobile App Scanning (iOS/Android) | P1 | PLG Launch | Draft |
| SPEC-006 | PDF/Document Scanning | P1 | PLG Launch | Draft |
| SPEC-007 | Legal Shield™ v1 | P0 | Enterprise | Ready |
| SPEC-008 | Custom Rules Engine (DSL) | P1 | Enterprise | Draft |
| SPEC-009 | AI Accessibility Agent | P0 | Platform | Concept |
| SPEC-010 | Accessibility App Store | P1 | Platform | Concept |

---

## SPEC-001: Free Tier & Self-Serve Onboarding

### 1.1 Overview
Enable developers to sign up, create an organization, and run their first accessibility scan in under 5 minutes without sales interaction.

### 1.2 User Flow
```
Landing Page → "Start Free" → Email → Verify → Org Name → First Project → 
Add URL → Run Scan → Results → First Fix → VPAT → Upgrade Prompt
```

### 1.3 Functional Requirements

| FR-ID | Requirement | Priority |
|-------|-------------|----------|
| FR-1.1 | Email/password signup + email verification (6-digit code) | P0 |
| FR-1.2 | Social login: GitHub, Google, Microsoft (OAuth 2.0) | P0 |
| FR-1.3 | Organization creation: name, slug (unique), plan selection | P0 |
| FR-1.4 | First project wizard: name, URL, scan config (max pages, delay) | P0 |
| FR-1.5 | One-click scan from project dashboard | P0 |
| FR-1.6 | Real-time scan progress (WebSocket/SSE) | P0 |
| FR-1.7 | Scan results: violations list + filters + AI fix button | P0 |
| FR-1.8 | One-click VPAT generation (PDF download) | P0 |
| FR-1.9 | Usage meter: pages scanned / month (header badge) | P0 |
| FR-1.10 | Upgrade prompts at 80% and 100% quota | P0 |
| FR-1.10 | Stripe Checkout for Starter ($200/mo) and Pro ($1,000/mo) | P0 |

### 1.4 Non-Functional Requirements
- **Time to First Scan**: < 5 minutes from landing page
- **Signup Conversion**: > 15% landing → verified org
- **Activation Rate**: > 40% verified org → first scan
- **Page Load**: < 2s (Lighthouse > 90)

### 1.5 API Endpoints
```
POST   /api/auth/signup              # Email/password signup
POST   /api/auth/verify-email        # 6-digit code verification
POST   /api/auth/oauth/github        # GitHub OAuth callback
POST   /api/auth/oauth/google        # Google OAuth callback
POST   /api/orgs                     # Create organization
POST   /api/projects                 # Create project
POST   /api/projects/:id/scans       # Trigger scan
GET    /api/projects/:id/scans/:scanId/events  # SSE progress
GET    /api/projects/:id/violations  # Paginated violations
POST   /api/violations/:id/fix       # Generate AI fix
POST   /api/projects/:id/vpat        # Generate VPAT PDF
GET    /api/orgs/:id/usage           # Current month usage
```

### 1.6 Database Changes
```prisma
model Organization {
  // ... existing fields
  plan              String          @default("free")  // free, starter, professional, enterprise
  pagesUsedThisMonth Int            @default(0)
  pagesQuota        Int             @default(1000)    // free tier: 1000
  stripeCustomerId  String?
  stripeSubscriptionId String?
  subscriptionStatus String?       // active, past_due, canceled, trialing
}

model Project {
  // ... existing fields
  scanConfig        Json            @default("{}")    // {maxPages, delay, userAgent, ...}
}
```

### 1.7 Stripe Integration
| Plan | Price ID | Monthly Pages | Features |
|------|----------|---------------|----------|
| Free | N/A | 1,000 | Basic scan, AI fixes, VPAT |
| Starter | `price_starter` | 50,000 | + CI/CD, GitHub App, Mobile |
| Professional | `price_professional` | 500,000 | + Legal Shield, SSO, Custom rules |

---

## SPEC-002: VS Code Extension

### 2.1 Overview
Native VS Code extension providing inline accessibility diagnostics, one-click fixes, and scan integration.

### 2.2 Features

| Feature | Description |
|---------|-------------|
| **Inline Diagnostics** | Red squiggles on violating elements in HTML/JSX/TSX/Vue/Svelte |
| **Hover Details** | Violation description + WCAG criterion + severity badge |
| **Code Actions** | "Fix with AccessGuard" → generates fix + applies to file |
| **Scan Current File** | Right-click → "Scan with AccessGuard" → results in panel |
| **Scan Workspace** | Command palette → "AccessGuard: Scan Workspace" |
| **PR Integration** | View violations from linked PR in sidebar |
| **Settings** | API key, org selection, auto-scan on save, severity filter |

### 2.3 Technical Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   VS Code       │────▶│  Extension      │────▶│  AccessGuard    │
│   (TypeScript)  │     │  Host           │     │  API (REST)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Language       │
                        │  Server (HTML)  │
                        │  - HTMLHinter   │
                        │  - Custom AST   │
                        └─────────────────┘
```

### 2.4 Key APIs Used
```
POST /api/scan/file          # Scan single file (HTML/JSX/TSX)
POST /api/violations/:id/fix # Generate fix for violation
GET  /api/orgs/:id/rules     # Custom rules for org
WS   /api/scan/progress      # Real-time progress
```

### 2.5 Packaging & Distribution
- **Marketplace**: `accessguard.accessguard-vscode`
- **Repository**: GitHub (public)
- **License**: MIT
- **Telemetry**: Opt-in (scan counts, fix acceptance, errors)

### 2.6 Acceptance Criteria
- [ ] Installs from VS Code Marketplace in < 30s
- [ ] Auth: API key + org selection persists across sessions
- [ ] Diagnostics appear within 2s of opening file
- [ ] "Fix with AccessGuard" creates valid diff + applies cleanly
- [ ] Works with: HTML, JSX, TSX, Vue, Svelte, Astro
- [ ] No false positives on valid accessible code
- [ ] Bundle size < 5MB

---

## SPEC-003: MCP Server (stdio + HTTP)

### 3.1 Overview
Model Context Protocol server enabling AI assistants (Claude Code, Cursor, Copilot, Continue) to interact with AccessGuard programmatically.

### 3.2 Capabilities (Tools)

| Tool | Description | Parameters | Returns |
|------|-------------|------------|---------|
| `scan_project` | Trigger full project scan | `project_id`, `config?` | `scan_id`, `status`, `estimated_time` |
| `get_scan_status` | Poll scan progress | `scan_id` | `progress`, `pages_scanned`, `violations_found` |
| `get_violations` | List violations with filters | `project_id`, `severity?`, `status?`, `rule_id?`, `limit?`, `offset?` | `violations[]`, `total` |
| `get_violation` | Get single violation detail | `violation_id` | Full violation + element HTML + selector |
| `generate_fix` | Generate AI remediation | `violation_id`, `force_regenerate?` | `code`, `explanation`, `confidence`, `approach` |
| `apply_fix` | Apply fix to repository (via GitHub App) | `violation_id`, `branch_name?` | `pr_url`, `pr_number` |
| `generate_vpat` | Generate VPAT/ACR PDF | `project_id`, `format?` (pdf/html/json) | `download_url`, `expires_at` |
| `check_compliance` | Quick compliance check | `url`, `standard?` (wcag21aa/wcag22aa/section508) | `score`, `passed`, `failed`, `violations[]` |
| `get_project` | Get project details | `project_id` | Project + last scan + violation summary |
| `list_projects` | List org projects | `org_id?`, `limit?`, `offset?` | `projects[]`, `total` |

### 3.3 Resources (Read-Only)
```
accessguard://projects/{project_id}/violations
accessguard://projects/{project_id}/scans
accessguard://projects/{project_id}/vpat
accessguard://orgs/{org_id}/usage
accessguard://orgs/{org_id}/rules
```

### 3.4 Prompts (Reusable Workflows)
| Prompt | Description |
|--------|-------------|
| `fix-all-critical` | "Fix all critical violations in project X" |
| `generate-vpat-for-audit` | "Generate VPAT for project X with evidence" |
| `pre-release-check` | "Run full accessibility audit before release" |
| `ci-integration-guide` | "How to add AccessGuard to my CI pipeline" |

### 3.5 Transport & Auth
| Transport | Auth | Use Case |
|-----------|------|----------|
| **stdio** | API Key (env var) | Local dev (Claude Code, Cursor) |
| **HTTP/SSE** | Bearer token | Remote (CI, servers, shared) |
| **WebSocket** | Bearer token | Real-time progress |

### 3.6 Configuration
```json
{
  "mcpServers": {
    "accessguard": {
      "command": "npx",
      "args": ["@accessguard/mcp-server"],
      "env": {
        "ACCESSGUARD_API_KEY": "agk_...",
        "ACCESSGUARD_ORG_ID": "org_...",
        "ACCESSGUARD_API_URL": "https://api.accessguard.io"
      }
    }
  }
}
```

### 3.7 Acceptance Criteria
- [ ] `npx @accessguard/mcp-server` starts in < 3s
- [ ] All 10 tools work with Claude Code, Cursor, Continue
- [ ] stdio + HTTP transports both functional
- [ ] API key auth works; invalid key returns clear error
- [ ] Rate limiting respected (tier-based)
- [ ] Progress streaming works for long scans
- [ ] Published to npm: `@accessguard/mcp-server`

---

## SPEC-004: GitHub App (PR Checks + Auto-Fix)

### 4.1 Overview
First-class GitHub integration providing PR checks, violation annotations, and one-click auto-fix PRs.

### 4.2 GitHub App Configuration
```
Name: AccessGuard
Homepage: https://accessguard.io
Webhook URL: https://api.accessguard.io/api/github/webhook
Permissions:
  - Contents: Read & Write (for fix PRs)
  - Checks: Read & Write (scan status)
  - Pull Requests: Read & Write (annotations, fix PRs)
  - Repository Metadata: Read
  - Issues: Write (violation tracking)
  - Members: Read (org membership)
Events:
  - push, pull_request, pull_request_review
  - check_suite, check_run
  - workflow_run, workflow_job
  - repository, organization
```

### 4.3 User Flow
```
1. User installs GitHub App on org/repo
2. Selects repositories → "Save"
3. Pushes code → GitHub Actions workflow triggers
4. AccessGuard check appears: "AccessGuard Scan" (pending → success/failure)
5. PR opened → violations as annotations on changed files
6. Click "Fix" on annotation → AccessGuard creates fix PR
7. Review fix PR → merge → violations resolved
```

### 4.4 Check Suite: "AccessGuard Accessibility Scan"
| Check | Status | Details |
|-------|--------|---------|
| `scan` | pending → success/failure | Total violations, by severity |
| `critical-violations` | success/failure | Count + links to annotations |
| `wcag-compliance` | success/failure | WCAG 2.2 AA pass rate % |

### 4.5 PR Annotations
```json
{
  "path": "src/components/Button.tsx",
  "start_line": 42,
  "end_line": 42,
  "annotation_level": "failure",
  "message": "[color-contrast] Text contrast 2.1:1 (WCAG 2.1 AA requires 4.5:1)",
  "title": "Color Contrast Violation",
  "raw_details": "Element: <button className=\"btn-secondary\">\nFix: Use text-gray-900 instead of text-gray-500\nConfidence: 92%"
}
```

### 4.6 Auto-Fix PR
**Trigger**: User clicks "Fix" button on annotation (GitHub Check Run action)

**Flow**:
1. AccessGuard generates fix for violation
2. Creates branch: `accessguard/fix-{violation-id}-{timestamp}`
3. Commits fix with message: `fix: resolve color-contrast on Button.tsx`
4. Opens PR: "Fix: Color contrast on Button.tsx (WCAG 2.1 AA)"
5. PR body includes:
   - Violation details + WCAG criterion
   - Before/after code diff
   - Confidence score + approach
   - Link to scan + violation
   - "Re-scan after merge" checkbox

### 4.7 Webhook Handling
| Event | Handler | Action |
|-------|---------|--------|
| `push` | Trigger scan on default branch | Queue scan job |
| `pull_request.opened` | Annotate PR with violations | Create check run + annotations |
| `check_run.requested_action` (fix) | Create fix PR | Generate fix → create branch → PR |
| `pull_request.closed` (merged) | Re-scan if "re-scan" label | Queue scan job |

### 4.8 GitHub Actions Workflow (`.github/workflows/accessguard.yml`)
```yaml
name: AccessGuard Scan
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: accessguard/action@v1
        with:
          api-key: ${{ secrets.ACCESSGUARD_API_KEY }}
          project-id: ${{ secrets.ACCESSGUARD_PROJECT_ID }}
          fail-on: critical  # or serious, moderate
      - name: Upload scan results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: accessguard-results
          path: accessguard-results.json
```

### 4.9 Acceptance Criteria
- [ ] App installs on org/repo in < 2 min
- [ ] Check runs on every push/PR
- [ ] Annotations appear on correct lines in PR files
- [ ] "Fix" button creates valid PR with working fix
- [ ] Fix PR merges cleanly; re-scan shows violation resolved
- [ ] Works with monorepos (multiple projects per repo)
- [ ] Rate limiting: 100 scans/hour per repo

---

## SPEC-007: Legal Shield™ v1

### 7.1 Overview
Industry-first legal protection combining automated audit trail, AI-drafted legal responses, and financial guarantee.

### 7.2 Components

| Component | Description | Delivery |
|-----------|-------------|----------|
| **Immutable Audit Trail** | Every scan, fix, decision logged to append-only store with cryptographic signing | Automatic (always on) |
| **AI Legal Response Drafter** | Demand letter → structured response with citations | On-demand (portal) |
| **Evidence-Backed VPAT** | VPAT with live links to scans/fixes | 1-click generation |
| **Expert Review Gateway** | Escalate to certified a11y pro (4hr SLA) | Portal ticket |
| **Guarantee Certificate** | "We stand behind our scans" + financial cap | PDF + portal |

### 7.3 Audit Trail Schema
```json
{
  "event_id": "evt_abc123",
  "timestamp": "2026-08-29T10:30:00Z",
  "org_id": "org_xyz",
  "user_id": "usr_abc",
  "action": "scan.completed",
  "resource_type": "scan",
  "resource_id": "scan_123",
  "metadata": {
    "project_id": "proj_456",
    "violations_found": 23,
    "critical_count": 2
  },
  "signature": "sha256:abc123...",
  "previous_event_hash": "sha256:def456..."
}
```
**Storage**: Append-only table + periodic Merkle root to blockchain (optional)

### 7.4 AI Legal Response Drafter
**Input**: Demand letter (PDF/text) + org scan history
**Output**: Structured response document
```
Sections:
1. Acknowledgment + Preservation Notice
2. Automated Compliance Evidence
   - Scan dates + results (with hashes)
   - Violations found + fixed (with timestamps)
   - VPAT/ACR with evidence links
3. Specific Claim Responses
   - Claim: "Button contrast fails" → Evidence: "Fixed PR #234 on 2026-08-15"
   - Claim: "No alt text" → Evidence: "0 image-alt violations in last scan"
4. Good Faith Remediation Commitment
5. Request for Specific Technical Details (if vague)
6. Legal Counsel Review Checkbox
```

### 7.4 Expert Review Gateway
| SLA | Trigger | Process |
|-----|---------|---------|
| 4 hours | Demand letter received | Auto-assign to certified pro |
| 24 hours | Complex claim | Pro reviews + drafts custom response |
| 48 hours | Litigation hold | Pro + legal counsel joint review |

### 7.5 Guarantee Terms
| Term | Detail |
|------|--------|
| **Coverage** | Valid ADA/EAA/Section 508 claims for scanned pages |
| **Cap** | 2x annual contract value (max $100K) |
| **Conditions** | Scans run monthly; critical violations fixed within 30 days |
| **Exclusions** | Third-party components; unscanned pages; pre-existing litigation |
| **Insurance** | E&O policy + $500K reserve |

### 7.6 Acceptance Criteria
- [ ] Audit trail immutable (Merkle tree + periodic blockchain anchor)
- [ ] Legal response drafter produces usable draft in < 60s
- [ ] VPAT includes clickable evidence links (scan ID, violation ID, fix PR)
- [ ] Expert review SLA: 4hr acknowledgment, 24hr draft
- [ ] Guarantee certificate generates PDF with org name, date, scope, cap
- [ ] All artifacts downloadable from dashboard + API

---

## SPEC-008: Custom Rules Engine (DSL)

### 8.1 Overview
Domain-specific language for organizations to define custom accessibility rules beyond WCAG.

### 8.2 DSL Syntax
```dsl
// Rule definition
rule "custom-focus-indicator" {
  description: "Custom focus ring must use brand color"
  severity: serious
  wcag_criterion: "2.4.7"
  
  when: {
    selector: "*:focus-visible"
    not: {
      any_of: [
        { css_property: "outline-color", value: "#0066CC" },
        { css_property: "box-shadow", contains: "0066CC" }
      ]
    }
  }
  
  then: {
    message: "Focus indicator must use brand primary color (#0066CC)"
    suggested_fix: "Add :focus-visible { outline: 2px solid #0066CC; }"
    examples: [
      { bad: "outline: 2px solid gray", good: "outline: 2px solid #0066CC" }
    ]
  }
  
  tags: ["brand", "focus", "design-system"]
}

// Component-specific rule
rule "button-accessible-name" {
  description: "All buttons must have accessible name"
  severity: critical
  wcag_criterion: "4.1.2"
  
  when: {
    selector: "button, [role='button'], input[type='submit'], input[type='button']"
    not: {
      any_of: [
        { attribute: "aria-label" },
        { attribute: "aria-labelledby" },
        { has_text_content: true },
        { child: { tag: "svg", attribute: "aria-hidden", value: "false" } }
      ]
    }
  }
  
  then: {
    message: "Button lacks accessible name"
    suggested_fix: "Add aria-label=\"Action description\" or visible text"
    approach: "semantic-html"
  }
}
```

### 8.3 DSL Grammar (EBNF)
```
rule = "rule" STRING "{" 
         "description:" STRING
         "severity:" ("critical"|"serious"|"moderate"|"minor")
         "wcag_criterion:" STRING
         "when:" condition
         "then:" action
         ("tags:" "[" STRING ("," STRING)* "]")?
       "}"

condition = "{" 
              "selector:" STRING
              ("not:" condition)?
              ("any_of:" "[" condition ("," condition)* "]")?
              ("all_of:" "[" condition ("," condition)* "]")?
            "}"

condition =/ attribute_condition
          |/ css_condition
          |/ text_condition
          |/ selector_condition

attribute_condition = "{" "attribute:" STRING ("value:" STRING)? "}"
css_condition       = "{" "css_property:" STRING ("value:" STRING | "contains:" STRING) "}"
text_condition      = "{" "has_text_content:" BOOLEAN "}"
selector_condition  = "{" "selector:" STRING "}"

action = "{" 
           "message:" STRING
           "suggested_fix:" STRING
           ("approach:" ("semantic-html"|"aria"|"css"|"structure"))?
           ("examples:" "[" example ("," example)* "]")?
           ("confidence:" NUMBER)?
         "}"

example = "{" "bad:" STRING "good:" STRING "}"
```

### 8.4 Rule Management UI
| Feature | Description |
|---------|-------------|
| **Rule Editor** | Monaco-based DSL editor with IntelliSense |
| **Test Panel** | Paste HTML → run rule → see matches + suggested fixes |
| **Versioning** | Git-like history; rollback; publish to org |
| **Sharing** | Export/import `.a11yrule` files; marketplace submit |
| **Inheritance** | Org-level + project-level overrides |

### 8.4 Execution Engine
- **Parser**: PEG.js generated parser from grammar
- **Evaluator**: CSS selector → DOM → condition evaluation
- **Performance**: < 5ms per rule per element; caching
- **Sandbox**: WebAssembly isolate for untrusted rules (future)

### 8.5 Acceptance Criteria
- [ ] DSL parser handles all grammar constructs
- [ ] Test panel runs rule against HTML in < 100ms
- [ ] Rules execute during scan without slowing > 10%
- [ ] Custom violations appear in results with `source: "custom"`
- [ ] Rules versioned; rollback works
- [ ] Export/import `.a11yrule` files work

---

## SPEC-009: AI Accessibility Agent (Concept)

### 9.1 Vision
Autonomous agent that: scans repo → finds violations → generates fixes → creates PRs → verifies → repeats until clean.

### 9.2 Capabilities
| Capability | Description |
|------------|-------------|
| **Repo Analysis** | Clone → detect framework → map component structure |
| **Smart Scanning** | Prioritize changed files; skip unchanged; parallel scan |
| **Fix Generation** | Batch generate fixes for all violations |
| **PR Creation** | Group related fixes; create atomic PRs; add tests |
| **Verification** | Re-scan after merge; confirm resolution |
| **Learning** | Track fix acceptance; improve model |

### 9.3 User Interaction
```
User: @accessguard fix all critical in my repo
Agent: Scanning 47 components... Found 23 critical violations
Agent: Generating fixes... 18/23 high confidence
Agent: Creating 5 atomic PRs (grouped by component)
Agent: PRs created: #234, #235, #236, #237, #238
Agent: Waiting for review...
[User merges PRs]
Agent: Re-scanning... All critical resolved ✅
```

### 9.3 Safety Guards
- **Max PRs per run**: 10
- **Confidence threshold**: 0.85 minimum for auto-PR
- **Human approval required**: For `force_regenerate` or new patterns
- **Rollback**: One-click revert PR
- **Budget**: Max $50/run (LLM costs)

---

## SPEC-010: Accessibility App Store (Concept)

### 10.1 Marketplace Model
| Side | Actors | Value |
|------|--------|-------|
| **Publishers** | Agencies, freelancers, internal teams | Monetize custom rules, fix patterns, integrations |
| **Consumers** | Orgs using AccessGuard | Extend platform without building |
| **AccessGuard** | Platform operator | 30% revenue share; ecosystem lock-in |

### 10.2 Item Types
| Type | Example | Price Model |
|------|---------|-------------|
| **Custom Rules** | "Brand focus indicator", "Design system button" | Free / $10-100/mo |
| **Fix Patterns** | "React ARIA dialog fix", "Vue form validation" | Free / $5-50/fix |
| **Integrations** | "Contentful webhook", "Jira sync", "Slack alerts" | Free / revenue share |
| **Report Templates** | "Executive summary", "Legal defense pack" | Free / $20-200 |

### 10.3 Revenue Share
| Tier | Publisher Share | AccessGuard Share |
|------|-----------------|-------------------|
| **Standard** | 70% | 30% |
| **Verified Publisher** | 80% | 20% |
| **AccessGuard Certified** | 85% | 15% |

---

## Cross-Cutting Requirements

### Security (All Specs)
- [ ] All APIs: Rate limiting, authZ, input validation
- [ ] Secrets: Vault-managed; rotation policy
- [ ] Encryption: TLS 1.3 in transit; AES-256 at rest
- [ ] Audit: All mutations logged to audit trail
- [ ] Penetration test: Quarterly

### Accessibility (All Specs)
- [ ] WCAG 2.2 AA compliant (self-hosted dogfooding)
- [ ] Keyboard navigable
- [ ] Screen reader tested (NVDA, VoiceOver, JAWS)
- [ ] Color contrast: 4.5:1 minimum
- [ ] Focus indicators visible
- [ ] ARIA labels on all interactive elements

### Performance (All Specs)
- [ ] API p95 < 300ms
- [ ] Scan: 50 pages/minute
- [ ] AI fix: < 3s p95
- [ ] UI: Lighthouse > 90

### Observability (All Specs)
- [ ] Structured logging (Pino)
- [ ] Metrics: Prometheus (latency, errors, business)
- [ ] Traces: Sentry (100% sampled errors, 10% requests)
- [ ] Alerts: PagerDuty (critical paths)

---

*These specifications are implementation-ready. Each spec maps to a Phase 1-3 epic in ROADMAP.md. Update on scope change; version with semantic versioning.*