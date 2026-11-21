# AccessGuard — Security Status

Last verification: 2026-11-22

## Independent re-review of the V23 hardening (2026-11-22)

The first hardening pass was reviewed again against the shipped code (`7498d46..HEAD`).
The verdict was **NOT READY (High 2, Medium 7, Low 1)**: the first pass had closed the
*literal* reproductions, but equivalent paths were still open. Every finding of that
re-review is fixed in `8cb32db` and covered by a regression test.

| # | Finding | Reproduction | Fix |
|---|---|---|---|
| H1 | A handler the **scanned page already carried** survived into the fix, executed in the verification browser and was written into customer repositories; `/onerror=` bypassed the old regex; an entity encoded `javascript:` URI was executable in HTML and TSX | `<img src=x onerror=globalThis.__pwned=1>` → `verified / confidence 1`; `<img src=x /onerror=…>` → executed; `<a href=&#106;avascript:…>` → executed on click | Event handlers are rejected **unconditionally** and the attributes are parsed the way a browser parses them (`src/lib/html-attributes.ts`). URI attributes are checked against a scheme allowlist after entity decoding and whitespace normalisation. Overlay capable styles are rejected. The template fallback strips the handlers of the scanned element. The verification document carries a restrictive CSP (`connect-src 'none'`) |
| H2 | WebSocket traffic escaped the HTTP route interception and reached an internal endpoint | A local server saw `WS /internal` during `verifyFixes` | `context.routeWebSocket('**/*')` closes every socket, the document CSP forbids every connection, service workers are blocked, and the HTTP route abort stays in place (`createVerificationContext`) |
| M1 | The request count limit did not bound concurrent browser work | 20 concurrent requests → 20 Chromium instances | A global semaphore runs at most two verification batches, a batch has a 60 s budget, and a request waits at most 30 s for a slot |
| M2 | A violation was linked to a PR without an accepted artifact | `createFile` fails for the fix file → the violation is still linked | A violation is linked only when GitHub accepted an artifact for it (a patched source file or its fix document); `fixesWithoutArtifact` reports the rest |
| M3 | The locator could still select the wrong element or the wrong file | Two `<img src="x">` with different classes → the first was patched; the target file as the 51st tree entry → the first file was patched | Every identity attribute the report carries is compared (class, `aria-label`, `role`, `data-testid` included) and the **whole** source tree is scanned, bounded by a byte budget instead of a file count; an incomplete scan never patches a file |
| M4 | An opened PR was not guaranteed to have an audit entry | `db.violation.updateMany` fails after the PR exists → no audit call | The audit entry is written **before** the violations are linked, `createAuditLog` returns whether the entry was stored, and the response reports `auditRecorded` |
| M5 | Markdown injection survived in untrusted prose | `![tracking pixel](https://attacker.example/pixel)` kept its link in the PR body | Untrusted prose is escaped for Markdown as well as for HTML; code samples keep a sized fence and a selector is an inline code span that cannot be broken out of |
| M6 | Hidden text satisfied the visible-content check | `<span hidden>Read more</span>` → the visible label was gone but the patch was accepted | The visible-text check ignores hidden content (`hidden`, `aria-hidden`, `display:none`, `visibility:hidden`) and the verification browser compares the **rendered** text, so a fix that hides the label fails |
| M7 | The VPAT `scanId` was not tenant isolated | `projectId` of tenant A + `scanId` of tenant B → a report built from B's violations | The scan is verified to belong to the authorized project (`404` otherwise) and the violations are queried by project **and** scan |
| L1 | The documented manual-check override was not wired | The generator looked up WCAG ids (`1.1.1`), the manual checks are stored under catalog ids (`meaningful-alt`) | The stored id is resolved through the catalog to the WCAG criterion it assesses; a real manual pass clears minor/moderate findings, a manual fail marks the criterion not supported, and a pass never clears a critical or serious finding |

### Disposition of the first review's findings

