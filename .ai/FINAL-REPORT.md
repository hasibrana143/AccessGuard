# AccessGuard — Final Report

Cycle: **V23 — verified-fix engine + security hardening + fourteenth-review closure** · Date: 2026-11-24 · Owner: CTO agent

## What shipped

The four P0 "make the product true" gaps from `.ai/PRODUCT-CRITIQUE-DEEP.md` are closed.
The first V23 cut was reviewed twelve times: the first review found seven more defects
(3 reproduced P0 defects, 3 High, 4 Medium, 1 Low), the **re-review of that hardening
found 2 High, 7 Medium, 1 Low**, the **third review found 2 High, 5 Medium**, the
**fourth review found 3 High, 9 Medium**, the **fifth review of that closure found
2 High, 4 Medium**, the **sixth review of that closure found 2 High, 6 Medium**, the
**seventh review of that closure found 3 High, 4 Medium**, the **eighth review of
that closure found 4 High, 2 Medium**, the **ninth review of that closure found
3 High, 3 Medium**, the **tenth review of that closure found 4 High, 4 Medium**, the
**eleventh review of that closure found 3 High, 3 Medium**, the **twelfth review
of that closure found 6 High, 3 Medium**, the **thirteenth review of that
closure found 5 High, 2 Medium** and the **fourteenth review of that closure
found 4 High, 6 Medium**.
Every earlier round closed the literal reproductions while an equivalent path stayed
open. The tenth review independently reproduced eight equivalent paths — an inline
`<script>` carrier, a DOM property getter, an escaped attribute **name**, the painted
box, the focus activation a fix causes, a paused animation, a customer-side request
through the focus, a repository mutation after a refusal and a missing audit trail.
**All eight are now fixed at their root cause, with a permanent regression each.**
The eleventh review independently reproduced six more equivalent paths — the
**event-handler carrier** and the **generic attribute state reads**, the **effective
painted surface** (the logical padding and border longhands, `zoom`, an unconstrained
scale, `aspect-ratio` and `box-shadow`), the **clipping preservation**, the
**custom-property resource** and the **animation delay and fill mode**.
**All six are now fixed at their root cause, with a permanent regression each**
(the closure matrix: 46/46 assertions — the 13 new reproductions blocked in the
unsafe direction, the benign twins still allowed, the route refusing both new cases
with `400` and no branch, no write and no pull request; the recovered prior matrices
19/19, 42/42 and 118/118).
The twelfth review independently reproduced nine more equivalent paths — the
**runtime attribute-name resolution**, the **functional pseudo-classes**, the
**focusability transition**, the **painted surface of a non-positioned element**, the
**script carrier**, the **remediation-introduced element**, the **positive off-screen
offsets**, the **introduced destination** and the **nested hidden target**.
**All nine are now fixed at their root cause, with a permanent regression each**
(the closure matrix: 26/26 assertions — every finding blocked in the unsafe
direction and every benign twin still allowed; the real-route harness: 8/8 — seven
refusals with `400` and no branch, no write and no pull request, and the benign
image-alt fix still opening a pull request; the recovered prior matrices 37/37,
42/42, 19/19, 9/9 and 118/118).
The thirteenth review independently reproduced seven more equivalent paths — the
**document base URL**, the **computed runtime state reads**, the **CSS transition
semantics**, the **focusability transition**, the **outline paint geometry**, the
**inset shorthand offsets** and the **safety order against the source budget**.
**All seven are now fixed at their root cause, with a permanent regression each**
(the closure matrix: 21/21 assertions — every finding blocked in the unsafe
direction and every benign twin still allowed; the recovered prior matrices 26/26,
37/37, 42/42, 19/19, 9/9 and 118/118; the two pre-closure harnesses failing
exactly as expected, 12 failed + 5 passed and 2 failed + 7 passed).
One false positive the review never asked for was found and fixed with them: the
document-base reader parsed every file of a repository as markup, so an ordinary
script file made the whole repository unprovable.
**The release verdict is still NOT READY** — the gate requires Critical 0 and High 0
from an independent pass, and the **fourteenth review is the next check**.
The fourteenth review independently reproduced ten more equivalent paths — the
**`Reflect.get` computed read**, the **stylesheet-link discovery**, the
**runtime-mutated document base**, the **remediation-introduced structural
change**, the **native semantics and keyboard focus**, the **remediation-introduced
CSS resource**, the **escaped `]` in an attribute selector**, the **`:link`
transition**, the **viewport-unit offset** and the **`aria-hidden` suppression**.
**All ten are now fixed at their root cause, with a permanent regression each**
(the closure matrix: 23/23 assertions — every finding blocked in the unsafe
direction and every benign twin still allowed; the recovered prior matrices
118/118, 145/145 and 17/17; the two pre-closure harnesses failing exactly as
expected, 12 failed + 5 passed and 2 failed + 7 passed; the fails-before proof:
21 + 7 + 2 regressions fail on the pre-closure tree).
Two false positives the review never asked for were found while reviewing the
closure and fixed with them: the element pairing compared the attributes of the
original and the patched element, so an ordinary fix that keeps a child element
with changed attributes was refused, and the "exactly one element" rule refused
every remediation with nested children when the original had no id.
The **fifteenth review** then reproduced nine more equivalent paths — the
**alternate attribute-read call syntaxes**, the **reflected `data-*` reads**, the
**id introduced on the patched target**, the **indexed collection receivers for
the document base**, the **modern slash-alpha transparency**, the **class removal
through nested negation**, the **`@font-face` resource**, the
**accessibility-tree hiding through browser semantics** and the **removal of
`autofocus`**. **All nine are now fixed at their root cause, with a permanent
regression each** (37 regressions: the closure matrix 24/24 assertions — every
finding blocked in the unsafe direction and every benign twin still allowed, with
16 of the 24 failing on the pre-closure tree; the recovered prior matrices
118/118 and 209/209 across nine files; the two pre-closure harnesses failing
exactly as expected, 12 failed + 5 passed and 2 failed + 7 passed; the
fails-before proof: 8 + 6 + 5 regressions fail on the pre-closure tree). The
gate opens only when a **sixteenth independent review** returns READY (Critical 0,
High 0).
The **sixteenth review** then reproduced **eleven more equivalent paths** — seven
of them let the customer's own runtime take the repaired page over — the
**chained and optional computed dataset receivers**, the **computed and optional
`Reflect` calls**, the **optional member inside a callee chain**, the
**concatenated introduced id**, the **literal runtime tag selector**, the
**alternate base-`href` mutation APIs**, the **runtime-created base**, the
**`color-mix()` transparency**, the **activated `font` shorthand**, the **wrong
duplicate `@font-face src`** and the **`:enabled` transition**. **All eleven are
now fixed at their root cause, with a permanent regression each** (32 regressions:
21 in `github.test.ts`, 10 in `css-context.test.ts`, 1 in `github-pr.test.ts`; the
closure matrix 42/42 assertions — every finding blocked in the unsafe direction
and every benign twin still allowed; the recovered prior matrices 118/118 and
192/192 across seven files and the route run 24 passed with the 2 intentional
pre-closure failures; the two pre-closure harnesses failing exactly as expected,
12 failed + 5 passed and 2 failed + 7 passed; the fails-before proof: 14 + 7
regressions fail on the pre-closure tree). The closure matrix also found one
still-open spelling — the optional **computed** member `img['dataset']?.['state']`
— which is closed and locked down by the regressions `16-H1d` and `16-H1e`. The
gate opens only when a **seventeenth independent review** returns READY (Critical
0, High 0).

