# AccessGuard — Deployment Status

Last verification: 2026-11-23

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

## The sixth-review closure run (2026-11-22)

All four workflows are green on `cdb246a` (the sixth-review closure cycle):

| Run | Workflow | Result |
|---|---|---|
| 44987889201 | CI | ✅ success — lint, source-only typecheck, vitest + coverage, `next build`, `npm audit`, Playwright |
| 44987889206 | Deploy | ✅ success |
| 44987889266 | AccessGuard Scan | ✅ success (skips without the API key) |
| 44987889253 | Docker | ✅ success — `Trivy image scan (fail on HIGH/CRITICAL)` ✅, `Upload Trivy SARIF` ✅, `Syft SBOM attest` ✅ |

The code-scanning dashboard after this run: **0 open High, 0 open Critical**
(9 historical High and 20 Medium alerts, all closed). The Trivy step is the gate
and it passed.

## The seventh-review closure run (2026-11-22)

All four workflows are green on `08ab9ef` (the seventh-review closure cycle):

| Run | Workflow | Result |
|---|---|---|
| 45019857629 | CI | ✅ success — lint, source-only typecheck, vitest + coverage, `next build`, `npm audit`, Playwright |
| 45019857630 | Deploy | ✅ success |
| 45019857601 | AccessGuard Scan | ✅ success (skips without the API key) |
| 45019857658 | Docker | ✅ success — `Trivy image scan (fail on HIGH/CRITICAL)` ✅, `Upload Trivy SARIF` ✅, `Syft SBOM attest` ✅ |

The Docker job is the proof for the image gate: every step of `build-and-push`
is green, including the Trivy step that fails on HIGH/CRITICAL. The code-scanning
dashboard after this run: **0 open alerts** (0 High, 0 Critical).

The push that carries the pipeline record itself (`8516dc8`, `.ai/DEPLOYMENT.md`
only — `git diff --quiet 08ab9ef..8516dc8 -- src` is clean) was re-verified:

| Run | Workflow | Result |
|---|---|---|
| 45032422517 | CI | ✅ success |
| 45032422576 | Deploy | ✅ success |
| 45032422528 | AccessGuard Scan | ✅ success |
| 45032422524 | Docker | ✅ success — `Trivy image scan (fail on HIGH/CRITICAL)` ✅, `Upload Trivy SARIF` ✅, `Syft SBOM attest` ✅ |

Code-scanning after that run: **0 open alerts**.

## The eighth-review closure run (2026-11-22)

All four workflows are green on `2a652bf` (the eighth-review closure cycle):

| Run | Workflow | Result |
|---|---|---|
| 45048469014 | CI | ✅ success — lint, source-only typecheck, vitest + coverage, `next build`, `npm audit`, Playwright |
| 45048469040 | Deploy | ✅ success |
| 45048469096 | AccessGuard Scan | ✅ success (skips without the API key) |
| 45048468997 | Docker | ✅ success — `Trivy image scan (fail on HIGH/CRITICAL)` ✅, `Upload Trivy SARIF` ✅, `Syft SBOM attest` ✅ |

The Docker job is the proof for the image gate: every step of `build-and-push` is
green, including the Trivy step that fails on HIGH/CRITICAL — **no new HIGH
finding**. The code-scanning dashboard after this run: **0 open alerts** (the
alerts API returns an empty list for the open alerts).

The push that carries the pipeline record itself (`b476bb2`, `.ai/DEPLOYMENT.md`,
`.ai/RISKS.md` and `.ai/STATE.md` only — `git diff --quiet 2a652bf..b476bb2 -- src`
is clean) was re-verified:

| Run | Workflow | Result |
|---|---|---|
| 45050605925 | CI | ✅ success |
| 45050605955 | Deploy | ✅ success |
| 45050605956 | AccessGuard Scan | ✅ success |
| 45050606224 | Docker | ✅ success — `Trivy image scan (fail on HIGH/CRITICAL)` ✅, `Upload Trivy SARIF` ✅, `Syft SBOM attest` ✅ |

Code-scanning after that run: **0 open alerts**.

Two deprecation annotations rode along with the green runs: the pinned actions
target Node.js 20 and are forced to Node.js 24, and CodeQL Action v3 is
deprecated in December 2026. Both are recorded as risk #35 with the exact
upgrade targets. The upgrade was deliberately kept out of this cycle, so the
pipeline record stays bound to the reviewed tree (`git diff --quiet
08ab9ef..2a652bf -- src` is the only source change set of the cycle).

