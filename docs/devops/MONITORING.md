# Volume 7 — Monitoring & Observability

## 1. Current state (verified)

### Sentry (configured, DSN-gated)
- **Server** (`sentry.server.config.ts`): `prismaIntegration`, `httpIntegration`, traces 25% prod / 100% dev, profiles 20%
- **Client** (`sentry.client.config.ts`): `browserTracing`, `replay` (10% session / 100% error), `httpClient`, `captureConsole` (error/warn); falls back to `pino` warn log if DSN missing
- **Edge** (`sentry.edge.config.ts`): minimal traces only
- **Env vars**: `SENTRY_DSN` (server/edge), `NEXT_PUBLIC_SENTRY_DSN` (client)
- **Gaps**: No custom alerts, no release tracking automation, no performance budgets

### Health checks
- **Postgres**: `pg_isready` (compose), k8s readiness probe hits `/api/health/ready`
- **Redis**: `redis-cli ping` (compose); `/api/health/ready` checks Redis when `REDIS_URL` set
- **App**: `/api/health/live` (process up) + `/api/health/ready` (DB+Redis, 503 on failure) — also surfaced on the public `/status` page

### Metrics
- None emitted by app (no Prometheus `/metrics`, no OpenTelemetry)
- CI produces vitest coverage artifact; Playwright report artifact

## 2. Target monitoring stack

| Layer | Tool | Status | Notes |
| --- | --- | --- | --- |
| **Error tracking** | Sentry | ✅ configured | Add release automation + alert rules |
| **APM / Traces** | Sentry (built-in) | ✅ partial | 25% sample prod; consider OpenTelemetry for vendor-neutral |
| **Infrastructure metrics** | Prometheus + Grafana | ❌ missing | Node exporter, kube-state-metrics, postgres-exporter, redis-exporter |
| **Application metrics** | Prometheus (custom) | ❌ missing | Add `/metrics` endpoint (http_requests_total, scan_duration, ai_cost_usd, queue_depth) |
| **Logs** | Loki / CloudWatch / Datadog | ❌ missing | See LOGGING.md |
| **Uptime / Synthetic** | Pingdom / BetterUptime / Grafana Synthetic | ❌ missing | Check `/api/health/live` + critical user flows |
| **Alerting** | Alertmanager / PagerDuty / Opsgenie | ❌ missing | Define SLOs first (see below) |

## 3. SLO / SLI definitions (draft)

| Service | SLI | SLO (monthly) | Alert threshold |
| --- | --- | --- | --- |
| **API availability** | HTTP 2xx / total requests | 99.9% | < 99.5% for 5m |
| **Scan latency (p95)** | Histogram `scan_duration_seconds` | < 30s | > 45s for 10m |
| **AI remediation latency (p95)** | Histogram `ai_remediation_duration_seconds` | < 15s | > 25s for 10m |
| **Error rate** | 5xx / total requests | < 0.1% | > 0.5% for 5m |
| **DB migration success** | `prisma migrate deploy` exit code | 100% | any failure |
| **Backup success** | `db-backup` exit code | 100% | any failure |

## 4. Recommended next steps (incremental)
1. **Add `/api/health/live` + `/api/health/ready`** (liveness = process up; readiness = DB+Redis reachable)
2. **Enable Sentry release tracking**: tag releases in CI (`sentry-cli releases new`, `finalize`, `set-commits`)
3. **Add Prometheus client** (`prom-client`) → expose `/api/metrics` (scrapeable)
4. **Deploy Prometheus + Grafana** (kube-prometheus-stack or managed) with dashboards:
   - RED metrics (Rate, Errors, Duration) per route
   - Queue depth (BullMQ) + worker count
   - Scanner throughput + error rate
   - AI cost per org / per day
5. **Configure Alertmanager** with routes to Slack/PagerDuty based on SLO burn-rate alerts
6. **Add synthetic checks** for critical paths: login → create project → run scan → view report