| First review item | Disposition |
|---|---|
| H1 — unsafe remediation execution | **Not closed** by the first pass (equivalent execution through a carried handler) → closed by the re-review fix |
| H2 — verification browser SSRF | **Not closed** by the first pass (HTTP blocked, WebSocket open) → closed by the re-review fix |
| H3 — cap / rate limit | **Partially closed** (concurrency unbounded) → closed by the re-review fix |
| M1 — overstated counters | **Partially closed** (PR linkage overstated) → closed by the re-review fix |
| M2 — wrong element / file | **Not closed** (class and file-list variants) → closed by the re-review fix |
| M3 — audit trail | **Partially closed** (failure paths) → closed by the re-review fix |
| M4 — Markdown injection | **Not closed** (raw HTML escaped, Markdown not) → closed by the re-review fix |
| L1 — VPAT false support | Automated path closed in the first pass; the manual override was incomplete → closed by the re-review fix |
| QA P0-3 — visible content deletion | **Not closed** (hidden text variant) → closed by the re-review fix |

## Independent review of V23 (QA + security review, before the hardening pass)

Two independent reviews of the V23 diff (`21a1d00..HEAD`) were run. Both found
reproducible defects. The security review's verdict was **NOT READY (High 3)**; the QA
review's verdict was **PARTIAL** with three reproduced P0 defects. The table below
states what the first hardening pass fixed; the rows that were not fully closed are
marked and were closed by the re-review fix above.

### High — fixed

| # | Finding | Reproduction | Fix |
|---|---|---|---|
| H1 | Unsafe remediation executed in the verification browser before the safety checks and could fake an axe pass | `<img src="x" alt="A"><script/x>globalThis.__pwned=1</script>` → `verified / confidence 1` | The safety, rule and placeholder checks now run **before** anything is rendered (`verifyFixes` rejects first). The script check covers every spelling (`<script>`, `<script/x>`, `< script >`); active elements (`iframe`, `object`, `embed`, `applet`, `base`, `svg`, `style`, `link`, `meta`) are rejected; URI schemes are checked against an allowlist; **every** event handler is rejected (see the re-review fix for the handler that was carried by the scanned page) |
| H2 | The verification browser was a server-side SSRF and active-content primitive | A local server received `GET /internal` for `<img src="http://127.0.0.1:…/internal">` | The verification context aborts **every** network request and closes every WebSocket; the document carries a restrictive CSP; each render and axe run has a 15 s deadline; the Chromium sandbox stays on except where it cannot be used (Docker runs as root) |
| H3 | The per-request work limit was applied after the expensive work, and the route had no rate limit | Every submitted violation cost a browser launch and an axe run | The cap (`MAX_FIXES_PER_PR = 25`) is applied **before** verification, the request may not carry more than 25 violations, the route is rate limited per user (`rateLimits.remediation`) and a global semaphore bounds the concurrent browsers |

### Medium / low — fixed

| # | Finding | Fix |
|---|---|---|
| M1 | The "verified" / "applied" counters overstated reality | A failed GitHub write is no longer counted as modified or applied; only accepted files are counted; the PR summary now says "the remediation snippet was re-scanned for the rule it targets" and states that verification is rule-level, not a full re-scan |
| M2 | The locator could patch the wrong element or the wrong file | Every identity attribute the report carries must now match; an element found in more than one file is left to a human; the whole tree is scanned under a byte budget |
| M3 | The automated verified-fix path wrote no audit trail | Every opened PR writes a `github_pr_created` audit entry with the verified and skipped counts and the rules involved — written before the violations are linked |
| M4 | Untrusted descriptions, explanations and remediation text could inject misleading Markdown into the PR | Raw HTML **and** Markdown syntax in untrusted fields are escaped, and code fences are sized to the content they wrap |
| L1 | The VPAT could show "Supports" for a criterion that still had a violation | Any unresolved violation now yields "Partially Supports"; only a manual check can clear minor/moderate findings, and never a critical or serious one |

### P0 defects reproduced by QA — fixed

