# Volume 12 — Versioning & Release Policy

> Grounding: package.json `1.0.0`, no git tags yet (first tag = v1.0.0 at GA), docker.yml
> publishes `v*` semver + `latest` + `main-<sha>`.

## 1. SemVer policy
| Segment | Bump when |
|---|---|
| **MAJOR** | Breaking API change (response shapes, removed endpoints), breaking DB migration, pricing/platform changes |
| **MINOR** | New feature (backwards-compatible), new endpoint, new plan |
| **PATCH** | Bugfix, security fix, docs, non-breaking config |

- **Pre-release**: `1.1.0-beta.1` style only for experimental (feature flags carry most beta work instead).

## 2. Release mechanics
```
main (CI green) → semantic-release (or manual) → tag vX.Y.Z → docker.yml builds GHCR:
  ghcr.io/hasibrana143/accessguard:
    v1.0.3          ← immutable, points at exact commit
    v1.0            ← major.minor rolling
    latest          ← default branch (floats)
    main-<sha>      ← every main push
```
- **First tag**: `v1.0.0` at GA (Production Checklist gate).
- **Tag immutability**: never force-push/move tags. If a release is bad, release `v1.0.4` — never rewrite `v1.0.3`.
- **Changelog**: generated from commits (`vol: <area>` prefixes → sections); keep in `CHANGELOG.md` (to add).

## 3. API versioning
- Routes under `/api/*` (v1 implicit); `X-API-Version: v1` on `/api/docs`.
- Breaking change → new major: mount `/api/v2/*` (or new path), keep v1 alive ≥ 6 months, announce.
- OpenAPI spec (`src/lib/openapi.ts`) must document version bumps.

## 4. Database versioning
- Migrations forward-only; each release ships exactly its migration set.
- Schema version = migration history; never `db push` on prod.
- Downgrade = restore (ROLLBACK tier 3), never reverse-migrate.

## 5. Release checklist per version
1. CI all green (lint, vitest, build, audit, e2e).
2. CHANGELOG entry + docs updates (API_REFERENCE if endpoints changed).
3. Tag + push → GHCR image + SHA digest recorded (release note).
4. Deploy staging → smoke → deploy prod (RB01).
5. Post-deploy monitor (error rate, health) 30 min.

## 6. Rollback contract
- Rollback = deploy previous image (tags immutable, so old tags always available).
- Data migration bugs: ROLLBACK tier 3 (restore), with declared RPO/RTO (DISASTER_RECOVERY).