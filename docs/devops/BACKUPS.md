# Volume 7 — Backups & Restore

## 1. Current state (verified)

### `scripts/db-backup.mjs`
- **Commands**: `backup`, `restore <file>`, `backup --prune`
- **Backend**: `pg_dump` / `psql` (local binary or `docker exec` into Postgres container)
- **Output**: `./backups/accessguard-<ISO-timestamp>.sql` (configurable via `BACKUP_DIR`)
- **Retention**: `KEEP_BACKUPS` env (default 7) — `--prune` keeps newest N
- **Container detection**: auto-finds Postgres container via `docker ps` name match `/postgres/i`, override with `POSTGRES_CONTAINER`
- **Env**: `DATABASE_URL` (required), `BACKUP_DIR`, `KEEP_BACKUPS`, `POSTGRES_CONTAINER`
- **NPM scripts**:
  - `db:backup` → `node scripts/db-backup.mjs backup`
  - `db:backup:prune` → `backup --prune`
  - `db:restore` → `restore <file>`

### What's backed up
- Full schema + data (pg_dump default)
- Includes `AuditLog`, `Scan`, `Violation`, `User`, `Organization`, `Project`, `CustomRole`, `GithubConnection`, `PasswordReset`, `TeamInvite`, `ComplianceReport`, `ScheduledScan`, `WcagRule`

### What's NOT backed up
- Redis (ephemeral queue data, rate-limit counters — acceptable loss)
- Object storage (none yet)
- Application container (immutable image)

## 2. Gaps

| Gap | Risk | Fix |
| --- | --- | --- |
| **No automated schedule** | Relies on manual `npm run db:backup` | CronJob (K8s) / GitHub Actions scheduled workflow / systemd timer |
| **No off-site copy** | Single-host failure = data loss | Upload to S3/GCS/R2/Azure Blob after backup |
| **No encryption at rest** | Backup files readable if host compromised | `pg_dump \| gpg --symmetric --cipher-algo AES256` or SSE-S3 |
| **No restore testing** | Restore may fail silently | Monthly automated restore to staging + smoke test |
| **No PITR** | Can only restore to backup points | Enable Postgres WAL archiving + `pg_basebackup` for point-in-time recovery |
| **No backup monitoring** | Silent failures | Alert on backup job exit code ≠ 0; metric `backup_last_success_timestamp` |

## 3. Target backup architecture

```
┌─────────────┐     pg_dump      ┌─────────────┐   encrypt+compress   ┌──────────┐
│  Postgres   │ ──────────────►  │  Backup Job │ ──────────────────►  │  S3/GCS  │
│  (primary)  │                  │  (CronJob)  │   (AES-256, gzip)    │  (WORM)  │
└─────────────┘                  └─────────────┘                      └──────────┘
        │                              │
        │ WAL archive                  │ metadata (size, checksum, timestamp)
        ▼                              ▼
┌─────────────┐                  ┌─────────────┐
│  WAL-G /    │                  │  Prometheus │
│  pgBackRest │                  │  (metrics)  │
└─────────────┘                  └─────────────┘
```

## 4. Recommended implementation (incremental)

### Phase 1 — Automation (week 1)
- **GitHub Actions scheduled workflow** (`.github/workflows/backup.yml`):
  ```yaml
  on:
    schedule:
      - cron: '0 2 * * *'  # daily 02:00 UTC
    workflow_dispatch:
  jobs:
    backup:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: docker/login-action@v3 ...  # if using docker exec
        - run: npm ci
        - run: npm run db:backup:prune
          env:
            DATABASE_URL: ${{ secrets.DATABASE_URL }}
            BACKUP_DIR: /tmp/backups
        - uses: actions/upload-artifact@v4
          with:
            name: db-backup
            path: /tmp/backups/*.sql
            retention-days: 30
  ```
- Add S3 upload step (`aws s3 cp`) with `AWS_ACCESS_KEY_ID`/`SECRET` secrets

### Phase 2 — Encryption + PITR (month 1)
- Wrap `pg_dump` output: `pg_dump ... | gzip | gpg --symmetric --cipher-algo AES256 --passphrase "$BACKUP_PASSPHRASE" > backup.sql.gz.gpg`
- Enable Postgres `wal_level = replica`, `archive_mode = on`, `archive_command = '...'` → ship WAL to S3 via `wal-g` or `pgBackRest`

### Phase 3 — Restore validation (ongoing)
- Monthly workflow: `restore latest backup to staging DB` → run `npm run test:e2e` subset → report success/failure

## 5. Restore procedures (runbook)

### Full restore (RPO = last backup, RTO ≈ 15 min)
```bash
# 1. Provision clean Postgres (RDS / Cloud SQL / local)
# 2. Download latest backup from S3
aws s3 cp s3://bucket/backups/accessguard-2026-08-06T02-00-00.sql.gz.gpg /tmp/
# 3. Decrypt + decompress
gpg --decrypt --passphrase "$BACKUP_PASSPHRASE" /tmp/backup.sql.gz.gpg | gunzip > /tmp/restore.sql
# 4. Restore
psql -h <host> -U <user> -d <db> < /tmp/restore.sql
# 5. Run migrations (in case schema drifted)
npx prisma migrate deploy
# 6. Verify: smoke test critical paths
```

### Point-in-time recovery (if WAL archiving enabled)
```bash
# Using pgBackRest / wal-g
pgbackrest --stanza=accessguard --type=time --target="2026-08-06 10:30:00" restore
```

## 6. Retention policy (compliance-aligned)
| Tier | Frequency | Retention | Storage |
| --- | --- | --- | --- |
| **Hot** | Daily | 7 days | S3 Standard |
| **Warm** | Weekly (Sun) | 4 weeks | S3 Standard-IA |
| **Cold** | Monthly (1st) | 13 months | S3 Glacier Deep Archive |
| **Annual** | Yearly (Jan 1) | 7 years | S3 Glacier Deep Archive (WORM) |

## 7. Metrics to expose
- `backup_last_success_timestamp_seconds` (gauge)
- `backup_duration_seconds` (histogram)
- `backup_size_bytes` (gauge)
- `backup_failure_total` (counter)