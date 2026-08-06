# Volume 6 — Audit Logs

## 1. Model & capture

- `AuditLog` (orgId, action, metadata JSON, createdAt; indexed) — every significant event
  is written with org scope. Actions observed in the product: `scan.started/completed/failed`,
  `scan.blocked_plan_limit`, `github.pr_created`, `remediation_generated`,
  `violation_status_changed`, `team.invite_sent`, `member_invited` (legacy alias).
- Written server-side alongside domain mutations (queue worker, invite flow, PR pipeline).

## 2. API

- `GET /api/audit-logs` — **admin/owner only** (403 for members), org-scoped, filters
  (`action`, `limit` ≤200, `offset`), ordered `createdAt desc`, metadata JSON-parsed safely.

## 3. UI

- **Audit Logs page** (`/audit-logs`): timeline view (role-gated).
- **Header bell** (notifications): shows recent org activity for admins/owners only
  (V6 parity fix — fetch + render gated on `isAdmin`).

## 4. Retention & integrity

- Timestamps immutable; metadata parse-guarded (no crash on malformed JSON).
- Rotation/prune policy: **not yet automated** (see OPS runbook gap — flagged).

## 5. Compliance value

- Feed for incident response (who/what/when), GDPR evidence of processing, and SOC 2 CC7/CC8
  monitoring narrative. Keep orgId scoping + role gate on every read path.