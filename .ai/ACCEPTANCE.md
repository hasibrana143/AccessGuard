# AccessGuard — Acceptance Checklist

The canonical acceptance criteria live in the `docs/` tree; this file is the
executable checklist and the pointer to the evidence. When the two disagree,
`docs/` wins on the criteria and this file wins on the evidence.

## The release gate

The tree is releasable only when **every** row below is PASS and an
independent security review returns **READY (Critical 0, High 0)**.

| # | Gate | Command / evidence | Current |
|---|---|---|---|
| 1 | Source-only typecheck | `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| 2 | Lint | `npm run lint` | PASS — 0 errors |
| 3 | Unit suite + coverage gate | `npx vitest run --coverage` | PASS — 53 files, 902/902; 68.88/61.78/72.06/70.74 (thresholds 55/50/58/57) |
| 4 | Build | `npm run build` | PASS — exit 0, 116 static pages |
| 5 | Browser E2E | `npx playwright test --project=chromium` | PASS — 78 passed, 1 flaky (passed on the retry) |
| 6 | Dependency audit | `npm audit --audit-level=high` | PASS — Critical 0 / High 0 (15 moderate) |
| 7 | Secret scan | the tracked-file pattern scan | PASS — no live credential |
| 8 | CI workflows | CI · Docker · Deploy · AccessGuard Scan on the pushed head | PASS — all four green on `2da3e00` |
| 9 | Independent security review | `.ai/SECURITY-REVIEW-15.md` | **NOT READY — Critical 0, High 4, Medium 5** |

## The per-finding acceptance criteria

Every finding of an independent review must satisfy all five:

1. a **permanent regression** is shipped that fails before the fix and passes
   after it;
2. the fix is made at the **shared root cause**, not by blocking only the literal
   payload;
3. the complete prior-review unsafe matrices are re-run and every unsafe
   direction produces **0 fixes and 0 writes**;
4. the **legitimate-behaviour** matrix is re-run and every listed behaviour stays
   writable or harmless;
5. the gate suite above is re-run and stays green.

## The evidence locations

| Evidence | File |
|---|---|
| The current phase, the blockers and the next action | `.ai/STATE.md` |
| The executable backlog | `.ai/TASKS.md` |
| The test evidence of every run | `.ai/TEST-STATUS.md` |
| The security dispositions of every review | `.ai/SECURITY-STATUS.md` |
| The review artifacts | `.ai/SECURITY-REVIEW-*.md` |
| The accepted fail-closed false positives | `.ai/RISKS.md` |
| The decisions and their rationale | `.ai/DECISIONS.md` |
| The pipeline runs | `.ai/DEPLOYMENT.md` |
| The cycle report | `.ai/FINAL-REPORT.md` |
