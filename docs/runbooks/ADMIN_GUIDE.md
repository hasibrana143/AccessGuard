# Volume 9 — Administrator Guide

For org admins (`admin`/`owner` roles) and platform admins. Verified against source.

## 1. Org administration

### 1.1 Members & roles (`/team`, `/api/team/*`)
| Action | Endpoint | UI |
|---|---|---|
| List members, change role, remove | `GET/PATCH/DELETE /api/team/members` | `/team` |
| Invite by email | `POST /api/team/invite` | `/team` → Invite |
| Revoke invite | `DELETE /api/team/pending-invites` | `/team` |
| Accept invite | `GET/POST /api/team/accept-invite` | token link |

- Invites are org-scoped; role decided by admin. Members see only their org data
  (query cache is cleared on org switch — V6 fix).

### 1.2 Custom roles (`/api/roles`)
- Clone a base role, toggle individual permissions, assign to members.
- **14 permissions** defined in `src/lib/rbac.ts` (e.g. `scan:create`, `violation:update`,
  `audit:read`, `billing:manage`).
- Guard chain in every route: auth → verified email → org access → permission → rate limit.

### 1.3 GitHub integration (Settings → GitHub)
- **Connect** (`/api/github/connect`) → OAuth (user-scoped token, secrets encrypted).
- **Repos** (`/api/github/repos`) — list accessible repos for PR targets.
- **Disconnect** (`/api/github/disconnect`) — revokes token.
- PRs created via `/api/github/create-pr` with `accessguard-fix` branch naming.

### 1.4 Billing (Settings → Billing / `/api/stripe/*`)
- Plans seeded: free/pro/enterprise; usage quotas per plan.
- Stripe checkout (`/api/stripe/checkout`), coupons (`/api/stripe/coupon`),
  invoices (`/api/stripe/invoices`), subscription management, cancel flow.
- Stripe webhook (`/api/stripe/webhook`) keeps subscription state in sync (signature verified).

## 2. Platform admin (`/admin`, `/api/admin`)
- **Feature flags** (`/api/flags`) — toggle features per org or globally (read via middleware).
- **Platform stats** — usage/trends across all orgs (`/api/stats/*`).
- **Audit (`/api/audit-tokens` get, `/api/audit` meta)** — global audit meta.

## 3. Monitoring duties
| Duty | Where | Frequency |
|---|---|---|
| Error rate | Sentry (`SENTRY_DSN`) | Daily |
| Queue health (BullMQ) | Redis `Bull:scan:*` / logs | Weekly |
| Scheduled scans | `/api/schedule` list + scheduler logs (60s tick) | Weekly |
| AI cost per org | Audit logs `action=remediation.ai_cost` (`/api/audit-logs`) | Monthly |
| Backup success | `scripts/db-backup.mjs` + retention | Weekly |
| Dependency CVEs | `npm audit` / CI `security` run | Continuous |

## 4. User lifecycle
| Task | Procedure |
|---|---|
| Offboard a member | `/api/team/members` DELETE → confirm; data remains org-owned |
| Feature flag roll-out | Set flag in `/api/flags`, verify in staging, then prod |
| GDPR data export (user-initiated) | `GET /api/account/export` → JSON (emails, scans meta) |
| Delete user data | `POST /api/account/delete` → purge per GDPR timelines |

## 5. Security rules admins must follow
- Platform admins should have MFA enabled (cf. auth settings).
- Revoke unused GitHub connections promptly (token leakage surface).
- Review audit logs weekly for suspicious actions (login from new IPs, role changes).
- Alert the team on any `remediation.ai_cost` spike (unexpected AI credit burn).