| # | Finding | Fix |
|---|---|---|
| P1 | Unsafe remediation was rendered before validation (see H1) | Validation moved before rendering |
| P2 | The AST matcher returned after the first distinguishing attribute, so two elements with the same `src` but different `id` patched the wrong one | Every identity attribute the report carries must match |
| P3 | An axe-verified replacement could delete the visible content of the element (`Read more` → `aria-label` + empty element) | A patch that empties an element with visible text is rejected — hidden text does not count as visible text |

## Findings fixed in the V23 cycle

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | The confidence gate treated `null` (unknown confidence, every template fix) as "good enough", so unverified fixes were written into customer repositories | High (trust) | FIXED — the gate reads verification confidence; `null` never passes (`src/lib/fix-verification.ts`) |
| 2 | A "fix" identical to the original element counted as applied | Medium (trust) | FIXED — no-op detection in `applyFixesToFile` |
| 3 | Fixes containing `TODO` / `{{…}}` / `YOUR_ALT_TEXT` were written into customer repositories | Medium | FIXED — placeholder rejection before patching |
| 4 | Patches were exact-string replacements of axe DOM HTML into source files, so JSX was patched by accident or not at all | High (correctness) | FIXED — AST-aware location for JSX/JS, re-parse guard discards a patch that breaks the file |
| 5 | `applyFixesToRepository` re-read the original file per violation, so a second fix in the same file overwrote the first | High (data loss in the PR) | FIXED — one fetch and one write per file |
| 6 | The VPAT PDF declared untested criteria out of scope | High (legal) | FIXED — the PDF reuses `generateVPATData` (`not-evaluated` + remarks) and is labelled a draft |

## Residual risk

| Risk | Rating | Why it is accepted |
|---|---|---|
| The Docker image runs Chromium as root, so the OS sandbox is disabled there | 🟡 MEDIUM | The verification document carries a restrictive CSP, the context aborts every HTTP request and closes every WebSocket, only validated markup is rendered, every run has a deadline, and the route is rate limited. Running the container as a non-root user is the follow-up (it also needs the Chromium sandbox packages). |
| Verification is rule-level on the remediation snippet, not on the patched file | 🟠 HIGH | Accepted by design: the customer's build is not available to the service. The patched file is re-parsed (syntax guard), ambiguous matches are left to a human, and the PR states exactly what was verified. |
| The element is located by content, not by a source map from the scanned URL | 🟡 MEDIUM | The whole tree is scanned under a byte budget; a match that is not unique is treated as ambiguous and is not patched. The source-map mapping is on the roadmap. |
| The AST is re-parsed per fix and per file | 🟢 LOW | Bounded by the 60 s batch budget and the 5 MB scan budget. Caching the parsed AST per file is on the roadmap. |
| A repository larger than the scan budget is never patched in place | 🟢 LOW | A complete scan is required to prove uniqueness; a tree that does not fit stays a review suggestion. Reported as `fixesWithoutArtifact` / a review file, never as a silent patch. |

## Dependency audit

```
npm audit --audit-level=high   → exit 0
Critical: 0 · High: 0 · Moderate: 15 (dev-toolchain only)
```

## External scan coverage

| Scanner | Where it runs | Status |
|---|---|---|
| `npm audit --audit-level=high` | local + CI (`.github/workflows/ci.yml`) | pass — Critical 0, High 0 |
| Independent security-engineer review of the V23 diff | local (CTO loop) | run twice: the first pass returned NOT READY (High 3) and all findings were fixed; the **re-review of that hardening** returned NOT READY (High 2, Medium 7, Low 1) — every finding is now fixed and covered by regression tests |
| Independent QA-engineer review of the V23 diff | local (CTO loop) | run once: 3 reproduced P0 defects, all fixed and covered by tests |
| Strix autonomous pentest (OSS CLI 1.6.2) | local (CTO loop) | **BLOCKED — the scan did not run.** The CLI is installed and the target was a sanitized export of the commit (no `.env` in the sandbox), but every configured provider refused the run: the default Gemini free tier is quota-exhausted (429, retry in ~14 h), NVIDIA's `meta/llama-3.3-70b-instruct` returns 410 Gone (model end-of-life 2026-08-26), and the OpenAI key has no credits left. No Strix finding exists for this cycle — do not cite Strix as evidence. Re-run it when a provider has quota. CI wiring has the same gap: the step needs an LLM secret the repository does not have, so it is not added rather than added broken. |