### How this cycle was shipped

The `/ship` skill was invoked for this cycle, but its helper binaries
(`gstack-ship-preflight`, `gstack-skill-end`) are `bun` scripts and **bun is not
installed on this machine** (documented in `AGENTS.md`: use `npm`/`node`), so the
workflow stops at pre-flight — it also refuses to work on the base branch by
design. The repository's volume definition of done mandates a **direct push to
`origin/main`** with `vol: <area> — V<n>: <summary>` commits, so the DoD steps were
executed manually and each one is evidenced above: the gate suite (tsc, lint, vitest
+ coverage, build, Playwright, `npm audit`), the DoD-ordered commits and the four
green workflow runs.

### How the eighth-review cycle was shipped

The commits, in the order the volume definition of done asks for:

| Commit | Layer | Content |
|---|---|---|
| `dd81c7f` | security | the six eighth-review findings closed at their root cause, with 21 permanent regressions |
| `ef384a6` | docs | `docs/ai/FIX_VERIFICATION.md` and `docs/ai/VALIDATION_ENGINE.md` brought in line with the shipped behaviour |
| `3992baf` | state | the closure evidence in `.ai/` and the reviewer's own artifact `.ai/SECURITY-REVIEW-8.md` |
| `2a652bf` | releases | the V23 row in `docs/VOLUMES.md` — the closure description and the hash chain |

The gate suite that backed the push: `npx tsc -p tsconfig.check.json --noEmit`
0, `npm run lint` 0, `npx vitest run --coverage` 53 files / 724 tests, coverage
64.83 / 56.97 / 66.58 / 66.32 (thresholds 55 / 50 / 58 / 57), `npm run build` 0,
`npx playwright test --project=chromium` 79/79, `npm audit --audit-level=high`
Critical 0 / High 0, plus the temporary reviewer-payload re-run at 78/78 (deleted
after the run).

## The ninth-review closure run (2026-11-23)

All four workflows are green on `78ec751` (the ninth-review closure cycle):

| Run | Workflow | Result |
|---|---|---|
| 45062171397 | CI | ✅ success — lint, source-only typecheck, vitest + coverage, `next build`, `npm audit`, Playwright |
| 45062171491 | Deploy | ✅ success |
| 45062171513 | AccessGuard Scan | ✅ success (skips without the API key) |
| 45062171468 | Docker | ✅ success — `Trivy image scan (fail on HIGH/CRITICAL)` ✅, `Upload Trivy SARIF` ✅, `Syft SBOM attest` ✅ |

The Docker job is the proof for the image gate: every step of `build-and-push` is
green, including the Trivy step that fails on HIGH/CRITICAL — **no new HIGH
finding**. The code-scanning dashboard after this run: **0 open alerts**.

The same two deprecation annotations rode along with the green runs: the pinned
actions target Node.js 20 and are forced to Node.js 24, and CodeQL Action v3 is
deprecated in December 2026. Both stay recorded as risk #35 with the exact
upgrade targets. The upgrade was deliberately kept out of this cycle, so the
pipeline record stays bound to the reviewed tree: `git diff --quiet
08ab9ef..d1cabd6 -- src` is the only source change set of the cycle, and
`git diff --quiet d1cabd6..HEAD -- src` is clean.

### How the ninth-review cycle was shipped

The commits, in the order the volume definition of done asks for:

| Commit | Layer | Content |
|---|---|---|
| `d1cabd6` | security | the six ninth-review findings closed at their root cause, with 26 permanent regressions |
| `5fbb16e` | docs | `docs/ai/FIX_VERIFICATION.md` and `docs/ai/VALIDATION_ENGINE.md` brought in line with the shipped behaviour |
| `022db00` | state | the closure evidence in `.ai/` and the reviewer's own artifact `.ai/SECURITY-REVIEW-9.md` |
| `78ec751` | releases | the V23 row in `docs/VOLUMES.md` — the closure description and the hash chain |

