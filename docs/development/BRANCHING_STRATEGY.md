# Volume 4 — Branching Strategy

## Current reality (Vol 1–5)
- Single long-lived branch: `main`. All volume docs/code pushed as direct commits to `main`.
- `ci.yml` gates PRs/pushes **to main**; `docker.yml` publishes GHCR images on `main` and `v*` tags.
- Hotfixes also land on `main` (no backport path yet).

## Target model (adopt before scaling collaborators)

```
main  ─── M1 ── M2 ──● (protected: CI must pass, 1+ review)
          │         │
          feat/arbitration│       feature branch: feat/vol5/ai-cost
          │         │          PR → main (CI gates)
          └─────────┘
tag: v0.x.y  (on merge/mark)       hotfix/… → main directly
```

| Branch | Purpose | Merges via | CI |
| --- | --- | --- | --- |
| `main` | always-deployable | PR/commit — protection on | full ci.yml |
| `feat/<vol>-<slug>` | one volume/task | PR + review → main | full |
| `hotfix/<slug>` | prod incident | PR + 2 reviews → main | full |
| `release/vX` (optional) | staging/holiday | cherry-pick from main | full |
| `main` + tag `vX.Y.Z` | deploy + GHCR image | — | docker.yml tag job |

## Rules
- `main` must stay green: never push directly for non-trivial work (soft rule until team grows).
- Feature branches short-lived (< 3 days) to limit divergence.
- Immutable tags on GHCR: docker.yml pushes `v*`; CI artifacts tagged per run.
- Document, tests, and code for a volume travel **in the same PR**.
- First-class: don't branch for single-security fixes — forward to main with review (like Vol 6).