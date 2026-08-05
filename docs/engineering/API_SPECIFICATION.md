# Volume 3 — API Specification

> Ground truth: every `src/app/api/*/route.{ts,tsx}` (≈66 handler files; 63 `.ts` + 3 `.tsx`).
> All REST under `/api`, JSON in/out, Next.js route handlers, gated by `src/lib/rbac.ts`.
> Lineage hints: baseRoute for a resource = the group root name.

## Conventions

- **AuthN**: `Authorization: Bearer <JWT>` (NextAuth JWT) or NextAuth session cookie. `getServerSession() first, JWT fallback.
- **Writes** additionally demand verified email (`VERIFICATION_REQUIRED`), checked inside `requirePermission`.
- **Permissions** strings in `src/lib/permission-defs.ts` (14): project.create/edit/delete/scan, violation.remediate/bulk, team.manage, role.manage, billing.manage, report.generate…
- **Rate limits** `src/lib/rate-limit.ts`: global default 100/min; scans 10/min; remediate 20/min; projects 30/min; in-memory failover.
- **Org isolation**: every domain requires the request to resolve to the user's org (`requireOrgAccess`, `requireProjectAccess`).

## 1. Auth & session
| Route | Method | Purpose | Gating |
| --- | --- | --- | --- |
| `/api/auth/register` | POST | Email/password sign-up; sets verify-token expiry (24h) | public (rate) |
| `/api/auth/forgot-password` | POST | Request reset; token email | public |
| `/api/auth/reset-password` | POST | Set new password w/ token | public, policy-enforced |
| `/api/auth/verify-email` | POST | Resend/set verified via token | public |
| `/api/auth/verify-reset-token` | GET/POST | Token validity (hashed lookup) | public |
| `/api/auth/mfa/setup` | POST | Enable/confirm MFA (otplib) | authed |
| `/api/auth/[...nextauth]` | ALL | NextAuth provider (credentials+OAuth, MFA) | — |
| `/api/csrf-token` | GET | CSRF token for NextAuth forms | public |

## 2. Account
| `/api/account/export` | GET | Download personal data (GDPR) | authed |
| `/api/account/delete` | DELETE | Delete account + consent flow | authed, destructive |

## 3. Teams
| `/api/team/invite` | POST | Invite member; **token hashed at rest**; email w/ button-resend | `team.manage` |
| `/api/team/accept-invite` | POST | Consume invite via token → membership | public w/ token |
| `/api/team/members` | GET/PATCH | List/change members, roles | `team.manage` reads |
| `/api/team/pending-invites` | GET | Pending list | `team.manage` |

## 4. Roles
`/api/roles` — CRUD custom roles (name + string[] permissions, `@@unique(orgId,name)`) — `role.manage`.

## 5. Scans
| `/api/scans` | POST | Create + run scan (queue `'scans`, attempts 3/backoff 2s; starts via instrumentation) | `project.scan` |
| `/api/scans/progress` | GET | Poll job progress | authed |
| `/api/schedule` | GET/POST | ScheduledScan CRUD (frequency/cron) | `project.scan` |
| `/api/schedule/process` | POST | Scheduler daemon entry (custom API tick) protected `X-Scheduler-Api-Key`, HP key) | HP key only |
| `/api/schedule/[id]` | DELETE | PATCH | Pause/resume/delete schedule | authed |

## 6. Violations & remediation
| `/api/violations` | GET | List with filters (severity, project, status) | authed |
| `/api/violations/batch` | PATCH | Bulk update status/metadata | `violation.bulk` |
| `/api/violations/export` | GET | CSV export (column subset) | authed |

**Fix remediation** `/api/remediate`, `/api/remediate/batch`
- `GENERATE_REMEDIATION` permission; batch variant takes IDs; result cached on the `Violation` row (remediationCode / aiExplanation / aiConfidenceScore) unless `forceRegenerate`; rate 20/min; template fallback when no AI key.

**Reports** `/api/reports` (POST generate; `list`, `share` (token), `executive-summary`, `vpat` (tsx renderers)) → `ComplianceReport` + public `/share/[token]`.

## 7. GitHub
| `/api/github/oauth` | GET | OAuth authorize URL | authed |
| `/api/github/connect` | POST | Exchange code→token, store encrypted, `GithubConnection` upsert | owner |
| `/api/github/callback` | GET | Callback handling | public |
| `/api/github/repos` | GET | Repos from token | authed |
| `/api/github/status` | GET | Connection status | authed |
| `/api/github/disconnect` | POST | Revoke grant + delete connection | owner |
| `/api/github/create-pr` | POST | Apply fixes → branch → PR; writes summary+fix files; updates `violation.githubPrUrl` | `violation.remediate` |
| `/api/github/pr` / `pr-status` | GET/POST | PR metadata + status check | authed |

## 8. Billing (Stripe)
checkout, coupon, create-customer, create-subscription, cancel-subscription, subscription, invoices (authed; `billing.manage` where relevant) + **webhook (public, `constructWebhookEvent`)**. Stripe integration falls back to `null`/demo price ids when `STRIPE_SECRET_KEY` unset.

## 9. Settings & stats
`/api/settings` (GET/PATCH rules, notification-settings typed alerts), `/api/settings/api-key` (org API keys), `/api/stats/trends|regression|usage`, `/api/admin`, `/api/audit-logs` (audit timeline) — all authed + org-scoped.

## 10. Legal / docs / health
`/api/legal/privacy` + `/tos` (static markdown), `/api/docs`, `/api/health` (public), `/api/flags` (feature toggles, `FLAG_CACHE_TTL`), `/api/notifications/test` (push notification sanity).

**Missing/Explicit non-goals (verify fresh):** no `/api/github/webhook` (App install), no usage/quotas API beyond `stats/usage`, no payments backend for `plan` table sync beyond `checkout`; no dedicated `/api/openapi` icon snapshot (docs serves specs).**