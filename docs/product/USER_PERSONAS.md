# User Personas — AccessGuard

> Status: Draft v1 (2026-08) · Derived from product flows (APP_FLOW.md, roles/permissions, pricing tiers).

## P1 — Sam, Founder/CTO at a Funded SMB SaaS (Starter/Growth)
- **Role:** Founder + tech owner, 5–30 person startup, public marketing site + app.
- **Goals:** avoid ADA lawsuits; ship acessible code without a dedicated a11y hire; get to compliance fast.
- **Pains:** manual audits too expensive/stale; devs resent doing a11y "manually"; needs evidence for investors/insurance.
- **Moment of truth:** weekly scan shows a critical violation on the pricing page → auto-PR → merged → risk score drops.
- **Wins:** time-to-first-scan < 5 min; GitHub auto-PR; report PDFs to send to counsel.

## P2 — Dana, Agency Owner (Agency tier, white-label)
- **Role:** owns a web agency with 10–40 client sites; retainer-based.
- **Goals:** sell accessibility as a recurring add-on to clients; margin on it; look enterprise-grade.
- **Pains:** audits eat margin; can't charge $5k/audit repeatedly; clients get demand letters; needs branded evidence to look credible.
- **Moment of truth:** white-label PDF with agency logo → $200–400/mo add-on per client → profit.
- **Wins:** team seats; white-label reports; multi-site dashboard of all clients.

## P3 — Priya, Head of Engineering at Mid-Market (Growth→Enterprise)
- **Role:** owns delivery; 20–100 devs; security/compliance mandates from legal.
- **Goals:** a11y checked in CI/CD and continuous monitoring; minimal dev overhead; procurement-friendly documentation.
- **Pains:** axe runs in CI are noisy; no one owns the follow-up; legal wants "monitoring," devs want "no new tools."
- **Moment of truth:** PR checks gate new a11y regressions; quarterly report to legal; automated PRs fix backlog.
- **Wins:** scan on schedule, Slack/Teams alerts, report export for procurement.

## P4 — Lena, Compliance/Procurement Officer (Enterprise)
- **Role:** at gov-adjacent/healthcare/finance; must evidence WCAG 2.1/2.2 AA + Section 508/EAA.
- **Goals:** defensible audit trail, signed reports, SLA, SSO, annual certification evidence.
- **Pains:** no visibility; vendors overpromise; needs names, not scans.
- **Moment of truth:** quarterly compliance report + audit log export → passed internal audit.
- **Wins:** SSO/SAML, dedicated CSM, SLA, unlimited sites.

## P5 — Ravi, Frontend Developer (Growth, daily user)
- **Role:** the person who actually fixes violations; member role in-app.
- **Goals:** fix issues fast without context-switching; clear guidance; not more meetings.
- **Pains:** axe output is terse; wants the fix, not the spec.
- **Moment of truth:** AI explanation + confidence score + validated code fix → one-click PR.
- **Wins:** violation detail w/ remediation code, severity filters, "fixed" status tracking.

## Persona prioritization
1. **Dana (agency)** — highest willingness to pay, pass-through economics, drives multi-site adoption.
2. **Sam (founder)** — fastest self-serve loop.
3. **Priya (eng lead)** — expansion + enterprise pathway.
4. **Lena** — enterprise later.
5. **Ravi** — day-to-day power user; keep happy, don't sell to him.
