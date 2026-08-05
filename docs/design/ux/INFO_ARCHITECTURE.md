# Volume 2 — Information Architecture

Grounded in the actual source tree (`src/app`). AccessGuard has two shells plus recovery/landing routes.

## 1. Route Tree

```
/s                     → Landing (public marketing)
/pricing               → Plans & Billing (public; also linked from app sidebar)
/auth/login            → Sign in
/auth/register         → Create account
/auth/forgot-password  → Password reset request
/verify-email          → Email verification (token via query)
/reset-password        → Set new password (token via query)
/invite                → Team invite accept (token via query)
/share/[token]         → Public read-only report

/(dashboard)            → Authenticated app shell (Desktop sidebar + mobile drawer)
  /dashboard           → Overview (KPIs, trend charts)
  /projects            → Project list / create / manage
  /scans               → Scan history
  /violations          → Violations list (filter by severity/project)
  /reports             → Reports & remediation
  /audit-logs          → Security audit log
  /team                → Team management (owner/admin invites)
  /admin               → Admin panel (role-gated: admin/owner only)
  /settings            → Profile, appearance, notification, push preferences
```

## 2. Navigation Model

Desktop (`lg` and up): fixed left **Sidebar** (16rem / `w-64`), persistent, shown via
`hidden lg:block` in `(dashboard)/layout.tsx`.
Mobile (< `lg`): sidebar becomes a left **Sheet** drawer (`w-64`), toggled by hamburger in
`DashboardHeader` (`onMenuClick`).

Nav order (source: `sidebar.tsx:22-36`):
1. Dashboard, 2. Projects, 3. Violations, 4. Scan History, 5. Reports,
6. Audit Logs, 7. Team, 8. Admin *(only when role is `admin` or `owner`)*,
9. Settings, and pinned bottom item **Plans & Billing** (`/pricing`).

Active view is derived from the pathname (`viewMap`, `(dashboard)/layout.tsx:18`).

## 3. Accessibility / Gating Rules

- **Auth gate: `(dashboard)/layout.tsx` renders `null` until authenticated, spinner while the session validates.
- **Role gate**: Admin nav item + `/admin` page are restricted to `admin`/`owner`.
  Invite flow: only `owner` can invite? (see `team` page).
- **Skip link**: root layout renders a skip-to-content anchor before nav.
- **Focus**: `outline-ring/50` base; primary focus rings use `--ring` (coral).
- **Reduced motion**: `prefers-reduced-motion` media shuts down animations globally.

## 4. Entry Points

- Anonymous → owned/public pages (landing, pricing, share/[token]).
- Authenticated → `/(dashboard)`; session cookie-driven; push notifications + onboarding wizard render inside the app shell.
- Any app route while logged out: layout returns `null` until redirect/middleware handles it.