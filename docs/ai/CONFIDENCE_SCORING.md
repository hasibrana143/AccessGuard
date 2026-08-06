# Volume 5 — Confidence Scoring

## 1. Principle (changed Vol 5)

**A violation only carries a confidence score when a model actually produced it.**
Previously the scanner wrote fake `0.85–0.99` scores on static/template suggestions —
this mislabeled heuristic output as AI. Now:

| Path | `aiConfidenceScore` stored |
| --- | --- |
| Scan (axe-core / fetch / dom) | `null` (template suggestion, guidance text only) |
| `/api/remediate` → LLM success | parsed from response, clamped to [0,1], default `0.85` when absent |
| `/api/remediate` → template fallback | `0.5` (source `template`) |

## 2. Where scores matter

- **UI**: violations page shows an `%` confidence chip only when score present.
- **GitHub PR gate** (`create-pr/route.ts`): `MIN_FIX_CONFIDENCE = 0.7`;
  - `confidence === null` → template fix, **allowed**;
  - `confidence < 0.7` → skipped with feedback to the user;
  - `>= 0.7` → applied to PR.
- **Export**: CSV includes the score column (empty for null).

## 3. Calibration notes
- LLM scores are self-reported; clamp prevents >1/<0.
- Template fixes are deterministic — 0.5 reflects "no model judgment", not failure.
- Roadmap: per-rule calibration eval (see EVALS) to sanity-check model scores vs human labels.

## 4. Tests
- Parser clamps/fallback covered in `prompts.test.ts`.
- `fix-validation` + `github-pr` tests cover the 0.7 gate behavior.