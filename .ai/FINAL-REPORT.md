# AccessGuard — Final Report

Cycle: **V23 — verified-fix engine + security hardening + tenth-review closure** · Date: 2026-11-23 · Owner: CTO agent

## What shipped

The four P0 "make the product true" gaps from `.ai/PRODUCT-CRITIQUE-DEEP.md` are closed.
The first V23 cut was reviewed ten times: the first review found seven more defects
(3 reproduced P0 defects, 3 High, 4 Medium, 1 Low), the **re-review of that hardening
found 2 High, 7 Medium, 1 Low**, the **third review found 2 High, 5 Medium**, the
**fourth review found 3 High, 9 Medium**, the **fifth review of that closure found
2 High, 4 Medium**, the **sixth review of that closure found 2 High, 6 Medium**, the
**seventh review of that closure found 3 High, 4 Medium**, the **eighth review of
that closure found 4 High, 2 Medium**, the **ninth review of that closure found
3 High, 3 Medium**, and the **tenth review of that closure found 4 High, 4 Medium**.
Every earlier round closed the literal reproductions while an equivalent path stayed
open. The tenth review independently reproduced eight equivalent paths — an inline
`<script>` carrier, a DOM property getter, an escaped attribute **name**, the painted
box, the focus activation a fix causes, a paused animation, a customer-side request
through the focus, a repository mutation after a refusal and a missing audit trail.
**All eight are now fixed at their root cause, with a permanent regression each**
(the reviewer-payload re-run: 19/19 assertions — the nine unsafe reproductions
blocked in the unsafe direction, the ten legitimate behaviour groups still pass, and
the legitimate fix still lands).
**The release verdict is still NOT READY** — the gate requires Critical 0 and High 0
from an independent pass, and the **eleventh review is the next check**.

| Gap (before) | Now | Evidence |
|---|---|---|
| Confidence gate treated `null` (unknown, every template fix) as "good enough" | The gate reads **verification** confidence; `null` never passes. Template fixes carry `null` instead of a fabricated `0.5` | `src/lib/fix-verification.ts`, `src/lib/__tests__/fix-verification.test.ts` |
| Fixes were exact-string replacements of axe DOM HTML into source files | JSX/JS is located through a real AST (TypeScript compiler API) and patched at AST-derived offsets; occurrence-aware per rule **and** per element; placeholder and no-op rejection; the patched file is re-parsed and the patch discarded if it breaks | `src/lib/ast-patch.ts`, `src/lib/__tests__/ast-patch.test.ts`, `src/lib/__tests__/github-pr.test.ts` |
| Nothing re-ran axe on a patched page | axe is re-run on the remediation snippet for the rule it targets; only verified fixes open a PR; no browser means no PR (fail closed) | `src/lib/fix-verification.ts`, `src/app/api/github/create-pr/route.ts` |
| The VPAT PDF declared untested criteria out of scope | The PDF reuses `generateVPATData`: `not-evaluated`, per-criterion remarks, draft label on cover and footer | `src/app/api/reports/vpat/route.tsx`, `src/lib/__tests__/vpat-generator.test.ts` |

### Tenth independent security review (2026-11-23)

