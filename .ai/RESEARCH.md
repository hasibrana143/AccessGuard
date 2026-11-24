# AccessGuard — Research

The canonical research lives in the `docs/` tree; this file is a pointer, not a
second source of truth.

| Research area | Canonical document |
|---|---|
| The technical and market research behind the volumes | `docs/product/` · `docs/engineering/` |
| The AI model, prompt and evaluation research | `docs/ai/` |
| The security research and the threat model | `docs/security/` |
| The competitor and compliance research | `docs/security/` · `.ai/COMPLIANCE.md` |
| The browser and standards references the writer chain follows | `docs/engineering/` · `docs/development/` |

**The research that shaped the current design.** The security research is
recorded directly as the independent review series: every review that found an
equivalent path is archived as `.ai/SECURITY-REVIEW-*.md`, and each finding
carries its exact payload, the observable reproduction and the root cause in the
shipped code. The acceptance criteria and the closure decisions live in
`.ai/DECISIONS.md`; the accepted fail-closed false positives live in
`.ai/RISKS.md`.

**Standing research rules.** A finding without an observable reproduction is
not a finding. A finding without a root cause in the shipped code is not
actionable. A closure is made at the shared root cause, not by blocking only the
literal payload, and every closure carries a permanent regression that fails
before the fix.

**Freshness.** Library and platform documentation is fetched at the time of use
through the Context7 connector rather than from memory; the standards the writer
chain follows (the HTML parsing rules, the CSS selector grammar, the colour
syntaxes, the accessibility tree semantics) are cited in `docs/security/` and
`docs/ai/` where they are applied.
