# AccessGuard — Architecture

The canonical architecture lives in the `docs/` tree; this file is a pointer, not
a second source of truth.

| Architecture area | Canonical document |
|---|---|
| The system architecture and the volume map | `docs/engineering/` · `docs/VOLUMES.md` |
| The engineering standards the code follows | `docs/development/CODING_STANDARDS.md` |
| The branching and release workflow | `docs/development/BRANCHING_STRATEGY.md` |
| The AI subsystem (prompts, models, evaluation, cost) | `docs/ai/` |
| The security architecture and the threat model | `docs/security/` |
| The deployment and infrastructure | `docs/development/DEPLOYMENT.md` · `.ai/DEPLOYMENT.md` |
| The operational runbooks and the SLOs | `.ai/OPERATIONAL-EXCELLENCE.md` · `.ai/SLO-DEFINITIONS.md` |

**The shipped stack.** Next.js (App Router) with TypeScript, Tailwind and
daisyUI on the front end; a Next.js route collection as the API; PostgreSQL
through Prisma as the database; Redis for the queue and the cache; Playwright
for the browser; axe-core for the rule engine; `@octokit/rest` for the GitHub
transport; NextAuth for the session.

**The verified-fix writer chain** — the boundary this repository's security
reviews concentrate on:

```
scan (axe-core in Chromium)
  → violation
  → remediation (src/ai/prompts.ts)
  → validation (src/lib/fix-validation.ts, src/lib/github-pr.ts)
  → destination analysis (src/lib/css-context.ts) — the repository's own CSS and runtime
  → isolated verification (src/lib/fix-verification.ts) — axe against the one rule
  → plan (src/lib/github.ts) — every source change decided before the first mutation
  → apply + pull request (src/app/api/github/create-pr/route.ts)
  → audit trail (github_pr_intent before the mutation, github_pr_created after)
```

Every stage can stop the chain. The order is the security property: the
destination is judged before the browser runs, the plan is complete before the
branch is created, and the intent audit record precedes the first irreversible
mutation.

**The architectural rule the whole chain rests on.** A destination the analyser
cannot prove is **unprovable**, and an unprovable destination never receives a
source patch. The reader is therefore allowed to be incomplete — but only in the
fail-closed direction, and every accepted incompleteness is recorded in
`.ai/RISKS.md`.