> The verdict was NOT READY — Critical 0, High 4, Medium 4, Low 0 — against tree
> `d1cabd6`. **All eight findings are closed** (the closure table and the evidence are
> in `.ai/SECURITY-STATUS.md`; the reviewer's own artifact is `.ai/SECURITY-REVIEW-10.md`).
> The release gate opens only when an **eleventh independent review** returns READY.

| Finding | Severity | Reproduced unsafe result | Status |
|---|---|---|---|
| 10-H1 — the runtime analysis read script **files** only and recognised **method** reads only | High | An inline `<script>` in the repository HTML and `if(img.alt)` in a linked script each turned the target into a fixed `1280×720` takeover | **Closed** — inline `<script>` blocks are analysed like linked scripts (an unclosed block fails closed), and a DOM property getter is a state read |
| 10-H2 — the selector reader decoded the attribute **value** but not the **name** | High | `[a\6ct]` (which the browser resolves to `alt`) took the page over the moment the fix added the attribute | **Closed** — every selector identifier is decoded the way the browser decodes it |
| 10-H3 — the geometry model judged the **content** box only | High | `scale:3`, `border:10000px` and `padding:10000px` each painted a viewport takeover | **Closed** — the painted box composes padding, border, `box-sizing`, `scale` and `transform: scale(…)`; a box that may cover the viewport is unprovable |
| 10-H4 — the activation signal knew added attributes and classes only | High | `input:focus ~ .overlay` took the page over as soon as the fix focused the input | **Closed** — a fix that adds `autofocus` activates every focus rule whose compound can match the patched element, in any compound |
| 10-M1 — the animation model chose the visible frame from the direction only | Medium | A paused animation held the element on its invisible first frame | **Closed** — the play state decides the frame the customer sees |
| 10-M2 — the activated-rule check did not see the focus transition | Medium | `input:focus{background-image:url(…)}` made the customer browser request a resource | **Closed** — the focus activation reaches the same resource check as every other activated rule |
| 10-M3 — the route created the branch, the documents and the pull request **after** the destination refused the fix | Medium | A refused fix still produced a branch, two documents and a pull request, and the route answered `200 success:true` | **Closed** — the writer is split into a plan phase and an apply phase; the route plans before it mutates, a refused candidate gets no artifact, and a run in which every candidate is refused creates no branch and no pull request |
| 10-M4 — the audit write happened **after** the pull request and was best effort | Medium | A persistent audit failure left a created pull request with no record and the route still answered success | **Closed** — a `github_pr_intent` record is written before the branch; a failure of the intent stops the mutation, a failure of the closing record leaves the intent as the recoverable trail and is reported as degraded |

### Ninth independent security review (2026-11-22)

> The verdict was NOT READY — Critical 0, High 3, Medium 3, Low 0 — against tree
> `2a652bf`. **All six findings are closed** (the closure table and the evidence are
> in `.ai/SECURITY-STATUS.md`; the reviewer's own artifact is `.ai/SECURITY-REVIEW-9.md`).
> The release gate opens only when a **tenth independent review** returns READY.

| Finding | Severity | Reproduced unsafe result | Status |
|---|---|---|---|
| 9-H1 — the destination CSS reader knew neither the logical inset longhands nor the sizes above the viewport | High | The `aria-label` fix activated a fixed `1280×720` overlay; the `9999px` and `200vw` twins did the same | **Closed** — the four logical inset longhands are geometry, and a size the analyser cannot compute (a fixed length that may be as long as the customer's screen, a viewport unit above 100%, a font-relative length of 64 units) is unprovable |
| 9-H2 — only the subject compound of a selector was judged, so a sibling combinator the fix activates looked like no rule | High | `[alt] ~ .overlay` took over the customer page the moment the fix added `alt` | **Closed** — the judgement computes what the fix changes and asks which rules start matching: a rule whose subject is another element is unprovable |
| 9-H3 — the repository's runtime was only inspected for a style it creates | High | A script that reads `alt` and adds a class, and a service worker that supplies the stylesheet bytes, each turned the element into a `1280×720` overlay | **Closed** — a conditional mutation that names an attribute the fix adds, a mutation that names the patched element, a service worker and a CSS-in-JS library make the destination unprovable; an ordinary script still gets its fix |
| 9-M1 — `attributionsrc` was not a URI attribute | Medium | The fix introduced an attribution pixel the customer browser then requested | **Closed** — `attributionsrc` is a URI attribute and is parsed as the space-separated URL list the browser parses |
| 9-M2 — the destination analyser never looked at the network-bearing declarations of a rule the fix activates | Medium | The fix activated `background-image:url(…)` and the customer browser issued the request | **Closed** — a resource-bearing declaration of an activated rule makes the destination unprovable |
| 9-M3 — the repository paint and geometry model was incomplete | Medium | A transparent repository colour, a logical margin, a negative offset, a zero dimension, `display:contents` and a reversed animation each removed the customer-visible content | **Closed** — all six are judged by the destination state model, and the visible frame of an animation follows its direction |

### Eighth independent security review (2026-11-22)

> The verdict was NOT READY — Critical 0, High 4, Medium 2, Low 0 — against tree
> `08ab9ef`. **All six findings are closed** (the closure table and the evidence are
> in `.ai/SECURITY-STATUS.md`; the reviewer's own artifact is `.ai/SECURITY-REVIEW-8.md`).
> The release gate opens only when a **ninth independent review** returns READY.

| Finding | Severity | Reproduced unsafe result | Status |
|---|---|---|---|
| 8-H1 — the destination CSS reader knew neither the `inset` shorthand edge assignment nor the logical sizing properties | High | `inset:0 0` and the `inline-size`/`block-size` twin each verified with `harm:null` while Chromium measured a fixed `1280×720` overlay | **Closed** — the shorthand assigns its edges the way the browser assigns them, the logical sizing properties are geometry, and an uncomputable geometry value is unprovable |
| 8-H2 — the destination analyser evaluated the repository's CSS without the remediation's own inline style | High | A fix that sizes the element against a repository rule that positions it verified and was written; the same with custom properties | **Closed** — the effective style is the repository's rules plus the remediation's inline declarations, the custom properties the fix defines resolve the `var()` references, and an unreadable style is unprovable |
| 8-H3 — the JSX `className` hook was invisible to validation and to destination matching | High | `className="overlay"` verified with confidence 1 and was written; Chromium measured a fixed `1280×720` overlay | **Closed** — `className` is a class-token carrier in the added-class guard and in the CSS element descriptor |
| 8-H4 — a repository script that creates a style at runtime was never inspected | High | The `alt` fix activated the runtime rule and was written; Chromium measured a fixed `1280×720` overlay | **Closed** — a runtime-created style is a dynamic style source: the destination is unprovable and no repository write happens |
| 8-M1 — one value per URI attribute name, and `ping` read as a single URI | Medium | A remote destination behind a duplicate `src`, a remote URL inside a `ping` list and a `mailto:` navigation behind a duplicate `href` each verified and were written | **Closed** — every duplicate is compared in source order and each attribute is parsed with the list grammar the browser uses |
| 8-M2 — a target or text that produces no visible paint passed as visible | Medium | Six browser-confirmed variants (modern transparent colour, zero size, clipped text, negative margin, viewport translation, opacity animation) each verified with confidence 1 and were written | **Closed** — the static guard reads the modern colour alpha, a zero size and a negative margin; the browser verdict resolves the alpha with a canvas and rejects a zero-area target, an off-screen target, a clipped text and an animation that ends invisible |

### Sixth independent security review (2026-11-22)

> The verdict was NOT READY — Critical 0, High 2, Medium 6, Low 0 — against tree
> `0650188`. **All eight findings are closed** (the closure table and the evidence are
> in `.ai/SECURITY-STATUS.md`). The release gate opens only when a **seventh
> independent review** returns READY.

| Finding | Severity | Reproduced unsafe result | Status |
|---|---|---|---|
| 6-H1 — the repository's stylesheet was only read from `.css` files, so a `.scss` file or a linked stylesheet could still turn the patched element into a 1280×720 fixed overlay | High | The write happened and Chromium measured `position:fixed`, `1280×720` | **Closed** — every repository-owned style source is collected (stylesheet files, the `<style>` block of every file, linked stylesheets, the `@import` chain); an unresolvable reference is unprovable |
| 6-H2 — the hand-written CSS reader missed ten browser-valid rule variants and depended on the order the stylesheets were read in | High | Every variant verified with `harm:null` while Chromium computed a full-viewport fixed overlay | **Closed** — escapes, strings, native nesting, dynamic viewport units, minimum viewport sizing, custom properties, changed attribute values and animation frames are read; the applicable values are unioned, so the verdict is order-independent |
| 6-M1 — a comment opener in the remediation swallows the markup behind it | Medium | The fix validated, verified and was written; the button behind it disappeared | **Closed** — HTML comment syntax is rejected |
| 6-M2 — a fix may hide the element it patches | Medium | `hidden` / `display:none` validated, verified and was written; the written element measured `display:none`, `0×0` | **Closed** — rejected statically, skipped in the write path and judged from the computed style in the browser |
| 6-M3 — a fix may make its text transparent | Medium | `color:transparent` validated, verified and was written; the computed colour was `rgba(0,0,0,0)` | **Closed** — transparent colour and an alpha of zero are rejected statically and in the browser |
| 6-M4 — a fix may introduce a remote URL the original element does not have | Medium | A tracking pixel verified (the verification browser blocks the request, so it is invisible there) and loaded from the customer browser after the write | **Closed** — every URI attribute is compared with the original element |
| 6-M5 — inert contexts were counted as live | Medium | A bogus comment, a CDATA section and an end tag inside an attribute value each counted 1 occurrence and were patched, while Chromium created 0 images | **Closed** — the scanner reads them the way the browser does |
| 6-M6 — an ambiguous blob (`.dat`) was skipped before it was read | Medium | Only `index.html` was read and patched although `payload.dat` held the same element | **Closed** — the blob is read and its content decides whether it is binary |

### Sixth-review closure (2026-11-22)

| Fix | Root cause | Regression |
|---|---|---|
| Destination CSS collection (`src/lib/github.ts`) | The judgement only saw `.css` files and `<style>` blocks, so two of the browser's own style carriers were outside it | `github.test.ts` (a preprocessor stylesheet, a linked stylesheet) |
| Browser-equivalent CSS reader (`src/lib/css-context.ts`) | The hand-written reader did not decode escapes, did not flatten nesting, ignored the viewport units and simulated the cascade by order | `css-context.test.ts` (13 new cases: ten variants, the order, the animations) |
| Remediation guards (`src/lib/github-pr.ts`) | A comment opener, a self-hiding target, transparent text and a new remote URL all passed validation and axe | `github-pr.test.ts` (six new cases) |
| Live-context scanner (`src/lib/ast-patch.ts`) | A markup declaration that is not a comment and an end tag inside an attribute value were read as live markup | `ast-patch.test.ts` (three new cases) |
| Content-based binary detection (`src/lib/github.ts`) | The extension denylist treated `.dat` as binary without reading it | `github.test.ts` (two new cases) |

**Gate evidence:** tsc 0 · lint 0 · vitest 53 files / 667 tests · coverage
64.80 / 56.21 / 66.80 / 66.34 (thresholds 55 / 50 / 58 / 57) · build 0 ·
Playwright 79/79 · `npm audit --audit-level=high` 0 (15 moderate) · the reviewer
payload re-run 36/36 (26 payloads blocked, 8 legitimate behaviours pass), temporary
file deleted.

### Seventh independent security review (2026-11-22)

> The verdict was NOT READY — Critical 0, High 3, Medium 4, Low 0 — against tree
> `cdb246a` (baseline `0650188`, checkout `5a1b83e`). **All seven findings are
> closed** (the closure table and the evidence are in `.ai/SECURITY-STATUS.md`;
> the reviewer's own artifact is `.ai/SECURITY-REVIEW-7.md`). The release gate
> opens only when an **eighth independent review** returns READY.

| Finding | Severity | Reproduced unsafe result | Status |
|---|---|---|---|
| 7-H1 — the CSS reader kept the priority suffix, missed the logical viewport units and left an uncomputable value harmless | High | `position:fixed!important` and `width:100vi` verified with `harm:null`; Chromium computed a 1280×720 fixed overlay and the fix was written | **Closed** — the suffix is stripped, every logical / small / large viewport unit is known, and a value the analyser cannot compute makes the destination unprovable |
| 7-H2 — a relational selector (`:has()`) was judged only on its subject compound | High | `body:has(#target[alt])` verified with `harm:null`; Chromium turned the ancestor into a full-viewport fixed overlay after the fix added `alt` | **Closed** — a selector that contains `:has(` makes the destination unprovable, so no write happens |
| 7-H3 — a dynamic `<style>{css}</style>` carrier was read as an empty, proven stylesheet | High | `styleBlocks:["{css}"]`, `cssRules:0`, `harm:null`, one write; Chromium applied the customer's overlay | **Closed** — a dynamic style source (a JSX expression body or `dangerouslySetInnerHTML`) is unprovable |
| 7-M1 — the remote-URL comparison matched raw strings, not resolved URLs | Medium | `//host/x`, `http:/host/x` and `http:\\host\\x` each validated, applied and hit the customer browser; `href="/account"` → `mailto:` was verified with confidence 1 and written | **Closed** — the destination is compared on the URL the way the browser resolves it; a changed, dropped or newly added destination is refused |
| 7-M2 — the hiding set knew four forms, not the other five | Medium | `font-size:0`, `content-visibility:hidden`, `translate:-9999px`, `filter:opacity(0)` and `scale:0` verified with confidence 1 while the text range measured `0×0` | **Closed** — the static guard, the browser verdict and the repository CSS reader all refuse the whole hiding set |
| 7-M3 — the `image-alt` rule check was lexical and did not require the media source | Medium | `<textarea>`, `<title>` and a bogus-comment carrier each verified with confidence 1 and were written; Chromium created `images:0`; a dropped `src` was accepted too | **Closed** — the fix needs a live `<img>` and has to keep the media source |
| 7-M4 — the live-context scanner did not implement the frameset parsing state | Medium | The scanner counted 1 live image and wrote the fix; Chromium reported `images:0`, `framesets:1` | **Closed** — the content of a frameset is frame content, not body content |

### Seventh-review closure (2026-11-22)

| Fix | Root cause | Regression |
|---|---|---|
| Browser-equivalent URI resolution (`src/lib/html-attributes.ts`, `src/lib/github-pr.ts`) | The destination comparison compared raw strings instead of resolved URLs | `html-attributes.test.ts`, `github-pr.test.ts` (the three URL spellings, the navigation mutation, the preserved and the added relative destination) |
| CSS declaration semantics + relational selector + dynamic carrier (`src/lib/css-context.ts`, `src/lib/github.ts`) | The reader kept the priority suffix, missed the logical viewport units, judged only the selector subject and treated a dynamic `<style>` as empty | `css-context.test.ts`, `github.test.ts` (the suffix, the units, the uncomputable value, `:has()`, the dynamic carrier, the hiding values) |
| Visual-hiding guard (`src/lib/github-pr.ts`, `src/lib/fix-verification.ts`) | Only four hiding forms were known to the static guard and the browser verdict | `github-pr.test.ts` (eight hiding styles), `fix-verification.test.ts` (the painted-nowhere browser cases) |
| Live element + media source (`src/lib/fix-validation.ts`) | The rule check found the `<img>` token lexically | `fix-validation.test.ts` (the raw-text / bogus-comment carriers, the dropped source) |
| Frameset parsing state (`src/lib/ast-patch.ts`) | The inert-content list did not carry the frameset | `ast-patch.test.ts`, `github-pr.test.ts` (nothing is written into a frameset document) |
| FreeMarker directive (`src/lib/github-pr.ts`) | The twelve template spellings covered eleven; `<#` was still accepted | `github-pr.test.ts` (the directive in a remediation and in a destination) |

**Gate evidence:** tsc 0 · lint 0 · vitest 53 files / 703 tests · coverage
64.94 / 56.85 / 66.88 / 66.50 (thresholds 55 / 50 / 58 / 57) · build 0 ·
Playwright 79/79 · `npm audit --audit-level=high` 0 (15 moderate) · the reviewer
payload re-run 39/39 (34 payloads blocked, 9 legitimate behaviours pass), temporary
file deleted.

### Fourth-review closure (2026-11-22)

All twelve findings of the fourth review are fixed. Each fix is a root-cause fix in
the shared code with a permanent regression test:

| Finding | Severity | Fix |
|---|---|---|
| 4-H1 — a named-entity CSS overlay bypassed the style check (the entity table was partial) | High | A style value that carries an **entity, a CSS escape or a CSS comment** is rejected outright — a partial table cannot mirror what the browser resolves |
| 4-H2 — HTML's alternate `--!>` comment terminator | High | Both terminators (`-->`, `--!>`) are neutralized in the untrusted text |
| 4-H3 — a remediation validated as HTML was inserted into a JSX file or a TypeScript string | High | A brace is rejected; a fix is only written into a file whose destination context can be **proven** (HTML or JSX) — a TypeScript module or a mixed component file receives a review suggestion |
| 4-M1 — GFM autolinks a bare URL without Markdown syntax | Medium | The URL scheme is neutralized (`https&#58;//`, `www&#46;`); verified against GitHub's own Markdown API |
| 4-M2 — `plaintext` rewrote the rest of the customer document | Medium | `plaintext`, `xmp`, `listing`, `noscript`, `noembed` are rejected |
| 4-M3 — customer-side resource loading | Medium | `video`, `audio`, `source`, `track`, `input[type=image]` are rejected |
| 4-M4 — `encoding:'none'` was cached as a scanned (empty) file | Medium | It counts as unreadable → the scan is incomplete → nothing is patched |
| 4-M5 — `.mjs`/`.cjs`/`.mts`/`.cts` were outside the scan | Medium | The scan covers every source extension; the scanned-but-never-patched files still count |
| 4-M6 — `opacity:0` kept the text in the DOM, so both gates passed | Medium | `opacity:0` counts as hidden in the static guard (CSS and JSX-object form) |
| 4-M7 — "Read more" could be reduced to "R" | Medium | The replacement has to **keep** the original visible text |
| 4-M8 — two selected identical elements got their remediations swapped by request order | Medium | Such fixes cannot be mapped at all, so they stay review suggestions |
| 4-M9 — an element inside an HTML comment was patched and counted as applied | Medium | A live-tag scanner excludes markup in a comment, in a raw-text element and in an attribute value |

### Third review findings (2026-11-22), fixed

| Finding | Severity | Fix |
|---|---|---|
| A CSS escaped overlay (`p\6fsition:fixed`) passed the overlay denylist and was written into customer source | High | CSS escapes are decoded before the declaration is read; the check also removes CSS comments and decodes the HTML entities of the attribute value, the three steps the browser applies in that order |
| `frame` / `frameset` passed the active-element denylist and were written into customer source | High | `frame`, `frameset`, `noframes`, `portal` and `fencedframe` are rejected like every other embedding element |
| An attacker controlled axe selector injected a live Markdown link into the PR | Medium | The inline code span uses a fence longer than the longest backtick run in the value (and pads a value that starts or ends with a backtick); the fix document writes the selector as an inline code span. Verified against GitHub's own Markdown renderer |
| An incomplete GitHub scan (a file that could not be read, a truncated tree) patched the wrong file | Medium | A truncated tree returns immediately, an unreadable file marks the scan incomplete, and an incomplete scan never patches a file |
| A fix deleted the visible label that was only marked `aria-hidden` | Medium | `aria-hidden` removes content from the accessibility tree, not from the screen — its text counts as visible text |
| An opened PR could have no audit entry | Medium | The audit write is retried (`createAuditLogWithRetry`, 3 attempts) before the route reports a missing trail |
| A selected duplicate occurrence was patched at the wrong occurrence | Medium | A fix is only written when every occurrence of its element in the file is covered by a selected fix; otherwise it stays a review suggestion |

Two further defects of the same class were found while fixing the above: the review
comment written into a customer file could be closed by untrusted text (`*/`, `-->`),
and the summary file wrote the rule id and the file name unescaped.

### Re-review findings (2026-11-22), fixed

| Finding | Severity | Fix |
|---|---|---|
| A handler the **scanned page already carried** executed in the verification browser and was written into customer repositories; `/onerror=` and an entity encoded `javascript:` URI bypassed the old checks | High | Event handlers are rejected unconditionally and the attributes are parsed the way a browser parses them; URI attributes are checked against a scheme allowlist after entity decoding and normalisation; overlay styles are rejected; the template fallback strips the scanned page's handlers |
| WebSocket traffic escaped the HTTP route interception and reached an internal endpoint | High | `context.routeWebSocket` closes every socket, the document carries a restrictive CSP (`connect-src 'none'`), service workers are blocked |
| The request limit did not bound concurrent browser work | Medium | A global semaphore runs at most two verification batches, a batch has a 60 s budget, a request waits at most 30 s for a slot |
| A violation was linked to a PR without an accepted artifact | Medium | A violation is linked only when GitHub accepted an artifact for it; `fixesWithoutArtifact` reports the rest |
| The locator could still pick the wrong element (class) or the wrong file (truncated tree) | Medium | Every identity attribute the report carries is compared; the whole tree is scanned under a byte budget; an incomplete scan never patches a file |
| An opened PR was not guaranteed to have an audit entry | Medium | The audit entry is written before the violations are linked, `createAuditLog` returns whether it was stored, the response reports `auditRecorded` |
| Markdown injection survived in untrusted prose | Medium | Untrusted prose is escaped for Markdown as well as HTML; selectors are inline code spans that cannot be broken out of |
| Hidden text satisfied the visible-content check | Medium | The visible-text check ignores hidden content and the browser compares the **rendered** text, so a fix that hides the label fails |
| The VPAT `scanId` was not tenant isolated | Medium | The scan must belong to the authorized project (`404` otherwise) and violations are queried by project **and** scan |
| The documented manual-check override was not wired | Low | The stored catalog id is resolved to the WCAG criterion it assesses; a real manual pass clears minor/moderate findings, a manual fail marks the criterion not supported |

### First review findings (2026-11-21), fixed

| Finding | Severity | Fix |
|---|---|---|
| Unsafe remediation executed in the verification browser before the safety checks and could fake an axe pass (`<script/x>`) | High | The safety, rule and placeholder checks now run **before** anything is rendered; every script spelling, active element, active URI scheme and event handler is rejected |
| The verification browser could make the host fetch arbitrary URLs (SSRF) | High | The verification context aborts every network request and closes every WebSocket; each run has a 15 s deadline; the OS sandbox stays on outside Docker |
| The work limit was applied after the browser work and the route had no rate limit | High | The cap is applied before verification, a request may not carry more than 25 violations, and the route is rate limited per user |
| The "verified" / "applied" counters overstated what GitHub accepted | Medium | A refused write is not counted; only accepted files are reported; the PR summary states exactly what was verified |
| The locator could patch the wrong element (same `src`, different `id`) or the wrong file | Medium | Every identity attribute must match; a multi-file match is left to a human |
| The verified-fix path wrote no audit trail | Medium | Every opened PR writes a `github_pr_created` audit entry |
| Untrusted text could inject misleading Markdown into the PR | Medium | Raw HTML and Markdown syntax are escaped and code fences are sized to their content |
| The VPAT could show "Supports" for a criterion that still had a violation | Low | Any unresolved violation is "Partially Supports"; only a manual check can clear minor/moderate findings |
| An axe-verified replacement could delete the visible content of the element | P0 | A patch that empties an element with visible text is rejected (hidden text does not count) |

Two further defects were found and fixed on the way: `applyFixesToRepository` re-read
the original file for every violation (a second fix in the same file overwrote the
first), and the route linked **all** requested violations to the PR, including the ones
it had excluded.

## Verification

| Check | Result |
|---|---|
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — 0 errors |
| `npx vitest run` | PASS — 53 files, 667 tests, 0 failed (was 53/634) |
| `npx vitest run --coverage` | PASS — statements 64.80% / branches 56.21% / functions 66.80% / lines 66.34% (CI thresholds 55/50/58/57) |
| `npm run build` | PASS — exit 0, Next standalone build |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed (4.1 min) |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev-toolchain) |
| Reviewer exploit reproductions (6) | PASS — every reproduction of the re-review is blocked |
| Third-review reproductions (5 + 2) | PASS — the escaped overlay, the frame, the injected selector, the `aria-hidden` text deletion and the wrong duplicate occurrence are blocked; the CSS comment and the entity encoded overlay were found while fixing them and are blocked as well |
| Fourth-review reproductions (12) | PASS — all twelve fourth-review payloads are blocked on the fixed tree (the temporary reproduction file was deleted afterwards) |
| Fifth-review temporary suites | PASS as evidence harnesses — 36/36 broad assertions and 7/7 focused reproductions; every temporary test was deleted |
| Sixth-review reproductions (8) | PASS — all eight sixth-review payloads are blocked on the fixed tree, with a permanent regression each |
| Reviewer-payload re-run on the sixth-review closure (temporary file, deleted afterwards) | PASS — 36/36 assertions: 6 fifth-review payloads, 12 fourth-review payloads and 8 sixth-review reproductions are blocked in the unsafe direction, and the 8 legitimate behaviours still pass |
| Fifth-review equivalent paths | **FAIL — 2 High and 4 Medium findings reproduced**; see `.ai/SECURITY-STATUS.md` |
| Shipped suite after sixth-review cleanup | PASS — 53 files, 667/667 tests |
| Sixth-review source-only typecheck / lint / build | PASS — exit 0 / 0 errors / exit 0 (116 static pages) |
| Sixth-review dependency check | PASS — npm audit High 0 / Critical 0 |
| Browser isolation (real Chromium) | PASS — no HTTP request and no WebSocket reaches a local server during verification |

The V23 code initially pushed global branch coverage to 49.98% (below the CI gate of
50). It was fixed by covering the new code, not by moving the threshold: the GitHub
writer and API helpers now sit at 87% branch coverage and the AST patcher at 91%.

## The CI pipelines

Three pipelines had been red on `main` since September; all eight defects are fixed
and documented in `.ai/DEPLOYMENT.md`: the Postgres health command is quoted, the
Trivy action is pinned, the AccessGuard self-scan runs against the public API, the
image build and the load build get the `NEXTAUTH_SECRET` / `NEXTAUTH_URL` that the
Next.js route collection needs, the image reference is lowercase, the runner ships an
npm without the HIGH CVEs the image gate found, and the image scan keeps its severity
filter in SARIF mode (the action drops it, so MEDIUM findings failed the job).
**Proof: Docker run 44955598091 completed ✅ on `8afc55a`** — the Trivy step passes
with the filter restored and the scanner pinned to `v0.76.2`. CI (44955597980),
Deploy (44955597965) and AccessGuard Scan (44955597959) are green on the same commit.

## Commits

- `8f44cc1` — `vol: engineering — V23: verified-fix pipeline (AST patching, axe verification, confidence gate, VPAT truth)`
- `b12484a` — `vol: docs — V23: verified-fix pipeline documentation and claim alignment`
- `d02161f` — `vol: state — V23: verified-fix engine evidence`
- `7498d46` — `vol: releases — V23: volume log entry`
- `3cd9ba6` / `a1bf6d7` / `6610d68` / `1cc529c` — first hardening pass (code, docs, state, volume entry)
- `93d880b` — PR-text escaping tests + scan coverage note
- `f40c251` / `999b02d` — coverage gate fix (tests, state)
- `f8f54f1` — `vol: devops — V23: repair the three CI pipelines`
- `4370a1a` — `vol: devops — V23: give the real-browser verification tests room on a cold CI runner`
- `8cb32db` — `vol: security — V23: close the re-review findings in the fix pipeline and the VPAT report`
- `086a6a3` / `bcf1b31` / `870267f` / `66dffba` — OpenAPI parity + docs + state + volume entry after the re-review
- `dbd7927` / `a55a340` / `19ab1ac` / `456d375` — the Docker pipeline repair (build env, lowercase image reference, npm without the HIGH CVEs)
- `e2d38b0` / `1a6b9c2` / `24fdb02` / `7c49b7b` / `8afc55a` — the third-review closure (code, devops, docs, state, volume entry)
- `db1fc6d` / `11918c1` / `3b3eb0f` / `0650188` — the fifth-review closure (code, docs, state, volume entry)
- `4cdefea` / `15300b9` — the sixth-review closure (code, docs); the state and volume entry follow in the same cycle
- `5fb4473` / `0b7befc` — the seventh-review closure (code, docs); the state and volume entry follow in the same cycle

## What this does NOT prove (read before making a claim)

- Verification is **rule-level on the remediation snippet**, not a full page re-scan and
  not a re-scan of the patched file. The customer's build is not available to the service.
- It does not prove the patch landed in the right file — an ambiguous match is left to a
  human rather than guessed.
- A verified fix can still break surrounding code. The PR is reviewed by a human before
  merge, and the PR summary states exactly what was verified.
- A fix is **never** written into a TypeScript module or a mixed component file
  (`.ts`, `.mts`, `.cts`, `.vue`, `.svelte`, `.astro`): the element text can sit inside a
  string or an expression there, so the destination context cannot be proven. Those
  fixes ship as a review suggestion. The files are still **scanned**, so a duplicate in
  one of them keeps the remaining match ambiguous.
- Verification results are reported in the PR, the API response and the audit log, not
  stored on the `Violation` row. Persisting them is on the roadmap.
- **No Strix result exists for this cycle.** The CLI is installed and the target was a
  sanitized export of the commit, but every configured provider refused the run (Gemini
  free tier quota exhausted, NVIDIA `meta/llama-3.3-70b-instruct` end-of-life, OpenAI
  credits exhausted). The security evidence for this cycle is the independent
  human-agent reviews (including the re-review) plus `npm audit`; Strix must be re-run
  before it can be cited.
- **The fifth independent security review returned NOT READY (High 2, Medium 4)**,
  **the sixth returned NOT READY (High 2, Medium 6)** and **the seventh returned
  NOT READY (High 3, Medium 4)**. Every set of equivalent paths was reproduced in
  local, mocked conditions and is now fixed at its root cause, but the release gate
  stays closed until an **eighth independent pass returns READY**; see
  `.ai/SECURITY-STATUS.md`.
- The destination CSS judgement is **static**: CSS-in-JS, CDN stylesheets, a style
  written by a script at runtime and a custom property the analyser cannot resolve
  are outside it (an unresolved custom property fails the destination closed when the
  fix changes that property). A repository whose stylesheets use syntax the analyser
  cannot judge receives review suggestions instead of source patches.

## Follow-ups logged, not done here

- Replace the end-of-life NVIDIA model in the free pool
  (`src/ai/model-router.ts`). The router fails over on 4xx, so the chain still completes,
  but every AI remediation wastes one provider call. Picking a live model needs a check
  of the current NVIDIA catalogue (next AI volume).
- Re-run the Strix pentest against the same sanitized export once a provider has quota.
- Run Chromium as a non-root user in the Docker image so the OS sandbox stays enabled
  for the verification browser.
- Cache the parsed AST per file instead of re-parsing it per fix (bounded by the 60 s
  batch budget today).
- A source map from the scanned URL to the repository path, so a match is never
  ambiguous and a repository over the 5 MB scan budget can still be patched.

## User actions required

None. Nothing needs a secret, a plan change, a DNS change or a manual migration.