The gate suite that backed the push: `npx tsc -p tsconfig.check.json --noEmit`
0, `npm run lint` 0, `npx vitest run --coverage` 53 files / 750 tests, coverage
65.22 / 57.50 / 67.04 / 66.70 (thresholds 55 / 50 / 58 / 57), `npm run build` 0,
`npx playwright test --project=chromium` 79/79, `npm audit --audit-level=high`
Critical 0 / High 0, plus the temporary reviewer-payload re-run at 42/42 (deleted
after the run).

## The tenth-review closure run (2026-11-23)

All four workflows are green on `94acf80` (the tenth-review closure cycle):

| Run | Workflow | Result |
|---|---|---|
| 45080482077 | CI | ✅ success (5m33s) — lint, source-only typecheck, vitest + coverage, `next build`, `npm audit`, Playwright |
| 45080482031 | Deploy | ✅ success (47s) |
| 45080482055 | AccessGuard Scan | ✅ success (9s — skips without the API key) |
| 45080482113 | Docker | ✅ success (18m19s) — `Trivy image scan (fail on HIGH/CRITICAL)` ✅, `Upload Trivy SARIF` ✅, `Syft SBOM attest` ✅ |

The Docker job is the proof for the image gate: every step of `build-and-push` is
green, including the Trivy step that fails on HIGH/CRITICAL — **no new HIGH
finding**. The code-scanning dashboard after this run: **0 open alerts** (29
historical alerts, all in the `fixed` state).

The same two deprecation annotations rode along with the green runs: the pinned
actions target Node.js 20 and are forced to Node.js 24, and CodeQL Action v3 is
deprecated in December 2026. Both stay recorded as risk #35 with the exact
upgrade targets. The upgrade was deliberately kept out of this cycle, so the
pipeline record stays bound to the reviewed tree: `git diff --quiet
08ab9ef..7ec51ee -- src` is the only source change set of the cycle, and
`git diff --quiet 7ec51ee..HEAD -- src` is clean.

### How the tenth-review cycle was shipped

The commits, in the order the volume definition of done asks for:

| Commit | Layer | Content |
|---|---|---|
| `7ec51ee` | security | the eight tenth-review findings closed at their root cause, with 20 permanent regressions (destination CSS, repository runtime, plan/apply split, audit intent) |
| `50fa70d` | ai | `docs/ai/FIX_VERIFICATION.md` and `docs/ai/VALIDATION_ENGINE.md` brought in line with the shipped behaviour |
| `cd85358` | state | the closure evidence in `.ai/` — the dispositions, the decisions, the risks, the test status and the final report |
| `94acf80` | releases | the V23 row in `docs/VOLUMES.md` — the closure description and the hash chain |

The gate suite that backed the push: `npx tsc -p tsconfig.check.json --noEmit`
0, `npm run lint` 0, `npx vitest run --coverage` 53 files / 770 tests, coverage
65.35 / 57.52 / 67.96 / 67.05 (thresholds 55 / 50 / 58 / 57), `npm run build` 0,
`npx playwright test --project=chromium` 79/79, `npm audit --audit-level=high`
Critical 0 / High 0, plus the temporary reviewer-payload re-run at 19/19 (deleted
after the run).

## The eleventh-review closure run (2026-11-23)

All four workflows are green on `435f72e` (the eleventh-review closure cycle):

| Run | Workflow | Result |
|---|---|---|
| 45140537033 | CI | ✅ success (5m27s) — lint, source-only typecheck, vitest + coverage, `next build`, `npm audit`, Playwright |
| 45140537127 | Deploy | ✅ success |
| 45140537097 | AccessGuard Scan | ✅ success (skips without the API key) |
| 45140537132 | Docker | ✅ success (17m25s) — `Trivy image scan (fail on HIGH/CRITICAL)` ✅, `Upload Trivy SARIF` ✅, `Syft SBOM attest` ✅ |

The Docker job is the proof for the image gate: every step of `build-and-push` is
green, including the Trivy step that fails on HIGH/CRITICAL — **no new HIGH
finding**. The code-scanning dashboard after this run: **0 open alerts** (29
historical alerts, all in the `fixed` state).

The same two deprecation annotations rode along with the green runs: the pinned
actions target Node.js 20 and are forced to Node.js 24, and CodeQL Action v3 is
deprecated in December 2026. Both stay recorded as risk #35 with the exact
upgrade targets. The upgrade was deliberately kept out of this cycle, so the
pipeline record stays bound to the reviewed tree: `git diff --quiet
08ab9ef..d429c6b -- src` is the only source change set of the cycle, and
`git diff --quiet d429c6b..HEAD -- src` is clean.

