# AccessGuard — Test Status

Last run: 2026-11-22 (V23 re-review closure cycle)

## Vitest

```
Test Files  51 passed (51)
Tests       566 passed (566)
Duration    ~17.5s
```

### Coverage (CI runs `vitest run --coverage`)

```
Statements  62.07%  (threshold 55)  PASS
Branches    53.25%  (threshold 50)  PASS
Functions   64.19%  (threshold 58)  PASS
Lines       63.47%  (threshold 57)  PASS
```

### New coverage in the re-review closure cycle

Every finding of the independent re-review has a regression test that fails on the
old code:

- `src/lib/__tests__/html-attributes.test.ts` (new, 10 tests) — browser-like attribute
  parsing (quoted, unquoted, boolean, slash separated, `>` inside a quoted value),
  entity decoding, URI normalisation, handler detection and handler stripping.
- `src/lib/__tests__/github-pr.test.ts` (43 tests) — the event handler of the scanned
  page is rejected, `/onerror=` is rejected, an entity encoded `javascript:` URI is
  rejected, an overlay style is rejected, ordinary `https`/`mailto`/relative URIs stay
  valid, and Markdown syntax in untrusted prose is escaped.
- `src/lib/__tests__/ast-patch.test.ts` (50 tests) — the class list, `aria-label`,
  `role` and `data-testid` are identity attributes (the wrong copy is not patched), and
  hidden text (`hidden`, `aria-hidden`, `display:none`, `visibility:hidden`) does not
  count as visible text.
- `src/lib/__tests__/github.test.ts` (26 tests) — the **whole** source tree is scanned
  (a target file beyond the first entries is found, an ambiguous match is still left
  alone), a tree over the byte budget is never patched, and the writer reports the ids
  of the fixes it actually wrote.
- `src/lib/__tests__/fix-verification.test.ts` (30 tests) — a carried handler, an
  entity encoded URI and a hidden text fix are rejected, and two **real browser**
  isolation tests prove that no HTTP request and no WebSocket reaches a local server
  during a verification run.
- `src/app/api/github/create-pr/route.test.ts` (11 tests) — a violation without an
  accepted artifact is not linked, a violation patched into a source file is linked, a
  failed audit write is reported (`auditRecorded: false`), and the audit trail is
  written even when the violation update fails.
- `src/lib/__tests__/vpat-generator.test.ts` (13 tests) — a scan of another tenant is
  answered with `404` and no violation is queried, the violation query is scoped to
  project **and** scan, and a **real** catalog manual check id
  (`meaningful-alt`, `keyboard-flow`) overrides the automated result.

The reviewer reproductions were re-run as a temporary suite before the permanent
regressions were written: all six reproductions (carried handler, `/onerror=`, entity
encoded `javascript:`, overlay style, wrong element by class, hidden text) are blocked.

## Previous cycle

Last run: 2026-11-21 (V23 verified-fix engine + security hardening cycle)

### Vitest

```
Test Files  50 passed (50)
Tests       523 passed (523)
Duration    ~17.4s
```

### Coverage (CI runs `vitest run --coverage`)

```
Statements  60.54%  (threshold 55)  PASS
Branches    52.05%  (threshold 50)  PASS
Functions   63.43%  (threshold 58)  PASS
Lines       61.84%  (threshold 57)  PASS
```

The V23 code initially pushed global branch coverage to **49.98%** — below the CI
gate, so the hardened commit would have failed CI. Fixed by covering the code V23
added, not by lowering the threshold: `src/lib/github.ts` (the GitHub writer and the
API helpers) and `src/lib/ast-patch.ts` (the AST locator and the HTML→JSX converter)
now sit at 87% and 91% branch coverage. No threshold was changed.

New coverage in this cycle:

- `src/lib/__tests__/ast-patch.test.ts` (38 tests) — AST location in JSX, occurrence
  awareness, HTML exact match, HTML→JSX conversion (`class`→`className`, void
  self-closing, `style` → object), placeholder rejection, parse guard, and the
  visible-text guard. Regression: two elements with the same `src` but a different
  `id` must not match each other. Also the attribute forms (single-quoted, unquoted,
  valueless, JSX expression), the class-list fallback, the style allow-list (a value
  that could escape the JS expression is dropped) and the edge cases of the text
  guard.
- `src/lib/__tests__/fix-verification.test.ts` (22 tests) — gate semantics (`null`
  never passes), verdict mapping (verified / failed / unverified), runner failure
  handling, the **check-before-render order** (an unsafe candidate never reaches the
  runner), mixed batches, and five **real browser** axe runs (verified fix,
  whitespace-only alt, rejected fixes, injected event handler). The browser block is
  skipped (visibly) when no Chromium is reachable; CI installs Chromium before the
  unit suite for this reason.
- `src/lib/__tests__/github-pr.test.ts` (35 tests) — occurrence-aware patching,
  independent elements of the same rule, placeholder rejection, no-op rejection,
  JSX patching through the AST, syntax-guard discard, content-loss rejection, the
  validation bypasses (`<script/x>`, unquoted `javascript:`, `data:text/html`,
  `onerror = "…"`, `iframe`/`object`/`svg`/`style`/`link`), and the Markdown
  escaping of untrusted text in the PR body.
- `src/lib/__tests__/github.test.ts` (20 tests) — the repository writer: one
  fetch and one write per file, two fixes in one file, two files, an ambiguous match
  left alone, a refused write not reported as applied, an unsafe fix never written;
  plus the GitHub API helpers (OAuth URL, code exchange, authenticated user,
  repository list, branch creation, file creation, pull request, write-access
  validation, repository details, token revocation, pull request status).
