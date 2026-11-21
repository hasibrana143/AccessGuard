# AccessGuard — Deployment Status

Last verification: 2026-11-22

## The pipelines

| Workflow | File | Trigger | Required | State on `main` |
|---|---|---|---|---|
| CI | `.github/workflows/ci.yml` | push / PR to `main` | **yes** — the gate | green (lint, tsc via build, vitest+coverage, `next build`, `npm audit`, Playwright) |
| Deploy | `.github/workflows/deploy.yml` | push / PR to `main` | no — secret-gated, skips with a notice | green (Vercel build + deploy when the secrets are set) |
| Docker | `.github/workflows/docker.yml` | push to `main`, `v*` tag | no — release path | image builds and pushes; Trivy image scan + Syft SBOM |
| AccessGuard Scan | `.github/workflows/accessguard.yml` | push / PR to `main`, `develop` | no — dogfooding | green (skips with a notice without the API key) |
| Load Tests | `.github/workflows/load.yml` | manual, weekly cron | no | builds, starts the server, runs k6 |
| Release | `.github/workflows/release.yml` | `v*` tag | no | changelog + GitHub Release |

## The repair (2026-11-21 → 2026-11-22)

Three pipelines had been red on `main` since September, each for a different
reason. The first hardening pass fixed the visible symptom of each; the second
pass fixed what the fix actually exposed.

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | The Postgres service health check never passed reliably | The health command was unquoted, so the container tested the shell instead of Postgres | Quoted the command: `--health-cmd "pg_isready -U accessguard -d accessguard_test"` |
| 2 | The image scan step failed before it scanned anything | `aquasecurity/trivy-action` was referenced by a floating tag that no longer resolved | Pinned to `v0.36.0` |
| 3 | The self-scan step failed on every push | The workflow called `accessguard/action@v1`, which does not exist | Rewritten onto AccessGuard's own public API (`POST /api/v1/scans`, `GET /api/v1/reports/vpat`); the step is skipped with a notice when the secrets are absent |
| 4 | The image build died at `/api/admin` | Next.js collects the route configuration at build time and the auth module throws without `NEXTAUTH_SECRET`; the build stage had no env at all | The build stage sets an ephemeral `NEXTAUTH_SECRET` (generated per build), the public `NEXTAUTH_URL` and a placeholder `DATABASE_URL`. No secret is baked into the image and no database has to be reachable |
| 5 | Trivy failed with `could not parse reference: ghcr.io/hasibrana143/AccessGuard:…` | A registry reference must be lowercase. The metadata action lowercases the name internally when it pushes, but the scan steps used the raw `${{ env.IMAGE_NAME }}` | The workflow resolves the pushed reference once (lowercase repository path + the sha tag that was pushed) and uses it for the Trivy scan and the Syft attestation. The job also got `security-events: write` for the SARIF upload |
| 6 | Trivy found 9 HIGH findings and failed the job | All 9 were in the base image's npm CLI bundle (`/usr/local/lib/node_modules/npm/node_modules/**`: pacote, sigstore, picomatch, ip-address, brace-expansion) — none in the application's dependencies | The runner stage installs npm 12.2.3, whose bundle carries fixed versions of all of them (sigstore 5.0.0, picomatch 4.0.5, pacote 22.0.1, ip-address 10.7.5, brace-expansion 5.0.12). The builder keeps the base npm — it never reaches the final image |
| 7 | The weekly load job would have failed in its build step | It built the app with only `DATABASE_URL` — the same missing-secret failure as the image build | The build step also gets `NEXTAUTH_SECRET` and `NEXTAUTH_URL` |
| 8 | The image scan failed although the image had no HIGH or CRITICAL finding | `trivy-action` drops the severity filter when the output format is SARIF (the report is meant to carry every severity), so the exit code counted the MEDIUM findings too | The scan keeps the filter (`limit-severities-for-sarif: true`), so only HIGH/CRITICAL fail the gate and reach the SARIF report. The scanner is pinned to `v0.76.2` (the action's default `v0.70.0` has known path traversal advisories) |

The load-test job was not among the three red pipelines (it runs on a weekly
cron); it carried the same defect and was fixed with it.

### The SARIF severity behaviour, from the action's own source

`aquasecurity/trivy-action@v0.36.0` — `entrypoint.sh`:

```sh
# Handle SARIF
if [ "${TRIVY_FORMAT:-}" = "sarif" ]; then
  if [ "${INPUT_LIMIT_SEVERITIES_FOR_SARIF:-false}" != "true" ]; then
    echo "Building SARIF report with all severities"
    unset TRIVY_SEVERITY      # <- the filter is dropped, so the exit code counts everything
  else
    echo "Building SARIF report"
  fi
fi
```

The input exists in the action (`action.yaml`: `limit-severities-for-sarif`) and
is exported as `INPUT_LIMIT_SEVERITIES_FOR_SARIF`. With it set to `true`,
`TRIVY_SEVERITY=CRITICAL,HIGH` survives into the scan, so only HIGH and CRITICAL
fail the job and appear in the SARIF report. The scanner is pinned to
`v0.76.2` (the action's default is `v0.70.0`, which has the path traversal
advisories GHSA-mcj4-mphf-j9ff and GHSA-8rc5-4fr6-64pw); the Trivy release
tag `v0.76.2` exists.

## Image scan — what the gate found

The first successful scan of the image (2026-11-22) reported:

| Location | HIGH | MEDIUM | Note |
|---|---|---|---|
| `/usr/local/lib/node_modules/npm/**` (base image's npm CLI) | 9 | 14 | fixed by the npm 12.2.3 upgrade |
| `/app/node_modules/**` (the application's tree) | 0 | 6 | dev-toolchain packages (`vitest`, `glob`/`minimatch` via the Sentry bundler plugins). `npm audit --audit-level=high` passes: Critical 0, High 0 |

After the npm upgrade the image carries **no HIGH and no CRITICAL** finding; the
remaining 8 findings are MEDIUM and live in the dev-toolchain tree
(`minimatch`, `glob`, `fast-copy`, `@vitest/mocker`) plus one in the npm bundle.
The gate itself is unchanged: Trivy fails the job on HIGH/CRITICAL and the
results are uploaded to code scanning as SARIF.

## The proof run (2026-11-22)

All four workflows are green on `8afc55a`:

| Run | Workflow | Result |
|---|---|---|
| 44955597980 | CI | ✅ success |
| 44955597965 | Deploy | ✅ success |
| 44955597959 | AccessGuard Scan | ✅ success |
| 44955598091 | Docker | ✅ success — the Trivy step passes with the severity filter restored |

The Docker run is the proof for the image gate: it builds the multi-arch image,
pushes it, scans it with Trivy `v0.76.2` (the exit code now counts HIGH/CRITICAL
only, because `limit-severities-for-sarif: true` keeps `TRIVY_SEVERITY` alive in
SARIF mode) and uploads the SARIF report. The 8 remaining MEDIUM findings are
uploaded as `warning` alerts; the code-scanning dashboard shows 0 High and 0
Critical open alerts.

## Local environment

- Docker services `accessguard-postgres-1` / `accessguard-redis-1` carry the
  dev database and Redis.
- The production image runs Chromium as root, so the OS sandbox is disabled
  there (recorded as risk 11 in `.ai/RISKS.md`).
