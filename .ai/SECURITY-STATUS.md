# AccessGuard — Security Status

Last verification: 2026-11-21

## Findings fixed in the V23 cycle

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | The confidence gate treated `null` (unknown confidence, every template fix) as "good enough", so unverified fixes were written into customer repositories | High (trust) | FIXED — the gate reads verification confidence; `null` never passes (`src/lib/fix-verification.ts`) |
| 2 | A "fix" identical to the original element counted as applied | Medium (trust) | FIXED — no-op detection in `applyFixesToFile` |
| 3 | Fixes containing `TODO` / `{{…}}` / `YOUR_ALT_TEXT` were written into customer repositories | Medium | FIXED — placeholder rejection before patching |
| 4 | Patches were exact-string replacements of axe DOM HTML into source files, so JSX was patched by accident or not at all | High (correctness) | FIXED — AST-aware location for JSX/JS, re-parse guard discards a patch that breaks the file |
| 5 | `applyFixesToRepository` re-read the original file per violation, so a second fix in the same file overwrote the first | High (data loss in the PR) | FIXED — one fetch and one write per file |
| 6 | The VPAT PDF declared untested criteria out of scope | High (legal) | FIXED — the PDF reuses `generateVPATData` (`not-evaluated` + remarks) and is labelled a draft |

## Dependency audit

```
npm audit --audit-level=high   → exit 0
Critical: 0 · High: 0 · Moderate: 15 (dev-toolchain only)
```

V23 dependency change: `typescript` and `axe-core` were promoted to production
dependencies (they are imported by runtime code; the lockfile diff is 9 lines, no new
packages were downloaded).

Upgrades applied for the published advisories:

| Package | Before | After | Advisory |
|---|---|---|---|
| next | 16.3.4 | 16.4.6 | RCE in `next/og` ImageResponse; `use cache` draft-mode leak |
| @sentry/nextjs | 10.66.0 | 10.78.0 | Middleware bypass with tunnel route |
| zod | 4.4.3 | 4.6.7 | Memory exhaustion on oversized constrained collections |
| prisma / @prisma/client | 6.11.1 | 6.19.3 | ReDoS via `effect` (override `effect ^3.22.1`) |
| sharp (override) | 0.35.4 | 0.35.5 | librsvg CVE-2026-96889 |
| vite (override) | 8.2.0 | 8.3.8 | launch-editor command execution / fs checks |
| source-map-js (override) | 1.2.1 | 1.2.4 | Event-loop denial of service |
| brace-expansion (nested overrides) | 1.1.18 / 5.0.9 | 1.1.22 / 5.0.13 | Quadratic expansion + stack exhaustion |

## Findings fixed in this cycle

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Public onboarding endpoints (`/api/onboarding/scan`, `/api/onboarding/vpat`) claimed rate limiting but had none — each request spawns a real browser scan | High (compute abuse) | FIXED — 5/min per client, shared bucket, covered by `src/app/api/onboarding/onboarding-rate-limit.test.ts` |
| 2 | Scan-auth credentials (login script, login credentials) were stored unencrypted | High | FIXED — AES-256-GCM at rest, `src/lib/scan-auth.ts` |
| 3 | Scan-auth GET returned the login script when no `scriptConfig` was set | High | FIXED — scripts and credentials are never returned; values are masked |
| 4 | Scan-auth used a hand-rolled permission check instead of the RBAC guard | Medium | FIXED — `requireVerifiedEmail(..., { permission: MANAGE_SETTINGS })` |
| 5 | Audit whitelist test matched non-audit `action:` fields | Low (test defect) | FIXED — the test now anchors on audit writes only |
| 6 | `projectId` was read from the unvalidated request body | Low | FIXED — validated by the Zod schema |
| 7 | 9 audit actions had no UI label (`audit-actions-diff` reported MISSING_LABELS=9) | Low | FIXED — labels added to `messages/en.json` + `messages/hi.json` (MISSING_LABELS=0) |
| 8 | Fresh-database deploy was broken (`Organization.pagesQuota` missing; agency/integration schema never migrated) | High (release blocker) | FIXED — two idempotent migrations, fresh DB reaches zero drift |

## Scan-auth credential handling (current design)

- Guard: verified email + `manage_settings` permission on every verb, project scoped to the caller's org.
- At rest: cookie values, sensitive header values, the login script and the login credentials are encrypted (AES-256-GCM).
- In transit: reads mask secrets (`••••••••`); the script and credentials are omitted.
- In the scanner: decrypted only when the browser context is prepared.
- Audit trail: `scan_auth_created` / `scan_auth_updated` / `scan_auth_deleted`.

## Not verified in this cycle

- Strix pentest (CLI/cloud not installed in this environment) — the manual review above covers the changed code paths.
- Playwright E2E — needs the dev server; API paths are covered by vitest route tests.
