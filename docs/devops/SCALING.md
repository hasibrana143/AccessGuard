# Scaling — Scan Throughput

> Status: implemented (worker split + env tuning). Measured numbers: pending
> k6 run (see Phase 4). Estimates below are architecture math, not proof.

## Bottleneck

One browser scan occupies ~1 CPU + 1–2 GB RAM for its whole run
(Playwright Chromium + axe-core per page, ~5–15 s/page). The web process
cannot host many of these without starving HTTP traffic.

## Knobs (in priority order)

1. **More worker processes** (horizontal): `docker compose --profile workers up --scale worker=3`.
   Each worker pulls from the same Redis `scans` queue (BullMQ — no
   coordination code needed; scheduler claims are atomic).
2. **Concurrency per worker** (vertical): `SCAN_WORKER_CONCURRENCY` (default 3,
   max 32, validated in `scanWorkerConcurrency()`).
3. **Quotas/rate limits** (backpressure): `pagesQuota` per org + 10 scans/min
   per client keep one org from starving the queue.

## Split mode

- Default `docker compose up`: all-in-one (web + worker in-process).
- Split: uncomment `DISABLE_BACKGROUND_WORKERS=true` on `app`, run
  `docker compose --profile workers up`. The scheduler daemon moves with the
  worker (claims + sweep gates are idempotent, safe with N workers).

## Capacity math (single server, defaults)

- 1 web + 1 worker × 3 slots ≈ 10–20 pages/min ≈ tens of active orgs.
- 1 web + 3 workers × 6 slots ≈ 60–120 pages/min.
- "100 concurrent scans" needs a worker fleet well beyond one box —
  that is a deliberate future step (k8s job queue), not this change.

## What was NOT changed

- No k8s manifests (PRD honest gap, unchanged).
- No DB partitioning (deferred until >5M violation rows, unchanged).
- No fair-queuing per org (quotas + rate limits already bound abuse).
