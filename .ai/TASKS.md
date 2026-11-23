# AccessGuard — Tasks

Source of record for execution. Full analysis: `.ai/PRODUCT-CRITIQUE.md`.

## P0 — Make the product true (weeks 1–2)

- [x] **Crawler v1** — sitemap + BFS + Playwright render; `maxPages` from `crawlConfig`; exclude paths/subdomains; per-page violations; page inventory; dedupe; quota per page.
  - Acceptance: 100-page site scanned end-to-end; per-page results; quota counts 100; p95 under 10 min.
- [x] **Customer API keys** — `ApiKey` model (hash, prefix, scopes, lastUsedAt, revoke), create/revoke UI, auth on `/api/v1`.
- [x] **GitHub Action repair** — point to `/api/v1/scans` + `/api/v1/reports/vpat`; PR gate on new critical/serious; publish `dist/index.js`.
  - Acceptance: Action runs on a sample repo, fails a PR on a real violation, passes after fix.
- [x] **Trial** — `trial_period_days: 14` in checkout/subscription; verify Stripe price config; no charge before day 15.
- [x] **Migrations** — `ScimGroup`, `CookieConsent`, `ManualCheck`, `pagesQuota` default; migration created at `prisma/migrations/20261120231949_...`; verify `migrate deploy` on empty DB after Docker up.
- [x] **Violation lifecycle** — fingerprint + reconciliation (new/persisting/fixed/regressed); write `fixedAt` on rescan.
- [x] **Scanner truth** — bundle axe locally (no CDN), WCAG 2.2 tags, stop blocking images/fonts, mobile viewport, network-idle wait, store axe target array as JSON, `help` text not `helpUrl`, remove `--disable-web-security`.
- [x] **AST patching** — ts-morph/Babel/PostCSS/parse5; occurrence-aware; reject placeholders; no-op detection (content unchanged ≠ fix).
  - Acceptance: JSX/TSX patched through a real AST (TypeScript compiler API), nth occurrence matched, placeholder rejected, unchanged output rejected, patched file re-parses without syntax errors.
- [x] **Fix verification** — apply patch to preview, re-run axe, only verified patches may open a PR; confidence from verification, template = `null`.
  - Acceptance: axe re-run on the patched element; PR opens only for verified fixes; effective confidence comes from verification; template fixes carry `null` AI confidence; no browser = fail closed with a clear error.
- [x] **Confidence gate fix** — `null` must not bypass `MIN_FIX_CONFIDENCE`.
  - Acceptance: a fix with `null` confidence is skipped, never auto-applied; gate unit-tested.
- [x] **VPAT truth** — "Not Evaluated" instead of "Not Applicable"; add remarks column; label "draft — human review required".
  - Acceptance: PDF route reuses `generateVPATData` (`not-evaluated` + per-criterion remarks), no "Not Applicable"/"N/A" wording survives, draft label on cover and footer.

## V23 — verified-fix engine (shipped)

Scope: the four P0 truth gaps above, shipped as one volume. Dependency order: confidence semantics → VPAT truth → AST patching → verification → docs/copy.

