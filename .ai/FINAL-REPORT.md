# AccessGuard — Final Report

Cycle: **V23 — verified-fix engine + security hardening + re-review closure** · Date: 2026-11-22 · Owner: CTO agent

## What shipped

The four P0 "make the product true" gaps from `.ai/PRODUCT-CRITIQUE-DEEP.md` are closed.
The first V23 cut was reviewed twice: the first review found seven more defects (3
reproduced P0 defects, 3 High, 4 Medium, 1 Low), and the **re-review of that hardening
found 2 High, 7 Medium, 1 Low** — equivalent paths were still open. Every finding of
both rounds is fixed and covered by a regression test.

| Gap (before) | Now | Evidence |
|---|---|---|
| Confidence gate treated `null` (unknown, every template fix) as "good enough" | The gate reads **verification** confidence; `null` never passes. Template fixes carry `null` instead of a fabricated `0.5` | `src/lib/fix-verification.ts`, `src/lib/__tests__/fix-verification.test.ts` |
| Fixes were exact-string replacements of axe DOM HTML into source files | JSX/JS is located through a real AST (TypeScript compiler API) and patched at AST-derived offsets; occurrence-aware per rule **and** per element; placeholder and no-op rejection; the patched file is re-parsed and the patch discarded if it breaks | `src/lib/ast-patch.ts`, `src/lib/__tests__/ast-patch.test.ts`, `src/lib/__tests__/github-pr.test.ts` |
| Nothing re-ran axe on a patched page | axe is re-run on the remediation snippet for the rule it targets; only verified fixes open a PR; no browser means no PR (fail closed) | `src/lib/fix-verification.ts`, `src/app/api/github/create-pr/route.ts` |
| The VPAT PDF declared untested criteria out of scope | The PDF reuses `generateVPATData`: `not-evaluated`, per-criterion remarks, draft label on cover and footer | `src/app/api/reports/vpat/route.tsx`, `src/lib/__tests__/vpat-generator.test.ts` |

### Re-review findings (2026-11-22), fixed

| Finding | Severity | Fix |
|---|---|---|
| A handler the **scanned page already carried** executed in the verification browser and was written into customer repositories; `/onerror=` and an entity encoded `javascript:` URI bypassed the old checks | High | Event handlers are rejected unconditionally and the attributes are parsed the way a browser parses them; URI attributes are checked against a scheme allowlist after entity decoding and normalisation; overlay styles are rejected; the template fallback strips the scanned page's handlers |
| WebSocket traffic escaped the HTTP route interception and reached an internal endpoint | High | `context.routeWebSocket` closes every socket, the document carries a restrictive CSP (`connect-src 'none'`), service workers are blocked |
| The request limit did not bound concurrent browser work | Medium | A global semaphore runs at most two verification batches, a batch has a 60 s budget, a request waits at most 30 s for a slot |
| A violation was linked to a PR without an accepted artifact | Medium | A violation is linked only when GitHub accepted an artifact for it; `fixesWithoutArtifact` reports the rest |
| The locator could still pick the wrong element (class) or the wrong file (truncated tree) | Medium | Every identity attribute the report carries is compared; the whole tree is scanned under a byte budget; an incomplete scan never patches a file |
| An opened PR was not guaranteed to have an audit entry | Medium | The audit entry is written before the violations are linked, `createAuditLog` returns whether it was stored, the response reports `auditRecorded` |
| Markdown injection survived in untrusted prose | Medium | Untrusted prose is escaped for Markdown as well as HTML; selectors are inline code spans that cannot be broken out of |
| Hidden text satisfied the visible-content check | Medium | The visible-text check ignores hidden content and the browser compares the **rendered** text, so a fix that hides the label fails |
| The VPAT `scanId` was not tenant isolated | Medium | The scan must belong to the authorized project (`404` otherwise) and violations are queried by project **and** scan |
| The documented manual-check override was not wired | Low | The stored catalog id is resolved to the WCAG criterion it assesses; a real manual pass clears minor/moderate findings, a manual fail marks the criterion not supported |

### First review findings (2026-11-21), fixed