## The twelfth-review closure run (2026-11-23)

All four workflows are green on `d2a7cda` (the twelfth-review closure cycle):

| Run | Workflow | Result |
|---|---|---|
| 45167837692 | CI | ✅ success (5m53s) — lint, source-only typecheck, vitest + coverage, `next build`, `npm audit`, Playwright |
| 45167837620 | Docker | ✅ success — `Trivy image scan (fail on HIGH/CRITICAL)` ✅, `Upload Trivy SARIF` ✅, `Syft SBOM attest` ✅ |
| 45167837609 | Deploy | ✅ success — **skipped with a notice**: the Vercel secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) are not configured, so nothing was deployed |
| 45167837842 | AccessGuard Scan | ✅ success — **skipped with a notice**: `ACCESSGUARD_API_KEY` / `ACCESSGUARD_PROJECT_ID` are not configured, so the self-scan did not run |

The two skips are the documented secret-gated behaviour, not a coverage result:
neither the deployment nor the self-scan is claimed as evidence for this cycle.

## The thirteenth-review closure run (2026-11-23)

All four workflows are green on `cd6b3ad` (the thirteenth-review closure cycle):

| Run | Workflow | Result |
|---|---|---|
| 45227830428 | CI | ✅ success (8m03s) — lint, source-only typecheck, vitest + coverage, `next build`, `npm audit`, Playwright |
| 45227830850 | Docker | ✅ success (11m59s) — the multi-arch image builds, the Trivy step passes with the CRITICAL/HIGH filter, the SARIF upload and the Syft SBOM attest are green |
| 45227830783 | Deploy | ✅ success (1m06s) — **skipped with a notice**: the Vercel secrets are not configured, so nothing was deployed |
| 45227830812 | AccessGuard Scan | ✅ success (17s) — **skipped with a notice**: `ACCESSGUARD_API_KEY` / `ACCESSGUARD_PROJECT_ID` are not configured, so the self-scan did not run |

The two skips are the documented secret-gated behaviour, not a coverage result:
neither the deployment nor the self-scan is claimed as evidence for this cycle.

### How the eleventh-review cycle was shipped

The commits, in the order the volume definition of done asks for:

| Commit | Layer | Content |
|---|---|---|
| `2506792` | state | the eleventh independent review recorded — the reviewer's own artifact `.ai/SECURITY-REVIEW-11.md` and the dispositions |
| `d429c6b` | security | the six eleventh-review findings closed at their root cause, with 29 permanent regressions (the runtime carriers and the generic state reads, the effective painted surface, the clipping preservation, the custom-property resource resolution, the animation timing) |
| `d53daf7` | ai | `docs/ai/FIX_VERIFICATION.md` and `docs/ai/VALIDATION_ENGINE.md` brought in line with the shipped behaviour |
| `dce11ae` | state | the closure evidence in `.ai/` — the dispositions, the decisions, the risks, the test status and the final report |
| `435f72e` | releases | the V23 row in `docs/VOLUMES.md` — the closure description and the hash chain |

The gate suite that backed the push: `npx tsc -p tsconfig.check.json --noEmit`
0, `npm run lint` 0, `npx vitest run --coverage` 53 files / 799 tests, coverage
66.59 / 59.2 / 69.02 / 68.3 (thresholds 55 / 50 / 58 / 57), `npm run build` 0,
`npx playwright test --project=chromium` 79/79, `npm audit --audit-level=high`
Critical 0 / High 0, plus the temporary closure matrix at 46/46 and the recovered
prior matrices at 19/19, 42/42 and 118/118 (all deleted after the run).

### How the twelfth-review cycle was shipped

The commits, in the order the volume definition of done asks for:

| Commit | Layer | Content |
|---|---|---|
| `7858a1f` | state | the twelfth independent review recorded — the reviewer's own artifact `.ai/SECURITY-REVIEW-12.md` and the dispositions |
| `11065e4` | security | the nine twelfth-review findings closed at their root cause, with 30 permanent regressions (the resolved attribute-name reads, the script-carrier discovery, the remediation-introduced elements, the functional pseudo-classes, the removal semantics, the focusability transition, the painted surface of a non-positioned element, the direction-free offsets, the URI preservation and the nested hiding) |
| `9cee793` | ai | `docs/ai/FIX_VERIFICATION.md` and `docs/ai/VALIDATION_ENGINE.md` brought in line with the shipped behaviour |
| `3803897` | state | the closure evidence in `.ai/` — the dispositions, the decisions, the risks, the test status and the final report |
| the releases commit | releases | the V23 row in `docs/VOLUMES.md` — the closure description and the hash chain |