- `src/app/api/github/create-pr/route.test.ts` (new, 7 tests) — the PR route: no PR
  without remediation, the request cap, no PR when every fix is unverified, no PR when
  the branch fails, only eligible violations linked to the PR, the audit trail, and
  honest file counters.
- `src/lib/__tests__/vpat-generator.test.ts` (extended, 9 tests) — the conformance
  labels, the source guard, and the generator itself: a project without scans reports
  everything as not evaluated, a criterion with a violation never claims full
  support, critical violations are not supported, a manual check overrides the
  automated result.

## Playwright

```
npx playwright test --project=chromium   → 79 passed, 0 failed (4.2m)
```

An earlier run of the same suite showed one retry-only flake
(`e2e/landing.spec.ts`, authenticated CTA); the spec passes 5/5 in isolation and the
full suite is green again.

## Previous cycle

Last run: 2026-11-21 (authenticated scans cycle)

### Vitest

```
Test Files  45 passed (45)
Tests       410 passed (410)
Duration    ~11.0s
```

New coverage in this cycle:

- `src/app/api/scan-auth/route.test.ts` (6 tests) — 401 without session, 403 for members,
  404 across organizations, encryption at rest, masked reads, update, delete.
- `src/app/api/onboarding/onboarding-rate-limit.test.ts` (3 tests) — 5/min limit, per-client
  scope, shared budget between `/onboarding/scan` and `/onboarding/vpat`.

Repaired (stale or broken fixtures, not product regressions):

| Suite | Root cause |
|---|---|
| `rbac.test.ts` | `db.user.findUnique` mock returned only `{ emailVerifiedAt }`; `requireAuth` re-reads id/role/orgId from the database → 401/403. The mock now mirrors the session row. |
| `queue.test.ts` | The database mock missed `scanAuthConfig.findMany`, `scan.findFirst`, `violation.findMany` and `$transaction` after the executor started reading auth configs. |
| `projects` / `violations` route tests | Both suites upserted the same e-mail into different organizations → whichever ran first decided the user's org. Unique e-mails + deterministic upserts now. |
| `tenant-isolation.test.ts` | The session referenced a fabricated user id (`u-a`) that does not exist in the database → 401 instead of 403. A real org-A user is created now. |
| `notification-settings.test.ts` | The test asserted 2 alert keys; the alerts feature ships 4 (`newCritical`, `newSerious` added). |
| `audit-whitelist.test.ts` | The regex matched every `action:` property, including `IntegrationLog.action`. It now anchors on audit writes only. |
| `openapi-parity.test.ts` | 13 route handlers were missing from the spec and the schema count had drifted. The spec now covers all 112 paths / 70 schemas. |
| `manual-checks` route test | The database was missing `ManualCheck.evidence` (db push drift) — fixed by the migration repair. |

## Typecheck

```
npx tsc -p tsconfig.check.json --noEmit   → exit 0 (PASS)
```

## Lint

```
npm run lint   → exit 0 (PASS, 0 errors)
```

## i18n / audit guards

```
node scripts/audit-actions-diff.mjs   → MISSING_LABELS=0 (TOTAL_ACTIONS=65)
en/hi key parity                       → 1500 keys, 0 missing
```

## Build

```
npm run build   → exit 0 (PASS) — Next 16.4.6, 116/116 static pages, standalone build
```

## Database

```
prisma migrate deploy (fresh DB)                → all 13 migrations applied
prisma migrate diff fresh DB → schema.prisma    → "No difference detected"
prisma migrate diff dev DB   → schema.prisma    → "No difference detected"
```

## Playwright E2E

```
npx playwright test --project=chromium   → 79 passed, 0 failed (4.0 min)
```

The V21 cycle closed with 70 passed / 9 failed. All 9 are now fixed at the root cause
(report: `.gstack/qa-reports/qa-report-accessguard-2026-11-21.md`):

| # | Failing spec(s) | Root cause | Fix |
|---|---|---|---|
| 1 | `contrast.spec.ts` (3) + `a11y.spec.ts` (2) — 8 axe `color-contrast` failures | The severity/brand tokens were tuned for fills and icons (3:1) while the same tokens are 12px badge text on `bg-<severity>/10` (4.5:1). Light `--serious` was 3.07, `--moderate` 2.08, `--minor` 3.51, `--emerald` 2.86; dark `--critical` 3.98 | Retuned `--critical/--serious/--moderate/--minor/--emerald` (light) and `--critical` (dark) in `src/app/globals.css`, with the `oklch → sRGB → WCAG` math checked before writing the CSS (`.gstack/qa-reports/contrast-math.mjs`) |
| 2 | `landing.spec.ts` start button | Stale expectation: the landing CTA routes **authenticated** visitors to `/dashboard` (`src/app/page.tsx:25`), and the chromium project always runs with an authenticated storage state | The spec now expects `/dashboard` |
| 3 | `settings.spec.ts` privacy tab | The tab click landed before React hydration attached the Radix handler, so the panel never switched (the body still showed the Profile panel) | The spec waits for `aria-selected="true"` on the trigger before reading the panel copy |

## Not run (blocked)

- k6 load suites — need the full running stack.
- Strix pentest — the CLI is installed but every configured provider refused the run
  (quota exhausted / model end-of-life / no credits). The independent review recorded
  in `.ai/SECURITY-STATUS.md` covers the changed code paths.
- A third-party review of the re-review fix has not run yet; the reviewer
  reproductions are covered by the regression tests listed above.

## How to reproduce green

```powershell
docker compose up -d postgres redis
npx prisma migrate deploy
npx vitest run
npx tsc -p tsconfig.check.json --noEmit
npm run lint
npm run build
```
