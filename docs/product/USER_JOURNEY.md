# User Journey — AccessGuard

> Status: Draft v1 (2026-08) · Three primary journeys mapped to personas + actual product flows.

## Journey 1 — Founder (Sam): First Scan → Compliance in a Morning

| Stage | User action | Product touchpoint | Outcome |
|---|---|---|---|
| Discover | Threat: ADA demand letter / reads lawsuit data | Landing, pricing, free trial | Trial account created |
| Activate | Enter site URL, add project | Projects → create → scan | Scan starts (queue) |
| First value | See violations w/ severity + WCAG criteria | Dashboard / violations page | < 5 min to "aha" |
| Remediate | Open violation → read AI explanation | Violation detail (remediationCode, AI explanation) | Merge fix |
| Automate | Connect GitHub, enable auto-PR, schedule scans | GitHub settings, schedule | PRs auto-open; weekly scans |
| Convert | Trial ends; risk score improves → upgrade | Pricing / Stripe checkout | Paid subscriber |
| Retain | Weekly evidence email + trend chart; share PDF report | Reports/PDF + share link, notification center | Renewal habit |

**Pain-checks:** total time to first scan < 5m; merging the first GitHub PR < 1 hr of use.

## Journey 2 — Agency Owner (White-Label at Scale)

| Stage | Action | Product | Outcome |
|---|---|---|---|
| Discover | Wants a11y add-on; compares to $5k audits | Pricing (Agency tier) | Trial |
| Activate | Adds 5–15 client sites | Multi-project workspace | Single dashboard per client org |
| Deliver | Client asks for status; generate report | Reports → PDF + share link (white-label, agency logo) | Client-facing PDF |
| Recur | Set scan cadence; alerts to Slack/Teams webhook | Scheduler + webhook notifications | Governance for all accounts |
| Expand | Adds seats as the team grows | Team management (roles, invites) | Agency seat expansion |
| Upsell | Client adds pages/websites | Usage-based caps → expansion | MRR growth |

## Pain 3 — Enterprise (Quarterly Evidence Loop)

| Stage | User | Product | Outcome |
|---|---|---|---|
| Evaluate | Procurement asks for a11y evidence | Vendor doc + report samples | Starter → Enterprise trial |
| Deploy | SSO/SAML + custom site limits | Subscription/limits, integrations | Sunset-over contract |
| Operationalize | Continuous scans; CI gate; Slack alerts | Scheduled scans, PR status, webhooks | Monitoring continuous |
| Evidence | Audit export, compliance report | Audit logs, PDF reports | Quarterly compliance cert |
| Renew | ROI: fewer suit costs, better page experience | Health score, benchmark/trends | Renewal |

## Cross-cutting touchpoints

- **Notified:** webhook (Slack/Teams) on scan complete + critical violations alert settings (per-key).
- **Monitored:** scheduled scans with scheduler daemon; trend charts; risk score per project.
- **Secured:** MFA, role permissions (owner/admin/member/viewer + custom roles), org-scoped data on every page.