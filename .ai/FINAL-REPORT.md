# AccessGuard — Final Report

Cycle: **V23 — verified-fix engine** · Date: 2026-11-21 · Owner: CTO agent

## What shipped

The four P0 "make the product true" gaps from `.ai/PRODUCT-CRITIQUE-DEEP.md` are closed.

| Gap (before) | Now | Evidence |
|---|---|---|
| Confidence gate treated `null` (unknown, every template fix) as "good enough" | The gate reads **verification** confidence; `null` never passes. Template fixes carry `null` instead of a fabricated `0.5` | `src/lib/fix-verification.ts`, `src/lib/__tests__/fix-verification.test.ts` |
| Fixes were exact-string replacements of axe DOM HTML into source files | JSX/JS is located through a real AST (TypeScript compiler API) and patched at AST-derived offsets; occurrence-aware per rule **and** per element; placeholder and no-op rejection; the patched file is re-parsed and the patch discarded if it breaks | `src/lib/ast-patch.ts`, `src/lib/__tests__/ast-patch.test.ts`, `src/lib/__tests__/github-pr.test.ts` |
| Nothing re-ran axe on a patched page | axe is re-run on the patched element; only verified fixes open a PR; no browser means no PR (fail closed) | `src/lib/fix-verification.ts`, `src/app/api/github/create-pr/route.ts` |
| The VPAT PDF declared untested criteria out of scope | The PDF reuses `generateVPATData`: `not-evaluated`, per-criterion remarks, draft label on cover and footer | `src/app/api/reports/vpat/route.tsx`, `src/lib/__tests__/vpat-generator.test.ts` |

One further defect was found and fixed on the way: `applyFixesToRepository` re-read the
original file for every violation, so a second fix in the same file overwrote the first.
It now fetches and writes each file once.

## Verification

| Check | Result |
|---|---|
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — 0 errors |
| `npx vitest run` | PASS — 48 files, 449 tests, 0 failed (was 45/410) |
| `npm run build` | PASS — exit 0, Next standalone build |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev-toolchain) |
| axe verification with a real browser | PASS — verified / failed / link-name cases behave as specified |

## Commits

- `8f44cc1` — `vol: engineering — V23: verified-fix pipeline (AST patching, axe verification, confidence gate, VPAT truth)`
- `b12484a` — `vol: docs — V23: verified-fix pipeline documentation and claim alignment`
- `vol: state — V23: ...` (this file and the rest of `.ai/`)
- `vol: releases — V23: volume log entry` (`docs/VOLUMES.md`)

## What this does NOT prove (read before making a claim)

- Verification is **rule-level on the patched element**, not a full page re-scan. The
  customer's build is not available to the service. A rule that needs page context
  (e.g. `color-contrast` without a background) is reported as *unverified* and excluded.
- A verified fix can still break surrounding code. The PR is reviewed by a human before
  merge, and the PR summary states exactly what was verified.
- `.vue` / `.svelte` / `.astro` files keep the conservative exact-text match and can miss.
- Verification results are reported in the PR and the API response, not stored on the
  `Violation` row. Persisting them is on the roadmap.

## User actions required

None. Nothing needs a secret, a plan change, a DNS change or a manual migration.
