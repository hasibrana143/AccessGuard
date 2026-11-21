# AccessGuard — Final Report

Cycle: **V23 — verified-fix engine + security hardening** · Date: 2026-11-21 · Owner: CTO agent

## What shipped

The four P0 "make the product true" gaps from `.ai/PRODUCT-CRITIQUE-DEEP.md` are closed,
and an independent QA + security review of the first V23 cut found seven more defects
(3 reproduced P0 defects, 3 High, 4 Medium, 1 Low). All of them are fixed and covered
by tests.

| Gap (before) | Now | Evidence |
|---|---|---|
| Confidence gate treated `null` (unknown, every template fix) as "good enough" | The gate reads **verification** confidence; `null` never passes. Template fixes carry `null` instead of a fabricated `0.5` | `src/lib/fix-verification.ts`, `src/lib/__tests__/fix-verification.test.ts` |
| Fixes were exact-string replacements of axe DOM HTML into source files | JSX/JS is located through a real AST (TypeScript compiler API) and patched at AST-derived offsets; occurrence-aware per rule **and** per element; placeholder and no-op rejection; the patched file is re-parsed and the patch discarded if it breaks | `src/lib/ast-patch.ts`, `src/lib/__tests__/ast-patch.test.ts`, `src/lib/__tests__/github-pr.test.ts` |
| Nothing re-ran axe on a patched page | axe is re-run on the remediation snippet for the rule it targets; only verified fixes open a PR; no browser means no PR (fail closed) | `src/lib/fix-verification.ts`, `src/app/api/github/create-pr/route.ts` |
| The VPAT PDF declared untested criteria out of scope | The PDF reuses `generateVPATData`: `not-evaluated`, per-criterion remarks, draft label on cover and footer | `src/app/api/reports/vpat/route.tsx`, `src/lib/__tests__/vpat-generator.test.ts` |

### Review findings, fixed

| Finding | Severity | Fix |
|---|---|---|
| Unsafe remediation executed in the verification browser before the safety checks and could fake an axe pass (`<script/x>`) | High | The safety, rule and placeholder checks now run **before** anything is rendered; every script spelling, active element, active URI scheme and spaced event handler is rejected |
| The verification browser could make the host fetch arbitrary URLs (SSRF) | High | The verification context aborts every network request; each run has a 15 s deadline; the OS sandbox stays on outside Docker |
| The work limit was applied after the browser work and the route had no rate limit | High | The cap is applied before verification, a request may not carry more than 25 violations, and the route is rate limited per user |
| The "verified" / "applied" counters overstated what GitHub accepted | Medium | A refused write is not counted; only accepted files are reported; the PR summary states exactly what was verified |
| The locator could patch the wrong element (same `src`, different `id`) or the wrong file | Medium | Every distinguishing attribute must match; a multi-file match is left to a human |
| The verified-fix path wrote no audit trail | Medium | Every opened PR writes a `github_pr_created` audit entry |
| Untrusted text could inject misleading Markdown into the PR | Medium | Raw HTML is escaped and code fences are sized to their content |
| The VPAT could show "Supports" for a criterion that still had a violation | Low | Any unresolved violation is "Partially Supports"; only a manual check can clear minor/moderate findings |
| An axe-verified replacement could delete the visible content of the element | P0 | A patch that empties an element with visible text is rejected |

Two further defects were found and fixed on the way: `applyFixesToRepository` re-read
the original file for every violation (a second fix in the same file overwrote the
first), and the route linked **all** requested violations to the PR, including the ones
it had excluded.

## Verification

| Check | Result |
|---|---|
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — 0 errors |
| `npx vitest run` | PASS — 50 files, 491 tests, 0 failed (was 45/410) |
| `npm run build` | PASS — exit 0, Next standalone build |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev-toolchain) |
| axe verification with a real browser | PASS — verified / failed / rejected cases behave as specified |

## Commits

- `8f44cc1` — `vol: engineering — V23: verified-fix pipeline (AST patching, axe verification, confidence gate, VPAT truth)`
- `b12484a` — `vol: docs — V23: verified-fix pipeline documentation and claim alignment`
- `d02161f` — `vol: state — V23: verified-fix engine evidence`
- `7498d46` — `vol: releases — V23: volume log entry`
- `vol: engineering — V23: security hardening (review findings)` (this cycle)
- `vol: state — V23: hardening evidence` and `vol: releases — V23: hardening entry`

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

## User actions required

None. Nothing needs a secret, a plan change, a DNS change or a manual migration.
