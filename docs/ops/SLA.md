# Volume 11 — SLA & Service Levels

> Grounding: SLO drafts in `docs/devops/MONITORING.md`; support tiers in SUPPORT.md. This defines
> committed SLAs per plan tier, plus internal SLOs and the measurement/credit mechanics.

## 1. Customer SLAs (by tier)
| Tier | Uptime | Support response | Credit formula |
|---|---|---|---|
| Starter | Best-effort (no SLA) | 48h | n/a |
| Growth | 99.9% monthly | 12h | 10% credit if breached |
| Agency | 99.9% monthly | 8h | 15% credit |
| Enterprise | 99.95% monthly (contract) | 4h | 25% credit (per contract terms) |

**Uptime definition**: % of minutes where `/api/health` + core user paths (login, projects,
scans, reports) return success. Excludes scheduled maintenance (announced ≥ 48h).

## 2. Internal SLOs (SLO = target, SLA = contract)
| SLO | Target | Alert threshold | Owner |
|---|---|---|---|
| API availability | 99.9% | < 99.5% / 5m | Platform |
| Scan p95 latency | < 30s | > 45s / 10m | Scanner |
| AI remediation p95 | < 15s | > 25s / 10m | AI |
| Error rate (5xx) | < 0.1% | > 0.5% / 5m | Platform |
| Scheduled scan success | 99% | < 97% | Scheduler |
| Migration success | 100% | any failure | Platform |
| Backup success | 100% | any failure | Ops |

## 3. Measurement (current vs needed)
| SLO | Measured today? | How | Gap |
|---|---|---|---|
| API availability | ❌ | — | Add uptime monitor (pingdom/UptimeRobot) + Prometheus |
| Scan latency | ✅ partial | Scan rows durationMs | Aggregate into Prometheus histogram |
| AI latency | ✅ partial | audit `remediation.ai_cost` | Prometheus histogram |
| Error rate | ✅ partial | Sentry | Prometheus http_requests_total |
| Backup success | ✅ | script exit code | Alert on failure |

**Plan**: V7/V8 introduced the target stack (Prometheus/Grafana/Alertmanager + k6 thresholds).
SLA reporting needs those live — measured monthly via Grafana dashboards + k6 load tests.

## 4. SLA breach process
1. Detect breach (dashboard metric crosses SLO).
2. Calculate affected window (per error budget burn).
3. Enterprise/Agency: apply credit automatically (Stripe credit memo) within 15 days of month end.
4. Root-cause postmortem → preventive action (INCIDENT_RESPONSE.md).

## 5. Error budget policy
- Monthly error budget per SLO: e.g., 99.9% availability = 43.8 min downtime/month.
- **Budgets consumed**:
  - < 50%: normal releases.
  - 50–80%: freeze feature releases; allow bugfixes.
  - > 80%: all hands on reliability; rollback features if needed.
- Error budget tracked in Grafana (burn-rate alert at 14.4x budget pace = SEV-2).

## 6. Maintenance windows
- Announced ≥ 48h for migrations/restarts; target off-peak (02:00–05:00 UTC).
- Zero-downtime deploys are the norm (rolling + standalone); migrations run in entrypoint before
  new pod starts — brief read-path overlap possible for large migrations.

## 7. Quarterly SLA review
- Present: uptime, SLO attainment %, incidents (count + MTTR), error budget usage.
- Adjust SLOs/SLAs only with customer notice (30d for Enterprise).