The hash of the releases commit itself is written into this table by that
commit — the chain in `docs/VOLUMES.md` is the authoritative one.

The gate suite that backed the push: `npx tsc -p tsconfig.check.json --noEmit`
0, `npm run lint` 0, `npx vitest run --coverage` 53 files / 829 tests, coverage
67.15 / 59.74 / 69.83 / 68.81 (thresholds 55 / 50 / 58 / 57), `npm run build` 0,
`npx playwright test --project=chromium` 79/79, `npm audit --audit-level=high`
Critical 0 / High 0, plus the temporary closure matrix at 26/26, the real-route
closure harness at 8/8 and the recovered prior matrices at 37/37, 42/42, 19/19,
9/9 and 118/118 (all deleted after the run).

Strix was **not** run for this cycle: every configured provider refuses the run
(quota / EOL model / no credits), so no Strix result is claimed.

### How the thirteenth-review cycle was shipped

The commits, in the order the volume definition of done asks for:

| Commit | Layer | Content |
|---|---|---|
| `b723be5` | state | the thirteenth independent review recorded — the reviewer's own artifact `.ai/SECURITY-REVIEW-13.md` and the dispositions |
| `be81d02` | security | the seven thirteenth-review findings closed at their root cause, with 26 permanent regressions (the document base URL, the computed runtime state reads, the CSS transition semantics, the focusability transition, the outline paint geometry, the inset shorthand offsets, the safety order against the source budget and the false positive the closure introduced) |
| `24263f3` | ai | `docs/ai/FIX_VERIFICATION.md` and `docs/ai/VALIDATION_ENGINE.md` brought in line with the shipped behaviour |
| the state commit | state | the closure evidence in `.ai/` — the dispositions, the decisions, the risks, the test status and the final report |
| the releases commit | releases | the V23 row in `docs/VOLUMES.md` — the closure description and the hash chain |

The hash of the releases commit itself is written into this table by that
commit — the chain in `docs/VOLUMES.md` is the authoritative one.

The gate suite that backed the push: `npx tsc -p tsconfig.check.json --noEmit`
0, `npm run lint` 0, `npx vitest run --coverage` 53 files / 853 tests, coverage
68.02 / 60.67 / 71.05 / 69.81 (thresholds 55 / 50 / 58 / 57), `npm run build` 0,
`npx playwright test --project=chromium` 79/79, `npm audit --audit-level=high`
Critical 0 / High 0, plus the temporary closure matrix at 21/21, the false-positive
probe at 3/3 after the fix, and the recovered prior matrices at 26/26, 37/37,
42/42, 19/19, 9/9 and 118/118 (all deleted after the run). The two pre-closure
eleventh-review harnesses failed exactly as expected (12 failed + 5 passed and
2 failed + 7 passed) — the failures assert that the eleventh-review
vulnerabilities still exist, so they confirm the closure.

Strix was **not** run for this cycle: every configured provider refuses the run
(quota / EOL model / no credits), so no Strix result is claimed.

## The fourteenth-review closure run (2026-11-24)

All four workflows are green on `2da3e00` (the fourteenth-review closure cycle):

| Run | Workflow | Result |
|---|---|---|
| 45296672365 | CI | ✅ success (7m) — lint, source-only typecheck, vitest + coverage, `next build`, `npm audit`, Playwright |
| 45296672346 | Docker | ✅ success (16.4m) — the multi-arch image builds, the Trivy step passes with the CRITICAL/HIGH filter, the SARIF upload and the Syft SBOM attest are green |
| 45296672321 | Deploy | ✅ success (1.2m) — **skipped with a notice**: the Vercel secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) are not configured, so nothing was deployed |
| 45296672737 | AccessGuard Scan | ✅ success (0.2m) — **skipped with a notice**: `ACCESSGUARD_API_KEY` / `ACCESSGUARD_PROJECT_ID` are not configured, so the VPAT report and the self-scan did not run |

