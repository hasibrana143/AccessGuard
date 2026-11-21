# Volume 5 — Confidence Scoring

## 1. Principle

**A confidence score is only ever stored when it describes something real, and only a
verified fix may reach a customer repository.**

Two different things used to be called "confidence" and both were wrong:

| Path | `aiConfidenceScore` stored |
| --- | --- |
| Scan (axe-core / fetch / dom) | `null` (guidance text only, no model ran) |
| `/api/remediate` → LLM success | parsed from the response, clamped to [0,1], default `0.85` when absent |
| `/api/remediate` → template fallback | `null` (source `template`) — the old `0.5` was a fabricated number |

The AI score is a **self-report**. It is kept as metadata (UI chip, CSV column) and it
is never used to decide that a fix is good enough.

## 2. Effective confidence (what the gate reads)

`src/lib/fix-verification.ts` derives the confidence the PR gate uses from an axe
re-run on the remediation snippet:

| Verification outcome | Effective confidence | PR gate |
| --- | --- | --- |
| axe confirms the rule no longer fires | `1.0` | passes (`>= MIN_FIX_CONFIDENCE`) |
| axe still reports the rule | `0` | skipped (`skippedLowConfidence`) |
| fix rejected by the safety/rule checks, axe could not evaluate the rule, or no browser | `null` | skipped (`skippedInvalid` / `skippedUnverified`) |

`MIN_FIX_CONFIDENCE = 0.7` still exists, but it now compares against **verification**
confidence. `null` never passes the gate: an unknown is not a pass.

Before V23 the gate read `aiConfidenceScore` directly and treated `null` as "allowed",
which meant every template fix bypassed the gate. That is fixed and covered by
`src/lib/__tests__/fix-verification.test.ts`.

## 3. Where scores matter

- **UI**: violations page shows a `%` confidence chip only when the AI score is present.
- **GitHub PR gate** (`create-pr/route.ts`): verification runs first; only verified
  fixes are written to the repository and listed in the PR.
- **Export**: CSV includes the score column (empty for null).

The AI score is not rendered in the PR body — the PR states what was verified, not
what a model claimed.

## 4. Calibration notes

- LLM scores are self-reported; the clamp prevents >1/<0 but does not make them evidence.
- Template fixes carry `null` because no model judged them. Their eligibility comes
  from the axe re-run, not from a made-up number.
- Roadmap: per-rule calibration eval (see EVALS) to sanity-check model scores vs
  human labels, kept separate from the verification gate.

## 5. Tests

- Parser clamp/fallback: `src/ai/__tests__/prompts.test.ts`.
- Gate behaviour: `src/lib/__tests__/fix-verification.test.ts` (unit + real browser).
- Patching behaviour: `src/lib/__tests__/github-pr.test.ts`, `src/lib/__tests__/ast-patch.test.ts`.
- PR route behaviour: `src/app/api/github/create-pr/route.test.ts`.
