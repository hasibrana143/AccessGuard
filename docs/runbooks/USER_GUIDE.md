# Volume 9 — User Guide

Persona-based guide for end users of AccessGuard. Verified against the running app (routes + UI).

## 1. Who this is for
- **Developer** — scans sites, triages violations, opens fix PRs.
- **Compliance lead** — generates reports, tracks regression trends, exports evidence.
- **Team member** — sees project status, violation feeds, shared reports.
- **Org admin** — manages members, roles, billing, GitHub connection, audit logs.

## 2. Getting started

### 2.1 Sign up & verify
1. Open `/auth/register` — create account with email + password.
2. Check inbox → verify email (token link; `/api/auth/verify-email`).
3. First login shows onboarding wizard (skippable — stored in `localStorage.onboarding-seen`).

### 2.2 First project & scan
1. **Dashboard** (`/dashboard`) → "New Project" — name + URL.
2. Project appears under **Projects** (`/projects`).
3. Open project → **Run Scan**. The scanner (Puppeteer + axe-core) crawls the page, then
   classifies violations by severity (critical/serious/moderate/minor) via the risk formula.
4. **Scan History** (`/scans`) shows live progress (polling `/api/scans/progress`).

### 2.3 What a scan gives you
- **Violations** (`/violations`) — per-rule results with WCAG criteria, affected element,
  and impact. Filter by severity/status/rule; bulk-mark ignored/fixed.
- **Risk score**: `clamp(100 − 10·critical − 5·serious − 2·moderate − 1·minor)`.
- **Reports** (`/reports`) — generate compliance report; share via unique link
  (`/share/[token]` — public, revocable).

## 3. Daily workflows

### 3.1 Triage violations
1. Open `/violations` — sort by severity.
2. Expand a violation → details: WCAG rule, impact, element snippet, suggested fix.
3. Status flow: `open` → `in_progress` → `fixed` / `ignored` (with reason).
4. Use **batch** actions for identical rule fixes.

### 3.2 AI remediation
1. On a violation, click **Generate Fix** → `/api/remediate`.
2. Result: code snippet + explanation + confidence (0–1).
   - `source: llm` = real model output (meta/llama-3.3-70b or configured provider).
   - `source: template` = rule template fallback (no LLM key / provider down / no code).
3. **Apply to GitHub**: connect a repo (Settings → GitHub) → **Create PR** — AccessGuard
   opens a branch + PR with the fix; track via PR status in the UI.
4. Confidence below `MIN_FIX_CONFIDENCE` (0.7) blocks auto-PR — review manually.

### 3.3 Scheduled scans
- Configure recurring scans in project settings (daily/weekly) — the scheduler daemon
  (BullMQ, 60s tick) enqueues them automatically.

### 3.4 Stats & trends
- **Trends** (`/api/stats/trends`) — score evolution across scan runs.
- **Regression** (`/api/stats/regression`) — which rules regressed between runs.
- **Usage** (`/api/stats/usage`) — scans/AI calls consumed vs plan.

## 4. Account & data
- **Settings** (`/settings`) tabs: Profile, Appearance (dark/light — default dark), Team,
  GitHub, Notifications, Billing.
- **MFA**: enable in auth settings (TOTP app). Required for admin actions once enabled.
- **GDPR**: export your data (`/api/account/export`); delete account (`/api/account/delete`).

## 5. Roles & permissions
Membership levels (seeded): `owner` (full), `admin` (manage team/billing/audit),
`editor` (projects/scans/remediation), `viewer` (read-only). Custom roles via
`/api/roles` (permission matrix with 14 granular permissions).

## 6. Limits
- Rate limits on auth + AI + destructive actions (429 responses).
- Plan quotas (seeded plans: free/pro/enterprise) enforced at project/scan/AI level
  (see `plan-limits`).

## 7. Support & feedback
- In-app notifications (bell, admin-visible via `/api/audit-logs`).
- Errors are tracked in Sentry; report issues with the timestamp shown in the app footer.