The two skips are the documented secret-gated behaviour, not a coverage result:
neither the deployment nor the self-scan is claimed as evidence for this cycle.

### How the fourteenth-review cycle was shipped

The commits, in the order the volume definition of done asks for:

| Commit | Layer | Content |
|---|---|---|
| `9ec1a3c` | state | the fourteenth independent review recorded — the reviewer's own artifact `.ai/SECURITY-REVIEW-14.md` and the dispositions |
| `d16797c` | security | the ten fourteenth-review findings closed at their root cause, with 49 permanent regressions (the `Reflect.get` computed reads, the browser-equivalent stylesheet-link discovery, the runtime-mutated document base, the structural selector and the patched-target identification, the native semantics and the keyboard focusability, the remediation's own inline style as a resource carrier, the escaped `]` in an attribute selector, the `:link` transition, the viewport-unit offset and the accessibility-tree suppression) and the two false positives the closure introduced |
| `1803d50` | ai | `docs/ai/FIX_VERIFICATION.md` and `docs/ai/VALIDATION_ENGINE.md` brought in line with the shipped behaviour |
| `0994fae` | state | the closure evidence in `.ai/` — the dispositions, the decisions, the risks, the test status and the final report |
| `2da3e00` | releases | the V23 row in `docs/VOLUMES.md` — the closure description and the hash chain |

The gate suite that backed the push: `npx tsc -p tsconfig.check.json --noEmit`
0, `npm run lint` 0, `npx vitest run --coverage` 53 files / 902 tests, coverage
68.88 / 61.78 / 72.06 / 70.74 (thresholds 55 / 50 / 58 / 57), `npm run build` 0,
`npx playwright test --project=chromium` 78 passed with 1 flaky (the
accessibility spec failed its first attempt and passed on the retry),
`npm audit --audit-level=high` Critical 0 / High 0, plus the temporary closure
matrix at 23/23, the fails-before proof at 21 + 7 + 2 failures, and the recovered
prior matrices at 118/118, 145/145 and 17/17 (all deleted after the run). The
two pre-closure eleventh-review harnesses failed exactly as expected (12 failed +
5 passed and 2 failed + 7 passed) — the failures assert that the eleventh-review
vulnerabilities still exist, so they confirm the closure.

Strix was **not** run for this cycle: every configured provider refuses the run
(quota / EOL model / no credits), so no Strix result is claimed.

## The fifteenth-review closure run (2026-11-24)

All four workflows are green on `9ae2a3a` (the fifteenth-review closure cycle):

| Run | Workflow | Result |
|---|---|---|
| 45326350671 | CI | ✅ success (6.5m) — lint, source-only typecheck, vitest + coverage, `next build`, `npm audit`, Playwright |
| 45326350629 | Docker | ✅ success (15.2m) — the multi-arch image builds, the Trivy step passes with the CRITICAL/HIGH filter, the SARIF upload and the Syft SBOM attest are green |
| 45326350627 | Deploy | ✅ success (1.4m) — **skipped with a notice**: `HAS_VERCEL_CREDS: false`, so the Vercel secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) are not configured and nothing was deployed |
| 45326350776 | AccessGuard Scan | ✅ success (0.1m) — **skipped with a notice**: `ACCESSGUARD_API_KEY` / `ACCESSGUARD_PROJECT_ID` are not configured, so the VPAT report and the self-scan did not run |

The two skips are the documented secret-gated behaviour, not a coverage result:
neither the deployment nor the self-scan is claimed as evidence for this cycle.

### How the fifteenth-review cycle was shipped

The commits, in the order the volume definition of done asks for:

| Commit | Layer | Content |
|---|---|---|
| `3859697` | state | the fifteenth independent review recorded — the reviewer's own artifact `.ai/SECURITY-REVIEW-15.md` and the dispositions |
| `b4bd811` | security | the nine fifteenth-review findings closed at their root cause, with 37 permanent regressions (the alternate attribute-read call forms, the reflected `data-*` reads, the id introduced on the patched target, the indexed collection receivers of the document base, the modern slash-alpha transparency, the class removal through a nested negation, the `@font-face` resource, the accessibility-tree hiding through the browser semantics and the removal of `autofocus`) |
| `d4cfaaf` | ai | `docs/ai/FIX_VERIFICATION.md` and `docs/ai/VALIDATION_ENGINE.md` brought in line with the shipped behaviour |
| `92341a3` | state | the closure evidence in `.ai/` — the dispositions, the decisions, the risks, the test status and the final report |
| `9ae2a3a` | releases | the V23 row in `docs/VOLUMES.md` — the closure description and the hash chain |