| # | Slice | Area | Status |
|---|---|---|---|
| 1 | Confidence semantics: template fixes carry `null`, gate reads effective (verification) confidence | ai | DONE |
| 2 | VPAT PDF reuses the shared generator (`not-evaluated`, remarks, draft label) | engineering | DONE |
| 3 | AST patching: JSX/TSX via TypeScript compiler API, occurrence-aware, placeholder + no-op rejection | engineering | DONE |
| 4 | Fix verification: axe re-run on the patched element gates PR creation | ai | DONE |
| 5 | Docs + marketing copy aligned with what the engine actually does | docs | DONE |
| 6 | Post-ship hardening: bounded selection (`MAX_FIXES_PER_PR = 25`), per-reason skip reporting (`skippedInvalid`, `skippedOverLimit`), 10-file write cap, tested `selectVerifiedFixes` | ai | DONE |
| 7 | Security hardening from the independent QA + security review: validate before render, block verification network access, sandbox + deadlines, cap before the browser work, rate limit, audit trail, ambiguity guard, content-loss guard, honest counters, Markdown escaping, VPAT conformance | security | DONE |
| 8 | CI repair: the three pipelines that were red on `main` since September (quoted Postgres health command, pinned Trivy action, self-scan rewritten onto the public API) | devops | DONE |
| 9 | Re-review closure (independent re-review of slice 7 returned NOT READY — High 2, Medium 7, Low 1): browser-like attribute parsing, unconditional handler rejection, URI scheme allowlist, overlay-style rejection, template fixes strip handlers, WebSocket + CSP isolation, verification semaphore, complete tree scan, artifact-based PR linking, audit before link update, Markdown escaping, hidden-text guard, VPAT scan tenancy, manual-check catalog mapping | security | DONE |
| 10 | Third-review closure (independent third review returned NOT READY — High 2, Medium 5): CSS escape decoding before the overlay check (+ CSS comments and HTML entities), `frame`/`frameset`/`portal`/`fencedframe` rejected, inline code span that cannot be broken out of, incomplete scans never patch, `aria-hidden` text counts as visible text, audit write retried before a missing trail is reported, a fix only written when every occurrence is covered | security | DONE |
| 11 | Image-gate repair: the Trivy step counted every severity because the SARIF format drops the severity filter (`limit-severities-for-sarif: true`, scanner pinned to `v0.76.2`) | devops | DONE |
| 12 | Fourth-review closure (independent fourth review returned NOT READY — High 3, Medium 9): style values that carry an entity / CSS escape / CSS comment are rejected instead of decoded with a partial table, the alternate HTML comment terminator `--!>` is neutralized, a brace is rejected and a fix is only written into a file with a provable destination context (HTML or JSX), the GFM bare-URL autolink is neutralized, `plaintext` / the resource loaders are rejected, `encoding:'none'` makes the scan incomplete, every source extension is scanned, `opacity:0` counts as hidden, the replacement has to keep the original text, unmappable remediations stay review suggestions, and only a live tag counts as a target | security | DONE |
| 13 | Fifth independent review of the fourth-review closure | security | DONE — NOT READY (High 2, Medium 4); all six findings are fixed in slice 14 |
| 14 | Fifth-review closure (the independent fifth review returned NOT READY — High 2, Medium 4): the repository's own CSS is judged before a write (overlay/hiding rules, utility stylesheets read together) and a remediation may not add a class, server-template grammar is rejected in the remediation and a template destination is refused entirely, the `input` type is entity-decoded before it is classified, the CSS priority suffix is stripped and visibility is computed instead of extracted, the live-context scanner follows the browser (raw-text, inert `template`/`object`/`applet`, real end tags, unclosed elements), and every text blob of the tree is scanned with a submodule making the scan incomplete | security | DONE |
| 15 | Sixth independent review of the fifth-review closure | security | DONE — NOT READY (High 2, Medium 6); all eight findings are fixed in slice 16 |
| 16 | Sixth-review closure (the independent sixth review returned NOT READY — High 2, Medium 6): the destination CSS context is built from every repository-owned style source (stylesheet files, the `<style>` block of every file, linked stylesheets, the `@import` chain) and fails closed on what it cannot judge; the CSS reader follows the browser (escapes, strings, native nesting, dynamic viewport units, minimum viewport sizing, order-independent union of the applicable values, animation frames); HTML comment syntax, a self-hiding target, transparent text and a new remote URL are rejected in the remediation; the live-context scanner reads a bogus comment / CDATA section as a comment that ends at `>` and keeps an end tag inside an attribute value as attribute text; an ambiguous blob is read and its content decides whether it is binary | security | DONE |
| 17 | Seventh independent review of the sixth-review closure | security | DONE — NOT READY (High 3, Medium 4); all seven findings are fixed in slice 18 |
| 18 | Seventh-review closure (the independent seventh review returned NOT READY — High 3, Medium 4): the CSS reader strips the priority suffix, knows the logical / small / large viewport units and makes an uncomputable value, unit or keyword unprovable when the fix changes that property; a relational selector (`:has()`) and a dynamic style source make the destination unprovable; the CSS reader also sees the values that hide an element or its text (content-visibility, a zero scale, an opacity filter, an off-screen translation, a zero font / line height, a large negative text indent); a URI attribute is compared on the URL the way the browser resolves it, so the protocol-relative, single-slash and backslash spelling of a remote URL cannot slip past it and a changed `href` may not point the user somewhere else; the static guard and the browser verdict refuse the visual-hiding forms and a zero-area or off-screen text range; an `image-alt` fix needs a live `<img>` and keeps the media source; the content of a frameset is frame content, not body content | security | DONE |
| 19 | Eighth independent review of the seventh-review closure | security | DONE — NOT READY (High 4, Medium 2); all six findings are fixed in slice 20 |
| 20 | Eighth-review closure (the independent eighth review returned NOT READY — High 4, Medium 2): the destination CSS reader assigns the `inset` shorthand edges the way the browser assigns them and knows the logical sizing properties (`inline-size`, `block-size`); the effective style of the patched element is the repository's rules **plus** the remediation's own inline declarations, and the custom properties the fix defines resolve the `var()` references of the repository's rules (a style that is not a plain CSS declaration list is unprovable); `className` is a class-token carrier in the added-class guard and in the CSS element descriptor; a repository script that creates a style at runtime owns CSS the analyser cannot read, so the destination is unprovable and no repository write happens; every duplicate of a URI attribute is compared in source order and `ping` is parsed as the space-separated URL list the browser parses; the static guard reads the modern colour alpha syntaxes, a zero-size target and a large negative margin, and the browser verdict rejects a zero-area target, an off-screen target, a clipped text and an animation that ends invisible | security | DONE |
| 21 | Ninth independent review of the eighth-review closure | security | DONE — NOT READY (High 3, Medium 3); all six findings are fixed in slice 22 |
| 22 | Ninth-review closure (the independent ninth review returned NOT READY — High 3, Medium 3): the destination CSS reader knows the four logical inset longhands and makes a size it cannot compute (a fixed length that may be as long as the customer's screen, a viewport unit above 100%, a font-relative length of 64 units) unprovable; a rule the fix **activates** is judged too — a sibling or descendant selector that asks for the attribute the fix adds can take over another element of the customer page, and a network-bearing declaration of such a rule loads a resource the verification browser blocks; the repository's runtime is judged as well — a script that reads an attribute the fix adds and then mutates an element, a script that names the patched element by its id, a service worker and a CSS-in-JS library make the destination unprovable; `attributionsrc` is a URI attribute and is parsed as the space-separated URL list the browser parses; the destination state model judges the repository's transparent colour, the logical margins, the negative positional offsets, a single zero dimension, `display:contents` and the visible frame of an animation by its direction | security | DONE |
| 23 | Tenth independent review of the ninth-review closure | security | DONE — NOT READY (High 4, Medium 4); all eight findings are fixed in slice 24 |
| 24 | Tenth-review closure (the independent tenth review returned NOT READY — High 4, Medium 4): the destination CSS reader decodes the selector identifiers the way the browser decodes them, composes the **painted box** (padding, border, `box-sizing`, `scale`, `transform: scale(…)`) so a box that may cover the viewport is unprovable, models the **focus activation** a fix causes (a fix that adds `autofocus` activates every focus rule whose compound can match the patched element, in any compound of the selector — the sibling takeover and the customer-side request included), and reads the **animation play state** so a paused animation is judged on the frame the customer sees; the repository runtime analysis reads an **inline `<script>`** like a linked script and recognises a **DOM property getter** (`img.alt`) as a state read; the create-PR route makes the destination and runtime decision **before the first repository mutation** (no branch, no document, no pull request when every candidate is refused) and writes a **durable audit intent** before the first GitHub mutation | security | DONE |
| 25 | Eleventh independent review of the tenth-review closure | security | DONE — NOT READY (High 3, Medium 3); all six findings are fixed in slice 26 |
| 26 | Eleventh-review closure (the independent eleventh review returned NOT READY — High 3, Medium 3): the repository runtime scanner reads the **event-handler attributes** of repository HTML as runtime carriers (an unreadable handler fails closed) and recognises the **generic attribute state reads** (`getAttributeNames()`, `getAttributeNode()`, `attributes.getNamedItem()`) as state reads that can gate a mutation; the destination CSS reader composes the **effective painted surface** — the four logical padding longhands and the logical border longhands and shorthands, `zoom` as a scale factor, a scale above one on an axis without a declared size (unprovable — the intrinsic size is unknown), an `aspect-ratio` that fills an undeclared axis (unprovable), and a `box-shadow` that paints outside the border box (the spread and blur grow the painted area) — and composes a **zero maximum size with a clipping overflow** (the painted control is gone); the activated-rule **resource check resolves the `var()` references** of the declaration against the definitions that can reach the element, the global ones included, and an unresolved reference is unprovable; the **animation delay, duration and fill mode** decide the frame the customer sees, and the keyframe offsets are kept so a paused timeline with a negative delay can be placed | security | IN PROGRESS |

Out of scope for V23 (recorded, not silently dropped): per-file patch persistence to the DB (verification results are reported in the PR + response, not stored on `Violation`), Vue/Svelte/Astro AST support, full-page re-scan verification (verification is rule-level on the patched element), an AST cache per file (bounded by the 60 s batch budget), a source map from the scanned URL to the repository path (the real fix for the byte-budget limit), and a third-party review of the re-review fix.
- [x] **Green baseline** — Docker up, `vitest` 378 passed (core), lint 0, build 0; commit WIP in slices (`vol:` messages).

## P1 — Make it sticky (weeks 3–4)

- [ ] Regression detection: new / fixed / persisting vs previous scan.
- [ ] Alerts: email + Slack + outbound webhook (signed, retried).
- [ ] Pricing v2: pages **monitored** meter; smart scheduling (daily critical, weekly long tail); overage.
- [ ] Page inventory UI: coverage, per-page status, top fixes.
- [ ] Risk score → transparent severity/trend or documented methodology.
- [ ] Manual checks v1: guided scripts, evidence upload, tester role.

## P1 — Make it sell (weeks 5–8)

- [ ] Agency workspace: client groups, white-label report branding, bulk scan.
- [ ] VPAT/ACR v2: WCAG 2.2 AA + EN 301 549 + Section 508, per-criterion remarks.
- [ ] Onboarding: URL → scan → top 3 fixes in <5 min; sample report without signup.
- [ ] Jira/Linear + Slack/Teams.
- [x] Authenticated scans (cookie / header / login script).
- [ ] 3 design partners + 2 case studies.

## P2 — Scale (weeks 9–12)

- [ ] SOC 2 readiness (only if enterprise pipeline exists); DPA + subprocessors + trust center.
- [ ] Document/PDF accessibility (integrate).
- [ ] Mobile app scanning (partner/integrate).
- [ ] Cost dashboard: $/1k pages, AI $/org, queue SLOs.
- [ ] Annual billing + Stripe Tax (VAT).

## Open defects (from the 2026-11-21 Playwright run: 70 pass / 9 fail)

- [x] **Contrast token pass** — severity + emerald tokens retuned for WCAG AA as 12px text on
      their own 10% tint (light `--critical/--serious/--moderate/--minor/--emerald`, dark
      `--critical`). Verified: axe `color-contrast` green on 13 routes × 2 themes.
- [x] **Stale e2e expectation** — `e2e/landing.spec.ts` now expects `/dashboard` (the shipped
      contract for authenticated visitors).
- [x] **Settings privacy copy** — the spec waited for the tab to become active; the click had
      landed before React hydration, so the panel never switched. Copy itself was correct
      ("Export My Data" / "Data Residency Region" / "EU").

Full suite after the fix: **79 passed / 0 failed**.

## Blocked

- [ ] Docker Desktop service stopped → DB/Redis tests, E2E, dev server.
