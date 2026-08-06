# Volume 11 — KPI Dashboard & Reporting

> Consolidates metric definitions from V7 (SLOs), V10 (business), and ANALYTICS.md into one
> operational reference. All metrics map to real data sources.

## 1. Metric dictionary (source-verified)
| Metric | Definition | Source | Cadence |
|---|---|---|---|
| **MRR** | Σ active subs × price | Stripe subscriptions + price table (`src/lib/stripe.ts`) | Weekly |
| **ARR** | MRR × 12 | Stripe | Monthly |
| **ARPU** | MRR ÷ paid customers | Stripe + `User`/`Org` | Monthly |
| **NR/RR** | (MRR start + expansion − contraction − churn) ÷ MRR start | Stripe | Monthly |
| **Logo churn** | cancelled subs ÷ active at month start | Stripe events (`customer.subscription.deleted`) | Monthly |
| **Trial→paid** | 30d cohort: paid ÷ trials | `User` + Stripe | Monthly |
| **CAC** | sales+marketing spend ÷ new customers | Finance sheet | Quarterly |
| **Activation** | signups reaching first scan within 24h | `Scan` rows vs `User` created_at | Weekly |
| **Scans/day** | Σ scans by day | `Scan` table | Daily |
| **Scan success rate** | completed ÷ total | `Scan.status` | Weekly |
| **Scan p95 duration** | 95th pct of durationMs | `Scan` | Weekly |
| **AI fixes generated** | Σ `source=llm` remediations | audit `remediation.ai_cost` events | Weekly |
| **AI cost/org** | Σ costUsd in ai_cost events | audit logs | Monthly |
| **PRs created/merged** | Σ create-pr success + status | audit + github API | Monthly |
| **Uptime** | % OK of /api/health probes | Uptime monitor (roadmap) | Monthly |
| **Error budget** | SLO attainment | Grafana (V7) | Monthly |
| **DAU/WAU/MAU** | unique users by day/week/month | PostHog (roadmap) | Weekly |
| **Retention D7/D30** | cohort returning at day 7/30 | PostHog | Monthly |
| **MFA adoption** | users with MFA ÷ active | `User` MFA column | Monthly |
| **Failed logins** | Σ auth failures | audit logs | Weekly |
| **Tickets** | support volume | Ticket system (until then email log) | Weekly |

## 2. Dashboard layouts

### Weekly ops dashboard (single screen)
```
[MRR ▁▅▇ trend] [New trials] [Trial→paid %] [Churn %]
[Scans/day] [Scan success %] [p95 scan ms] [AI cost/org top 5]
[SLO: uptime bar] [Error budget bar] [Queue depth] [Incidents]
```

### Monthly business review
```
MRR bridge (new/expansion/contraction/churn)
Funnel: signup → first scan → repeat scan → report → paid
Cohort retention table (D7/D30 by signup month)
NPS/CSAT (roadmap survey)
```

## 3. Implementation status
| Component | Status | Effort to finish |
|---|---|---|
| Data (DB/Stripe/audit) | ✅ all exist | — |
| Revenue snapshot script | ❌ | S (1 script) |
| PostHog product analytics | ❌ | M |
| Grafana SLO dashboards | ❌ (V7 plan) | M |
| Weekly export email | ❌ | S |

## 4. Alerting rules (who gets pinged)
| Alert | Trigger | Channel | Severity |
|---|---|---|---|
| Scan success < 80% | hourly check | Slack #incidents | SEV-2 |
| AI latency p95 > 25s | 10m window | Slack #incidents | SEV-2 |
| Uptime < 99.5% | 5m | PagerDuty | SEV-1 |
| Failed logins spike | 10× baseline | Slack #security | SEV-3 |
| MRR drop > 10% | monthly review | Email | Review |
| Backup failure | daily | PagerDuty | SEV-2 |

## 5. First 30 days of dashboarding
1. Write `scripts/revenue-snapshot.mjs` (Stripe API → CSV/Markdown report; MRR bridge).
2. Wire PostHog events (signup→scan→report funnel).
3. Grafana: scanner latency + AI cost + queue depth dashboards (data exists in DB/audit).
4. Ship weekly ops email (Friday): MRR, trials, activation, scan success, incidents.