The gate suite that backed the push: `npx tsc -p tsconfig.check.json --noEmit`
0, `npm run lint` 0, `npx vitest run --coverage` 53 files / 939 tests, coverage
69.89 / 62.75 / 72.93 / 71.78 (thresholds 55 / 50 / 58 / 57), `npm run build` 0,
`npx playwright test --project=chromium` 79 tests with 0 failed,
`npm audit --audit-level=high` Critical 0 / High 0, plus the temporary closure
matrix at 24/24 (16 failures and 8 passed on the pre-closure tree), the
fails-before proof at 8 + 6 + 5 failures, and the recovered prior matrices at
118/118 and 209/209 across nine files (all deleted after the run). The two
pre-closure eleventh-review harnesses failed exactly as expected (12 failed + 5
passed and 2 failed + 7 passed) — the failures assert that the eleventh-review
vulnerabilities still exist, so they confirm the closure.

Strix was **not** run for this cycle: every configured provider refuses the run
(quota / EOL model / no credits), so no Strix result is claimed.

## The seventeenth-review closure run (2026-11-26)

All four workflows are green on `53e2af0` (the seventeenth-review closure tree):

| Run | Workflow | Result |
|---|---|---|
| 45810724743 | CI | ✅ success — lint, source-only typecheck, vitest + coverage, `next build`, `npm audit`, Playwright |
| 45810724518 | Docker | ✅ success — the multi-arch image builds, the Trivy step passes with the CRITICAL/HIGH filter, the SARIF upload and the Syft SBOM attest are green |
| 45810724689 | Deploy | ✅ success — **skipped with a notice**: `HAS_VERCEL_CREDS: false`, so the Vercel secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) are not configured and nothing was deployed |
| 45810724600 | AccessGuard Scan | ✅ success — **skipped with a notice**: `ACCESSGUARD_API_KEY` / `ACCESSGUARD_PROJECT_ID` are not configured, so the VPAT report and the self-scan did not run |

The two skips are the documented secret-gated behaviour, not a coverage result:
neither the deployment nor the self-scan is claimed as evidence for this cycle.

The closure of the seventeenth-review findings ships as five commits, in the order the
volume definition of done asks for:

| Commit | Layer | Content |
|---|---|---|
| `0d619ae` | state | the seventeenth independent review recorded — the reviewer's own artifact `.ai/SECURITY-REVIEW-17.md` |
| `5e30641` | security | the two seventeenth-review findings closed at their root cause, with 15 permanent regressions (every statically resolvable DOM mutation form and the unreadable method and written name that fail closed, the CSS declaration order of every `@font-face` descriptor and the incomplete family table) |
| `4f0a69f` | ai | `docs/ai/FIX_VERIFICATION.md` and `docs/ai/VALIDATION_ENGINE.md` brought in line with the shipped behaviour |
| this commit | state | the closure evidence in `.ai/` — the dispositions, the decisions, the risks, the test status and the final report |
| the releases commit | releases | the V23 row in `docs/VOLUMES.md` — the closure description and the hash chain |

The gate suite that backed the push: `npx tsc -p tsconfig.check.json --noEmit` 0,
`npm run lint` 0, `npx vitest run --coverage` 53 files / 987 tests, coverage
70.4 / 63.12 / 73.41 / 72.53 (thresholds 55 / 50 / 58 / 57), `npm run build` 0 (116
static pages), `npx playwright test --project=chromium` 79/79 with 0 failed,
`npm audit --audit-level=high` Critical 0 / High 0, plus the fails-before proof at
10 failures with the five benign-boundary tests passing before and after.

Strix was **not** run for this cycle: every configured provider refuses the run
(quota / EOL model / no credits), so no Strix result is claimed.

## Local environment

- Docker services `accessguard-postgres-1` / `accessguard-redis-1` carry the
  dev database and Redis.
- The production image runs Chromium as root, so the OS sandbox is disabled
  there (recorded as risk 11 in `.ai/RISKS.md`).