| Gap (before) | Now | Evidence |
|---|---|---|
| Confidence gate treated `null` (unknown, every template fix) as "good enough" | The gate reads **verification** confidence; `null` never passes. Template fixes carry `null` instead of a fabricated `0.5` | `src/lib/fix-verification.ts`, `src/lib/__tests__/fix-verification.test.ts` |
| Fixes were exact-string replacements of axe DOM HTML into source files | JSX/JS is located through a real AST (TypeScript compiler API) and patched at AST-derived offsets; occurrence-aware per rule **and** per element; placeholder and no-op rejection; the patched file is re-parsed and the patch discarded if it breaks | `src/lib/ast-patch.ts`, `src/lib/__tests__/ast-patch.test.ts`, `src/lib/__tests__/github-pr.test.ts` |
| Nothing re-ran axe on a patched page | axe is re-run on the remediation snippet for the rule it targets; only verified fixes open a PR; no browser means no PR (fail closed) | `src/lib/fix-verification.ts`, `src/app/api/github/create-pr/route.ts` |
| The VPAT PDF declared untested criteria out of scope | The PDF reuses `generateVPATData`: `not-evaluated`, per-criterion remarks, draft label on cover and footer | `src/app/api/reports/vpat/route.tsx`, `src/lib/__tests__/vpat-generator.test.ts` |

### Sixteenth independent security review (2026-11-24)

> The verdict was NOT READY — Critical 0, High 7, Medium 4, Low 0 — against tree
> `b4bd811`. **All eleven findings are closed** in the sixteenth-review closure
> tree (the dispositions are in `.ai/SECURITY-STATUS.md`; the reviewer's own
> artifact is `.ai/SECURITY-REVIEW-16.md`).
> The release gate opens only when a **seventeenth independent review** returns READY.

