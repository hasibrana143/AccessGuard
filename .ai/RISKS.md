# AccessGuard — Risk Register

Updated: 2026-11-21

| # | Risk | Probability | Impact | Rating | Mitigation | Status |
|---|---|---|---|---|---|---|
| 1 | A login script stored per organization is arbitrary JavaScript executed against the scan target | Medium | High | 🟠 HIGH | Only admins (`manage_settings`) can create one; scripts are encrypted at rest and never returned by the API; the scanner runs them in the browser sandbox of the target page, not on the server | Accepted (documented in `docs/engineering/SCAN_AUTHENTICATION.md`) |
| 2 | A login script runs once per page in crawl mode, making authenticated crawls slow | High | Low | 🟡 MEDIUM | Documented limit; cookie/header auth stays cheap; reduce `crawlConfig.maxPages` for script-auth projects | Open |
| 3 | Dependency upgrades to next 16.4.6 / prisma 6.19.3 could change runtime behaviour | Medium | Medium | 🟡 MEDIUM | Full gate suite re-run after the upgrade (typecheck, lint, 407 vitest, next build, prisma validate + generate, zero-drift migration check) | Mitigated |
| 4 | `prisma db push` on the dev database drifts from the migration chain again | Medium | Medium | 🟡 MEDIUM | `prisma migrate deploy` is the source of truth; `migrate diff --to-schema-datamodel` reports zero drift for both the dev and a fresh database | Mitigated |
| 5 | Shared test fixtures across API route suites caused cross-file user/org collisions | High | Medium | 🟡 MEDIUM | Unique e-mail per suite plus deterministic upserts; rbac/tenant-isolation mocks now use real database rows | Mitigated |
| 6 | Public onboarding scans remain a compute-abuse vector behind a single proxy IP | Medium | Medium | 🟡 MEDIUM | 5/min per client; for a shared egress IP the limit is shared — consider a signed token or CAPTCHA if abuse appears | Open |
| 7 | No E2E coverage for the new credential API | Medium | Low | 🟢 LOW | Contract tests cover auth, permission, tenancy, encryption, masking, update and delete | Open |
