# Volume 11 — Feature Flags

> Grounding: `src/lib/feature-flags.ts` + `/api/flags` (admin/owner only). Fully implemented —
> this doc is the operating procedure.

## 1. Architecture (verified)
- **10 built-in flags** (key · default · owner):
  | Key | Default | Owner |
  |---|---|---|
  | `scanner.browser` | true | platform |
  | `scanner.ai_remediation` | true | ai |
  | `reports.pdf` | true | platform |
  | `auth.github` | true | auth |
  | `billing.stripe` | true | billing |
  | `notifications.email` | true | platform |
  | `scheduler.automation` | true | platform |
  | `team.invites` | true | auth |
  | `experimental.new_dashboard` | false | frontend |
  | `experimental.bulk_actions` | false | frontend |
- **Evaluation order**: env override `FF_<KEY_UPPER_SNAKE>` → Redis `ff:global:<key>` /
  `ff:<orgId>:<key>` → default.
- **Scope**: global or per-org (`orgId` in Redis key).
- **TTL**: `FLAG_CACHE_TTL` (default 300s) on Redis writes.
- **Access**: `/api/flags` GET (list + state) / POST (set) — admin/owner only via JWT role.
- **Guard pattern**: `createFlagGuard(key).guard(fn, fallback, orgId)` — kill-switch by default.

## 2. Operating rules
| Rule | Detail |
|---|---|
| Add flag | New entry in `BUILT_IN_FLAGS` with owners[]; code reviews both sides (feature + flag) |
| Default off | New features ship `defaultValue: false` unless already vetted |
| Kill switch | Critical subsystems (scanner, AI, billing) keep flags; incident = flip off via Redis |
| Per-org rollouts | Target specific orgs before global enable |
| Env override | Infra-level kill without Redis: `FF_SCANNER_BROWSER=0` |
| Audit | `setFlag` logs via logger; consider adding audit events (`flags.set`) to `src/lib/audit.ts` whitelist |
| Cleanup | Flag stays until feature fully rolled + 1 release cycle; then remove flag + dead branches |

## 3. Rollout workflow
1. **Alpha**: default off; enable for internal org (Redis `ff:<org>:<key>`).
2. **Beta**: 5–10 customer orgs opt-in; monitor Sentry + usage.
3. **GA**: default true (or global Redis set); keep flag for 1 release as rollback.
4. **Remove**: delete flag + code branches; update docs.

## 4. Current inventory status
| Flag | State | Notes |
|---|---|---|
| All core flags | On (defaults) | Production defaults |
| `experimental.new_dashboard` | Off | Awaiting redesign ship |
| `experimental.bulk_actions` | Off | Awaiting UX validation |

## 5. Incident use
- Scanner regression → `FF_SCANNER_BROWSER=0` (env) or `ff:global:scanner.browser=0` (Redis) —
  fetch/dom fallback strategies still scan (degraded but functional).
- AI outage → `ff:global:scanner.ai_remediation=0` → template fixes only (product never blocks).
- Billing bug → `ff:global:billing.stripe=0` → checkout disabled until fixed.

## 6. Monitoring
- Flag states visible via `/api/flags` (admin UI page is roadmap).
- Logger events on set/unknown-key warn.
- Add flag-change audit events (gap noted above) to strengthen compliance story.