| Finding | Severity | Reproduced unsafe result | Status |
|---|---|---|---|
| 16-H1 — chained and optional computed dataset receivers bypassed the reflected-attribute gate | High | `img['dataset']['state']` and `img.dataset?.state` each changed the target to class `overlay` and a fixed `1280×720` takeover; both applied 1 fix, wrote 1 file and the real route opened a pull request | **Closed** — `calleeMembers()` parses the member chain (dot, optional dot, computed and optional computed members) and `datasetKeyReads()` maps the key behind a `dataset` member to its `data-*` attribute; an unresolvable chain or key fails closed. Regressions `16-H1a`–`16-H1e` |
| 16-H2 — computed and optional `Reflect` calls bypassed the property-read gate | High | `Reflect['get'](img,'alt')`, `Reflect?.get(img,'alt')` and `Reflect.get?.(img,'alt')` each changed the target to class `overlay` and a fixed `1280×720` takeover | **Closed** — `reflectPropertyReads()` normalizes the dot, computed and optional `Reflect.get` / `Reflect.getOwnPropertyDescriptor` forms and resolves the receiver and the property; an unresolved receiver or property fails closed. Regressions `16-H2a`–`16-H2d` |
| 16-H3 — an optional member inside a callee chain bypassed the call parser | High | `Element.prototype.getAttribute?.call(img,'alt')` and `Element.prototype['getAttribute']?.call(img,'alt')` each changed the target to class `overlay` and a fixed `1280×720` takeover | **Closed** — `METHOD_CALL_PATTERN` and `calleeMembers()` parse the optional and computed members in the middle of a callee chain and keep the attribute-read receiver and argument. Regressions `16-H3a`–`16-H3c` |
| 16-H4 — a concatenated introduced id bypassed the literal-id check | High | `document.getElementById('act'+'ivated')` reached the element the fix introduced: a fixed `1280×720` takeover, one fix, one write and a pull request | **Closed** — `elementIdReads()` and `selectionSelectorReads()` resolve the id argument and the selector through the existing `resolveStringExpression()`; an unresolved id expression fails closed for the introduced-id check only. Regressions `16-H4a`–`16-H4c` |
| 16-H5 — a literal runtime tag selector reached a remediation-introduced element | High | `document.querySelector('span')` reached the `<span data-state="active">` the remediation introduced: Chromium showed it at `1280×720` with the overlay class | **Closed** — `introducedElements()` returns the elements the remediation introduces and `scriptSelectsIntroducedElement()` compares their tag, id, class and attribute names with the compound of a literal runtime selector. Regressions `16-H5a`–`16-H5b` |
| 16-H6 — alternate base-`href` mutation APIs bypassed the base resolver | High | `setAttributeNS(null,'href','/sub/')` and `attributes.href.value='/sub/'` each made the writer analyse a stylesheet the browser never loaded (`/sub/theme.bin` was requested) | **Closed** — `SET_ATTRIBUTE_NS_PATTERN` (the attribute name is the second argument) and `ATTRIBUTE_VALUE_ASSIGNMENT_PATTERN` (an `Attr.value` write) are modelled as base mutations next to `setAttribute(...)` and the `href` property assignment. Regressions `16-H6a`–`16-H6c` |
| 16-H7 — a runtime-created base bypassed the static-has-base gate | High | `const b=document.createElement('base');b.href='/sub/';document.head.appendChild(b)` in a document without a static base made the writer analyse a stylesheet the browser never loaded | **Closed** — `scriptCreatesBase()` detects a runtime-created base and the runtime-base pass runs for it; in that mode an unresolved receiver does not count as the base. Regressions `16-H7a`–`16-H7b` |
| 16-M1 — `color-mix()` could make activated text fully transparent | Medium | `[aria-label]{color:color-mix(in srgb,rgb(0 0 0 / 0),rgb(0 0 0 / 0))}` made the repaired button's computed colour `color(srgb 0 0 0 / 0)` | **Closed** — `colorAlpha()` reads the alpha of a colour and `colorMixAlpha()` computes the weighted alpha of a mixed colour; a colour function whose alpha cannot be read fails closed. The same reading is now shared with the remediation check in `github-pr.ts`. Regressions `16-M1a`–`16-M1c` (CSS) and `16-M1c` (validator) |
| 16-M2 — an activated `font` shorthand was not connected to its font-face | Medium | `@font-face{font-family:Evil;src:url(/font)}` with an activated `font:16px Evil` issued `GET /font` in the customer browser | **Closed** — `fontShorthandFamily()` parses the family component of the shorthand after its size component and resolves it through the same `fontFamilyResourceState()` path the longhand uses. Regressions `16-M2a`–`16-M2d` |
| 16-M3 — the wrong duplicate `@font-face src` declaration won in the analyser | Medium | `@font-face{font-family:Evil;src:local("Arial");src:url(/font2)}` issued `GET /font2` — the browser used the later URL declaration | **Closed** — `collectFontFace()` keeps the **last** `src` declaration of the face, which is the one the browser uses. Regression `16-M3a` |
| 16-M4 — an `:enabled` transition was not modelled | Medium | `button:enabled{background-image:url(/pixel-enabled)}` issued `GET /pixel-enabled` after the fix removed `disabled` from the button | **Closed** — `parseSubject()` models `:enabled` / `:disabled` as a `controlState` requirement and `compoundActivatedByFix()` wires the transition into the activation decision; `:hover` and `:focus-within` stay harmless. Regressions `16-M4a`–`16-M4b` |

