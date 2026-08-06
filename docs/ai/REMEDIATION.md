# Volume 5 — AI Remediation

## 1. Pipeline (verified implementation)

```mermaid
flowchart LR
    U[User clicks "Generate remediation"] --> R[POST /api/remediate or /batch]
    R --> G{rbac: GENERATE_REMEDIATION + verified email + rate 20/min}
    G -- no --> 4[401/403/429]
    G -- yes --> S{Already cached & not forceRegenerate?}
    S -- yes --> C[return cached remediation + confidence]
    S -- no --> AI[src/ai: build prompts]
    AI --> M[model-router: primary -> fallback]
    M --> P[parse ---CODE--- / ---EXPLANATION--- / ---CONFIDENCE---]
    P -- llm code --> D[persist on Violation + cost audit log]
    P -- no code / no providers / no key --> T[template fallback 0.5]
```

- Entry: `src/app/api/remediate/route.ts` (+ `/batch`, limit 50).
- Module: `src/app/api/remediate/remediation.ts` → returns
  `{ remediationCode, explanation, confidence, source, model, usage, costEstimate }`.

## 2. LLM vs template

| Source | When | Confidence |
| --- | --- | --- |
| LLM | `AI_API_KEY` present AND provider responded with a code block | parsed from response (clamped 0–1, default 0.85) |
| Template | no key; all providers fail; no code block returned by model; parse failure | fixed 0.5, `source: 'template'` |

- LLM **never blocks** the product: on any failure chain it degrades to template remediation.
- Provider failures are logged with `violationId` (warn) — visible to ops.

## 3. Honesty (Vol 5) — what changed vs V6 notes
- The scanner previously wrote **fake `aiConfidenceScore: 0.92 / 0.85–0.99`** into violations at scan
  time, pretending "AI". **Fixed:** scanner strategies (axe-core, fetch, dom) now store
  `aiConfidenceScore: null`; template suggestions are labelled as guidance, not AI.
- Real confidence only ever becomes non-null when `/api/remediate` actually runs and stores it.
- The GitHub PR gate already treats `null` confidence as "template allowed".

## 4. Persistence & caching
- `Violation.remediationCode` + `aiExplanation` + `aiConfidenceScore` updated on generation;
  subsequent calls return cached until `forceRegenerate`.
- Public WCAG reference served by `GET /api/remediate`.

## 5. Tests
`src/ai/__tests__/*` (prompts, model-router, cost) — 20 new cases; full suite **234 passing**.