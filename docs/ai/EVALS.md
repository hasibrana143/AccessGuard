# Volume 5 — Remediation Evaluations (QA harness)

## 1. Automated gates today

| Suite | Covers |
| --- | --- |
| `src/ai/__tests__/prompts.test.ts` | prompt contract (version, markers, default/clamped confidence), template fixes never claim AI |
| `src/ai/__tests__/model-router.test.ts` | provider fallback semantics, timeouts, no-key skip, usage parsing |
| `src/ai/__tests__/cost.test.ts` | pricing math, unknown-model baseline |
| `src/lib/__tests__/fix-validation.ts`, `github-pr.ts` | injection guards + PR gate |
| Scanner suites | strategies produce `null` confidence (no fake AI) |

Total suite: **234 vitest** (was 214) + Playwright e2e (11 specs).

## 2. Gap: LLM-output quality evals (roadmap)

No live LLM is called in CI (no key, determinism). Planned:

1. **Golden dataset**: fixtures (rule, bad snippet) × expected-good fix — run once with real key
   via a manual `npm run ai:evals` script; assert markers + `validateFixForRule` pass rate ≥ X%.
2. **Prompt regression**: each `PROMPT_VERSION` bump reruns the golden dataset; track
   pass-rate delta — revert prompt if worse.
3. **Confidence calibration**: compare model confidence vs human label on 100-sample set.
4. **Cost benchmark**: tokens per fix per model — feed COST_OPTIMIZATION decisions.

## 3. Criteria for a "good" fix (eval rubric)
- Contains a valid fix for the rule (rule-specific validator passes);
- passes generic injection guards;
- preserves original classes/attributes where expected;
- compiles as valid HTML/JSX (parser check on the code block).