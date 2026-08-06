# Volume 9 — Operational Runbooks

Procedures for on-call engineers. Grounded in the actual stack (Next standalone + Docker,
Postgres 16, Redis 7, BullMQ, GHCR). Cross-ref: `docs/devops/DISASTER_RECOVERY.md`.

## RB01 — Daily deploy (image push → container refresh)
```bash
# 1. CI green on main (lint, vitest 234, build, audit, e2e)
# 2. Tag release
git tag v0.4.0 && git push origin v0.4.0
# 3. docker.yml builds ghcr.io/hasibrana143/accessguard:v0.4.0 (+ latest)
# 4. Refresh deployment (VM: compose pull + up -d / K8s: rollout restart)
docker compose up -d --pull always
# 5. Verify
curl -f https://<host>/api/health          # expects 200 {"status":"healthy","database":"connected"}
# 6. Watch Sentry for 15 min; check audit-logs for auth spikes
```
Rollback: `docker compose up -d <previous-tag>` (keep last image tag) or
`kubectl rollout undo deployment/accessguard`.

## RB02 — Database migration (safe rollout)
```bash
# Entry point runs `prisma migrate deploy` at container boot — do NOT migrate live manually
# Preflight (staging): run migration, run smoke tests, verify seed
# Prod: deploy new image → entrypoint migrates → app starts after migration success
# Failure: entrypoint exits non-zero; container restarts; migration retried
# Manual fallback (only if entrypoint blocked):
docker compose run --rm app npx prisma migrate deploy
```
**Never** run `prisma db push` on prod (destructive). Constraint set:
`npm run db:constraints` (idempotent) after schema changes.

## RB03 — Backup & restore
```bash
# Backup (daily, keeps last 7)
npm run db:backup:prune            # → ./backups/accessguard-<ts>.sql

# Restore (drill every month; on-call must do one)
npm run db:restore backups/accessguard-<ts>.sql
# 1. Stop app writes (maintenance window)
# 2. Restore, 3. re-run migrations if newer, 4. smoke test, 5. resume
```
Off-site + encryption + PITR are roadmap items (docs/devops/BACKUPS.md).

## RB04 — Queue / scheduler health
- Worker runs in-process (BullMQ, concurrency 3) + scheduler daemon (60s tick via instrumentation).
- **Symptom**: scans stay `queued`. Checks:
  1. Redis up: `docker compose exec redis redis-cli ping`
  2. Jobs backlog: `redis-cli llen Bull:scan:*` (or BullMQ dashboard)
  3. Worker logs: `grep "Scan queue" / docker logs`
- **Fix**: restart app container (worker re-initialises); if Redis corrupted, `FLUSHALL` only
  after confirming no in-flight jobs matter (queued scans will re-enqueue from DB state).

## RB05 — Scanner failures
- **Symptom**: scan `failed` / timeouts. Checks: target URL reachable; robots/captcha;
  Puppeteer Chromium present (`/usr/bin/chromium-browser`); proxy env vars.
- `fetch-analysis` + `dom-analysis` fallbacks exist; axe-core is primary.
- Rate-limit key on target site — use provided `scanTimeoutMs`.

## RB06 — AI remediation issues
- Template fallback is automatic (AI never blocks). Check `source` field:
  - `template` + no LLM key → configure `NVIDIA_API_KEY`/`ANTHROPIC_API_KEY`.
  - `llm` but slow → check model router config + 30s AbortController timeout.
- Cost tracking: audit logs `remediation.ai_cost` include tokens + `costUsd` per org.

## RB07 — Auth incident (users can't log in)
1. Verify `NEXTAUTH_SECRET` + `OAUTH_STATE_SECRET` set (V6: fail-closed, no fallback secret).
2. Check NextAuth: callback URL matches `NEXTAUTH_URL` (dev `http://localhost:3000` vs prod).
3. MFA flow: TOTP secret stored per user; if lost → admin reset (DB update) after identity proof.
4. Rate limiter may 429 IPs — wait out window (Redis `rl:*` keys) or clear for legit user.

## RB08 — Billing incidents (Stripe)
- Webhook failures: check signature verification; replay from Stripe dashboard.
- Subscription drift: reconcile via `/api/stripe/subscription` refresh; invoices via `/api/stripe/invoices`.
- Test mode: use Stripe test keys + test card; webhook listener for local dev.

## RB09 — Logs & error triage
- **App logs**: pino JSON on stdout; container `docker logs <app>`.
- **Errors**: Sentry (server+client+edge). Search by route/orgId/traceId.
- **Audit trail**: `/api/audit-logs` (org admin) or DB `AuditLog` table.
- **Redaction**: logger redacts password/token/secret/authorization by default.

## RB10 — Security incident (see also DISASTER_RECOVERY playbook 5)
1. Rotate secrets immediately (DB, NEXTAUTH_SECRET, OAUTH_STATE_SECRET, GitHub, Stripe, Sentry).
2. Force re-auth: rotate JWT secret → all sessions invalid; verify no token reuse.
3. Isolate evidence: snapshot audit logs + Sentry; revoke GitHub connections if suspected.
4. GDPR: notify within 72h if personal data involved; log in incident tracker.

## On-call kit
| Item | Where |
|---|---|
| Runbooks | this folder + `docs/devops/DISASTER_RECOVERY.md` |
| Dashboards | Sentry; Prometheus/Grafana (roadmap) |
| Secrets | Vault / AWS SM (roadmap); `.env` today |
| Access | GitHub repo + GHCR; docker host; Stripe dashboard; Sentry org |