V23 dependency change: `typescript` and `axe-core` were promoted to production
dependencies (they are imported by runtime code; the lockfile diff is 9 lines, no new
packages were downloaded).

Upgrades applied for the published advisories:

| Package | Before | After | Advisory |
|---|---|---|---|
| next | 16.3.4 | 16.4.6 | RCE in `next/og` ImageResponse; `use cache` draft-mode leak |
| @sentry/nextjs | 10.66.0 | 10.78.0 | Middleware bypass with tunnel route |
| zod | 4.4.3 | 4.6.7 | Memory exhaustion on oversized constrained collections |
| prisma / @prisma/client | 6.11.1 | 6.19.3 | ReDoS via `effect` (override `effect ^3.22.1`) |
| sharp (override) | 0.35.4 | 0.35.5 | librsvg CVE-2026-96889 |
| vite (override) | 8.2.0 | 8.3.8 | launch-editor command execution / fs checks |
| source-map-js (override) | 1.2.1 | 1.2.4 | Event-loop denial of service |
| brace-expansion (nested overrides) | 1.1.18 / 5.0.9 | 1.1.22 / 5.0.13 | Quadratic expansion + stack exhaustion |

## Findings fixed in this cycle

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Public onboarding endpoints (`/api/onboarding/scan`, `/api/onboarding/vpat`) claimed rate limiting but had none — each request spawns a real browser scan | High (compute abuse) | FIXED — 5/min per client, shared bucket, covered by `src/app/api/onboarding/onboarding-rate-limit.test.ts` |
| 2 | Scan-auth credentials (login script, login credentials) were stored unencrypted | High | FIXED — AES-256-GCM at rest, `src/lib/scan-auth.ts` |
| 3 | Scan-auth GET returned the login script when no `scriptConfig` was set | High | FIXED — scripts and credentials are never returned; values are masked |
| 4 | Scan-auth used a hand-rolled permission check instead of the RBAC guard | Medium | FIXED — `requireVerifiedEmail(..., { permission: MANAGE_SETTINGS })` |
| 5 | Audit whitelist test matched non-audit `action:` fields | Low (test defect) | FIXED — the test now anchors on audit writes only |
| 6 | `projectId` was read from the unvalidated request body | Low | FIXED — validated by the Zod schema |
| 7 | 9 audit actions had no UI label (`audit-actions-diff` reported MISSING_LABELS=9) | Low | FIXED — labels added to `messages/en.json` + `messages/hi.json` (MISSING_LABELS=0) |
| 8 | Fresh-database deploy was broken (`Organization.pagesQuota` missing; agency/integration schema never migrated) | High (release blocker) | FIXED — two idempotent migrations, fresh DB reaches zero drift |

## Scan-auth credential handling (current design)

- Guard: verified email + `manage_settings` permission on every verb, project scoped to the caller's org.
- At rest: cookie values, sensitive header values, the login script and the login credentials are encrypted (AES-256-GCM).
- In transit: reads mask secrets (`••••••••`); the script and credentials are omitted.
- In the scanner: decrypted only when the browser context is prepared.
- Audit trail: `scan_auth_created` / `scan_auth_updated` / `scan_auth_deleted`.

## Not verified in this cycle

- Strix pentest — the CLI is installed but every configured provider refused the run
  (quota exhausted / model end-of-life / no credits). The independent review above
  covers the changed code paths; no Strix finding exists for this cycle.
- A third-party review of the re-review fix has not run yet. The fix is covered by the
  reviewer reproductions re-run as tests (`validateRemediation`, `verifyFixes`, the
  locator, the visible-text guard, the writer and the VPAT route).
