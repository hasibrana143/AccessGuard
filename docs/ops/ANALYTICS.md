# Volume 11 — Analytics & KPI Dashboard

> Grounding: usage stats exist in API (`/api/stats/usage`, `/api/stats/trends`,
> `/api/stats/regression` — org-level). Product analytics (PostHog/GA4) NOT wired — gap. This doc
> defines the analytics plan + KPI dashboard spec.

## 1. Two analytics layers
| Layer | Purpose | Tool | Status |
|---|---|---|---|
| **Product analytics** (behavioural) | Funnel, activation, feature usage, session replay | PostHog (OSS-friendly, GDPR) | ❌ not wired |
| **Business/ops metrics** | MRR, SLO, infra, queues | Grafana + Stripe + custom | ⚠️ partial (SLO stack V7 roadmap) |

## 2. Product analytics (PostHog) — implementation plan
- **SDK**: `posthog-js` client + `posthog-node` server (`/api/*` edge for server events).
- **Identify**: on auth (`userId`, `orgId`, `plan`).
- **Core events** (map to funnel):
  | Event | Trigger | Funnel stage |
  |---|---|---|
  | `signup_started` | `/auth/register` view | Signup |
  | `email_verified` | verify-email success | Signup |
  | `project_created` | POST /api/projects 201 | Activation |
  | `scan_started` | POST /api/scans 202 | Activation |
  | `scan_completed` | scan job done | Activation |
  | `violation_ignored / fixed` | PUT /api/violations | Engagement |
  | `ai_fix_generated` | /api/remediate 200 | Engagement |
  | `pr_created` | /api/github/create-pr 200 | Value |
  | `report_generated` | POST /api/reports/generate | Value |
  | `checkout_started / subscribed` | Stripe events | Conversion |
  | `plan_upgraded / cancelled` | Stripe subscription updates | Retention |
- **Privacy**: GDPR-ready — cookie consent banner (roadmap), no PII in events, masking in replay.

## 3. Funnel targets (with existing pipeline)
| Stage | Baseline → Target |
|---|---|
| Signup → first scan | 70% → 85% |
| First scan → 2nd scan | 50% → 65% |
| 2nd scan → report gen | 30% → 45% |
| Trial → paid | 8% → 12% |
| Activation time (signup→first scan) | < 5 min |

## 4. KPI Dashboard spec
### 4.1 Revenue (Stripe + DB)
- MRR / ARR · ARPU · NR/RR (net revenue retention) · churn (logo + MRR) · CAC · payback · refunds.
### 4.2 Product health
- Active projects · scans/day · scan success rate · avg scan duration (p95) · violations/scan ·
  AI fixes generated · PRs created/merged · report shares.
### 4.3 Engagement
- DAU/WAU/MAU · retention cohorts (D7/D30) · session count · weekly evidence email open rate.
### 4.4 Reliability (V7 SLOs)
- Uptime · p95 latency by endpoint · error budget · queue depth · incident count.
### 4.5 Security (audit signals)
- Failed logins · MFA adoption · audit events/day · flag flips.

### Dashboard layers (maps to tools)
- **Grafana**: infra/ops (SLO, queues, scanner, AI cost).
- **PostHog dashboard**: funnel + retention + product KPIs.
- **Revenue sheet → BI**: until dedicated BI (Metabase/Mode) at scale.

## 5. Data pipeline (roadmap build)
```
App events (PostHog SDK / Stripe webhooks / DB tables)
   │
   ├─ PostHog (product KPIs)  ────────────────► dashboards + alerts
   ├─ Prometheus/Grafana (SLO/ops) ───────────► alerting
   └─ SQL exports (Stripe + Postgres) ────────► weekly revenues snapshot (script)
```

## 6. Weekly ops cadence
| Day | Meeting | Data reviewed |
|---|---|---|
| Mon | KPIs baseline refresh | MRR, trials, activation |
| Thu | Reliability triage | SLO burn, incidents, queue health |
| Fri | Metrics close + action log | Funnel step drops, top friction (<br>scan/remediate/report) |

## 7. Immediate actions
1. Add PostHog (or privacy-first alternative) instrumentation — enable product funnel (biggest insight gap).
2. Wire `audit` events for `flag.set` (strengthen both feature flags + analytics of change).
3. Export script (CSV) for MRR/retention from Stripe + `Plan` tables (weekly snapshot); it becomes the revenue dashboard foundation.
4. Alert on funnel step drops (scan_started → scan_completed < 80% = scanner regression alert).