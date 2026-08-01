# Partitioning, Read Replicas & Archiving

Status: **Design / deferred to production infrastructure** (single-node dev PostgreSQL today).

Scope: how AccessGuard keeps `Scan` and `Violation` tables fast as data grows to millions of rows, and how the app should be wired to support it without code changes.

---

## 1. Why partition (and why defer)

`Scan` and `Violation` are the two append-heavy, time-ordered tables. Every crawl inserts one scan row and dozens of violation rows; dashboard queries filter by `orgId` + `createdAt`, and retention purges old rows by `deletedAt`.

Problems at scale:

- Index size grows with the table; B-tree lookups on `(orgId, createdAt)` stay logarithmic but the index itself no longer fits cache.
- `DELETE` of old rows (retention) causes index bloat and MVCC bloat; autovacuum struggles to keep up.
- Backups and restores get slower with no way to drop "last month" cheaply.

Monthly **range partitioning** on `createdAt` is the standard fix: queries that always filter by date only touch one partition, retention becomes `DROP TABLE`/`DETACH PARTITION`, and vacuum runs per-partition.

**Why deferred:** none of this matters below ~5M violation rows, requires `db push`/migration tooling changes (Prisma does not generate `PARTITION BY`), and adds operational complexity (per-partition maintenance, indexes). The schema is already designed so partitioning is a zero-code-change migration later (see §4).

## 2. Target design

```sql
-- Scans, partitioned by month on createdAt
CREATE TABLE "Scan" (
  id TEXT NOT NULL,
  projectId TEXT NOT NULL,
  orgId TEXT NOT NULL,
  status TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  ...
  PRIMARY KEY (id, "createdAt")
) PARTITION BY RANGE ("createdAt");

CREATE TABLE "Scan_2026_08" PARTITION OF "Scan"
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
```

Notes:

- Partitioning key must be part of the PK → composite `(id, createdAt)`. The app already selects scans by `id` (unique per project) and by `(projectId, createdAt)` ranges, so composite PKs keep all queries partition-prunable.
- `Violation` uses the same scheme with `(id, createdAt)` and `(scanId, createdAt)` indexes.
- Partition creation is automated by a monthly cron (`scripts/partition-maintenance.mjs` in production) or `pg_partman`; on dev, partitions are pre-created in a migration.
- Older partitions are **detached** (not dropped) and moved to a cold archive for compliance history.

## 3. Read replicas

Serving model after replicas exist:

- Writes, and any read that must see the write (scan results immediately after a scan, role/permission checks), go to the primary.
- Heavy analytical reads — dashboard aggregates, report generation, audit-log listing — can go to a replica.

Prisma wiring (no app-code change):

- `DATABASE_URL` = primary (write) connection, kept as-is.
- `REPLICA_DATABASE_URL` = read-only connection used via Prisma Client extension:

```ts
// src/lib/db.ts (production only)
const replicaUrl = process.env.REPLICA_DATABASE_URL;
export const db = replicaUrl
  ? prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            const isRead = ['findMany', 'findFirst', 'findUnique', 'count', 'aggregate', 'groupBy'].includes(
              args?.operation ?? this.operation
            );
            return query({ ...args, $replica: isRead });
          },
        },
      },
    })
  : prisma;
```

- Round-robin / least-conn load balancing is left to PgBouncer / RDS Proxy, which can route `$replica` queries to replica endpoints.
- Replication lag (target < 500ms) is acceptable: scan results pages refetch after run completion, and the worker that marks scans complete writes through the primary.
- Never route MFA, billing, or permission checks to replicas — consistency-critical reads stay on primary.

## 4. Why the current schema is already partitioning-ready

- Every write path scopes by `orgId`/`projectId` + `createdAt`; queries already carry those filters (dashboard, scans list, violations list).
- Soft deletes (`deletedAt`) on Scan/Violation mean retention is a bulk `UPDATE`/`DELETE` by date range — the exact operation partitioning makes cheap.
- No cross-table foreign keys into `Scan`/`Violation` require ON DELETE behavior changes; violations reference scans but both partition by the same key.
- Prisma `db push` on dev is unaffected; the production migration path can switch to raw SQL migrations for these two tables only.

## 5. Archiving & retention

| Tier | Strategy |
| --- | --- |
| Hot (last 13 months) | Partitioned tables; active queries prune by date. |
| Warm (13–36 months) | Detached partitions moved to `accessguard_archive` tablespace/DB; report generation queries it via `dblink` or a replica. |
| Cold (36+ months) | Parquet export to object storage for compliance; row-level GDPR delete requests still honored via audit `deletedAt` filters. |

Archiving jobs (`scripts/archive-partitions.mjs` in production, cron monthly) follow the existing `deletedAt` soft-delete convention so the application code never knows a partition was detached.

## 6. Rollout checklist (when infra exists)

1. Migrate `Scan`/`Violation` to partitioned parents with 12 pre-created monthly partitions.
2. Backfill old rows into partitions; verify `pg_verify_backup` and row counts per org.
3. Add `REPLICA_DATABASE_URL` + Prisma read-replica extension (this file's snippet).
4. Enable PgBouncer transaction pooling; confirm `$replica` routing.
5. Start `pg_partman`/cron for partition + archive maintenance; alert on partition lag.
6. Extend `ENTERPRISE_DB_ARCHITECTURE.md` status section once live.

Nothing in the application layer needs to change — the guards (`requireOrgAccess`, permissions) and all list/aggregate queries already carry the `orgId` + `createdAt` predicates partitioning relies on.
