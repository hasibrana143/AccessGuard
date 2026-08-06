# Volume 6 — Encryption & Data Protection

## 1. In transit
- HTTPS everywhere in prod; HSTS header added in V6 (`Strict-Transport-Security`, 1y + subdomains).
- TLS termination at hosting layer; API responses carry `Cache-Control: no-store` for `/api/*`.

## 2. At rest — secrets & credentials
| Data | Mechanism | Where |
| --- | --- | --- |
| Passwords | **bcrypt, 12 rounds** | `User.password` |
| GitHub OAuth tokens | **AES-GCM** (`src/lib/crypto.ts`) | `GithubConnection` (access/refresh) |
| MFA secret | otplib TOTP secret | `User.mfaSecret` |
| Session | JWT signed (`NEXTAUTH_SECRET`) | stateless |
| Reset/invite tokens | one-way hash at rest; raw token only in email/URL | `PasswordReset.token`, `TeamInvite.token` |
| OAuth state | HMAC-SHA256 + timingSafeEqual | `src/lib/oauth-state.ts` (fail-closed, V6) |

## 3. Key handling
- Single app secret `NEXTAUTH_SECRET` (≥32 bytes, env-only, never bundled client-side).
- GitHub tokens never returned by APIs; only existence + org whitelist exposed.
- No `NEXT_PUBLIC_` secrets (only publishable Stripe key + price IDs, safe).

## 4. Other controls
- File/URL inputs validated (`url-validation.ts`); remediation snippets sanitized
  (`validateRemediation` blocks `<script>`, `javascript:` URIs, event handlers, >20k chars).
- CSP-style injection defense noted; full CSP rollout deferred (risk of breaking inline
  Radix/next styles — track in V7).

## 5. Gaps to close (ops)
- Key rotation runbook (rotate NEXTAUTH_SECRET without token loss).
- Client-side encryption (org settings JSON is plaintext — assess in V7).
- HSM/KMS optional (single-key model adequate at current scale; revisit >1M rows).