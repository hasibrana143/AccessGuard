# Volume 4 — Git Workflow

## 1. Commit message format

Repo convention (see recent history):

```
vol: <volume> — <what changed>

example: vol: ai — V5: remove fake AI confidence; prompt lib; cost accounting
example: vol: security — V6: fail-closed OAuth state; 8 docs
```

- Always prefixed with the affected area and a concrete summary.
- One logical change per commit (docs / code / config separate).
- `git status` + `git diff` review before staging; **stage only intended files** (no `.env`, no `*.log`).
- Never commit secrets or `.env`.

## 2. Pre-commit checklist
1. `npm run lint` → 0 errors.
2. `vitest run` → all green (target ≥ current count).
3. Source typecheck passes (see BUILD_SYSTEM §notes for the `.next` caveat).
4. For route/behavior changes: model a quick e2e spot run.

## 3. Pull request flow (PR-based; aligning repo to it)

- Branch: `feat/<slug>` (see BRANCHING_STRATEGY).
- PR body: bind to volume/DoD item; list tests run; reference docs updated.
- CI (`ci.yml`) runs on PRs to main: lint, vitest+coverage, build, audit, Playwright.
- Merge to main with **at least 1 approving review** (volume commit history shows docs+code together).

## 4. Pushing to remote
- `git push` to `origin/main` only from `main` (or PR merge).
- Releases tagged `vX.Y.Z` (docker.yml publishes on `v*`).
- Never force-push to `main`.

## 5. Housekeeping
- Keep history linear-ish (rebase before merge; squash tiny follow-ups like "record hash").
- Untracked artifacts (`.next`, logs) stay gitignored; remove stale generated `*.tsbuildinfo`
  when they appear without need.