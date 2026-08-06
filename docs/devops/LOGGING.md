# Volume 7 — Logging

## 1. Current state (verified)

### Application logging
- **Server**: `src/lib/error-logger.ts` (pino-based structured JSON logger)
  - Levels: `error`, `warn`, `info`, `debug`
  - Redacts sensitive fields (password, token, secret, key, authorization)
  - Child loggers per module (`logger.child({ module: 'scanner' })`)
- **Client** (`sentry.client.config.ts`): falls back to `pino` warn if Sentry DSN missing
- **Edge**: Sentry only, no local fallback

### Access logs
- **Next.js**: none by default (standalone server)
- **Docker**: container stdout/stderr → Docker JSON log driver
- **Compose**: no log driver config (defaults to json-file, no rotation limit)

### Audit logs (domain)
- **DB table**: `AuditLog` (Prisma model) — org-scoped, action/user/timestamp/metadata JSON
- **API**: `/api/audit-logs` (admin-only, paginated)
- **UI**: Header bell fetches `/api/audit-logs` (gated by `isAdmin` per V6 fix)

## 2. Gaps

| Gap | Impact | Fix |
| --- | --- | --- |
| No log aggregation | Can't query across pods/containers; lost on restart | Ship to Loki / CloudWatch / Datadog / Elasticsearch |
| No structured log sampling | High-volume DEBUG in prod = cost/noise | Level via `LOG_LEVEL` env; default `info` prod |
| No correlation IDs | Can't trace request across services | Add middleware: `x-request-id` → pass to logger child |
| No log retention policy | Disk pressure / compliance | Rotation + retention in aggregation layer |
| No audit log export | Compliance / SIEM | Scheduled export job (see BACKUPS.md) |

## 3. Target log pipeline

```
App (pino JSON stdout)
   │
   ├─ Docker json-file (local)  ──► Loki (via promtail/Docker logging driver)
   │
   └─ K8s stdout  ──► Fluent Bit / Vector  ──► Loki / Elasticsearch / CloudWatch
```

### Structured log schema (recommended)
```json
{
  "timestamp": "2026-08-06T12:34:56.789Z",
  "level": "info",
  "service": "accessguard",
  "module": "scanner",
  "requestId": "abc-123",
  "orgId": "org_...",
  "userId": "user_...",
  "message": "Scan completed",
  "durationMs": 12345,
  "scanId": "scan_...",
  "violations": 7
}
```

## 4. Implementation steps
1. **Add request ID middleware** in `src/middleware.ts` → header `x-request-id` (generate UUID if missing) → attach to response + logger context
2. **Configure Docker log driver** in `docker-compose.yml`:
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```
3. **Add Loki + Promtail** (dev) / Vector (prod) to scrape `/var/lib/docker/containers`
4. **Grafana Loki datasource** + dashboards: error rate by module, scan latency, AI cost events
5. **Audit log export job** (cron in K8s or GitHub Actions): query `AuditLog` → JSONL → S3/GCS with retention

## 5. Compliance notes
- **GDPR**: Audit logs contain personal data (email, IP) — include in DSAR export; retention 12 months default (configurable)
- **SOC 2**: Immutable audit trail — ensure log aggregation is append-only; WORM bucket for exports