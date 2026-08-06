# Volume 9 — API Reference

> **Grounding**: All routes below were verified from source (`src/app/api/**/route.ts` — 63 route files).
> **Live docs**: `/api/docs` serves Swagger UI (renders `src/lib/openapi.ts`). **Note**: the OpenAPI
> spec currently documents only 9 of 63 paths — expanding it to full coverage is an open task (§6).

## 1. Conventions
- **Base URL**: `/api` (paths below are relative, e.g. `GET /api/projects`).
- **Auth**: session cookie (`next-auth.session-token`) for browser clients; guard chain in every
  route: auth → email verification → org access/permission → rate limit (`src/lib/rbac.ts`).
- **Errors**: JSON `{ "error": { "code", "message" } }`; HTTP status reflects failure class
  (400 validation, 401 unauthenticated, 403 forbidden, 404, 429 rate-limited, 500).
- **Pagination**: `?page=1&limit=20` on list endpoints.
- **Versioning**: `X-API-Version: v1` header set on `/api/docs`.

## 2. Route inventory (63 route files, verified 2026-08-06)

### System
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | – | DB connectivity check (200/503) |
| GET | `/api/docs` | – | Swagger UI / OpenAPI JSON |
| GET | `/api/csrf-token` | – | CSRF token for forms |
| GET | `/api/flags` / POST | session | Feature flags read/write |
| GET | `/api/legal/tos`, `/api/legal/privacy` | – | Legal pages content |

### Authentication & account
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | – | New user signup |
| POST | `/api/auth/forgot-password` | – | Send reset email |
| POST+GET | `/api/auth/reset-password` | token | Apply new password |
| GET | `/api/auth/verify-reset-token` | token | Validate reset token |
| POST+GET | `/api/auth/verify-email` | token | Email verification |
| GET+POST+DELETE | `/api/auth/mfa/setup` | session | MFA enroll/verify/disable |
| POST | `/api/auth/[...nextauth]` | – | NextAuth provider (login/logout/oauth) |
| GET | `/api/account/export` | session | GDPR data export |
| POST | `/api/account/delete` | session | Account deletion |

### Projects
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET+POST | `/api/projects` | org | List/create projects |
| PATCH+DELETE | `/api/projects` | org | Update/delete |
| POST | `/api/projects/import` | org | Bulk import |
| GET+POST | `/api/projects/verify` | org | URL/ownership verification |

### Scans
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET+POST | `/api/scans` | org | List/create scans (POST enqueues BullMQ job) |
| PATCH | `/api/scans` | org | Update scan state |
| GET | `/api/scans/progress` | org | Live scan progress polling |
| GET+POST+DELETE | `/api/schedule` | org | Scheduled scan CRUD |
| GET+POST | `/api/schedule/process` | org | Trigger/process scheduled scans |

### Violations & remediation
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET+POST+PUT | `/api/violations` | org | List/create/update violations |
| PATCH | `/api/violations/batch` | org | Bulk status updates |
| GET | `/api/violations/export` | org | CSV/JSON export |
| GET+POST | `/api/remediate` | org | Single-violation AI remediation |
| POST | `/api/remediate/batch` | org | Batch remediation (aggregated AI cost audit) |

### Reports
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET+POST+DELETE | `/api/reports/generate` | org | Generate compliance reports |
| GET+DELETE | `/api/reports/list` | org | List/delete reports |
| GET+POST | `/api/reports/share` | org | Shared report links |

