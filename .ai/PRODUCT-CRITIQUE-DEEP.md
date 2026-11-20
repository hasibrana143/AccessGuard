# AccessGuard — Deep Dive: Idea, Moat, Code Reality

**Date:** 2026-11-20
**Method:** Line-level code inspection of scanner, remediation, PR engine, VPAT, data model + unit economics.
**Purpose:** Answer two questions honestly: (1) is the idea right? (2) what exactly to add/remove?

---

## 1. The uncomfortable headline

> The product's **flagship differentiator — "AI fixes your code and opens a GitHub PR" — is currently a demo, not a working engine** on modern stacks.

Not because the team is bad. Because the approach is wrong:

- axe returns **rendered DOM HTML**.
- React/Vue/Svelte source is **JSX/templates**, not rendered HTML.
- The code does **exact string replacement** of rendered HTML inside source files.
- On a React site, `class="btn"` (DOM) ≠ `className="btn"` (source), attributes reorder, tags self-close, dynamic values differ.
- Result: match fails → no code change. The PR still gets created, but with **Markdown suggestion files**, not fixes.
- The UI/marketing says "GitHub auto-PR". The buyer expects code changes. They get a docs PR. That is a trust-destroying mismatch.

**This is fixable** — but only with AST-based patching (ts-morph/Babel/PostCSS/parse5) + re-scan verification. Not regex.

---

## 2. Deep findings (file:line evidence)

