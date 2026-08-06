# Volume 10 — SEO Strategy

> Grounding: landing page live (Next.js SSR/SSG capable, App Router); pages: `/` (landing),
> `/pricing`, `/auth/*`, dashboard. No blog/SEO layer built yet — this is the plan + zero-cost start.

## 1. Keyword map (by intent)
| Intent | Keywords | Difficulty | Content type |
|---|---|---|---|
| **Commercial** | wcag compliance tool, accessibility scanner for websites, ada website compliance software, axe core alternative | High | Landing + comparison pages |
| **Informational** | wcag 2.2 requirements, ada lawsuit 2026 statistics, color contrast ratio checker, aria rules list | Med | Blog pillar articles |
| **Agency/commercial** | white label accessibility reports, client website audit report, wcag remediation services | Low | Agency landing + case studies |
| **Dev** | axe-core vs lighthouse, puppeteer accessibility test, accessibility ci pipeline, github action wcag | Med | Dev docs + GitHub README |

## 2. Technical SEO (Next.js)
- **Metadata**: add `metadata` export per route (title/description/OG). Currently minimal — highest-value quick win.
- **Sitemap**: `app/sitemap.ts` + `robots.ts` — auto-generated from routes.
- **OG/social**: per-page OG images (design tokens + template).
- **Core Web Vitals**: already good (SSG pages, minimal JS on landing). Monitor via Sentry performance.
- **Canonicals**: default — add explicit `canonical` once duplicate content exists (/share links must be noindex!).
- **Structured data**: `SoftwareApplication` + `FAQPage` schema on landing (rich results).

## 3. Content pillars (12 posts, 6 months)
| Month | Pillar | Target keyword | CTA |
|---|---|---|---|
| 1 | "WCAG 2.1 vs 2.2: what changed for SaaS" | wcag 2.2 | Start scan |
| 1 | "ADA website lawsuits 2026: data" | ada lawsuit statistics | Start scan |
| 2 | "axe-core vs commercial scanners" | axe core alternative | Free scan |
| 2 | "Color contrast: WCAG AA checker guide" | color contrast checker | Scan |
| 3 | "AI accessibility remediation: safe auto-fixes" | ai accessibility remediation | Try AI fix |
| 3 | "White-label accessibility reports for agencies" | white label accessibility reports | Agency tier |
| 4 | "Building an accessibility CI pipeline" | accessibility ci pipeline | API key |
| 4 | "Puppeteer + axe-core test setup" | puppeteer accessibility | Docs |
| 5 | "SSR vs client-side a11y scanning" | server side accessibility scanning | Scan |
| 5 | "WCAG audit checklist (25 rules)" | wcag audit checklist | Free audit |
| 6 | "Case studies: agency clients" | accessibility audit agency | Agency |
| 6 | "2027 WCAG roadmap (3.0 draft)" | wcag 3.0 | Scan |

## 4. Link building (white-hat)
- GitHub: open-source the scanner strategy module? → README + docs backlinks (strong).
- Communities: r/accessibility, web.dev, Hacker News (Show HN), DEV.to reposts.
- Agencies: list in "accessibility tools for agencies" roundups.
- PR/backlink: public WCAG report share pages (share/[token]) → "website accessibility report" query surface.

## 5. Measurement
| Metric | Tool | Baseline → Target (6 mo) |
|---|---|---|
| Indexed pages | GSC | 5 → 60+ |
| Organic clicks | GSC | 0 → 800/mo |
| Keyword #10-top | GSC | 0 → 15 |
| Blog CVR → trial | GSC + GA | — → 3–5% |
| Domain authority | free tools | new → 20+ |

## 6. Quick wins (this week, zero code)
1. `metadata` for landing + pricing (title/description with keywords).
2. `app/sitemap.ts` + `robots.ts` (exclude `/share/[token]`, `/api/*`).
3. `noindex` on `/share/[token]` pages (public but should not be indexed).
4. GitHub repo description + topics + README badges (a11y = marketing surface).
5. OG image for landing.

## 7. Open items (code-backed)
- [x] `sitemap.ts`/`robots.ts` (auto-generated; app shell + `/share` + `/api` excluded).
- [x] Structured data on landing (`SoftwareApplication` + `FAQPage` JSON-LD in root layout).
- [ ] Blog/Changelog routes (`/blog/*`) + CMS (MDX or headless).
- [ ] Per-page `metadata` (route groups).
- [x] `/share` noindex header (robots noindex via share layout metadata).