### GitHub integration
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/github/connect` | org | Start OAuth flow |
| GET | `/api/github/callback` | – | OAuth callback |
| GET+POST | `/api/github/oauth` | org | Exchange token / refresh |
| POST | `/api/github/disconnect` | org | Revoke connection |
| GET | `/api/github/status` | org | Connection status |
| GET | `/api/github/repos` | org | List repos (PR target) |
| POST | `/api/github/create-pr` | org | Open PR with fix |
| GET+POST | `/api/github/pr` | org | PR status/details |
| GET+POST | `/api/github/pr-status` | org | PR pipeline status |

### Team & roles
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET+PATCH+DELETE | `/api/team/members` | org admin | Member management |
| GET+POST+DELETE | `/api/team/invite` | org admin | Invites |
| GET+DELETE | `/api/team/pending-invites` | org admin | Pending invites |
| GET+POST | `/api/team/accept-invite` | member | Accept invite |
| GET+POST+PATCH+DELETE | `/api/roles` | org admin | Custom roles + permission matrix |

### Settings, stats, billing, admin
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET+PATCH | `/api/settings` | org | Org settings |
| GET+POST | `/api/settings/api-key` | org | API key management |
| GET | `/api/stats/regression` | org | Violation regression stats |
| GET | `/api/stats/trends` | org | Trend charts |
| GET | `/api/stats/usage` | org | Usage analytics |
| GET+PATCH | `/api/admin` | platform admin | Admin controls |
| GET | `/api/audit-logs` | org admin | Audit trail |
| GET | `/api/audit` | platform | Audit meta |
| POST | `/api/notifications/test` | org | Test notifications |
| POST | `/api/stripe/checkout` | org | Start checkout |
| POST | `/api/stripe/create-customer` / `create-subscription` | org | Billing setup |
| GET+POST+DELETE | `/api/stripe/subscription` | org | Subscription management |
| GET+POST | `/api/stripe/coupon` | org | Coupon apply |
| POST+GET | `/api/stripe/cancel-subscription` | org | Cancel flow |
| GET | `/api/stripe/invoices` | org | Invoice list |
| POST | `/api/stripe/webhook` | – (signed) | Stripe events |

## 3. Key endpoint contracts

### POST `/api/projects` — create project
```json
Request: { "name": "My Site", "url": "https://example.com" }
201:     { "id": "proj_...", "name": "My Site", "url": "https://example.com",
          "createdAt": "2026-08-06T...", "status": "active" }
Errors: 400 invalid URL · 401 · 403 no permission · 429 rate limit
```

### POST `/api/scans` — run scan (async)
```json
Request: { "projectId": "proj_...", "url": "https://example.com" }
202:     { "id": "scan_...", "status": "queued" }
Then poll: GET /api/scans/{id} → status: queued | running | completed | failed | cancelled
Completed payload: { "id", "status": "completed", "violations": N, "critical": n1,
                     "serious": n2, "moderate": n3, "minor": n4,
                     "summary": { "completedAt", "durationMs" } }
```

### POST `/api/remediate` — AI remediation
```json
Request: { "violationId": "viol_...", "model": "llama-3.3-70b" }   // model optional
200:     { "remediationCode": "…", "explanation": "…", "confidence": 0.87,
          "source": "llm" | "template", "model": "meta/llama-3.3-70b-instruct",
          "usage": { "promptTokens": 812, "completionTokens": 141 },
          "costEstimate": { "costUsd": 0.0012, "estimated": false } }
Errors: 400 invalid violation · 404 · 429 rate limited · 503 LLM unavailable (falls back to template)
```

### POST `/api/github/create-pr` — open fix PR
```json
Request: { "repoName": "owner/repo", "branch": "accessguard-fix",
           "commitMessage": "fix(accessibility): …", "filePath": "src/index.html",
           "content": "…fixed html…", "prTitle": "…", "prBody": "…" }
200:     { "prUrl": "https://github.com/owner/repo/pull/123",
          "prNumber": 123, "repoFullName": "owner/repo" }
```

### GET `/api/audit-logs` — audit trail (org admin)
```json
Query: ?page=1&limit=20&action=remediation.ai_cost
200:   { "data": [ { "id", "orgId", "userId", "action", "metadata", "createdAt" } ],
        "pagination": { "page": 1, "limit": 20, "total": 183 } }
```

## 4. Error codes
| Code | Meaning | Retry |
|---|---|---|
| `validation_error` | Bad request body/params | Fix request |
| `unauthorized` | Missing/invalid session | Re-login |
| `email_not_verified` | Verification required | Verify email |
| `forbidden` | Missing permission | Request access |
| `not_found` | Resource absent | Check id |
| `rate_limited` | Rate limit hit | Backoff + retry |
| `plan_limit` | Plan quota exceeded | Upgrade |
| `llm_unavailable` | AI provider down (→ template) | Retry later |

## 5. SDK / client notes
- No official SDK yet; all routes are JSON REST.
- Browser clients use session cookies; automation should use an org API key
  (`/api/settings/api-key`) with `Authorization: Bearer <key>` (bearer support in OpenAPI spec).

## 6. OpenAPI spec gap & plan
- `src/lib/openapi.ts` currently documents 9 paths (health, auth/register, auth/login,
  projects, scans, violations, remediate, reports, settings). **63 real route files exist.**
- Plan: progressively add missing paths (github/*, team/*, roles, stats/*, stripe/*, audit-logs,
  schedule/*, account/*, flags, legal, notifications) — batch per domain, verify via
  `GET /api/docs?format=json` + a spec-vs-routes script in CI (fail if a route has no spec).