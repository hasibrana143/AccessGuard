# Volume 10 — Product Hunt Launch Plan

> V12 Launch will execute this. Grounding: product is real (Next.js app, working scanner + AI +
> Stripe + GitHub PRs), pricing live, docs complete (V1–V9). PH launch = the day-1 distribution.

## 1. Launch thesis
- **Category**: Developer Tools / AI / Accessibility (pick "Developer Tools" — biggest audience).
- **Tagline candidates**:
  - "Automated WCAG compliance with AI fixes and GitHub auto-PR"
  - "Your accessibility scanner that writes the PR"
- **One-sentence**: "AccessGuard scans your site for WCAG violations, scores compliance risk,
  generates AI fixes, and opens the pull request — then proves it with compliance reports."

## 2. Pre-launch (T-30 to T-1)
| Task | Owner | Status anchor |
|---|---|---|
| Collect 3 pilot users willing to comment on launch day | Founder | — |
| Screenshots: dashboard, scan results, AI fix, PR view, report | Design tokens ready | — |
| Demo GIF (30–60s): create project → scan → fix → PR | — | — |
| Landing page: launch-specific CTA ("Get early access / 14-day trial") | Live page exists | — |
| Write launch post copy + title A/B (3 variants) | — | — |
| Prepare launch-day email + social blast list | — | — |
| Ensure infra can handle 5–10k visitors (container scales; Postgres fine at this scale) | docker/k8s | — |
| PH listing: product name, tagline, description, 8 screenshots, 5 topics, makers, links | — | — |

## 3. Launch day (T-0)
- **00:00 PT**: publish listing; comment with story ("built in 12 volumes, honest docs" angle).
- **Morning**: maker comments on every visitor comment (fast replies = algorithm boost).
- **Ask**: pilot users + communities (r/webdev, HN "Show HN" same-day, LinkedIn, X) to vote.
- **Live demo**: link to `/api/docs` Swagger + a shared public report link — proof it works.
- **Offer**: launch-day code `LAUNCH40` → 40% off first 3 months (Stripe coupon exists: `/api/stripe/coupon`).

## 4. Post-launch (T+1 to T+30)
- Follow-up post: "What we learned from 30 days of WCAG scanning" (data angle).
- Convert launches → waitlist email drip → trial.
- Collect testimonials for landing.
- Ship 2–3 visible improvements (changelog) to ride the traffic wave.

## 5. Launch-day readiness checks (code-grounded)
- [ ] Signup → verify email → first scan works < 5 min (e2e smoke covers path).
- [ ] Stripe checkout live in test mode; coupon endpoint wired.
- [ ] `/api/health` green; Sentry active; logs rotation on.
- [ ] Pricing page current; `/share/[token]` reports public.
- [ ] Docs links from landing (help docs = USER_GUIDE).
- [ ] Rate limits tuned (auth, AI) so launch spike doesn't lock out real users.

## 6. KPIs for launch
| Metric | Stretch | Good | Minimum |
|---|---|---|---|
| Upvotes | 500+ | 250 | 120 |
| Visits (30d) | 10k | 5k | 1.5k |
| Signups | 400 | 150 | 40 |
| Trial→paid (30d) | 12% | 8% | 5% |
| Paid from launch | 30 | 12 | 2 |

## 7. Follow-up channels (post-launch engine)
- Product Hunt "Product of the Day/Week" chase (voting strategy).
- Newsletter (own audience) — set up before launch.
- Launch press: indie hacker interviews, accessibility newsletters.