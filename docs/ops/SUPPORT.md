# Volume 11 — Support Operations

> Grounding: app has audit logs, notifications module (`src/lib/notifications.ts`,
> `notification-settings.ts`, `/api/notifications/test`), public reports, legal pages, rate limits.

## 1. Support tiers
| Tier | Customers | SLA (target) | Channels |
|---|---|---|---|
| **Self-serve** | Starter ($49) | 48h email | Email support@accessguard.dev |
| **Priority** | Growth ($149) | 12h | Email + in-app notifications |
| **Agency** | Agency ($399) | 8h | Email + dedicated contact |
| **Enterprise** | Custom | 4h (SLA contract) | Email + phone/video |

## 2. Support toolkit (what exists vs needed)
| Tool | Status | Notes |
|---|---|---|
| In-app notifications (bell) | ✅ built | Admin-gated read of `/api/audit-logs`; `/api/notifications/test` |
| Notification settings per user | ✅ built | `src/lib/notification-settings.ts` |
| Public report links | ✅ built | `/share/[token]` — share evidence with client |
| Legal pages | ✅ built | `/api/legal/tos`, `/api/legal/privacy` |
| Help docs | ✅ built | `docs/runbooks/USER_GUIDE.md` + ADMIN_GUIDE |
| Email transport | ⚠️ partial | Need transactional email provider wiring (Resend/Postmark) + templates |
| Ticket/CRM system | ❌ missing | Roadmap: simple help desk (Zendesk/Linear inbox) until 50 customers |
| Chat widget | ❌ missing | Defer (no need at early scale) |

## 3. Common ticket playbook
| Ticket | First response | Resolution path |
|---|---|---|
| "Scan fails on my site" | Ask for URL + scan id | RB05 (scanner runbook): robots/captcha/timeouts; retry; fetch/dom fallback |
| "Why no AI fix?" | Check plan tier + key config | Template fallback is default; LLM key needed for llm source; confidence < 0.7 blocks PR |
| "Report looks wrong" | Ask which report/org | Verify scan timestamps, rule set, risk formula (100 − 10c − 5s − 2m − 1mn) |
| "Can't log in" | Verify email verified + MFA | RB07 auth runbook; secrets must be set (fail-closed) |
| "Billing issue" | Stripe sub id | RB08 billing runbook; coupon/invoices via API |
| "Agency white-label" | Probe tier + sites count | Pitch Agency tier + admin guide |

## 4. Support SLAs & metrics
| Metric | Target | Measurement |
|---|---|---|
| First response (Starter/Priority/Agency) | 48h / 12h / 8h | Ticket system (or email log until then) |
| Resolution time (median) | < 72h | Ticket system |
| CSAT | ≥ 4.5/5 | Post-resolution survey (roadmap) |
| Tickets per 100 customers | < 25/mo | Ticket system |
| Bug tickets → fix | < 7 days | GitHub issues |

## 5. Escalation ladder
```
L1 (email support) → L2 (founder/eng) → L3 (incident response — RB10)
```
- L2 on PagerDuty on-call rotation (V7 DR plan).
- All bugs → GitHub issue with reproduction (scan id, org id, timestamps).

## 6. Proactive support
- Weekly scan evidence emails = self-serve support ("your site is failing N rules").
- Scheduled scans catch breakage; notify admin (notifications module).
- Status page (roadmap): `status.accessguard.dev` + `/api/health` uptime widget.