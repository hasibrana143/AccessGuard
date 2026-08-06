# Volume 6 — RBAC & Authorization

## 1. Role model

`owner` > `admin` > `member`, plus org-scoped **custom roles** (`CustomRole`: name +
string[] permissions, unique per `[orgId, name]`).

- **owner** — everything (incl. billing.manage, role.manage, account control).
- **admin** — everything except `MANAGE_BILLING`.
- **member** — base set (project.read/scan, violation.read/status…).
- **custom role** — merges onto member base; assigned via `User.customRoleId`.

## 2. Permission definitions

14 permission strings in `src/lib/permission-defs.ts` (project.create/edit/delete/scan,
violation.remediate/bulk, team.manage, role.manage, billing.manage, report.generate, …).
`resolvePermissions(userId)` in `src/lib/permissions.ts` returns effective set (cached/request).

## 3. Enforcement chain (`src/lib/rbac.ts`, 223 L)

```mermaid
flowchart LR
    R[route] --> A{requireAuth}
    A -- no --> 401
    A -- yes --> V{email verified?}
    V -- writes only, not verified --> 403 VERIFICATION_REQUIRED
    V -- yes --> P{requirePermission / requireRole}
    P -- no --> 403
    P -- yes --> O{requireOrgAccess}
    O -- cross-tenant --> 403
    O -- ok --> D[proceed]
```

- `requirePermission(perm)` (writes); `requireRole(['admin','owner'])` (admin surfaces).
- `requireOrgAccess` / `requireProjectAccess` / `requireScanAccess` — org-id matching → **no cross-tenant reads**.
- `getServerSession` first, JWT fallback (bearer APIs).

## 4. UI gating

- Sidebar Admin item only for `admin`/`owner`; Admin page route-guarded.
- **V6 fix:** header notification bell (reads `/api/audit-logs`, an admin-only surface)
  now renders + fetches **only for admins/owners** — members no longer see a dead bell
  or a "View all activity" link that 403s (previously a UI/auth parity bug).

## 5. Verification

- Vitest: `rbac.ts` (guards/permissions), `permissions.ts`, `tenant-isolation`
  (cross-org denial) — all green (214 suite).
- API route tests: roles, projects, violations, audit-logs.