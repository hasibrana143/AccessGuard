# AccessGuard — Product Requirements

The canonical product documentation lives in the `docs/` tree; this file is a
pointer, not a second source of truth.

| Product artifact | Canonical document |
|---|---|
| The product brief and the problem it solves | `docs/product/` |
| The product critique that drove the V23 truth gaps | `.ai/PRODUCT-CRITIQUE.md` and `.ai/PRODUCT-CRITIQUE-DEEP.md` |
| The design and UX specification | `docs/design/ux/` |
| The shipped scope of a volume | `docs/VOLUMES.md` |
| The strategy and the roadmap | `.ai/PRODUCT-STRATEGY.md` |

**Who it is for.** Teams that own a web product and need to know which
accessibility defects are in production, whether they are fixed, and what a
remediation looks like before it reaches the repository.

**What it does.** Scans a page with axe-core in a real browser, reports the
violations with the evidence, generates a remediation for each, verifies the
remediation against the single rule it claims to fix, and — only for a verified
remediation — opens a pull request against the connected customer repository.

**What it refuses to do.** It does not write a fix it cannot prove: an
ambiguous match stays a human decision, a destination the analyser cannot read
stays a review suggestion, and a fix that removes the customer's content,
navigation, network behaviour, focus behaviour or accessibility-tree presence
never reaches the repository.

**Scope boundaries.** The remediation is never written into a TypeScript module
or a mixed component file — the element text can sit inside a string or an
expression there, so the destination context cannot be proven. Verification
results are reported in the PR, the API response and the audit log, not stored
on the `Violation` row. Per-file patch persistence is on the roadmap.

The executable backlog is `.ai/TASKS.md`; the acceptance checklist is
`.ai/ACCEPTANCE.md`.
