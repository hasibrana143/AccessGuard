# Volume 3 — GitHub Integration

## 1. Model

OAuth **user-token** (GitHub App-style install NOT used yet) + **individual authorized PR**
pipeline; no webhooks. NextAuth GitHub sign-in (identity) is separate from the repo integration.

## 2. Components

| Piece | File | Notes |
| --- | --- | --- |
| OAuth lib | `src/lib/github.ts` (308 L, @octokit/rest) | authorize URL, code exchange, token revoke |
| Encrypt | `src/lib/crypto.ts` | AES-GCM for `access_token`/`refresh_token` before DB |
| Model | `GithubConnection` | orgId, `installationId` unique, repositories JSON, isActive |
| PR helpers | `src/lib/github-pr.ts` | branch name `accessguard/fix-{rule}-{date}-{ts}`, PR title/body, fix blocks, `validateRemediation`, `generateDemoPreview` |

## 3. Flow

1. **Connect** — user hits `/api/github/oauth` → GitHub authorize → `/api/github/callback`
   → exchange code → `connect` upserts `GithubConnection`, decrypts later via `status`.
2. **Repos** — `/api/github/repos` lists from token; stored as whitelist on connection.
3. **Create PR** — `/api/github/create-pr`:
   - body: `violationIds[]`, `repository`, `demoMode`.
   - org-scoped repo whitelist check; write-access probe.
   - per violation: skip if `aiConfidenceScore < 0.7` (feed back); run `validateRemediation`
     (injection guards: `<script>`/`javascript:`/event handlers/unclosed tags, ≤20k chars).
   - create branch → fetch git tree of `.html/.tsx/.jsx/.js/.css...` files → string-match patch
     (`applyFixesToFile`) → write `accessguard-fixes/summary.md` + per-rule `.md`.
   - open PR (`pr-title` = accessguard/fix-{rule}-{date}-{ts}: "Fix {rule} for {url}").
   - update `violation.githubPrUrl`.
4. **Status** — `/api/github/pr-status` checks open PRs; `/api/github/pr` returns metadata.
5. **Disconnect** — revoke token via app grant + delete connection row.

## 4. Security notes
- Tokens encrypted at rest; never returned; org-scoped (`requireOrgAccess`).
- Access tokens user-scoped; `demoMode` avoids real pushes (generates preview only).
- Rate-limit + permission gates (`team.manage` for connect? repurposed `violation.remediate`).

## 5. Gaps / roadmap
- No GitHub **App installation webhook** (`/api/github/webhook` missing) — installationId is
  stubbed (`generateInviteToken` HMAC unused). App-install mode → per-repo events, no user token.
- OAuth user tokens expire; no refresh flow auto-wire (revoke exists).
- applyFixesToFile is string-match patching — brittle against formatting; upgrade to AST/range patches in V5.
- Demo branch naming is TS-suffixed (dedupe ok).