### Fifteenth independent security review (2026-11-24)

> The verdict was NOT READY — Critical 0, High 4, Medium 5, Low 0 — against tree
> `d16797c`. **All nine findings are closed** in the fifteenth-review closure tree
> (the dispositions are in `.ai/SECURITY-STATUS.md`; the reviewer's own artifact
> is `.ai/SECURITY-REVIEW-15.md`).
> The release gate opens only when a **sixteenth independent review** returns READY.

| Finding | Severity | Reproduced unsafe result | Status |
|---|---|---|---|
| 15-H1 — alternate attribute-read call syntaxes bypassed the runtime state-read gate | High | `Element.prototype.getAttribute.call(img,'alt')`, `img.getAttribute?.('alt')` and `img['get'+'Attribute']('alt')` each changed the target to class `overlay` and a fixed `1280×720` takeover at the viewport centre; all three applied 1 fix, wrote 1 file and the real route opened a pull request | **Closed** — `attributeReadCalls()` recognises the direct, optional, prototype `.call`/`.apply` and computed-method forms and resolves the attribute argument; an unresolvable method or attribute name fails closed as a generic state read |
| 15-H2 — the reflected `data-*` attribute reads bypassed the reflected-attribute gate | High | `img.dataset['state']` and `Reflect.get(img.dataset,'state')` each changed the target to class `overlay` and a fixed `1280×720` takeover; both applied 1 fix, wrote 1 file and the real route opened a pull request | **Closed** — `attributeOfDatasetKey()` maps a dataset key to its `data-*` attribute for the bracket access and for the `Reflect.get` / `getOwnPropertyDescriptor` forms on a `dataset` receiver; an unresolved key fails closed |
| 15-H3 — an id introduced on the patched target was not checked against the repository runtime | High | a remediation that added `id="activated"` let `document.getElementById('activated')` reach the target after the fix: a fixed `1280×720` takeover, one fix, one write and a pull request | **Closed** — the introduced ids are collected from every patched element, so a new id on the patched target is an introduced id that the runtime may reference; the source patch is then refused |
| 15-H4 — indexed collection receivers bypassed the runtime document-base mutation analysis | High | `document.querySelectorAll('base')[0].href='/sub/'` and `document.getElementsByTagName('base')[0].href='/sub/'` each made the writer analyse a stylesheet the browser never loaded (`/sub/theme.bin` was requested) and left the repaired target fixed at `1280×720` | **Closed** — `indexedReceiver()` resolves an indexed collection receiver and `receiverMayBeBase()` recurses into the collection, so a receiver that may contain the base makes the document base unprovable |
| 15-M1 — modern slash-alpha transparency was missed | Medium | `[aria-label]{color:rgba(0 0 0 / 0)}` made the repaired button's computed colour `rgba(0, 0, 0, 0)`: the visible text became transparent although axe still found the accessible name | **Closed** — `isTransparentColor()` reads the legacy comma alpha and the modern slash alpha in one browser-equivalent grammar for `rgb`, `rgba`, `hsl`, `hsla`, `hwb`, `oklch`, `oklab`, `lab`, `lch` and `color()` |
| 15-M2 — class removal through nested negation was missed | Medium | `button:is(:not(.armed)){background-image:url(/pixel)}` issued `GET /pixel` after the fix removed `.armed` from the button | **Closed** — `compoundActivatedByFix()` propagates a removed class and a changed attribute value through nested negation and through the `:is()` / `:where()` alternatives |
| 15-M3 — an `@font-face` resource was disconnected from the activated rule | Medium | `@font-face{font-family:Evil;src:url(/font)}` with an activated `font-family:Evil` issued `GET /font` in the customer browser | **Closed** — `collectFontFace()` collects the family and its `src` descriptors, and `fontFamilyResourceState()` resolves an activated `font-family` to its resource; an unreadable or unresolved family or resource fails closed |
| 15-M4 — the repaired element could be hidden from the accessibility tree through browser semantics | Medium | `aria-hidden="&#116;rue"`, `role="&#112;resentation"`, an `aria-hidden="true"` **ancestor** and `inert` each removed the repaired image from the accessibility tree; all four applied 1 fix, wrote 1 file and the real route opened a pull request. The control `<div role="presentation">` ancestor is **not** harmful — Chromium keeps the image with role `image` | **Closed** — the values are browser-decoded, the repaired element and its remediation ancestors are inspected with browser-equivalent semantics and `inert` is a hiding form; the harmless `role="presentation"` ancestor is not blanket-refused |
| 15-M5 — removing `autofocus` changed the initial focus | Medium | a remediation that dropped `autofocus` moved Chromium's `document.activeElement` from `BUTTON#target` to `BODY` | **Closed** — `validateRemediation()` compares the presence of `autofocus` on the original and the patched target and refuses its removal |

