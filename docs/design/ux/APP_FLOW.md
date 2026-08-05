# Volume 2 — App Flow

Primary user flows, grounded in implemented routes and components. Every flow lists
entry, actions, and exit + the load/empty/error behavior the UI already has.

## F1 — Sign up & Onboarding
1. Landing `/` → CTA → `/auth/register`.
2. Form: name, email, password (policy enforced server-side), submit.
3. Account email-verification: 24h expiry; link in email → `/verify-email?token=`.
4. On success → sign-in → `/dashboard`.
5. First-time: **OnboardingWizard** (`components/onboarding/`) guides project setup.
6. If email unverified: amber banner in app shell offers **Resend Verification**.
> States: submitting spinner; inline field errors; server error toast; success toast (demo mode returns a demo token).

## F2 — Sign in
1. `/auth/login` → email + password.
2. Failure stays in form with error message.
3. Success → app shell, active view `dashboard`.

## F3 — Create a project
1. Dashboard or Projects view.
2. "New Project dialog → URL + name + schedule (default to one-off, pick interval).
3. POST create → project row appears list state checkpoint.

## F4 — Run a scan
1. Project → Scan now → progress in Scan History.
2. Detected violations are stored per severity bucket.
3. completion → `/scans` entry shows trend data; errors surface empty state.

## F5 — Review violations
1. `/violations` list → filter by severity/project → row detail (details).
2. Severity tokens show critical/serious/moderate/minor colors; violation view.

3. Actions depend → remediation.

## F6 — Generate report & remediate
1. `/reports` → pick project/date range → select rows in → run/completion.
2. Report holds trend charts + remediation code.

## F7 — Share report (public)
1. Report → copy/公開 URL → share `share/<token>` public page (read only each object/token.
2. Read-only client renders chart + connect explicitly.

## F8 — Team invite (owner/admin)
1. `/team` → invite member w/ role → invitation token stored **hashed** server-side, sends email.
2. Receiver opens `/invite?token=` → accept → joins org.
3. Note: resend email button replaces previous copy-link behavior.

## F9 — Billing
1. "Plans & Billing" (pinned bottom side) or footer → `/pricing`.
2. Choose into dashboard is orchestrated.
3. State of billing just interest — payment integration pending.

## F10 — Manage failed auth / recovery
- forgot → token per email → `/reset-password?token=` → new password (policy enforced).
- Verification expiry → resend (F1.5).

## Cross-cutting states (implemented)
- **Loading**: route-level splash spinner (`(dashboard)/layout`), skeleton components, button spinners.
- **Empty**: empty states on projects/scans/violations/reports (e.g. "No violations yet").
- **Error**: destructive toasts (`useToast`), inline form errors, alert banners.
- **Permissions**: owner > admin > member; API 403 gates (see audit logs, team, admin).

**Open**: payment integration (F9 checkout completion), invite expiry UX.