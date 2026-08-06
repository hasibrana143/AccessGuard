# Volume 5 — Prompt Library

## 1. Location & contract

`src/ai/prompts.ts` — single source of truth for LLM prompts (was embedded in `remediation.ts`).

- `PROMPT_VERSION = 1` — bump on any prompt change; **parsed output carries the version back**.
- `WCAG_RULES` — 12 rule reference entries (name + requirement) used by both the LLM prompt and template fixes.
- Builders: `buildSystemPrompt()`, `buildUserPrompt(input)`.
- Parser: `parseRemediationResponse(response)` returns `{ remediationCode, explanation, confidence, promptVersion }`.
- Template: `renderTemplateFix(html, ruleId, description)`.

## 2. Response contract (markers)

The model must answer:
```
---CODE---
[fixed code here]
---EXPLANATION---
[why]
---CONFIDENCE---
[0-1]
```
- Regex parse is strict; missing confidence defaults to 0.85 (clamped to [0,1]).
- `Rule ID` included in the user prompt (added Vol5) → traceability in logs/tests.

## 3. System prompt guarantees

- Semantic HTML first; ARIA not as band-aid; keep JSX/React syntax valid; minimal change;
  code-only in the block; also return explanation + confidence. Temperature 0.2.

## 4. Versioning rule

Any wording/format change in `buildSystemPrompt`/`buildUserPrompt` bumps `PROMPT_VERSION`
**and** the parser must stay backwards-compatible (marker columns unchanged). Tests in
`src/ai/__tests__/prompts.test.ts` pin the contract.

## 5. Roadmap
- Prompt templates per rule category (bigger delimiter), versioned table.
- Changelog per `PROMPT_VERSION`; A/B eval of prompt versions (see EVALS).