# Volume 12 — Rollback & Recovery Plan

> How to revert any release safely. Complements RB01/RB03 in RUNBOOKS and DISASTER_RECOVERY.
> Core principle: **image rollback first, DB migration rollback only as last resort**.

## 1. Rollback tiers
| Tier | Trigger | Action | Downtime |
|---|---|---|---|
| **App image** | Bug, perf regression, 5xx spike | Redeploy previous image tag | < 1 min (rolling) |
| **App + config** | Env misconfiguration | Redeploy with fixed env (keep image) | < 1 min |
| **App + DB schema** | Bad migration | Restore DB from backup + deploy compatible image | 15–30 min |
| **Full disaster** | Region loss, ransomware | DR restore (V7 DISASTER_RECOVERY) | < 4h |

## 2. Image rollback (the common case)
```bash
# Current: v1.0.3 broken → revert to v1.0.2
docker compose up -d --pull always --force-recreate  # with IMAGE_TAG=v1.0.2
# or Kubernetes
kubectl rollout undo deployment/accessguard
# Verify
curl -f https://host/api/health && smoke login→scan
```

## 3. Migration rollback (last resort — data)
- Migrations are forward-only (`prisma migrate deploy`). There is **no automatic down**.
- If a migration corrupted data:
  1. **Stop app** (prevent more writes).
  2. **Restore from backup**: `npm run db:restore backups/<latest>.sql` (RB03).
  3. Redeploy image **matching the schema of the backup** (old image).
  4. Re-run newer migrations only after the bug is fixed in a new migration.
- Alternative (lighter): keep `migration_20260XXX` files; if schema change is additive and safe,
  you can stay on new schema but old image must tolerate extra columns (Prisma ignores unknown
  columns) — evaluate per case.

## 4. Rollback metrics & monitoring
| Check | Threshold → rollback |
|---|---|
| Error rate (5xx) | > 0.5% for 5 min |
| /api/health | 3 consecutive failures |
| Scan success rate | < 80% hourly |
| AI latency p95 | > 25s for 10 min |
| CPU/memory | sustained 90%+ with no headroom |

## 5. Rollback decision (commander)
1. Any SEV-1 caused by the release → **rollback immediately** (no debugging in prod).
2. SEV-2 with workaround → evaluate fix-forward vs rollback (team vote < 15 min).
3. Data-affecting → restore path (tier 3) with data loss window declared.

## 6. Versioning contract (see VERSIONING)
- `v*` tags immutable; `latest` floats; sha tags for precise pinning.
- Never force-push tags; never amend released versions.

## 7. Post-rollback
1. Postmortem (INCIDENT_RESPONSE template) — root cause, preventive tests.
2. Regression test in staging before next deploy attempt.
3. Restore `latest` tag only after verified green.