| Finding | Severity | Fix |
|---|---|---|
| Unsafe remediation executed in the verification browser before the safety checks and could fake an axe pass (`<script/x>`) | High | The safety, rule and placeholder checks now run **before** anything is rendered; every script spelling, active element, active URI scheme and event handler is rejected |
| The verification browser could make the host fetch arbitrary URLs (SSRF) | High | The verification context aborts every network request and closes every WebSocket; each run has a 15 s deadline; the OS sandbox stays on outside Docker |
| The work limit was applied after the browser work and the route had no rate limit | High | The cap is applied before verification, a request may not carry more than 25 violations, and the route is rate limited per user |
| The "verified" / "applied" counters overstated what GitHub accepted | Medium | A refused write is not counted; only accepted files are reported; the PR summary states exactly what was verified |
| The locator could patch the wrong element (same `src`, different `id`) or the wrong file | Medium | Every identity attribute must match; a multi-file match is left to a human |
| The verified-fix path wrote no audit trail | Medium | Every opened PR writes a `github_pr_created` audit entry |
| Untrusted text could inject misleading Markdown into the PR | Medium | Raw HTML and Markdown syntax are escaped and code fences are sized to their content |
| The VPAT could show "Supports" for a criterion that still had a violation | Low | Any unresolved violation is "Partially Supports"; only a manual check can clear minor/moderate findings |
| An axe-verified replacement could delete the visible content of the element | P0 | A patch that empties an element with visible text is rejected (hidden text does not count) |

Two further defects were found and fixed on the way: `applyFixesToRepository` re-read
the original file for every violation (a second fix in the same file overwrote the
first), and the route linked **all** requested violations to the PR, including the ones
it had excluded.

## Verification

| Check | Result |
|---|---|
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — 0 errors |
| `npx vitest run` | PASS — 51 files, 566 tests, 0 failed (was 50/523) |
| `npx vitest run --coverage` | PASS — statements 62.07% / branches 53.25% / functions 64.19% / lines 63.47% (CI thresholds 55/50/58/57) |
| `npm run build` | PASS — exit 0, Next standalone build |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev-toolchain) |
| Reviewer exploit reproductions (6) | PASS — every reproduction of the re-review is blocked |
| Browser isolation (real Chromium) | PASS — no HTTP request and no WebSocket reaches a local server during verification |

The V23 code initially pushed global branch coverage to 49.98% (below the CI gate of
50). It was fixed by covering the new code, not by moving the threshold: the GitHub
writer and API helpers now sit at 87% branch coverage and the AST patcher at 91%.

## Commits

- `8f44cc1` — `vol: engineering — V23: verified-fix pipeline (AST patching, axe verification, confidence gate, VPAT truth)`
- `b12484a` — `vol: docs — V23: verified-fix pipeline documentation and claim alignment`
- `d02161f` — `vol: state — V23: verified-fix engine evidence`
- `7498d46` — `vol: releases — V23: volume log entry`
- `3cd9ba6` / `a1bf6d7` / `6610d68` / `1cc529c` — first hardening pass (code, docs, state, volume entry)
- `93d880b` — PR-text escaping tests + scan coverage note
- `f40c251` / `999b02d` — coverage gate fix (tests, state)
- `f8f54f1` — `vol: devops — V23: repair the three CI pipelines`
- `4370a1a` — `vol: devops — V23: give the real-browser verification tests room on a cold CI runner`
- `8cb32db` — `vol: security — V23: close the re-review findings in the fix pipeline and the VPAT report`

## What this does NOT prove (read before making a claim)

- Verification is **rule-level on the remediation snippet**, not a full page re-scan and
  not a re-scan of the patched file. The customer's build is not available to the service.
- It does not prove the patch landed in the right file — an ambiguous match is left to a
  human rather than guessed.
- A verified fix can still break surrounding code. The PR is reviewed by a human before
  merge, and the PR summary states exactly what was verified.
- `.vue` / `.svelte` / `.astro` files keep the conservative exact-text match and can miss.
- Verification results are reported in the PR, the API response and the audit log, not
  stored on the `Violation` row. Persisting them is on the roadmap.
- **No Strix result exists for this cycle.** The CLI is installed and the target was a
  sanitized export of the commit, but every configured provider refused the run (Gemini
  free tier quota exhausted, NVIDIA `meta/llama-3.3-70b-instruct` end-of-life, OpenAI
  credits exhausted). The security evidence for this cycle is the independent
  human-agent reviews (including the re-review) plus `npm audit`; Strix must be re-run
  before it can be cited.
- **A third-party review of the re-review fix has not run yet.** The fix is covered by
  the reviewer reproductions re-run as permanent regression tests, not by another
  independent opinion.

## Follow-ups logged, not done here

- Replace the end-of-life NVIDIA model in the free pool
  (`src/ai/model-router.ts`). The router fails over on 4xx, so the chain still completes,
  but every AI remediation wastes one provider call. Picking a live model needs a check
  of the current NVIDIA catalogue (next AI volume).
- Re-run the Strix pentest against the same sanitized export once a provider has quota.
- Run Chromium as a non-root user in the Docker image so the OS sandbox stays enabled
  for the verification browser.
- Cache the parsed AST per file instead of re-parsing it per fix (bounded by the 60 s
  batch budget today).
- A source map from the scanned URL to the repository path, so a match is never
  ambiguous and a repository over the 5 MB scan budget can still be patched.

## User actions required

None. Nothing needs a secret, a plan change, a DNS change or a manual migration.