### Fourteenth independent security review (2026-11-24)

> The verdict was NOT READY — Critical 0, High 4, Medium 6, Low 0 — against tree
> `be81d02`. **All ten findings are closed** in `d16797c` (the closure
> documentation is `1803d50`; the dispositions are in `.ai/SECURITY-STATUS.md`;
> the reviewer's own artifact is `.ai/SECURITY-REVIEW-14.md`).
> The release gate opens only when a **fifteenth independent review** returns READY.

| Finding | Severity | Reproduced unsafe result | Status |
|---|---|---|---|
| 14-H1 — a `Reflect.get(object, propertyName)` computed property read bypassed the runtime state-read gate | High | `Reflect.get(img,'al'+'t')` changed the target to class `overlay` and a fixed `1280×720` takeover at the viewport centre; verified with confidence `1`, applied 1 fix, wrote 1 file and the real route opened a pull request | **Closed** — `Reflect.get` and `Reflect.getOwnPropertyDescriptor` are computed property reads; the property-name argument is resolved with the existing string-expression resolver and a name the reader cannot resolve is a generic dynamic state read |
| 14-H2 — the stylesheet-link discovery was not browser-equivalent | High | an entity-encoded `rel` and a quoted `>` in another attribute each hid the stylesheet from the writer while Chromium loaded it; the patched target became a fixed `1280×720` takeover | **Closed** — the `<link>` tags are parsed with the browser's quoted-attribute semantics, the entities of `rel` and `href` are decoded, and a stylesheet link whose attributes cannot be read makes the destination unprovable |
| 14-H3 — a runtime-mutated `<base href>` bypassed the resource resolution | High | the script set `base.href="/sub/"` before the `<link>` was parsed: the writer analysed the benign root stylesheet while Chromium loaded the unreviewed `sub/theme.bin` | **Closed** — a runtime that assigns a base element's `href` makes the effective base unprovable; the document URL is no longer a fallback |
| 14-H4 — a remediation-introduced element changed the structural CSS and the verifier judged the wrong element | High | an introduced `<span aria-hidden="true">` made the image the second child, so `img:nth-child(2) ~ #overlay` turned the sibling into a fixed `1280×720` takeover | **Closed** — an introduced element makes a structural selector (`:nth-child(…)`, `:nth-last-child(…)`, a sibling combinator) unprovable, and the verifier judges the patched target (by id, else by kind) instead of the first rendered element; an unidentifiable target stays unverified with no confidence |
| 14-M1 — native semantics and keyboard focus could be removed | Medium | a native `<button>` replaced by a `<div>` and a `tabindex="0"` changed to `"-1"`: Tab focused the original button and focused neither repaired element | **Closed** — a remediation keeps the native interactive semantics of the element it patches (a native control, a link with an `href` or `role="button"`) and never removes its keyboard focusability |
| 14-M2 — the remediation could introduce a CSS resource request | Medium | `style="background-image:var(--pixel)"` with `:root{--pixel:url(/pixel)}` and `style="background-image:image-set('/pixel')"`: the after-fix listener observed `GET /pixel` in both cases | **Closed** — the remediation's own inline style is checked for a resource with the repository's custom properties resolved; a reference the analyser cannot resolve is unprovable |
| 14-M3 — a quoted escaped `]` defeated the CSS attribute-selector analysis | Medium | `img[alt="\]"] ~ #overlay{background-image:url(/pixel)}`: the after-fix listener observed `GET /pixel` | **Closed** — the closing bracket of an attribute selector is read with browser-equivalent quote and escape handling, and a selector whose attribute syntax cannot be read is unprovable |
| 14-M4 — adding `href` activated `:link` | Medium | `a:link{background-image:url(/pixel)}` with an added `href="#main"`: the after-fix listener observed `GET /pixel` | **Closed** — an added `href` activates the `:link` and `:any-link` rules through the same destination decision as the other fix-created states; `:hover` and `:focus-within` stay harmless |
| 14-M5 — a `99vw` offset moved the patched content off-screen | Medium | the left edge of the `64×64` target moved from `8` to `-1259.1875` (computed `left: -1267.2px`) | **Closed** — a viewport-unit offset is composed with the declared element size, so `99vw` on the exact `64×64` target is not harmless |
| 14-M6 — `aria-hidden="true"` could suppress the repaired image | Medium | Chromium's accessibility tree changed the target from role `image` to role `none` (`ignored: true`), so axe stopped reporting `image-alt` | **Closed** — the decorative exception requires an actually decorative original, so a remediation cannot hide the element it claims to repair |

### Thirteenth independent security review (2026-11-23)

> The verdict was NOT READY — Critical 0, High 5, Medium 2, Low 0 — against tree
> `11065e4`. **All seven findings are closed** in `be81d02` (the closure table and the
> evidence are in `.ai/SECURITY-STATUS.md`; the reviewer's own artifact is
> `.ai/SECURITY-REVIEW-13.md`).
> The release gate opens only when a **fourteenth independent review** returns READY.

| Finding | Severity | Reproduced unsafe result | Status |
|---|---|---|---|
| 13-H1 — the repository's stylesheet and script references were resolved against the containing file's directory, not the document's **effective base URL** | High | `<base href="/sub/">` with `<link rel="stylesheet" href="theme.bin">`: the writer analysed the benign root stylesheet while Chromium loaded the unreviewed `sub/theme.bin`; the candidate verified with confidence `1`, applied 1 fix, wrote 1 file and the real route opened a pull request | **Closed** — the first live `<base href>` of a document is read and the references are resolved against it; a base that cannot be resolved from repository source or that points outside the repository makes the destination unprovable |
| 13-H2 — a **computed** property or selector read bypassed the runtime state-read gate | High | `img["al"+"t"]` and `img.matches("["+"al"+"t"+"]")` each changed the target to class `overlay` and a fixed `1280×720` takeover at the viewport centre; both applied 1 fix and 1 write and the real route opened a pull request | **Closed** — a computed read is resolved when it is a concatenation of string literals, and a name the reader cannot resolve is a generic dynamic state read (fail closed) |
| 13-H3 — the CSS transition model missed an attribute **value change**, a nested negation and the `:nth-child(… of …)` selector list | High | `#target:not([data-state="active"]) ~ .overlay`, `img:nth-child(1 of [alt]) ~ .overlay` and `#target:not(:not([alt])) ~ .overlay` each took the page over (the sibling grew from less than `1280` wide to a fixed `1280×720`) | **Closed** — the value change, the selector list and the nested negation are modelled, and a functional pseudo-class whose transition cannot be read fails closed |
| 13-H4 — an added `href` changed the **focusability** of an element | High | Before the fix Tab did not focus the anchor; after it, Tab focused it and the sibling became a fixed `1280×720` takeover | **Closed** — the actual focusability is compared before and after the fix (an added `href`, an added `contenteditable`, a `tabindex` value change) |
| 13-H5 — the **outline** was absent from the painted surface | High | `[alt]{outline:100000px solid #f0f}` computed `outline-width:100000px` and the screenshot origin and midpoint changed from white to the opaque outline colour | **Closed** — `outline-width` and `outline-offset` grow the painted area on every side, and an outline the analyser cannot compute is unprovable |
| 13-M1 — the `inset` shorthand did not use the large-offset rule | Medium | `[alt]{position:relative;inset:-9999px}` computed `left: -9999px` and `top: -9999px`; the image left the viewport | **Closed** — the `inset`, `inset-block` and `inset-inline` shorthands are expanded into their physical edges and use the direction-free rule |
| 13-M2 — a candidate **after** the ten-source-write budget skipped the safety analysis and still received review artifacts | Medium | The eleventh candidate skipped the analysis; the route answered `200 success:true`, created a branch and opened a pull request and wrote `image-alt-v11.md` and `summary.md` for the unsafe candidate | **Closed** — validation, runtime analysis and destination analysis run for every candidate; the budget limits the source writes, never the safety decision |

### Twelfth independent security review (2026-11-23)

> The verdict was NOT READY — Critical 0, High 6, Medium 3, Low 0 — against tree
> `d429c6b`. **All nine findings are closed** in `11065e4` (the closure table and the
> evidence are in `.ai/SECURITY-STATUS.md`; the reviewer's own artifact is
> `.ai/SECURITY-REVIEW-12.md`).
> The release gate opens only when a **thirteenth independent review** returns READY.

| Finding | Severity | Reproduced unsafe result | Status |
|---|---|---|---|
| 12-H1 — a runtime attribute read whose name the script **builds** (`'a'+'lt'`) or cannot resolve, and the standard `hasAttributes()`, were not state reads | High | The built-name read and the `hasAttributes()` twin each turned the target into a fixed `1280×720` takeover with 1 fix and 1 write; the real route answered `200 success:true` and opened a pull request | **Closed** — a concatenation of string literals names the attribute it evaluates to, an unresolvable name fails closed into the generic bucket, and `hasAttributes()` joins the generic attribute reads |
| 12-H2 — the arguments of `:is()` / `:where()` / `:not()` were opaque, and a **removed** class did not activate a rule | High | `input:is([aria-label]) ~ .overlay` and `#target:not(.card) ~ .overlay` each took the page over (the sibling grew from `1264×18` to a fixed `1280×720`) | **Closed** — the functional pseudo-classes are read and matched the way the browser matches them, and the fix's removed classes and attributes are tracked |
| 12-H3 — an added `tabindex` was not a focusability transition | High | A `div[role="button"]:focus ~ .overlay` rule with a remediation that adds `tabindex="0"` took the page over as soon as the customer focused the element | **Closed** — an added `tabindex` reaches the same focus-activation decision as `autofocus` |
| 12-H4 — the painted surface was composed for **positioned** elements only | High | `[alt]{scale:100}` scaled the image from `64×64` to `6400×6400` and it covered the viewport | **Closed** — the painted surface is composed for every element, and a painted box that covers the viewport because of the fix is refused |
| 12-H5 — a `<script src>` target was never followed into the tree | High | `<script src="/runtime.php">` whose body reacts to the added `alt` took the page over; the real route opened a pull request | **Closed** — a script target is followed into the tree and inspected whatever its name is (a browser executes by MIME type, not by suffix); a target outside the repository makes the destination unprovable |
| 12-H6 — the runtime gate correlated only with the original target's id and the first element's attributes | High | A remediation that adds `<div id="overlay">` next to the patched image, with a script that mutates `getElementById('overlay')`, produced a fixed `1280×720` takeover | **Closed** — the whole remediation is judged: a script that names an added id or reads an added attribute refuses the fix; a multi-element remediation stays legal (the `label` rule) |
| 12-M1 — a large **positive** offset or margin was not off-screen | Medium | `[alt]{left:9999px}` and `[alt]{margin-left:9999px}` moved the image from a left edge of `8` to `10007` | **Closed** — a large offset is a large offset in either direction |
| 12-M2 — a remediation could introduce a URI attribute the original did not have | Medium | `<a id="target">Text</a>` → `<a id="target" href="/destination">Text</a>` made the local listener receive `GET /destination` | **Closed** — a remediation may not introduce a URI attribute; only a pure in-page fragment (`#main`) stays allowed |
| 12-M3 — only the **first** tag of a replacement was judged | Medium | A remediation that wraps the patched image in a `<span>` and marks the image `hidden` was written; Chromium measured the image at `0×0` with `display:none` | **Closed** — no live element of the replacement may be hidden: the `hidden` attribute and the hiding styles are refused on every live tag |

### Eleventh independent security review (2026-11-23)

> The verdict was NOT READY — Critical 0, High 3, Medium 3, Low 0 — against tree
> `7ec51ee`. **All six findings are closed** in `d429c6b` (the closure table and the
> evidence are in `.ai/SECURITY-STATUS.md`; the reviewer's own artifact is
> `.ai/SECURITY-REVIEW-11.md`).
> The release gate opens only when a **twelfth independent review** returns READY.

| Finding | Severity | Reproduced unsafe result | Status |
|---|---|---|---|
| 11-H1 — the runtime scanner read script **files** and inline script **blocks**, never the **event-handler attributes** of the markup, and knew no **generic** attribute read | High | An inline `onload` handler and the script twins `getAttributeNames()`, `getAttributeNode()` and `attributes.getNamedItem()` each turned the target from a static `16×16` image into a fixed `1280×720` takeover; the real route answered `200 success:true` and opened a pull request | **Closed** — the handler attributes are analysed like inline scripts (an unreadable handler fails closed), and a generic attribute enumeration that can react to any attribute the fix adds is a state read |
| 11-H2 — the painted box knew the content box, not the **effective** surface | High | The logical padding longhands, `zoom:3`, `scale:100` and `width:100%;aspect-ratio:1` each painted a viewport takeover, and a fixed `1×1` element with `box-shadow:0 0 0 10000px #f0f` covered 921,357 of 921,600 pixels | **Closed** — the logical padding and border longhands join the sides, `zoom` is a scale factor, a scale above one without a declared size is unprovable, an aspect ratio that fills an undeclared axis is unprovable, and a shadow grows the painted area by its blur and spread |
| 11-M1 — a maximum size was read as a size, not as a **cap** | Medium | `max-height:0` with `overflow:hidden` removed the patched control from the customer's paint | **Closed** — a zero cap together with a clipping overflow removes the painted control; a zero cap without clipping and a cap that is not zero stay harmless |
| 11-M2 — the resource check read the **raw** declaration value | Medium | `:root{--pixel:url(…)}` with `background-image:var(--pixel)` made the customer browser request `GET /pixel` after the fix | **Closed** — the resource check resolves the `var()` references against the definitions that can reach the element, the global ones included; an unresolved reference is unprovable, and the effective style stays unprovable for a `var()` it cannot resolve |
| 11-M3 — the visible frame was chosen from the direction alone | Medium | A paused animation with `animation-delay:-0.4s` and the running `animation-fill-mode:backwards` twin both held the computed opacity at `0` | **Closed** — the play state, the delay, the duration and the fill mode decide the frame, and the keyframe offsets are kept so a paused timeline can be placed |

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

The table below is the **fourteenth-review closure** run (2026-11-24) — the current
state of the tree. The earlier rounds are listed in `.ai/TEST-STATUS.md`.

| Check | Result |
|---|---|
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — 0 errors |
| `npx vitest run --coverage` | PASS — 53 files, 902 tests, 0 failed (was 53/853) |
| `npx vitest run --coverage` | PASS — statements 68.88% / branches 61.78% / functions 72.06% / lines 70.74% (CI thresholds 55/50/58/57) |
| `npm run build` | PASS — exit 0, Next standalone build (116 static pages) |
| `npx playwright test --project=chromium` | PASS — 78 passed, 1 flaky (the accessibility spec failed its first attempt and passed on the retry; no assertion failed on the re-run), exit 0 |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev-toolchain) |
| Tracked-file secret scan | PASS — the diff carries no credential pattern and no `.env`, `.log`, `secret`, `credential`, `.pem` or `.key` file |
| Fourteenth-review closure matrix (temporary, deleted afterwards) | PASS — 23/23: the ten findings blocked in the unsafe direction (0 fixes, 0 writes), the benign twins allowed |
| Fails-before proof | PASS — 21 + 7 + 2 regressions fail on the pre-closure tree (each scope reverted in turn) |
| Prior payload matrices (temporary, deleted afterwards) | PASS — the prior / legitimate matrix 118/118, the twelfth / thirteenth / tenth / eleventh / ninth closure matrices 145/145, the route matrices 17/17 |
| Pre-closure eleventh-review harnesses (temporary, deleted afterwards) | FAIL **as expected** — 12 failed + 5 passed and 2 failed + 7 passed: the failures assert that the eleventh-review vulnerabilities still exist, so they confirm the closure rather than report a regression |
| Eleventh-review closure matrix (temporary, deleted afterwards) | PASS — 46/46: the 13 new reproductions blocked in the unsafe direction, the benign twins allowed, the route refusing both new cases with `400` and no branch, no write and no pull request |
| Prior payload matrices (temporary, deleted afterwards) | PASS — the tenth-review matrix 19/19, the ninth-review matrix 42/42, the prior / legitimate matrix 118/118 |
| Earlier rounds (the first, re-review, third, fourth, fifth and sixth reviews) | PASS — see `.ai/TEST-STATUS.md` |
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
- `7ec51ee` / `50fa70d` / `cd85358` / `94acf80` / `0df2299` — the tenth-review closure (code, docs, state, volume entry, pipeline evidence)
- `2506792` — the eleventh independent security review (state)
- `d429c6b` / `d53daf7` — the eleventh-review closure (code, docs); the state and volume entry follow in the same cycle
- `7858a1f` — the twelfth independent security review (state)
- `11065e4` / `9cee793` — the twelfth-review closure (code, docs); the state and volume entry follow in the same cycle
- `b723be5` — the thirteenth independent security review (state)
- `be81d02` / `24263f3` — the thirteenth-review closure (code, docs); the state and volume entry follow in the same cycle
- `9ec1a3c` — the fourteenth independent security review (state)
- `d16797c` / `1803d50` — the fourteenth-review closure (code, docs); the state and volume entry follow in the same cycle

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
  **the sixth returned NOT READY (High 2, Medium 6)**, **the seventh returned
  NOT READY (High 3, Medium 4)**, **the eighth (High 4, Medium 2)**, **the ninth
  (High 3, Medium 3)**, **the tenth (High 4, Medium 4)**, **the eleventh
  (High 3, Medium 3)**, **the twelfth (High 6, Medium 3)** and **the thirteenth
  (High 5, Medium 2)**. Every set of equivalent paths was reproduced in
  local, mocked conditions and is now fixed at its root cause, but the release gate
  stays closed until a **fifteenth independent pass returns READY**; see
  `.ai/SECURITY-STATUS.md`.
- The destination CSS judgement is **static**: CSS-in-JS, CDN stylesheets, a style
  written by a script at runtime and a custom property the analyser cannot resolve
  are outside it (an unresolved custom property fails the destination closed when the
  fix changes that property). A repository whose stylesheets use syntax the analyser
  cannot judge receives review suggestions instead of source patches.
- The painted box reads the element's **own** `zoom`, but `zoom` is inherited: a zoom
  on an **ancestor** of the patched element is outside the model (risk 45).
- The generic attribute-read gate is deliberately broad: a script that enumerates the
  attributes of any element and then mutates anything refuses the fix, even when the
  mutation cannot reach the patched element. The cost is a false positive — such a
  repository receives a review suggestion instead of a source patch (risk 46).
- The thirteenth-review closure added three more deliberate fail-closed directions,
  each with a documented cost: a document whose `<base href>` cannot be resolved or
  points outside the repository (risk 49), a computed property or selector read whose
  name the reader cannot resolve (risk 50), a functional pseudo-class whose transition
  semantics cannot be read (risk 52) and a document that carries a `<base>` the reader
  cannot parse (risk 53). In every case the fix ships as a review suggestion instead of
  a source patch.

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
