# Volume 7 — GitHub Actions CI/CD

## 1. Current pipelines (verified)

### `ci.yml` — on push/PR to `main`
- **Runner**: `ubuntu-latest`
- **Services**: Postgres 16 + Redis 7 (health-checked)
- **Steps**:
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` (Node 22, npm cache)
  3. `npm ci`
  4. `prisma generate`
  5. `prisma db push --skip-generate` (test DB)
  6. `db:constraints` (check constraints)
  7. `db:seed` (test fixtures)
  8. `npm run lint` (eslint, must be 0)
  9. `vitest run --coverage` (234 tests target)
  10. `npm run build` (Next standalone)
  11. `npm audit --audit-level=high`
  12. `playwright install --with-deps chromium`
  13. `npm run test:e2e` (Playwright)
  14. Upload Playwright report on failure (7-day retention)

### `docker.yml` — on push to `main` + `v*` tags
- **Permissions**: `contents: read`, `packages: write`
- **Steps**:
  1. Checkout
  2. `docker/login-action@v3` → GHCR with `GITHUB_TOKEN`
  3. `docker/metadata-action@v5` → tags:
     - `vX.Y.Z` (semver)
     - `vX.Y` (major.minor)
     - `main-<sha>` (branch-sha)
     - `latest` (default branch only)
  4. `docker/setup-buildx-action@v3`
  5. `docker/build-push-action@v6` → push, GHA cache (`type=gha`)

## 2. Gaps & hardening roadmap

| Gap | Action | Effort |
| --- | --- | --- |
| **No semantic release** | Add `semantic-release` job on `main` → auto version, changelog, GH release, tag `v*` → triggers docker.yml | M |
| **No dependency update automation** | Add Dependabot/Renovate config (`.github/dependabot.yml`) with grouped updates, auto-merge patch | S |
| **No container scanning** | Add Trivy step in docker.yml (`aquasecurity/trivy-action`) fail on HIGH/CRITICAL | S |
| **No SBOM** | Add `syft` in docker.yml, `attest` to GHCR | S |
| **No multi-arch build** | Add `platforms: linux/amd64,linux/arm64` in build-push-action | S |
| **No deployment job** | Add `deploy` job (after docker.yml) → ArgoCD sync / kubectl apply / SSH to VM | M |
| **No PR preview envs** | Add `deploy-preview` job for PRs → temporary namespace / Vercel preview / preview URL | M |
| **No coverage gate** | Add `vitest --coverage` threshold (e.g., 80% lines) | S |
| **No commit signing enforcement** | Add `gh-actions-verify-signatures` or require signed commits in branch protection | S |

## 3. Proposed pipeline structure (after gaps closed)

```
push/PR → main
  ├─ lint
  ├─ typecheck (source-only)
  ├─ test (vitest + coverage gate)
  ├─ build
  ├─ audit (high+)
  ├─ e2e (playwright)
  ├─ container-scan (trivy)
  └─ sbom (syft)
      ↓ (on main, all green)
docker.yml → GHCR (multi-arch, tagged v*, latest, sha)
      ↓ (on tag v*)
semantic-release → version bump, changelog, GH release, tag v*
      ↓
deploy (ArgoCD/Flux/kubectl) → staging → prod (manual approval gate)
```

## 4. Secrets required in GitHub repo settings
| Secret | Used by | Source |
| --- | --- | --- |
| `GITHUB_TOKEN` | docker login, release | Auto-provided |
| `SENTRY_DSN` | Sentry upload (optional) | Sentry project |
| `SNYK_TOKEN` / `TRIVY_DB_REPOSITORY` | container scan | Vendor |
| Cloud creds (AWS/AZURE/GCP) | deploy job | IAM / OIDC |

## 5. Branch protection (recommended)
- **main**: Required status checks = all CI jobs; Require PR review (1); Require linear history; Require signed commits; No force push; No deletions.
- **Tags `v*`**: Protected (only via semantic-release bot).