# Volume 6 — Authentication

## 1. Providers & session strategy

- **NextAuth v4, JWT session strategy** (`src/lib/auth.ts`); no DB sessions. Claims:
  `id, role, orgId, orgSlug, orgName, emailVerified` (callbacks.jwt/session).
- **Credentials** (email+password): bcrypt compare (**12 rounds**); MFA check throws
  `MFA_REQUIRED` → client prompts for OTP (otplib `mfaSecret`).
- **OAuth** (env-gated GitHub + Google): on first sign-in provisions the account into the
  default org (`default-org` upsert) with role `member`, emailVerified set.
- Helpers: `signToken/verifyToken` (JWT 7d), CSRF token helpers, `extractTokenFromHeader` (Bearer) —
  so API routes work with `Authorization` header or session cookie.

## 2. Registration & verification

- `POST /api/auth/register` — rate-limited (auth surface); name/email/password policy
  enforced server-side (length + strength); verification token with **24h expiry**
  (`User.emailVerificationTokenExpiresAt`, migration 20260805).
- `/api/auth/verify-email` resend+verify; dashboard shows amber banner until verified;
  **writes are blocked** (`VERIFICATION_REQUIRED`) until email verified.

## 3. Password reset

- `forgot-password` (rate-limited) → one-time token, stored **hashed** (`PasswordReset.token`
  unique; lookup by hash at `/api/auth/verify-reset-token`), expiry + `used` flag.
- `reset-password` re-applies password policy.

## 4. Team invite & share tokens

- `TeamInvite.token` — **one-way hashed at rest**; raw token only in email/URL.
- `/api/auth/[...nextauth]` drives `/invite` accept; role validated on accept.
- `share/[token]` — public read-only report (random token, no secrets in payload).

## 5. OAuth state protection (FIXED this round)

- `src/lib/oauth-state.ts` signs state with HMAC-SHA256 and **timing-safe compare**
  (`crypto.timingSafeEqual`), binds `orgId`; callback verifies `state.orgId === session.orgId`.
- **V6 fix:** removed the hardcoded fallback secret `'accessguard-oauth-state-secret'` —
  signing now **fails closed** when `NEXTAUTH_SECRET`/`OAUTH_STATE_SECRET` unset.

## 6. Session hardening

- Middleware (`src/middleware.ts`) protects dashboard + `/api/*`; allows only
  `/api/schedule/*` via `X-Scheduler-Api-Key`.
- JWT 7d expiry; NextAuth cookies (`__Secure-` prefix in prod).
- Logout clears React Query cache (V6 fix — no cross-account data bleed in SPA).

## 7. Test coverage

`src/lib/__tests__/security.ts` (MFA/verify), `rbac.ts`, rate-limit tests; Playwright
covers login success/failure + registration flow; 214 vitest green.