# Volume 11 — Incident Response (Ops layer)

> Complements `docs/devops/DISASTER_RECOVERY.md` (infra playbooks) and `docs/runbooks/RUNBOOKS.md`
> (procedures). This is the team process layer: how incidents are triaged, run, and reviewed.

## 1. Severity definitions
| Sev | Definition | Examples | Response target |
|---|---|---|---|
| **SEV-1** | Total outage / data loss / security breach | App down, DB compromised, secrets leaked | < 15 min acknowledge; every hour updates |
| **SEV-2** | Major feature degraded, no workaround | Scans fail, AI down (template fallback), billing broken | < 30 min acknowledge |
| **SEV-3** | Minor, workaround exists | Slow scans, cosmetic bug, single-tenant issue | < 2h; fix in normal cycle |
| **SEV-4** | Non-urgent | Docs errors, low-priority bugs | Next sprint |

## 2. Incident lifecycle
```
DETECT → TRIAGE (sev, commander) → MITIGATE → COMMUNICATE → REVIEW (postmortem) → PREVENT
```

### Detection sources (current)
- Sentry (errors/performance) — must-have alert rules wired (V7 roadmap)
- CI failures (lint/test/build/e2e)
- `/api/health` monitoring (uptime checker — roadmap)
- Customer reports (support@)

### Roles
| Role | Responsibility |
|---|---|
| **Incident Commander** | Seviest person; owns comms + decision; never codes |
| **Mitigator(s)** | Run the playbook (RB01–RB10), implement fix |
| **Scribe** | Timeline log (what, when, who) |
| **Postmortem owner** | Writes report within 72h |

## 3. Communication
| Channel | Who | Cadence |
|---|---|---|
| Slack `#incidents` | Team | Status every 30–60 min (SEV-1), on change (SEV-2) |
| PagerDuty | On-call | SEV-1/2 alerts |
| Status page | Customers | SEV-1: "Investigating → Identified → Monitoring → Resolved" |
| Email | Enterprise customers | SEV-1 update per SLA |

## 4. Postmortem template (72h)
```
Title: [SEV-1] 2026-08-06 — [summary]
Impact: users affected, duration, metrics (error rate, availability)
Timeline: detection → mitigation → resolution (with timestamps)
Root cause: (5 whys)
Contributing factors: monitoring gap, deploy process, etc.
Actions:
  [ ] Fix X (owner, due)
  [ ] Alert on Y (owner, due)
  [ ] Test for Z (owner, due)
Follow-ups tracked as GitHub issues; review at next ops sync.
```

## 5. SEV-1 runbook (condensed)
1. **Acknowledge** < 15 min (PagerDuty).
2. **Freeze deploys** (unless rollback fixes it).
3. **Mitigate first** (rollback image, restore backup, rotate secret — see RB01/RB03/RB10).
4. **Communicate** status page + customers (enterprise).
5. **Restore service**, verify `/api/health` + smoke paths (login → scan → report).
6. **Postmortem** < 72h; track actions.

## 6. Metrics
| Metric | Target |
|---|---|
| MTTA (time to acknowledge) | < 15 min (SEV-1) |
| MTTR (time to resolve) | < 1h (SEV-1) |
| Incidents/mo | < 2 (SEV-1/2) |
| Postmortems on time | 100% |
| Action closure | 90% within 14 days |

## 7. Readiness checklist (launch)
- [ ] PagerDuty rotation with 2+ members
- [ ] Sentry alert rules (error spike, 5xx, scan failure)
- [ ] Status page (or /api/health + simple status HTML)
- [ ] Postmortem template in repo (`docs/ops/`)
- [ ] On-call contact list + escalation tree