| # | Finding | Evidence | Impact | Severity |
|---|---|---|---|---|
| 1 | Scan is **one URL**, not a site crawl | `scan-executor.ts:239` `scanUrl(url)`; `axe-core.ts:225` `pagesScanned: 1`; `crawlConfig` only read in project CRUD, never in executor | Cannot deliver "website" scanning | 🔴 P0 |
| 2 | **No violation reconciliation** — every scan inserts fresh `open` rows; old ones never marked fixed; `fixedAt` unused | `scan-executor.ts:80-101`; `Violation` schema has `status`/`fixedAt` but no logic writes them | Counts inflate, "fixed/regression" claims false, monitoring broken | 🔴 P0 |
| 3 | **PR patching is rendered-HTML → source string replace** | `github.ts:198-238`; `github-pr.ts:234-251` | Fails on JSX/Vue/Svelte; flagship doesn't work | 🔴 P0 |
| 4 | **Only 50 files scanned per repo**, first 50 from tree; **only 10 violations** per PR; up to **500 GitHub API calls** | `github.ts:202-208` | Large repos never reached; rate-limit risk | 🔴 P0 |
| 5 | **No-op "fixes" counted as applied** — template returns original HTML for `color-contrast`, `heading-order`, `focus-visible`; `content.replace(x, x)` increments `fixesApplied` | `prompts.ts:290-312`; `github-pr.ts:235-238` | PR claims fix that changed nothing; violates "never fake" rule | 🔴 P0 |
| 6 | **Placeholder fix templates** can destroy code: `image-alt` in scanner emits `<img alt="..." src="..." />` | `axe-core.ts:18-21` | If matched on static HTML, replaces real `src` with `"..."` | 🔴 P0 safety |
| 7 | **Template confidence hardcoded 0.5**; LLM self-reports confidence (uncalibrated) | `remediation.ts:81`, `:67` | Fake confidence — violates repo's own rule | 🟠 P1 |
| 8 | **Null-confidence fixes bypass the 0.7 gate** (`=== null || >= 0.7`) | `create-pr/route.ts:111` | Least-verified fixes are auto-applied | 🔴 P0 |
| 9 | **VPAT marks untested criteria "Not Applicable"** and derives conformance from violation counts | `vpat/route.tsx:93-102` | Legally false statements in a procurement document | 🔴 P0 legal |
| 10 | VPAT is **WCAG 2.1 only**, no Remarks column, no Section 508 / EN 301 549 | `vpat/route.tsx:40-91`, `:119` | Not a real VPAT 2.5; enterprise buyers will reject | 🟠 P1 |
| 11 | Scanner runs only **WCAG 2.1 tags** despite 2.2 claims | `axe-core.ts:110-112` (`runOnly` lacks `wcag22*`) | 2.2 claims untested | 🔴 P0 claim gap |
| 12 | axe-core loaded from **CDN at scan time**, version **4.8.4** (old) | `axe-core.ts:95-104` | Supply-chain risk, offline failure, outdated rules | 🟠 P1 |
| 13 | Scanner **blocks all images/fonts** via route abort | `axe-core.ts:187-189` | Contrast/layout/accessible-name false positives & negatives | 🟠 P1 |
| 14 | **Single desktop viewport** 1920×1080, no mobile/zoom/reduced-motion pass | `axe-core.ts:177-182` | Reflow, target size, responsive issues missed | 🟠 P1 |
| 15 | `elementSelector` = axe target array joined with `' > '` | `axe-core.ts:124` | Invalid selectors for iframes/shadow roots; breaks matching | 🟠 P1 |
| 16 | `description` stores **helpUrl** instead of axe `help` text | `axe-core.ts:126` | Alt text templates receive a URL as description (see #6) | 🟠 P1 |
| 17 | Browser launched **per scan**, no pool | `axe-core.ts:165-175` | 0.5–1s wasted per page; throughput hit at scale | 🟡 P2 |
| 18 | `--disable-web-security` + `ignoreHTTPSErrors` always on | `axe-core.ts:171,181` | Unnecessary risk surface | 🟡 P2 |
| 19 | GitHub token accepted from **client header**, falls back to **server `GITHUB_TOKEN`** | `create-pr/route.ts:174` | Stored encrypted org token bypassed; server token misuse risk | 🟠 P1 security |
| 20 | PR engine writes **Markdown suggestion files** even when no code patched | `create-pr/route.ts:225-249` | "Auto-fix PR" is actually a docs PR | 🟠 P1 honesty |

---

## 3. Unit economics (real numbers)

Assumptions: 8s per page scan (launch + nav + axe + wait), 2 vCPU/4GB worker ≈ $24/mo.

| Plan | Pages/mo | Compute hours | Infra cost | AI cost (paid) | Gross margin |
|---|---|---|---|---|---|
| Free 100 | 100 | 0.22 h | ~$0.01 | ~$0 | ~100% |
| Starter $49 / 500 | 500 | 1.1 h | ~$0.04 | ~$1–5 | >90% |
| Growth $149 / 5,000 | 5,000 | 11 h | ~$0.40 | ~$10–30 | >75% |
| Agency $399 / 25,000 | 25,000 | 55 h | ~$2 | ~$50–150 | >60% |
| Daily 5k pages | 150,000 | 333 h | ~$12–25 | — | still fine |
| Daily 25k pages | 750,000 | 1,667 h | ~$60–120 | — | fine at $399 |

**Conclusion:** compute is **not** the constraint. The constraints are:
1. Crawl correctness and politeness.
2. False positives (support cost).
3. GitHub API limits and patch quality.
4. Trust — one bad auto-PR costs more than a year of infra.

**Pricing is underpriced, not overpriced.** Growth at $149 for 5,000 monitored pages is 3–10× below Silktide/Siteimprove. Raise after crawler + CI + white-label actually ship.

---

## 4. Is the idea right? Three versions

| Version | Verdict | Why |
|---|---|---|
| A. "AI accessibility scanner SaaS" | ❌ Weak | axe-core is commodity; Deque/UserWay/Siteimprove own it; buyers compare on price. |
| B. "Compliance autopilot / guaranteed compliance" | ❌ Dangerous | FTC accessiBe $1M precedent; automation catches ~40%; legal liability. |
| C. "Remediation operations for agencies" | ✅ **Winning** | Recurring multi-client workflow, white-label, labor arbitrage, evidence trail, low churn. |

**Pick C.** The product is not a scanner. It is an **operations layer**:
> Scan many client sites → triage → assign/fix → verify → white-label report → monitor → prove progress.

This reframes every feature decision:
- Crawler = required.
- Page inventory = required.
- Violation lifecycle (new/fixed/regressed) = required.
- Fix queue + assignment = required.
- White-label client portal = required.
- Auto-VPAT = **remove** (human-in-the-loop draft only).
- Enterprise SSO/SCIM = keep code, don't market until $1M ARR.

---

## 5. The existential question: why not axe DevTools + Copilot/Cursor?

Honest answer: **a developer with Cursor does not need AccessGuard.** That is not the buyer.

The buyer who *does* need it:
- An **agency** managing 10–100 client sites, with 1–3 accessibility specialists and no spare dev time.
- A **compliance manager** who needs recurring evidence, not a one-time audit.
- An **EU mid-market** company that needs an accessibility statement, monitoring, and a defensible remediation log for EAA.

They pay for **coverage, repeatability, and proof** — not for a smarter scanner. This is why the agency wedge is the only defensible one.

---

## 6. Add / Remove (direct answer)

### ADD (in order)
1. **Crawler v1** — sitemap + BFS + JS render + per-page results + page inventory.
2. **Violation fingerprint + reconciliation** — new / persisting / fixed / regressed; `fixedAt` written on rescan.
3. **AST-based patching** — ts-morph (TS/TSX), Babel (JS/JSX), PostCSS (CSS), parse5 (HTML); match by rule + selector + context; replace all occurrences; reject placeholders; detect no-ops.
4. **Patch verification** — apply to a preview build, re-run axe on the affected page; store `verifiedAt` + method. This is the real moat.
5. **Customer API keys + working GitHub Action** — `/api/v1`, scoped keys, PR gate on new critical/serious.
6. **Trial + pages-monitored pricing** — 14 days, overage, annual.
7. **Agency workspace** — client groups, bulk scan, white-label report branding, client share links.
8. **Alerts** — email + Slack + signed outbound webhook; new critical only.
9. **EAA pack** — EN 301 549 preset + accessibility statement generator (legally required in many EU states).
10. **Manual testing v1** — guided checks, evidence upload, tester role; feed VPAT remarks.
11. **Sample report + 3 design partners + 2 case studies.**

### REMOVE / FREEZE
1. **Auto-VPAT** — replace with "VPAT draft, requires human review"; untested = "Not Evaluated", never "N/A".
2. **"GitHub auto-PR fixes" marketing** — until AST patching + verification ship, say "suggested fixes".
3. **Arbitrary risk score** — replace with severity counts + trend, or publish methodology.
4. **"Daily scans" on every page** — smart scheduling: daily critical pages, weekly long tail, scan-on-change via content hash.
5. **Multi-provider free AI mesh as a selling point** — reliability risk; one paid provider + deterministic fallback.
6. **Enterprise SSO/SCIM marketing** — keep code, freeze sales surface until $1M ARR.
7. **Hindi/i18n expansion** — freeze; en + hi is enough.
8. **Legacy `hive/`, debug e2e, stale specs** — delete/archive.
9. **`--disable-web-security`, CDN axe, blocked images** — technical debt with accuracy/security cost.

---

## 7. Revised 30-day technical plan

**Week 1 — Truth**
- Bundle axe-core locally, upgrade, add `wcag22aa`, stop blocking images/fonts, add mobile viewport + network idle.
- Fix selector storage (JSON array), description (`help`), remove unsafe flags.
- Add `Page` model + `ScanPage` results + violation fingerprint + reconciliation.
- Add migration for missing models + quota default.

**Week 2 — Crawl**
- Sitemap + BFS crawler with `maxPages`, excludes, subdomains, rate limit, content-hash skip.
- Per-page violations, dedupe, page inventory API + UI.
- Quota per page; smart schedule (daily critical, weekly long tail).

**Week 3 — Fix loop**
- AST patching for TSX/JSX/HTML/CSS; occurrence-aware; placeholder/no-op rejection.
- Preview re-scan verification; only verified patches can open a PR.
- Confidence from verification, not self-report; template = `null` + labeled.

**Week 4 — Distribution**
- `ApiKey` model + `/api/v1` + repaired GitHub Action; PR gate.
- 14-day trial; pages-monitored pricing; usage dashboard.
- VPAT draft rename + "Not Evaluated" + remarks column.

**Exit criteria:** scan a 100-page React site, get per-page violations, open a PR that changes real JSX, re-scan proves the fix, Action blocks a new critical in CI, fresh DB migrates clean.

---

## 8. Final verdict

- **Idea (category):** right.
- **Current product definition:** wrong — generic scanner with demo-grade fixing.
- **Winning definition:** agency remediation operations with verified fixes and proof.
- **Biggest risk:** shipping auto-PRs that don't fix (or worse, break) customer code. One incident kills trust.
- **Biggest opportunity:** nobody owns the "verified fix + evidence" layer for agencies. Deque owns detection, overlays own deception, agencies own manual labor. Own the workflow between them.

**One line:** Stop selling a scanner. Build the proof-of-fix machine for agencies.
