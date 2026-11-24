# AccessGuard — Requirements

The canonical requirements live in the `docs/` tree; this file is a pointer, not a
second source of truth. When the two disagree, `docs/` wins.

| Requirement area | Canonical document |
|---|---|
| Product scope, users, value proposition | `docs/product/` (start with `docs/product/README.md`) |
| User stories and acceptance criteria | `docs/product/` · `docs/engineering/` |
| Design and UX requirements | `docs/design/ux/` |
| Engineering standards and constraints | `docs/engineering/` |
| Development workflow, branching, coding standards | `docs/development/` |
| AI behaviour and cost governance | `docs/ai/` |
| Security requirements and threat model | `docs/security/` |
| Operational requirements, runbooks, SLOs | `docs/operations/` (see `.ai/OPERATIONAL-EXCELLENCE.md`) |
| The executable backlog | `.ai/TASKS.md` |
| The test evidence | `.ai/TEST-STATUS.md` |

**Functional requirements** are the V23 product: scan a page with axe-core,
report the violations, generate a remediation for each, verify the remediation
in an isolated browser, and write the verified fixes into a connected customer
repository as a pull request.

**Non-functional requirements** — the security boundary of the writer chain is
the strict one: a remediation must preserve the customer's content, navigation,
network behaviour, focus behaviour, semantics, accessibility-tree presence and
rendering after the repository's own CSS and the repository's own runtime code
are combined with the generated fix. A destination the analyser cannot prove is
**unprovable**, and an unprovable destination never receives a source patch.

**Acceptance criteria** are the gate suite: source-only typecheck, lint, the
unit suite with the coverage gate, the standalone build, the Chromium E2E suite,
`npm audit` with Critical 0 / High 0, and an independent security review that
returns READY (Critical 0, High 0). See `.ai/ACCEPTANCE.md` for the checklist
and `.ai/FINAL-REPORT.md` for the current evidence.
