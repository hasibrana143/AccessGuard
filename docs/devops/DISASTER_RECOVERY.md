# Volume 7 — Disaster Recovery Runbook

## 1. RPO / RTO Targets (draft)

| Scenario | RPO (data loss) | RTO (downtime) | Confidence |
| --- | --- | --- | --- |
| **Single pod crash** | 0 (stateless) | < 30s (k8s reschedule) | High |
| **Node loss** | 0 | < 2m (pod eviction + reschedule) | High |
| **Availability zone loss** | 0 (multi-AZ) | < 5m (cross-AZ failover) | Medium (needs multi-AZ deploy) |
| **Region loss** | < 24h (daily backup) | < 4h (restore to standby region) | Low (untested) |
| **Postgres primary failure** | < 5s (sync replica) | < 1m (auto-failover) | Low (no replica yet) |
| **Accidental `DROP TABLE` / bad migration** | < 24h (last backup) | < 30m (restore + migrate) | Medium (restore tested monthly) |
| **Ransomware / encrypted DB** | < 24h (off-site backup) | < 2h (clean restore) | Low (needs immutable backup) |

## 2. Current architecture resilience

| Component | HA status | Failover |
| --- | --- | --- |
| **App (Next.js)** | Stateless, horizontal scaling ready | K8s Deployment (rolling) / Compose restart |
| **Postgres** | Single primary (compose / single RDS) | **None** — manual restore from backup |
| **Redis** | Single instance | **None** — ephemeral, re-populate from DB |
| **Queue (BullMQ)** | In-process worker + scheduler | Jobs persist in Redis; re-process on restart |
| **Object storage** | Not used yet | N/A |
| **Secrets** | `.env` / GH Actions secrets | Rotate via secret manager |

## 3. Incident response playbooks

### Playbook 1: App pod crash / OOM / deploy failure
1. **Detect**: Alert on pod restarts > 5 in 10m / health check failing
2. **Triage**: `kubectl logs -n accessguard -l app=accessguard --tail=100`
3. **Mitigate**: `kubectl rollout restart deployment/accessguard -n accessguard`
4. **Root cause**: Check Sentry for error spike; check `error-logger` output
5. **Postmortem**: Add to incident log; fix underlying bug

### Playbook 2: Postgres primary down
1. **Detect**: `/api/health/ready` failing (DB connection); pg_isready failing; CPU/memory alerts
2. **Triage**: Check RDS/Cloud SQL console / `docker logs postgres`
3. **Mitigate (current)**: Restore from latest backup (see BACKUPS.md §5)
   - RPO ≈ 24h, RTO ≈ 30m
4. **Long-term fix**: Provision read replica + auto-failover (RDS Multi-AZ / CloudNativePG)

### Playbook 3: Redis down
1. **Detect**: Rate-limit errors; queue stalls; scheduler logs "ECONNREFUSED"
2. **Triage**: `redis-cli ping` / check memory / OOM
3. **Mitigate**: Restart Redis (`docker compose restart redis` / RDS reboot); app auto-reconnects
4. **Data loss**: Rate-limit counters reset (acceptable); queued scans re-picked by scheduler

### Playbook 4: Bad migration deployed
1. **Detect**: App crashes on start; `prisma migrate deploy` fails in entrypoint
2. **Mitigate**: Rollback image tag (`kubectl rollout undo deployment/accessguard`); if schema changed, restore DB from backup + redeploy previous image
3. **Prevention**: `db:push` blocked in CI; only `migrate deploy` in prod; test migrations in staging first

### Playbook 5: Security breach (credentials leaked)
1. **Detect**: Unusual access patterns; Sentry alerts; audit log anomalies
2. **Contain**: Rotate **all** secrets immediately (DB password, NEXTAUTH_SECRET, OAUTH_STATE_SECRET, GitHub OAuth, Sentry DSN, Stripe keys)
3. **Investigate**: AuditLog query for suspicious actions; Sentry for error spikes
4. **Recover**: Force logout all sessions (change NEXTAUTH_SECRET); re-issue API keys
5. **Report**: Follow GDPR/SOC2 notification timelines (72h GDPR)

## 4. DR testing schedule

| Test | Frequency | Method | Success criteria |
| --- | --- | --- | --- |
| **Backup restore** | Monthly | GitHub Actions workflow → restore to staging → run smoke tests | Restore < 15m; smoke tests pass |
| **Failover (simulated)** | Quarterly | Stop primary Postgres → verify replica promotes (when replica exists) | Failover < 1m; 0 data loss |
| **Region failover** | Semi-annual | Deploy to standby region from backup → DNS cutover | RTO < 4h; data < 24h old |
| **Full incident sim** | Annual | Tabletop exercise with team | Runbook gaps identified |

## 5. Communication plan

| Severity | Channel | Escalation |
| --- | --- | --- |
| **SEV-1** (prod down, data loss) | PagerDuty → On-call → Slack #incidents → Email stakeholders | CTO within 15m |
| **SEV-2** (degraded, partial outage) | Slack #incidents → On-call | Eng lead within 30m |
| **SEV-3** (minor, non-user-facing) | Slack #devops → Ticket | Next business day |

## 6. Runbook location
- This doc: `docs/devops/DISASTER_RECOVERY.md`
- Live runbook (when implemented): GitBook / Notion / Confluence synced from this file
- On-call contacts: GitHub Team `accessguard-oncall` (Slack/PD integration)