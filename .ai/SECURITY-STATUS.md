# AccessGuard — Security Status

Last verification: 2026-11-26

## Current HEAD verification

| Check | Result |
|---|---|
| Reviewed tree | `a02ba63` was the reviewed base (identical to `origin/main`); the seventeenth-review closure is committed on top of it — the fix `5e30641`, the docs `4f0a69f` |
| Source-only typecheck | PASS — exit 0 |
| Lint | PASS — exit 0, 0 errors |
| Unit / integration suite | PASS — 53 files, 987/987 tests (15 new seventeenth-review regressions) |
| Coverage | PASS — 70.4 / 63.12 / 73.41 / 72.53 against 55 / 50 / 58 / 57 |
| Production build | PASS — exit 0, 116 static pages |
| Browser E2E | PASS with one retry — 78 passed, 1 flaky, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0 / High 0 (15 moderate advisories) |
| CI security gates | PASS — CI and Docker workflows succeeded on `a02ba63`; the AccessGuard Scan workflow succeeded |
| Production deployment | NOT CLAIMED — the Vercel build/deploy steps were skipped because the credentials are absent |
| Strix autonomous pentest | **NOT RUN** — no provider credit or usable model is available, so no Strix evidence is claimed for this cycle |
| Seventeenth independent review | **NOT READY — Critical 0, High 1, Medium 1** (`.ai/SECURITY-REVIEW-17.md`); both root causes are closed in the working tree |
| Eighteenth independent review | **PENDING** — the release gate opens only when it returns READY (Critical 0, High 0) |

## Seventeenth independent security review (2026-11-26) — closure in the working tree

**Verdict: NOT READY — Critical 0, High 1, Medium 1, Low 0.** The READY gate requires
Critical 0 and High 0. The reviewer's own artifact is `.ai/SECURITY-REVIEW-17.md`
(report only — it changed no shipped source, test, dependency, CI, environment or
existing `.ai/` file). Every reproduction used local synthetic repositories, a mocked
GitHub transport, local Chromium and listeners bound to `127.0.0.1`; no production,
public, third-party or live-GitHub target was touched, and **no Strix result is
claimed**. The reviewer re-ran the sixteen sixteenth-review payloads in the unsafe
direction: **16/16 refused with 0 fixes and 0 writes**, and the benign twins stayed
writable.

| ID | Severity | Surface | Reproduced unsafe result | Root cause | Closure |
|---|---|---|---|---|---|
| 17-H1 | **High** | The mutation vocabulary of the repository runtime reader | Six equivalent spellings — `setAttributeNS(null,'class')`, `element.style =`, `className +=`, `attributes.<name>.value =`, `outerHTML =` and `Object.assign(element.style, …)` — were invisible to the reader, so a conditional-takeover script was judged harmless: 1 fix, 1 write, and Chromium measured a `1280×720` fixed takeover (`z-index: 2147483647`). The real create-PR route wrote `index.html` and opened a pull request | `RUNTIME_MUTATION_PATTERN` was a closed list of five spellings; `inspectRuntimeScript()` only entered its analysis block when that pattern matched, so a script that mutated through any other spelling never reached the conditional-mutation gate | **CLOSED** — `runtimeMutations()` in `src/lib/github.ts` reads the DOM mutations through the shared member-chain reader (`METHOD_CALL_PATTERN` + `calleeMembers()`): the attribute methods, the class list, the inline style, the attribute node, the markup and the object assignment. `writtenAttributeName()` resolves the written attribute once and is shared with the document-base reader, so `setAttributeNS` has one implementation. A method name or a written name the analyser cannot read fails closed like a generic state read. Regressions `17-H1a`–`17-H1k` |
| 17-M1 | **Medium** | The `@font-face` descriptor reader | A face that declares its family twice vanished from the family table, the activated family resolved to "no face", and the customer-side `GET /evil-font` was judged harmless and written | `collectFontFace()` read the family with `declarations.find(...)` (the **first** declaration) while it read the source with the **last** one; the browser keeps the last descriptor of a face | **CLOSED** — `collectFontFace()` applies the CSS declaration order to every descriptor of a face, and `CssContext.fontFacesComplete` records whether the family table could be read completely: a family with no readable face is `unknown` rather than `absent`, so the activated-rule resource check fails closed. Regressions `17-M1a`–`17-M1d` |

The fails-before proof: with the two source fixes reverted and the new regressions
kept, **10 of the 15 new tests fail** (the six harmful spellings, the dynamic
mutation form, the computed method name, the unreadable method name and the
duplicate font family) and the five benign-boundary tests pass; with the fixes
restored all 15 pass.

## Sixteenth independent security review (2026-11-24) — closure shipped

**Verdict: NOT READY — Critical 0, High 7, Medium 4, Low 0.** The READY gate
requires Critical 0 and High 0. This tree was **not releasable** until every High
reproduction is blocked in the unsafe direction, permanent regressions cover the
root causes, and a fresh independent review returns READY. All eleven findings
are now closed at their root cause; the release gate opens only when a
**seventeenth independent review** returns READY against the sixteenth-review
closure tree.

The reviewed closure tree was `b4bd811` (`vol: security — V23: close the
fifteenth review's runtime, CSS and validation findings`), against the requested
baseline `08ab9ef`; the checkout at report time was `9ae2a3a`
(`git diff --quiet b4bd811..HEAD -- src` is exit 0, so the reviewed source is the
closure tree itself). The reviewer's own artifact is `.ai/SECURITY-REVIEW-16.md`
(report only — no shipped source, test, dependency, CI, environment or existing
`.ai/` file was changed by the reviewer). Every reproduction used local synthetic
repositories, a mocked GitHub transport, local Chromium and listeners bound to
`127.0.0.1`. No production, third-party or public target was scanned, no live
repository was mutated, no external GitHub Markdown service was called, and **no
Strix result is claimed**.

The literal fourth- through fifteenth-review payloads stay closed: the reviewer
re-ran them in the unsafe direction and got **118/118** recovered prior
assertions, **192/192** writer closure assertions and **24/24** route assertions
passing, plus the two pre-closure harnesses failing exactly as expected. The
eleven findings below are **newly found equivalent paths**.

### Reproduced findings

| ID | Severity | Surface | Reproduced unsafe result | Root cause | Closure |
|---|---|---|---|---|---|
| 16-H1 | **High** | Chained / optional computed dataset receivers | `img['dataset']['state']` and `img.dataset?.state` each changed the target to class `overlay` and a fixed `1280×720` takeover at the viewport centre; both applied 1 fix, wrote 1 file and the real route opened a pull request | `computedPropertyReads()` keeps only one computed member of a chain, so `img['dataset']['state']` is not understood as a read of `data-state`, and the reflected-property regex requires the literal dot form `dataset.state`, so `img.dataset?.state` is missed too | **CLOSED** — `calleeMembers()` in `src/lib/github.ts` parses a member chain (dot, optional dot, computed and optional computed members) and `datasetKeyReads()` maps the key behind a `dataset` member to its `data-*` attribute; an unresolvable chain or key fails closed as a generic state read. Regressions `16-H1a`–`16-H1e` |
| 16-H2 | **High** | Computed / optional `Reflect` calls | `Reflect['get'](img,'alt')`, `Reflect?.get(img,'alt')` and `Reflect.get?.(img,'alt')` each changed the target to class `overlay` and a fixed `1280×720` takeover; all three applied 1 fix and wrote 1 file | `RUNTIME_STATE_READ_PATTERN` and `REFLECT_PROPERTY_READ_PATTERN` require the literal `Reflect.` member syntax, so `reflectPropertyReads()` cannot normalize a computed, an optional or an optional-call form | **CLOSED** — `reflectPropertyReads()` normalizes the dot, computed and optional `Reflect.get` / `Reflect.getOwnPropertyDescriptor` forms through the shared member-chain parser and resolves the receiver and the property; an unresolved receiver or property fails closed. Regressions `16-H2a`–`16-H2d` |
| 16-H3 | **High** | An optional member inside a callee chain | `Element.prototype.getAttribute?.call(img,'alt')` and `Element.prototype['getAttribute']?.call(img,'alt')` each changed the target to class `overlay` and a fixed `1280×720` takeover; both applied 1 fix and wrote 1 file | `METHOD_CALL_PATTERN` permits an optional call only immediately before the final `(` and `calleeMembers()` has no optional-member state, so the method in `getAttribute?.call(...)` is never identified | **CLOSED** — `METHOD_CALL_PATTERN` and `calleeMembers()` parse the optional and computed members in the middle of a callee chain (`Element.prototype.getAttribute?.call(...)`, `Element.prototype['getAttribute']?.call(...)`) and keep the attribute-read receiver and argument; an unresolvable method or attribute name fails closed. Regressions `16-H3a`–`16-H3c` |
| 16-H4 | **High** | A concatenated introduced id | `document.getElementById('act'+'ivated')` reached the element the fix introduced: a fixed `1280×720` takeover, one fix, one write and a pull request. The sibling spelling `document.querySelector('#'+'activated')` was accepted the same way | `scriptRefersToElementId()` compares the introduced id only with a literal quoted `getElementById(...)` argument or a literal selector; the existing `resolveStringExpression()` is not used there | **CLOSED** — `elementIdReads()` and `selectionSelectorReads()` resolve the id argument and the selector through the existing `resolveStringExpression()` before `scriptRefersToElementId()` compares them; an id expression the reader cannot resolve fails closed for the introduced-id check only, and the original-element literal check is unchanged. Regressions `16-H4a`–`16-H4c` |
| 16-H5 | **High** | A literal runtime tag selector reaching an introduced element | `document.querySelector('span')` reached the `<span data-state="active">` the remediation introduced: Chromium showed it at `1280×720` with the overlay class; one fix, one write and a pull request | the runtime checks identify the original target by id, introduced elements by literal id and introduced attributes by attribute read; an introduced element's **tag** is never compared with a literal runtime selector | **CLOSED** — `introducedElements()` (in `src/lib/css-context.ts`) pairs the patched target with the original and returns the elements the remediation introduces, and `scriptSelectsIntroducedElement()` compares the tag, id, class and attribute names of every introduced element with the compound of a literal runtime selector; only a selector that can name an introduced element refuses the patch. Regressions `16-H5a`–`16-H5b` |
| 16-H6 | **High** | Alternate base-`href` mutation APIs | `document.querySelector('base').setAttributeNS(null,'href','/sub/')` and `document.getElementById('base').attributes.href.value='/sub/'` each made the writer analyse a stylesheet the browser never loaded (`/sub/theme.bin` was requested) and left the repaired target fixed at `1280×720` | `SET_ATTRIBUTE_PATTERN` recognises `setAttribute(...)` but not `setAttributeNS(...)`, and neither pattern models an `Attr.value` assignment | **CLOSED** — `SET_ATTRIBUTE_NS_PATTERN` (the attribute name is the second argument) and `ATTRIBUTE_VALUE_ASSIGNMENT_PATTERN` (an `Attr.value` write) are modelled as base mutations next to `setAttribute(...)` and the `href` property assignment; a resolvable base mutation makes the document base unprovable. Regressions `16-H6a`–`16-H6c` |
| 16-H7 | **High** | A runtime-created base | `const b=document.createElement('base');b.href='/sub/';document.head.appendChild(b)` in a document **without** a static `<base>` made the writer analyse a stylesheet the browser never loaded (`/sub/theme.bin` was requested) and left the repaired target fixed at `1280×720` | the runtime base-mutation pass starts with `if (!info?.hasBase) continue;`, so a document without a static base is never inspected for a base the runtime creates later | **CLOSED** — `scriptCreatesBase()` detects a runtime-created base and the runtime-base pass runs for it; in that mode `receiverMayBeBase()` no longer counts an unresolved receiver as the base, so only the variable that holds the created base is read as the base. A document with no base and no runtime base creation stays writable. Regressions `16-H7a`–`16-H7b` |
| 16-M1 | Medium | `color-mix()` transparency | `[aria-label]{color:color-mix(in srgb,rgb(0 0 0 / 0),rgb(0 0 0 / 0))}` made the repaired button's computed colour `color(srgb 0 0 0 / 0)`: the visible text became transparent although axe still found the accessible name | `isTransparentColor()` accepts only the function names in `COLOR_FUNCTIONS`; `color-mix(...)` is not parsed as a nested colour expression | **CLOSED** — `colorAlpha()` reads the alpha of a colour and `colorMixAlpha()` computes the weighted alpha of a `color-mix()` (both omitted weights split the mix evenly, one omitted weight takes the rest, two given weights have to add up to 100 %); a colour function whose alpha cannot be read fails closed, except a value that carries `var(`. The reader is shared with the remediation validator. Regressions `16-M1a`–`16-M1c` (CSS) and `16-M1c` (validator) |
| 16-M2 | Medium | An activated `font` shorthand | `@font-face{font-family:Evil;src:url(/font)}` with an activated `font:16px Evil` issued `GET /font` in the customer browser | the activated-resource loop connects a declaration to an `@font-face` only when `declaration.property === 'font-family'`; the `font` shorthand also selects the family | **CLOSED** — `fontShorthandFamily()` parses the family component of the shorthand after its size component and `activatedFontFamily()` resolves it through the same `fontFamilyResourceState()` path the `font-family` longhand uses; a shorthand without a family of its own and a CSS-wide keyword name no family and stay harmless. Regressions `16-M2a`–`16-M2d` |
| 16-M3 | Medium | The wrong duplicate `@font-face src` declaration | `@font-face{font-family:Evil;src:local("Arial");src:url(/font2)}` issued `GET /font2` — the browser used the later URL declaration while the analyser treated the first `local(...)` declaration as the only source | `collectFontFace()` uses `declarations.find(...)` for `src`, so it retains the **first** duplicate declaration; CSS declaration order makes the later one win | **CLOSED** — `collectFontFace()` keeps the **last** `src` declaration of the face, which is the one the browser uses; an unresolved effective source fails closed. Regression `16-M3a` |
| 16-M4 | Medium | An `:enabled` transition | `button:enabled{background-image:url(/pixel-enabled)}` issued `GET /pixel-enabled` after the fix removed `disabled` from the button | `parseSubject()` treats an unknown simple pseudo-class as `opaqueConditional` and does not model its state transition; `compoundActivatedByFix()` models no control-state transition | **CLOSED** — `parseSubject()` models `:enabled` / `:disabled` as a `controlState` requirement, `changesBetween()` reports the `enabledActivated` / `disabledActivated` transition and `compoundActivatedByFix()` wires it into the activation decision; `:hover` and `:focus-within` stay harmless, because they are user-interaction states the fix does not create. Regressions `16-M4a`–`16-M4b` |

### Reviewer's gate suite

| Check | Result |
|---|---|
| Recovered fourth- through fifteenth-review payloads | PASS — the prior / legitimate matrix 118/118, the writer closure matrices 192/192 across seven files, the route matrices 24 passed with the 2 intentional pre-closure failures, plus the two pre-closure harnesses failing exactly as expected (12 failed + 5 passed, 2 failed + 7 passed) |
| New equivalent-path writer / Chromium harness | PASS — every harmful variant of the eleven findings was writable, with a Chromium geometry / computed-style / accessibility-tree / `127.0.0.1` observable |
| New equivalent-path route harness | PASS — the representative cases returned `200 success:true`, applied one source fix, wrote three files, opened the pull request and recorded both audit events |
| Legitimate-behaviour harness | PASS — 35 listed behaviours stayed writable or harmless |
| Reviewer's gate suite | PASS — source-only typecheck 0, lint 0, vitest 53 files / 939/939, coverage 69.89/62.75/72.93/71.78, build 0, Playwright 79 (78 passed, 1 flaky, 0 failed), `npm audit` Critical 0 / High 0 (15 moderate) |
| Tracked-file secret scan | PASS — 786 tracked files; one AWS-key-shaped **documentation placeholder** (path and category only, value never printed) and no live credential |

### Gate status

The sixth through sixteenth review closures are shipped; the sixteenth review
returned **NOT READY** (High 7, Medium 4) and **all eleven of its findings are
now closed at their root cause** in the sixteenth-review closure tree. The
**release gate is still closed**: it opens only when a **seventeenth independent
review** returns READY (Critical 0, High 0) against the sixteenth-review closure
tree.

### Sixteenth-review closure evidence

| Check | Result |
|---|---|
| Sixteenth-review closure | PASS — all eleven findings (16-H1…16-H7, 16-M1…16-M4) closed at their root cause in `src/lib/github.ts`, `src/lib/css-context.ts` and `src/lib/github-pr.ts` |
| Permanent regressions | PASS — 32 new tests (21 in `github.test.ts`, 10 in `css-context.test.ts`, 1 in `github-pr.test.ts`); the pre-closure tree fails 14 harmful Scope A cases and 7 harmful Scope B cases, and every benign twin passes before and after |
| Sixteenth-review closure matrix (temporary) | PASS — 42/42: every finding is blocked in the unsafe direction (0 fixes, 0 writes) and every benign twin stays writable. The file was deleted after the run |
| Gap found by the closure matrix | FIXED — the optional **computed** member `img['dataset']?.['state']` was still open; the shared member pattern now covers the optional computed access, and the permanent regressions `16-H1d` and `16-H1e` lock it down |
| Prior payload matrices (recovered) | PASS — the prior / legitimate matrix 118/118 (run with `tsx`), the combined writer closure run 192/192 across seven files and the route run 24 passed with the 2 intentional pre-closure failures |
| Pre-closure eleventh-review harnesses (recovered) | FAIL **as expected** — 12 failed + 5 passed and 2 failed + 7 passed: the failures assert that the eleventh-review vulnerabilities still exist, so they confirm the closure rather than report a regression |
| `npx vitest run --coverage` | PASS — 53 files, 972/972 tests (was 53/939) |
| Coverage | PASS — statements 70.3% (threshold 55) · branches 63.09% (50) · functions 73.36% (58) · lines 72.38% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 tests, 78 passed, 1 flaky, 0 failed |
| `npm audit --audit-level=high` | PASS — exit 0, Critical 0 / High 0 (15 moderate toolchain advisories); `npm audit --omit=dev --audit-level=high` exits 0 with 5 moderate advisories |
| Strix autonomous pentest | **NOT RUN** — every configured provider refuses the run (quota / EOL model / no credits); no Strix result is claimed for this cycle |
| Release gate | CLOSED — opens only when a **seventeenth** independent review returns READY (Critical 0, High 0) |

## Fifteenth independent security review (2026-11-24) — closure shipped

**Verdict: NOT READY — Critical 0, High 4, Medium 5, Low 0.** The READY gate
requires Critical 0 and High 0. This tree was **not releasable** until every High
reproduction is blocked in the unsafe direction, permanent regressions cover the
root causes, and a fresh independent review returns READY. All nine findings are
now closed at their root cause; the release gate opens only when a **sixteenth
independent review** returns READY against the fifteenth-review closure tree.

The reviewed closure tree was `d16797c` (`vol: security — V23: close the
fourteenth review's runtime, stylesheet, validation and verification findings`),
against the requested baseline `08ab9ef`; the checkout at report time was
`2da3e00` (`git diff --quiet d16797c..HEAD -- src` is exit 0, so the reviewed
source is the closure tree itself). The reviewer's own artifact is
`.ai/SECURITY-REVIEW-15.md` (report only — no shipped source, test, dependency,
CI, environment or existing `.ai/` file was changed by the reviewer). Every
reproduction used local synthetic repositories, a mocked GitHub transport, local
Chromium and listeners bound to `127.0.0.1`. No production, third-party or public
target was scanned, no live repository was mutated, no external GitHub Markdown
service was called, and **no Strix result is claimed**.

The literal fourth- through fourteenth-review payloads stay closed: the reviewer
re-ran them in the unsafe direction and got **185/185** recovered assertions
passing plus the two pre-closure harnesses failing exactly as expected. The nine
findings below are **newly found equivalent paths**.

### Reproduced findings

| ID | Severity | Surface | Reproduced unsafe result | Root cause | Closure |
|---|---|---|---|---|---|
| 15-H1 | **High** | Alternate attribute-read call syntaxes | `Element.prototype.getAttribute.call(img,'alt')`, `img.getAttribute?.('alt')` and `img['get'+'Attribute']('alt')` each changed the target to class `overlay` and a fixed `1280×720` takeover at the viewport centre; all three applied 1 fix, wrote 1 file and the real route opened a pull request | `RUNTIME_STATE_READ_PATTERN` and `ATTRIBUTE_NAME_READ_PATTERN` require the literal method name to be followed directly by `(`, so a prototype receiver with `.call`, an optional call and a computed method name are not recognised as state reads | **CLOSED** — `attributeReadCalls()` in `src/lib/github.ts` recognises every statically resolvable attribute-read call form (direct, optional, prototype `.call`/`.apply` and a computed method name) and resolves the attribute argument; a method or attribute name the reader cannot resolve fails closed as a generic state read. Regressions `15-H1a`–`15-H1e` |
| 15-H2 | **High** | Reflected `data-*` attribute reads | `img.dataset['state']` and `Reflect.get(img.dataset,'state')` each changed the target to class `overlay` and a fixed `1280×720` takeover; both applied 1 fix, wrote 1 file and the real route opened a pull request | `attributePropertyAliases()` knows only the literal dot form `dataset.state`; the bracket form is not matched and `Reflect.get` on a `dataset` receiver is not mapped to the `data-*` attribute | **CLOSED** — `attributeOfDatasetKey()` and `scriptReadsDatasetAttribute()` map a dataset key to its `data-*` attribute for the bracket access and for the `Reflect.get` / `getOwnPropertyDescriptor` forms on a `dataset` receiver; an unresolved dataset key fails closed. Regressions `15-H2a`–`15-H2c` |
| 15-H3 | **High** | An id introduced on the patched target | a remediation that added `id="activated"` to the patched image let `document.getElementById('activated')` reach the target after the fix: a fixed `1280×720` takeover, one fix, one write and a pull request | the introduced ids are collected only from `patchedElements.slice(1)`, so a **new** id on the patched target is excluded, and the attribute-read checks do not model `getElementById(...)` as a read of the `id` attribute | **CLOSED** — the introduced ids are collected from **every** patched element, so a new or changed id on the patched target and on every introduced element is an introduced id, and runtime code that references it refuses the source patch. Regressions `15-H3a`–`15-H3c` |
| 15-H4 | **High** | Indexed collection receivers for the document base | `document.querySelectorAll('base')[0].href='/sub/'` and `document.getElementsByTagName('base')[0].href='/sub/'` each made the writer analyse a stylesheet the browser never loaded: the listener observed `/sub/theme.bin`, and the repaired target was fixed at `1280×720`; both applied 1 fix, wrote 1 file and the real route opened a pull request | the `href`-assignment receiver grammar has no indexed collection expression, and neither the expression resolver nor `receiverMayBeBase()` interprets the following `[0]` | **CLOSED** — `indexedReceiver()` resolves an indexed collection receiver and `receiverMayBeBase()` recurses into the collection, so a receiver that may contain the base makes the document base unprovable; an unresolved collection or index fails closed. Regressions `15-H4a`–`15-H4d` |
| 15-M1 | Medium | Modern slash-alpha transparency | `[aria-label]{color:rgba(0 0 0 / 0)}` made the repaired button's computed colour `rgba(0, 0, 0, 0)`: the visible text became transparent although axe still found the accessible name | `isTransparentColor()` splits only on commas and returns `false` for a slash-alpha colour before the modern grammar is evaluated | **CLOSED** — `isTransparentColor()` reads the legacy comma alpha and the modern slash alpha in one browser-equivalent colour grammar for `rgb`, `rgba`, `hsl`, `hsla`, `hwb`, `oklch`, `oklab`, `lab`, `lch` and `color()`. Regressions `15-M1a`–`15-M1d` |
| 15-M2 | Medium | Class removal through nested negation | `button:is(:not(.armed)){background-image:url(/pixel)}` issued `GET /pixel` after the fix removed `.armed` from the button | `positiveRequirementRemoved()` does not traverse a candidate's negated requirements, and the final negated check examines only the root requirements | **CLOSED** — `compoundActivatedByFix()` propagates a removed class and a changed attribute value through nested negation and through the `:is()` / `:where()` alternatives. Regressions `15-M2a`–`15-M2d` |
| 15-M3 | Medium | An `@font-face` resource | `@font-face{font-family:Evil;src:url(/font)}` with an activated `font-family:Evil` issued `GET /font` in the customer browser | `@font-face` is classified as a `VALUE_AT_RULE` and its body is discarded, so no family-to-resource relation exists | **CLOSED** — `collectFontFace()` collects the family and its `src` descriptors, and `fontFamilyResourceState()` resolves an activated `font-family` to its resource; an unreadable or unresolved family or resource fails closed. Regressions `15-M3a`–`15-M3d` |
| 15-M4 | Medium | Accessibility-tree hiding through browser semantics | `aria-hidden="&#116;rue"`, `role="&#112;resentation"`, an `aria-hidden="true"` **ancestor** and `inert` each removed the repaired image from the accessibility tree (absent, or role `none` with `ignored:true`); all four applied 1 fix, wrote 1 file and the real route opened a pull request | the raw attribute value is compared with the literal `true` / `presentation` / `none` (no browser entity decoding), the image-alt check inspects the target only (not its remediation ancestors) and has no `inert` branch | **CLOSED** — `browserValue()` decodes the value as the browser reads it, `hidesFromAccessibilityTree()` adds the `inert` branch, and `hiddenByAncestor()` inspects the remediation ancestors with browser-equivalent semantics. The harmless `role="presentation"` ancestor (Chromium keeps the image with role `image`) is **not** blanket-refused. Regressions `15-M4a`–`15-M4g` |
| 15-M5 | Medium | Removal of `autofocus` | a remediation that dropped `autofocus` from the button moved Chromium's `document.activeElement` from `BUTTON#target` to `BODY` | the focusability comparison rejects only a loss of keyboard focusability; it does not compare the presence of `autofocus` | **CLOSED** — `validateRemediation()` compares the presence of `autofocus` on the original and the patched target and refuses its removal. Regressions `15-M5a`–`15-M5c` |

### Reviewer's gate suite

| Check | Result |
|---|---|
| Recovered fourth- through fourteenth-review payloads | PASS — 185/185 recovered assertions across eight matrices and route harnesses, plus the two pre-closure harnesses failing exactly as expected (12 failed + 5 passed, 2 failed + 7 passed) |
| New equivalent-path writer / Chromium harness | 19 candidates — 17 writable, 2 controls correctly refused with 0 fixes and 0 writes, 16 harmful writable candidates with a Chromium geometry / computed-style / accessibility-tree / `127.0.0.1` observable |
| New equivalent-path route harness | 11/11 representative harmful cases passed — every case returned `200 success:true`, applied one source fix, created the branch and the pull request and wrote both audit events |
| New legitimate-behaviour harness | 29/29 passed |
| Reviewer's gate suite | PASS — source-only typecheck 0, lint 0, vitest 53 files / 902/902, coverage 68.88/61.78/72.06/70.74, build 0, Playwright 79 (77 passed, 2 flaky, 0 failed), `npm audit` Critical 0 / High 0 (15 moderate) |
| Tracked-file secret scan | PASS — 781 tracked files; one AWS-key-shaped **documentation placeholder** (path and category only, value never printed) and no live credential |

### Gate status

The sixth through fourteenth review closures are shipped (`d16797c`); the
fifteenth review returned **NOT READY** (High 4, Medium 5) and **all nine of its
findings are now closed at their root cause** in the fifteenth-review closure
tree. The **release gate is still closed**: it opens only when a **sixteenth
independent review** returns READY (Critical 0, High 0) against the
fifteenth-review closure tree.

### Fifteenth-review closure evidence

| Check | Result |
|---|---|
| Permanent regressions | PASS — 37 new tests: 17 in `github.test.ts` (`15-H1a`–`15-H1e`, `15-H2a`–`15-H2c`, `15-H3a`–`15-H3c`, `15-H4a`–`15-H4d`), 12 in `css-context.test.ts` (`15-M1a`–`15-M1d`, `15-M2a`–`15-M2d`, `15-M3a`–`15-M3d`), 7 in `fix-validation.test.ts` (`15-M4a`–`15-M4g`) and 3 in `github-pr.test.ts` (`15-M5a`–`15-M5c`) |
| Fails-before proof | PASS — the regressions fail on the pre-closure tree: 8 failures with `src/lib/github.ts` reverted, 6 with `src/lib/css-context.ts` reverted and 5 with `src/lib/fix-validation.ts` and `src/lib/github-pr.ts` reverted (19 failures in total); every benign twin passes before and after |
| Fifteenth-review closure matrix (temporary) | PASS — 24/24 with the closure (16 failures and 8 passed on the pre-closure tree): every finding is blocked in the unsafe direction (0 fixes, 0 writes) and every benign twin stays writable. The file was deleted after the run |
| Prior payload matrices (recovered) | PASS — the prior / legitimate matrix 118/118 (run with `tsx`) and the combined closure run 209/209 across nine files (the ninth 42, the tenth 19, the eleventh 37 + 9, the twelfth 26 + 8, the thirteenth 21, the fourteenth 23 and the fifteenth 24) |
| Pre-closure eleventh-review harnesses (recovered) | FAIL **as expected** — 12 failed + 5 passed and 2 failed + 7 passed: the failures assert that the eleventh-review vulnerabilities still exist, so they confirm the closure rather than report a regression |
| `npx vitest run --coverage` | PASS — 53 files, 939/939 tests (coverage 69.89 / 62.75 / 72.93 / 71.78 against the gates 55 / 50 / 58 / 57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 tests, 0 failed |
| `npm audit --audit-level=high` | PASS — exit 0, Critical 0 / High 0 (15 moderate toolchain advisories) |
| Tracked-file secret scan | PASS — 787 tracked files; one AWS-key-shaped **documentation placeholder** in `.openclaw/skills/document-generate/SKILL.md` (path and category only, value never printed) and no live credential |
| Strix autonomous pentest | **NOT RUN** — every configured provider refuses the run (quota / EOL model / no credits); no Strix result is claimed for this cycle |

## Fourteenth independent security review (2026-11-24) — closure shipped

**Verdict: NOT READY — Critical 0, High 4, Medium 6, Low 0.** The READY gate
requires Critical 0 and High 0. This tree is **not releasable** until every High
reproduction is blocked in the unsafe direction, permanent regressions cover the
root causes, and a fresh independent review returns READY.

The reviewed closure tree was `be81d02` (`vol: security — V23: close the
thirteenth review's runtime, geometry and budget findings`), against the
requested baseline `08ab9ef`; the checkout at report time was `f6db8f7`
(`git diff --quiet be81d02..HEAD -- src` is exit 0, so the reviewed source is the
closure tree itself). The reviewer's own artifact is `.ai/SECURITY-REVIEW-14.md`
(report only — no shipped source, test, dependency, CI, environment or existing
`.ai/` file was changed by the reviewer). Every reproduction used local synthetic
repositories, a mocked GitHub transport, local Chromium and listeners bound to
`127.0.0.1`. No production, third-party or public target was scanned, no live
repository was mutated, no external GitHub Markdown service was called, and **no
Strix result is claimed**.

The literal fourth- through thirteenth-review payloads stay closed: the reviewer
re-ran them in the unsafe direction and got **280/280** recovered assertions
passing plus the two pre-closure harnesses failing exactly as expected. The ten
findings below are **newly found equivalent paths**.

### Reproduced findings

| ID | Severity | Surface | Reproduced unsafe result | Root cause | Closure |
|---|---|---|---|---|---|
| 14-H1 | **High** | Computed runtime state read | `Reflect.get(img,'al'+'t')` changed the target to class `overlay` and a fixed `1280×720` takeover at the viewport centre; verified with confidence `1`, applied 1 fix, wrote 1 file, and the real route answered `200 success:true`, created a branch and opened a pull request | `COMPUTED_PROPERTY_READ_PATTERN` recognises the **bracket** notation only; `RUNTIME_STATE_READ_PATTERN` does not include `Reflect.get`, and `scriptReadsAttributeProperty()` recognises a dot property and a bracket property but not the `Reflect.get(object, propertyName)` API — so the runtime mutation is recorded but the conditional-mutation decision never sees a state read | **Closed** (`d16797c`) — `Reflect.get(object, propertyName)` is a computed property read whose property-name argument is resolved with the existing string-expression resolver; a name that cannot be resolved is a generic dynamic state read |
| 14-H2 | **High** | Stylesheet-link discovery | `<link rel="styles&#x68;eet" href="theme.bin">` and `<link title=">" rel="stylesheet" href="theme.bin">` each loaded the unreviewed `theme.bin` and turned the patched target into a fixed `1280×720` takeover; both verified with confidence `1`, applied 1 fix, wrote 1 file, and the real route opened a pull request | `extractStylesheetLinks()` uses `/<link\b([^>]*)>/gi`: it stops at the first `>` even inside a quoted attribute, and it compares the raw `rel` value without HTML-entity decoding — the browser uses the quoted-attribute and entity semantics of `html-attributes.ts` | **Closed** (`d16797c`) — the `<link>` tags are parsed with the browser-like quoted-attribute semantics, the entities of `rel` and `href` are decoded, and a stylesheet link whose attributes cannot be read makes the destination unprovable |
| 14-H3 | **High** | Runtime-mutated document base | `<base id="base">` whose `href` the repository script sets to `/sub/` before the `<link>` is parsed: the writer analysed the benign root `theme.bin` while Chromium loaded the unreviewed `sub/theme.bin`; verified with confidence `1`, applied 1 fix, wrote 1 file, and the real route opened a pull request | `resolveDocumentBase()` reads a **static** `href` attribute; the runtime scanner does not treat a base-element property assignment as a runtime mutation, so it keeps the document URL as the base | **Closed** (`d16797c`) — a repository runtime that assigns a `<base>` element's `href` makes the effective base unprovable; the destination is refused instead of falling back to the document URL |
| 14-H4 | **High** | Remediation-introduced structural change | A remediation that introduces `<span aria-hidden="true">x</span>` before the patched image made the image the second child, so `img:nth-child(2) ~ #overlay` turned the sibling into a fixed `1280×720` takeover; verified with confidence `1`, applied 1 fix, wrote 1 file, and the real route opened a pull request | the destination model compares the attributes and classes of the patched element but not the **DOM position** or the sibling relationships an introduced element creates, and `checkRenderedElement()` declares the **first** rendered element to be the patched target | **Closed** (`d16797c`) — a remediation that introduces an element makes a structural selector (`:nth-child()`, `:nth-last-child()`, sibling combinators) unprovable, and the verifier judges the patched target instead of the first rendered element |
| 14-M1 | Medium | Native semantics and keyboard focus | a native `<button>` replaced by a `<div>` and a `tabindex="0"` changed to `"-1"`: Tab focused the original button in both cases and focused neither repaired element; both verified with confidence `1`, applied 1 fix, wrote 1 file, and the real route opened a pull request | `validateFixForRule()` has no `button-name` branch, so the default branch accepts the replacement of a native button, and the focusability transition is only modelled in the **gain** direction | **Closed** (`d16797c`) — a remediation preserves the native interactive semantics of the element it patches and never removes its keyboard focusability |
| 14-M2 | Medium | Remediation-introduced CSS resource | `style="background-image:var(--pixel)"` with `:root{--pixel:url(/pixel)}` and `style="background-image:image-set('/pixel')"`: the after-fix `127.0.0.1` listener observed `GET /pixel` in both cases; both verified with confidence `1`, applied 1 fix, wrote 1 file, and the real route opened a pull request | `checkStyleAttribute()` rejects a literal `url(` but does not resolve `var()` references and does not recognise `image-set()`; the repository CSS analyser knows both, but its resource check is not applied to the remediation's own inline style | **Closed** (`d16797c`) — the remediation's own inline style is checked for a resource with the custom properties of the repository resolved, and a reference the analyser cannot resolve is unprovable |
| 14-M3 | Medium | CSS attribute-selector decoding | `img[alt="\]"] ~ #overlay{background-image:url(/pixel)}`: the after-fix `127.0.0.1` listener observed `GET /pixel`; verified with confidence `1`, applied 1 fix, wrote 1 file, and the real route opened a pull request | the attribute-selector branch of `parseSubject()` finds the end of a selector with `selector.indexOf(']', i)`, so a quoted CSS escape `\]` ends the selector early and the activated rule's resource is not analysed | **Closed** (`d16797c`) — the closing bracket of an attribute selector is read with browser-equivalent quote and escape handling, and a selector whose attribute syntax cannot be read is unprovable |
| 14-M4 | Medium | Link-state transition | `a:link{background-image:url(/pixel)}` with an added `href="#main"`: the after-fix `127.0.0.1` listener observed `GET /pixel`; verified with confidence `1`, applied 1 fix, wrote 1 file, and the real route opened a pull request | `parseSubject()` records `:link` as an opaque conditional state and `compoundActivatedByFix()` models no link-state transition, while the remediation changes the match state of `:link` | **Closed** (`d16797c`) — an added `href` activates the `:link` / `:any-link` rules through the same destination decision as the other fix-created states; `:hover` and `:focus-within` stay harmless |
| 14-M5 | Medium | Viewport-unit off-screen offset | `[alt]{position:relative;left:-99vw}` on a `64×64` image: the left edge moved from `8` to `-1259.1875` (computed `left: -1267.2px`), so the repaired image left the viewport | `isLargeOffset()` treats a viewport unit as off-screen only at `100` units or more and does not compose the offset with the element's declared size | **Closed** (`d16797c`) — a viewport-unit offset is composed with the element's declared size, so `99vw` on the exact `64×64` target is not harmless |
| 14-M6 | Medium | Accessibility-tree visibility | `aria-hidden="true"` added to the repaired image: Chromium's accessibility tree changed the target from role `image` to role `none` (`ignored: true`), so axe stopped reporting `image-alt` while the image left the accessibility tree | the `image-alt` branch of `validateFixForRule()` accepts `aria-hidden="true"` independently of the `alt` value because of the boolean structure of its decorative-image condition | **Closed** (`d16797c`) — the decorative exception requires an actually decorative original and replacement, so a remediation cannot hide the element it claims to repair |

### Re-run evidence of the fourteenth review

| Harness | Result |
|---|---|
| Recovered fourth- through thirteenth-review assertions | 280/280 passed (the prior/legitimate matrix 118/118, the ninth 42/42, the tenth 19/19, the eleventh 37/37 + 9/9, the twelfth 26/26 + 8/8, the thirteenth 21/21) |
| Pre-closure eleventh-review evidence and route harnesses | 12 failed + 5 passed and 2 failed + 7 passed — exactly as expected; the failures assert that the eleventh-review vulnerabilities still exist |
| New equivalent-path writer / verifier / Chromium harness | every final unsafe variant was observed with validation true, no destination refusal, verification confidence `1`, one fix and one mocked source write |
| New equivalent-path route harness | 13/13 passed across two temporary harnesses — every variant wrote `index.html`, created a branch and a pull request, and wrote the intent and the closing audit event |
| New legitimate-behaviour harness | 18/18 passed |
| Reviewer's gate suite | PASS — source-only typecheck 0, lint 0, vitest 53 files / 853/853, coverage 68.02/60.67/71.05/69.81, build 0, Playwright 79/79, `npm audit` Critical 0 / High 0 (15 moderate) |
| Tracked-file secret scan | PASS — 780 tracked files, 779 scanned; only `.env.example` is tracked in the `.env*` name family; one AWS-key-shaped **documentation example** (path and category only, value never printed) and no live credential |

### Gate status

The sixth through thirteenth review closures are shipped (`be81d02`); the
fourteenth review returned **NOT READY** (High 4, Medium 6) and all ten of its
findings are now closed in `d16797c` (the closure documentation is `1803d50`).
The **release gate is still closed**: it opens only when a **fifteenth
independent review** returns READY (Critical 0, High 0) against the
fourteenth-review closure tree.

## Thirteenth independent security review (2026-11-23) — closure shipped

**Verdict: NOT READY — Critical 0, High 5, Medium 2, Low 0.** The READY gate
requires Critical 0 and High 0. This tree is **not releasable** until every High
reproduction is blocked in the unsafe direction, permanent regressions cover the
root causes, and a fresh independent review returns READY.

The reviewed closure tree was `11065e4` (`vol: security — V23: close the twelfth
review's runtime, geometry and validator findings`), against the requested
baseline `08ab9ef`; the checkout at report time was `d2a7cda` (`git diff --quiet
11065e4..HEAD -- src` is exit 0, so the reviewed source is the closure tree
itself). The reviewer's own artifact is `.ai/SECURITY-REVIEW-13.md` (report only —
no shipped source, test, dependency, CI, environment or existing `.ai/` file was
changed by the reviewer). Every reproduction used local synthetic repositories, a
mocked GitHub transport, local Chromium and listeners bound to `127.0.0.1`. No
production, third-party or public target was scanned, no live repository was
mutated, no external GitHub Markdown service was called, and **no Strix result is
claimed**.

The literal fourth- through twelfth-review payloads stay closed: the reviewer
re-ran them in the unsafe direction and got **259/259** recovered assertions
passing plus the two pre-closure harnesses failing exactly as expected. The seven
findings below are **newly found equivalent paths**.

### Reproduced findings

| ID | Severity | Surface | Reproduced unsafe result | Root cause | Closure |
|---|---|---|---|---|---|
| 13-H1 | **High** | Repository resource base URL | `<base href="/sub/">` with `<link rel="stylesheet" href="theme.bin">`: the writer analysed the benign root `theme.bin`, Chromium loaded the unreviewed `sub/theme.bin` (`[alt]{position:fixed;inset:0;width:100vw;height:100vh;…}`); the candidate verified with confidence `1`, applied 1 fix, wrote 1 file and the real route opened a pull request | `resolveRepositoryPath()` resolves a reference against the **containing file's directory**; a browser resolves a document-relative URL against the document's **effective base URL**, which `<base href>` changes. The same mismatch exists on the `<script src>` target path | **Closed** (`be81d02`) — the references are resolved with the document's effective base (the first live `<base href>` of a document), and a base that cannot be resolved from repository source or that points outside the repository makes the destination unprovable. A script file is runtime code and not a document, so it is never read as markup |
| 13-H2 | **High** | Computed runtime state reads | `img["al"+"t"]` and `img.matches("["+"al"+"t"+"]")` each changed the target to class `overlay`, fixed `1280×720`, at the viewport centre; both verified with confidence `1`, applied 1 fix, wrote 1 file, and the real route opened a pull request | `scriptReadsAttributeProperty()` recognises a **dot** property, not a **computed bracket** property; `scriptNamesAttribute()` searches for a literal attribute word and does not resolve the argument of `matches()` / `closest()` | **Closed** (`be81d02`) — a computed property or selector read is resolved when it is a concatenation of string literals, and a name the reader cannot resolve is a **generic dynamic state read** (fail closed) |
| 13-H3 | **High** | CSS transition semantics | Three transitions the analyser did not model — a negated attribute **value** change (`:not([data-state="active"])` with `data-state` changed), `:nth-child(1 of [alt])` and the nested negation `:not(:not([alt]))` — each turned the sibling into a fixed `1280×720` takeover at the viewport centre; verified with confidence `1`, applied 1 fix, wrote 1 file, and the real route opened a pull request | `parseSubject()` reads only the arguments of `:is()`, `:where()` and `:not()`; the transition model records added and removed attributes but not a **changed value**, and a nested negation is not reduced | **Closed** (`be81d02`) — the value change, the `:nth-child(... of ...)` selector list and the nested negation are modelled, and a functional pseudo-class whose transition semantics cannot be read fails closed |
| 13-H4 | **High** | Focusability transition | An added `href="#main"` on an anchor made it keyboard-focusable; the `a:focus ~ .overlay` rule turned the sibling into a fixed `1280×720` takeover at the viewport centre; verified with confidence `1`, applied 1 fix, wrote 1 file, and the real route opened a pull request | `changesBetween()` marks a focusability transition only for an **added** `tabindex`; it does not compare the element's actual focusability before and after the fix | **Closed** (`be81d02`) — the actual focusability is compared before and after the fix (an added `href`, an added `contenteditable`, a `tabindex` value change to a focusable value) |
| 13-H5 | **High** | Outline paint geometry | `[alt]{outline:100000px solid #f0f}` computed `outline-width:100000px` and painted the outline over the viewport (the screenshot origin and midpoint changed from white to the opaque outline colour); verified with confidence `1`, applied 1 fix, wrote 1 file, and the real route opened a pull request | `paintedBoxOf()` composes box-shadow growth but not the outline, and `outline` / `outline-width` are absent from the relevant-property set | **Closed** (`be81d02`) — the outline width and offset are composed into the painted surface, and an outline the analyser cannot compute is unprovable |
| 13-M1 | Medium | Inset shorthand offsets | `[alt]{position:relative;inset:-9999px}` computed `left: -9999px` and `top: -9999px`; the image left the viewport | the inset **longhands** call `isLargeOffset()`, but the `inset`, `inset-block` and `inset-inline` **shorthands** only compute zero-valued edges in `stateOf()` | **Closed** (`be81d02`) — the shorthands are expanded into their physical edges and use the same direction-free large-offset rule |
| 13-M2 | Medium | Safety order against the source budget | Eleven candidates: the eleventh (`#target11:nth-child(11 of [alt]){position:fixed;inset:0;…}`) skipped the safety analysis and received the review artifacts `accessguard-fixes/image-alt-v11.md` and `summary.md`; the real route answered `200 success:true`, created a branch and opened a pull request | `planRepositoryFixes()` slices the candidates to ten **before** the safety decision, so every candidate at index ten or later goes straight into `reviewFixIds` | **Closed** (`be81d02`) — validation, runtime analysis and destination analysis run for **every** candidate; the budget may limit source writes, never the safety decision |

### Re-run evidence of the thirteenth review

| Harness | Result |
|---|---|
| Recovered fourth- through twelfth-review assertions | 259/259 passed (118 prior/legitimate + 124 writer closure + 17 route closure) |
| Pre-closure eleventh-review evidence and route harnesses | 12 failed + 5 passed and 2 failed + 7 passed — exactly as expected; the failures assert that the eleventh-review vulnerabilities still exist |
| New equivalent-path writer / verifier / Chromium harness | 17/17 passed — all nine unsafe candidates reached one fix and one write, with every Chromium and local-request result observed |
| New equivalent-path route harness | 7/7 passed — five representative High cases opened a pull request; the unsafe eleventh candidate produced no source fix but did produce review artifacts |
| Legitimate behaviours | 26/26 passed — the ordinary fixes, the `https:` / `mailto:` hrefs, the preserved relative destination, the preserved class and inline style, 3-of-3 and 2-of-3 identical copies, the twelve server-template spellings, the ordinary repository script, the linked script that does not react, the unrelated runtime mutation, the harmless focus rule, the custom property without a resource, the scale of one, the small box shadow, the non-zero and the unclipped zero maximum size, the aspect ratio with both axes, the running animation, the positive delay, and the pure in-page fragment `#main` |
| Reviewer's gate suite | PASS — source-only typecheck 0, lint 0, vitest 53 files / 829/829, coverage 67.15/59.74/69.83/68.81, build 0, Playwright 79/79, `npm audit` Critical 0 / High 0 (15 moderate) |
| Tracked-file secret scan | PASS — 779 tracked files; only `.env.example` is tracked in the `.env*` name family; one AWS-key-shaped **documentation example** (path and category only, value never printed) and no live credential |

### Gate status

The sixth through thirteenth review closures are shipped (`be81d02`); the
thirteenth review returned **NOT READY** (High 5, Medium 2) and all seven of its
findings are closed at their root cause, with a permanent regression each. The
**release gate is still closed**: it opens only when a **fourteenth independent
review** returns READY (Critical 0, High 0) against the thirteenth-review closure
tree.

## Twelfth independent security review (2026-11-23) — closed 2026-11-23

**Verdict: NOT READY — Critical 0, High 6, Medium 3, Low 0.** The READY gate
requires Critical 0 and High 0. This tree is **not releasable** until every High
reproduction is blocked in the unsafe direction, permanent regressions cover the
root causes, and a fresh independent review returns READY.

The reviewed closure tree was `d429c6b` (`vol: security — V23: close the eleventh
review's runtime and painted-surface findings`), against the requested baseline
`08ab9ef`; the checkout at report time was `2dce09d` (the state commit that
carries the pipeline evidence — `git diff --quiet d429c6b..HEAD -- src` is exit
0, so the reviewed source is the closure tree itself). The reviewer's own
artifact is `.ai/SECURITY-REVIEW-12.md` (report only — no shipped source, docs,
CI, dependency or environment file was changed by the reviewer). Every
reproduction used local synthetic repositories, a mocked GitHub transport, local
Chromium and `127.0.0.1` listeners. No production, third-party or public target
was scanned, no live repository was mutated, no external GitHub Markdown service
was called, and **no Strix result is claimed**.

### Reproduced findings

| ID | Severity | Surface | Reproduced unsafe result | Root cause | Closure |
|---|---|---|---|---|---|
| 12-H1 | **High** | Repository runtime state reads | `hasAttribute('a'+'lt')` and the standard `hasAttributes()` twin each returned valid / harm-null / verified confidence `1` / 1 fix / 1 write while Chromium turned the target into a fixed `1280×720` takeover; the real route answered `200 success:true`, created a branch and opened a pull request | `scriptNamesAttribute()` searches for a literal attribute **word**, so a name built at runtime never matches; `RUNTIME_GENERIC_STATE_READ_PATTERN` does not know `Element.hasAttributes()` | **Closed** — `hasAttributes()` joins the generic attribute reads, and an attribute read whose name cannot be resolved (a variable, a call, an interpolation) is a generic state read; a name that is a concatenation of string literals is resolved |
| 12-H2 | **High** | Destination selector activation | `input:is([aria-label]) ~ .overlay` and `#target:not(.card) ~ .overlay` each returned valid / harm-null / verified / 1 fix / 1 write; Chromium changed the sibling from `1264×18` to a fixed `1280×720` takeover | `parseSubject()` treats every functional pseudo-class as one opaque `conditional` marker and skips its argument, and `changesBetween()` records added attributes and classes but not removed classes | **Closed** — the arguments of `:is()`, `:where()` and `:not()` are read and matched, and the fix's **removed** classes and attributes are tracked |
| 12-H3 | **High** | Destination focusability transition | A `div[role="button"]:focus ~ .overlay` rule with a remediation that adds `tabindex="0"` returned valid / harm-null / verified / 1 fix / 1 write; after the fix and focus the sibling was a fixed `1280×720` takeover | `changesBetween()` sets its `focus` transition only when the remediation adds `autofocus`, so a fix that makes the element focusable activates no focus rule | **Closed** — an added `tabindex` is a focusability transition and reaches the same focus-activation decision as `autofocus` |
| 12-H4 | **High** | Destination painted surface | `[alt]{scale:100;background:#f0f}` returned valid / harm-null / verified / 1 fix / 1 write; Chromium scaled the image from `64×64` to `6400×6400` and it covered the viewport | `paintedBoxOf()` returns before composing padding, borders, scale, transform and zoom whenever the element is not positioned, and `coversViewport()` requires a positioned state | **Closed** — the painted surface is composed for every element, and a painted box that covers the viewport **because of the fix** is refused |
| 12-H5 | **High** | Repository runtime carrier discovery | `<script src="/runtime.php">` whose body reacts to the added `alt` returned valid / harm-null / verified / 1 fix / 1 write; Chromium requested `/runtime.php` and the target became a fixed `1280×720` takeover; the real route opened a pull request | `SCRIPT_FILE_PATTERN` recognises a fixed list of JavaScript extensions, and the scanner never follows a `<script src>` target into the tree — a browser executes the response by its MIME type, not by its suffix | **Closed** — a `<script src>` target is followed into the tree and inspected whatever its name is; a target that is not part of the repository makes the destination unprovable |
| 12-H6 | **High** | Runtime mutation of a remediation-introduced element | A remediation that adds `<div id="overlay">` next to the patched image, with an inline script that mutates `getElementById('overlay')`, returned valid / harm-null / verified / 1 fix / 1 write; Chromium measured the added element at a fixed `1280×720` | The runtime gate correlates the mutation scripts only with the **original** target's id and with the attributes added to the **first** element of the remediation | **Closed** — the whole remediation is judged: a script that names an id or reads an attribute the remediation introduces makes the destination unprovable |
| 12-M1 | Medium | Destination off-screen offsets | `[alt]{position:relative;left:9999px}` and `[alt]{margin-left:9999px}` each returned valid / harm-null / verified / 1 fix / 1 write; Chromium moved the image from a left edge of `8` to `10007` | `isLargeNegativeOffset()` and the matching `stateOf()` branches recognise only negative offsets and margins | **Closed** — a large offset is a large offset in either direction |
| 12-M2 | Medium | URI attribute preservation | `<a id="target">Text</a>` → `<a id="target" href="/destination">Text</a>` returned valid / verified / 1 write; the local listener received `GET /destination` after the patched link was clicked | `isForeignDestination()` deliberately treats a same-origin relative URL as safe, so the "new URI attribute" branch allows a remediation to introduce a destination the original element did not have | **Closed** — a remediation may not introduce a URI attribute the original element does not have; only a pure in-page fragment (`#main`) stays allowed |
| 12-M3 | Medium | Remediation target shape | A remediation that wraps the patched image in a `<span>` and marks the image `hidden` returned valid / verified / 1 write; Chromium measured the image at `0×0` with a computed `display:none` | `validateRemediation()` marks only the **first** tag as the target, and `hidesOwnTarget()` inspects only the first opening tag of the replacement | **Closed** — no live element of the replacement may be hidden: the `hidden` attribute and the hiding styles are refused on every live tag |

### Re-run evidence of the twelfth review

| Harness | Result |
|---|---|
| Eleventh-review closure matrix | 37/37 |
| Eleventh-review route / audit closure matrix | 9/9 |
| Tenth-review and ninth-review closure matrices | 61/61 |
| Prior / legitimate assertion matrix | 118/118 (one harness-only confidence expectation corrected — not a product change) |
| New equivalent-path writer / verifier / Chromium harness | 4/4 tests, twelve candidate rows — every candidate reached one fix and one write |
| Route / audit harness with the literal closure plus the new route probes | 12/12 (the dynamic state read, the functional pseudo-class and the nonstandard script extension each returned `200 success:true` and opened a pull request) |
| Build, source-only typecheck, lint, vitest 799/799, coverage 66.59/59.2/69.02/68.3, Playwright 79/79, `npm audit` Critical 0 / High 0 | PASS |

### Gate status

The sixth through twelfth review closures are shipped; the twelfth review
returned **NOT READY** (High 6, Medium 3) and all nine of its findings are
closed at their root cause, with a permanent regression each. The **release gate
is still closed**: it opens only when a **thirteenth independent review** returns
READY (Critical 0, High 0) against the twelfth-review closure tree
(`11065e4`).

### Closure evidence of the twelfth review (2026-11-23)

| Check | Result |
|---|---|
| Twelfth-review closure matrix (nine findings in the unsafe direction plus the benign twins) | PASS — 26/26 |
| Twelfth-review real-route closure harness (seven refusals plus the benign pull request) | PASS — 8/8 |
| Recovered prior matrices — eleventh closure, ninth, tenth, eleventh route | PASS — 37/37, 42/42, 19/19, 9/9 |
| Prior / legitimate assertion matrix | PASS — 118/118 |
| Permanent regressions added | 30 (15 in `css-context.test.ts`, 8 in `github.test.ts`, 7 across `github-pr.test.ts` and `ast-patch.test.ts`) |
| `npx vitest run --coverage` | PASS — 53 files / 829/829, coverage 67.15 / 59.74 / 69.83 / 68.81 (thresholds 55 / 50 / 58 / 57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0 |
| `npm run build` | PASS — exit 0 |
| `npx playwright test --project=chromium` | PASS — 79/79 |
| `npm audit --audit-level=high` | PASS — Critical 0 / High 0 (15 moderate) |
| Strix autonomous pentest | **NOT RUN** — every configured provider refuses the run (quota / EOL model / no credits); no Strix result is claimed for this cycle |

Two existing expectations changed with the 12-M3 design: a remediation that
hides a nested element is now refused **before** the verification browser
(`unverified`, `rejected before verification`) instead of failing the browser
check afterwards. The browser-level checks stay covered by their own
regressions.

No Strix result is claimed for this cycle: every configured provider still
refuses the run (quota / EOL model / no credits).

## Eleventh independent security review (2026-11-23) — closed 2026-11-23

**Verdict: NOT READY — Critical 0, High 3, Medium 3, Low 0.** The READY gate
requires Critical 0 and High 0. This tree is **not releasable** until every High
reproduction is blocked in the unsafe direction, permanent regressions cover the
root causes, and a fresh independent review returns READY.

The reviewed closure tree was `7ec51ee` (`vol: security — V23: close the tenth
review's runtime, geometry, focus, plan and audit findings`), against the
requested baseline `08ab9ef`; the checkout at report time was `0df2299` (the
state commit that carries the pipeline evidence — `git diff --quiet
7ec51ee..HEAD -- src` is exit 0, so the reviewed source is the closure tree
itself). The reviewer's own artifact is `.ai/SECURITY-REVIEW-11.md` (report only
— no shipped source, docs, CI, dependency or environment file was changed by the
reviewer). Every reproduction used local synthetic repositories, a mocked GitHub
transport, local Chromium and `127.0.0.1` listeners. No production, third-party
or public target was scanned, no live repository was mutated, no external GitHub
Markdown service was called, and **no Strix result is claimed**.

### Reproduced findings

| ID | Severity | Surface | Reproduced unsafe result | Root cause | Closure |
|---|---|---|---|---|---|
| 11-H1 | **High** | Repository runtime carriers and state reads | An inline `onload` handler in the repository HTML (`if(t.hasAttribute('alt'))t.classList.add('overlay')`) and the script twins `getAttributeNames()`, `getAttributeNode()` and `attributes.getNamedItem()` each returned valid / harm-null / verified confidence `1` / 1 fix / 1 write while Chromium turned the target from a static `16×16` image into a fixed `1280×720` takeover; the real route answered `200 success:true` and opened a pull request for the inline-handler case | The runtime scanner inspects `<script>` blocks and script **files**, but not the **event-handler attributes** of repository HTML; `RUNTIME_STATE_READ_PATTERN` recognises no DOM API that reads an attribute's presence generically | **CLOSED** — the event-handler attributes of repository HTML are analysed like inline scripts (an unreadable handler fails closed), and `getAttributeNames()` / `getAttributeNode()` / `attributes.getNamedItem()` are state reads; a **generic** attribute enumeration that can react to any attribute the fix adds is a separate gate |
| 11-H2 | **High** | Effective painted surface and geometry | The logical padding longhands, `zoom:3`, an unconstrained `scale:100`, `width:100%;aspect-ratio:1` and a fixed `1×1` element with `box-shadow:0 0 0 10000px #f0f` each returned valid / harm-null / verified / 1 fix / 1 write; Chromium painted a viewport-wide target for the four layout variants and an opaque viewport-wide shadow for the fifth (921,357 of 921,600 pixels). The real route opened a pull request for the zoom variant | `sideInputsOf()` reads the physical padding and the `padding-block` / `padding-inline` shorthands but not the four logical padding longhands; `zoom` is listed but never composed into the painted box; `scale` is multiplied only into a **declared** size, so an intrinsic-size element is missed; `aspect-ratio` is never composed; and the paint extensions (`box-shadow`) are outside the model | **CLOSED** — the logical padding and border longhands join the sides, `zoom` is a scale factor, a scale above one without a declared size is unprovable, an aspect ratio that fills an undeclared axis is unprovable, and a shadow grows the painted box by its spread and blur |
| 11-M1 | Medium | Repository clipping preservation | `[aria-label]{max-height:0;overflow:hidden}` with the ordinary button-name remediation returned valid / harm-null / verified / 1 fix / 1 write; Chromium showed the patched control's blue paint before the attribute and no blue paint after it | `max-height` is a **cap**, not a size: the model never composes the cap with the overflow, so a zero cap with a clipping overflow leaves the control painted | **CLOSED** — a zero `max-height` / `max-width` together with a clipping overflow removes the painted control |
| 11-M2 | Medium | Customer-side CSS resource activation through a custom property | `:root{--pixel:url(http://127.0.0.1:<port>/pixel)}[aria-label]{background-image:var(--pixel)}` returned valid / harm-null / verified / 1 fix / 1 write; the local listener received no request before the fix and `GET /pixel` after it | The activated-rule resource check reads the **raw** declaration value, so `var(--pixel)` hides the `url(...)`; the custom-property definitions are collected only from the rules that provably match the patched element, so the inherited `:root` definition is missing | **CLOSED** — the resource check resolves the `var()` references against the definitions that can reach the element, the global ones included, and an unresolved reference is unprovable; the effective style stays unprovable for a `var()` it cannot resolve |
| 11-M3 | Medium | Repository animation timing and fill semantics | A paused animation with `animation-delay:-0.4s` and the positive-delay `animation-fill-mode:backwards` twin each returned valid / harm-null / verified / 1 fix / 1 write; Chromium held the computed opacity at `0` | A paused animation is modelled as its first frame, but a negative delay moves the paused timeline to a later frame; the model ignores the delay and the fill mode, so the first frame can stay visible to the model while the browser displays a different or hidden frame | **CLOSED** — the delay, the duration and the fill mode decide the frame the customer sees, and the keyframe offsets are kept so a paused timeline can be placed |

### Re-run evidence of the eleventh review

| Harness | Result |
|---|---|
| Tenth-review closure matrix | 19/19 |
| Ninth-review closure matrix | 42/42 |
| Prior / legitimate assertion matrix | 118/118 (one harness-only confidence expectation corrected — not a product change) |
| New equivalent-path writer / verifier / Chromium harness | 17/17 |
| Remaining-equivalent probe | 1/1 (`clip-path:inset(100%)` blocked; `box-shadow`, the positive-delay and the negative-delay animations reproduced) |
| Real-route / audit harness | 9/9 (the inline-handler and zoom cases returned `200` and opened a pull request) |
| Shipped create-PR route regressions | 16/16 |
| Build, source-only typecheck, lint, vitest 770/770, Playwright 79/79, `npm audit` Critical 0 / High 0 | PASS |

### Closure evidence (the eleventh-review closure run, 2026-11-23)

| Check | Result |
|---|---|
| Closure commit | `d429c6b` (`vol: security — V23: close the eleventh review's runtime and painted-surface findings`) — 4 files, 947 insertions, 67 deletions: `src/lib/css-context.ts`, `src/lib/github.ts` and their two regression files |
| Permanent regressions | PASS — 29 new tests (22 in `css-context.test.ts`, 7 in `github.test.ts`); the shipped suites are 92 and 70 tests. Every reproduction of the eleventh review has a regression: the inline event handler, the three generic attribute reads, the attribute iteration, the unreadable handler, the logical padding and border longhands, `zoom`, the unconstrained scale, the aspect ratio, the box shadow, the zero cap with clipping, the inherited custom property and the animation delay / negative delay / fill mode |
| Eleventh-review closure matrix (temporary) | PASS — 1 file, 46/46 assertions: the 13 new reproductions are blocked in the unsafe direction (0 fixes, 0 writes, non-null destination harm), the benign twins stay allowed, and the **route** refuses the inline-handler and the zoom case with `400` and no branch, no write and no pull request. The file was deleted after the run |
| Prior payload matrices (temporary, recovered from the reviewer's own harnesses) | PASS — the tenth-review closure matrix 19/19, the ninth-review closure matrix 42/42 (61 assertions across the two files) and the prior / legitimate matrix 118/118. The files were deleted after the run |
| Harness correction (not a product change) | The first run of the closure matrix failed on **one** benign twin: `:root{--brand:#06c}[alt]{color:var(--brand)}` was written with an original element that carried no `alt`, which makes the rule **activated** by the fix — and the brief requires the effective style to stay unprovable for a `var()` it cannot resolve. The twin was corrected to the shape that tests the resource check (an element that already carries the attribute), and the matrix then passed 46/46. No shipped source changed for it |
| `npx vitest run --coverage` | PASS — 53 shipped files, 799/799 tests (was 53/770) |
| Coverage | PASS — statements 66.59% (threshold 55) · branches 59.2% (50) · functions 69.02% (58) · lines 68.3% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed (4.4 min) |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |

### Gate status

The sixth through eleventh review closures are shipped. The **release gate is
still closed**: it opens only when a **twelfth independent review** returns READY
(Critical 0, High 0) against the eleventh-review closure tree `d429c6b`.

## Tenth independent security review (2026-11-23) — closed 2026-11-23

**Verdict: NOT READY — Critical 0, High 4, Medium 4, Low 0.** The READY gate
requires Critical 0 and High 0. This tree is **not releasable** until every High
reproduction is blocked in the unsafe direction, permanent regressions cover the
root causes, and a fresh independent review returns READY.

The reviewed closure tree was `d1cabd6` (`vol: security — V23: close the ninth
review's geometry, activated-rule, runtime, URI and paint findings`), against the
requested baseline `08ab9ef`; the checkout at review time was `78ec751`. The
reviewer's own artifact is `.ai/SECURITY-REVIEW-10.md` (report only — no shipped
source, docs, CI, dependency or environment file was changed by the reviewer).
Every reproduction used local synthetic repositories, a mocked GitHub transport,
local Chromium and `127.0.0.1` listeners. No production, third-party or public
target was scanned, no live repository was mutated, no external GitHub Markdown
service was called, and **no Strix result is claimed**.

### Reproduced findings

| ID | Severity | Surface | Reproduced unsafe result | Root cause | Closure |
|---|---|---|---|---|---|
| 10-H1 | **High** | Repository runtime carriers and state reads | An inline `<script>` in the repository HTML (`if(img.hasAttribute("alt"))img.classList.add("overlay")`) and the linked-file twin `if(img.alt)` each returned valid / harm-null / verified confidence `1` / 1 fix / 1 write while Chromium turned the target from a static `16×16` image into a fixed `1280×720` takeover | `SCRIPT_FILE_PATTERN` covers script **files** only, so an inline `<script>` never entered the runtime analysis; `RUNTIME_STATE_READ_PATTERN` recognises **method** reads only, so a DOM **property** getter that reflects the attribute (`img.alt`) never entered the conditional-mutation gate | **Closed** — inline `<script>` blocks are analysed like linked scripts (an unclosed block fails closed), and a DOM property getter (`img.alt`, `el.className`, `el.dataset.x`) counts as a state read. Regressions: `github.test.ts` |
| 10-H2 | **High** | CSS identifier escape semantics | `[a\6ct]{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647}` with the ordinary `alt` fix returned valid / harm-null / verified / 1 fix / 1 write; Chromium decoded the identifier as `alt` and took the page over | `parseSubject()` decodes CSS escapes in an attribute **value** but keeps the attribute **name** raw, so the browser-matching rule looked like no rule at all | **Closed** — every selector identifier is decoded the way the browser decodes it, the attribute **name** included (`[a\6ct]` is `[alt]`). Regression: `css-context.test.ts` |
| 10-H3 | **High** | Destination painted-box geometry | `[alt]{position:fixed;width:50vw;height:50vh;scale:3}` (painted `1920×1080`), `[alt]{position:fixed;width:50vw;height:50vh;border:10000px solid}` (painted `20640×20360`) and `[alt]{position:fixed;padding:10000px}` (painted `20037×20034`) each returned valid / harm-null / verified / 1 fix / 1 write while Chromium measured a viewport takeover | The model judges the **content** box only: a scale above `1` is unbounded, `padding` is listed but never composed into the painted box, and `border` is ignored | **Closed** — the painted box composes padding, border, `box-sizing`, `scale` and `transform: scale(…)`; a box that may cover the viewport is unprovable, never harmless, and a declared size above the viewport stays unprovable. Regressions: `css-context.test.ts` |
| 10-H4 | **High** | Focus-state activation of sibling rules | `input:focus ~ .overlay{position:fixed;inset:0;…}` with the `autofocus` remediation returned valid / harm-null / verified / 1 fix / 1 write; after the fix the input was `document.activeElement` and the sibling was a fixed `1280×720` takeover | The activation signal covers added attributes and classes only; no rule connected the newly added `autofocus` to `:focus`, and the rule's subject is another element, so it was invisible to the subject-only decision | **Closed** — a fix that adds `autofocus` activates every focus rule whose compound can match the patched element, in any compound of the selector. Regressions: `css-context.test.ts` |
| 10-M1 | Medium | Repository animation play state | `[alt]{animation:hide 1s paused}` with `@keyframes hide{from{opacity:0}to{opacity:1}}` returned valid / harm-null / verified / 1 fix / 1 write; Chromium measured the computed opacity drop from `1` to `0` while the animation stayed paused | The model picks the visible frame from the animation **direction** but ignores `animation-play-state:paused` — a paused animation stays on its **first** frame | **Closed** — the play state decides which frame the customer sees: a paused animation stays on its first frame. Regressions: `css-context.test.ts` |
| 10-M2 | Medium | Customer-side CSS resource activation through focus | `input:focus{background-image:url(http://127.0.0.1:<port>/focus-pixel)}` with the same `autofocus` remediation returned valid / harm-null / verified / 1 fix / 1 write; the local listener received `GET /focus-pixel` after the merge and nothing before it | The activated-rule check only recognises an added attribute or class as the activation hook, so the focus transition was invisible to it | **Closed** — the focus activation reaches the same resource check as every other activated rule. Regression: `css-context.test.ts` |
| 10-M3 | Medium | Create-PR route writes after a destination refusal | The real route with the real verifier and the real writer and a mocked transport: the writer returned a non-null destination harm, applied **0 fixes** and wrote **0 source files**, but the route still created the branch, `accessguard-fixes/button-name-v1.md`, `accessguard-fixes/summary.md` and the pull request, and answered `200 success:true` | The route creates the branch **before** it calls the writer, then writes a fix document and a summary for every isolated-verified violation without distinguishing a destination refusal from a successful source patch | **Closed** — the writer is split into a plan phase (`planRepositoryFixes`, no writes) and an apply phase (`applyRepositoryFixPlan`); the route plans **before** the first mutation. A refused candidate gets no patch, no document, no summary entry and no link, and a run in which every candidate is refused creates no branch, no document and no pull request (`400`). Regressions: `github.test.ts`, `route.test.ts` |
| 10-M4 | Medium | Audit-trail failure after an irreversible mutation | The same route reproduction with a persistent `createAuditLogWithRetry` failure: branch, two documents and pull request created, response `200 success:true auditRecorded:false` | The audit write happens **after** the pull request and is best effort, so a persistent database failure leaves an externally visible repository mutation with no trail and a success response | **Closed** — a `github_pr_intent` record is written **before** the branch (no migration: `AuditLog.action` is a plain string column). A persistent failure of the intent stops the mutation (`500`, no branch, no pull request); a failure of the closing `github_pr_created` record leaves the intent as the recoverable trail and is reported as degraded (`auditRecorded: false`, `auditNotice`). Regressions: `route.test.ts` |

### Re-run evidence of the tenth review

| Harness | Result |
|---|---|
| Ninth-review closure matrix | 42/42 — 26 writer-level unsafe payloads, 4 validator-level groups, 12 legitimate groups |
| Prior / legitimate assertion matrix | 118/118 — 94 unsafe assertions across 40 payload groups and 24 legitimate assertions across 13 behaviour groups (one harness-only confidence expectation corrected, not a product change) |
| Ninth-review closure candidate probe | 15/15 expected outcomes (the dismissed `contain:size` candidate still allowed) |
| New equivalent-path probe | 9/9 unsafe results reproduced |
| Build, source-only typecheck, lint, vitest 750/750, Playwright 79/79, `npm audit` Critical 0 / High 0 | PASS |

### Closure evidence (2026-11-23)

| Check | Result |
|---|---|
| Temporary reviewer-payload matrix | PASS — 1 file, 19/19 assertions: the nine unsafe reproductions of this review (the inline script, the property getter, `[a\6ct]`, `scale:3`, `border:10000px`, `padding:10000px`, the focus sibling, the paused animation, the focus resource) are blocked in the unsafe direction (0 fixes, 0 writes), and the ten legitimate behaviour groups still pass. The file was deleted after the run |
| `npx vitest run --coverage` | PASS — 53 shipped files, 770/770 tests (was 53/750) |
| Coverage | PASS — statements 65.35% (threshold 55) · branches 57.52% (50) · functions 67.96% (58) · lines 67.05% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed (4.4 min) |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |

### Gate status

The sixth, seventh, eighth, ninth and tenth review closures are shipped; the
tenth review returned **NOT READY** (High 4, Medium 4) and every one of its
eight findings is now closed with a permanent regression. The **release gate is
still closed**: it opens only when an **eleventh independent review** returns
READY (Critical 0, High 0) against the closure tree.

## Ninth independent security review (2026-11-22) — closed 2026-11-23

**Verdict: NOT READY — Critical 0, High 3, Medium 3, Low 0.** The READY gate
requires Critical 0 and High 0. This tree was **not releasable** until every High
reproduction is blocked in the unsafe direction and a fresh independent review
returns READY.

The reviewed tree was `2a652bf` (`vol: releases — V23: volume log entry for the
eighth-review closure cycle`), against the requested baseline `08ab9ef`; the
checkout at review time was `85a1031`. The reviewer's own artifact is
`.ai/SECURITY-REVIEW-9.md` (report only — no shipped source, docs, CI, dependency
or environment file was changed by the reviewer). Every reproduction used local
synthetic repositories, a mocked GitHub transport, local Chromium and
`127.0.0.1` listeners. No production, third-party or public target was scanned,
no live repository was mutated, no external GitHub Markdown service was called,
and **no Strix result is claimed** (every configured provider refused the run:
quota / EOL model / no credits).

### Reproduced findings and their closure

| ID | Severity | Surface | Reproduced unsafe result | Root cause | Closure |
|---|---|---|---|---|---|
| 9-H1 | **High** | Destination CSS geometry semantics | `[aria-label]{position:fixed;inset-block-start:0;inset-block-end:0;inset-inline-start:0;inset-inline-end:0;z-index:2147483647}` with the `aria-label` remediation → `validation:true`, `harm:null`, verified with confidence 1, 1 fix, 1 write, Chromium measured a fixed `1280×720` overlay; the fixed-pixel twin `width:9999px;height:9999px` and the viewport twin `width:200vw;height:200vh` (`2560×1440`) did the same | The four **logical inset longhands** were absent from the relevant-property, judgement and edge semantics, and the coverage test recognised only the exact value `100%` / `100vw` — a larger length could still span the viewport | The logical longhands (`inset-block-start`, `inset-block-end`, `inset-inline-start`, `inset-inline-end`) joined `RELEVANT_PROPERTIES`, `JUDGEMENT_PROPERTIES` and `GEOMETRY_PROPERTIES` and set the same edges as their physical names in a horizontal writing mode. A size the analyser cannot compute — a fixed length that may be as long as the customer's screen (`9999px`), a viewport unit above 100% (`200vw`), a font-relative length of 64 units or more — is **unprovable**, never harmless |
| 9-H2 | **High** | Destination CSS sibling-combinator semantics | Repository HTML `<img id="target" src="x"><div id="overlay" class="overlay">owned</div>` with `[alt] ~ .overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647}` → the same valid / harm-null / verified / write result; Chromium started matching the sibling as soon as the fix added `alt` and measured a fixed `1280×720` takeover | `matchSelector` splits a selector and judges **only the subject compound**, so a rule whose subject is another element looked like no rule at all; the seventh-review closure covered `:has()` but not the general combinators | The destination judgement now computes **what the fix changes** (`changesBetween`: the attributes and classes the remediation adds) and asks, for every rule of the repository, whether a compound of its selector asks for one of them (`compoundActivatedByFix`). A rule the fix activates whose subject is **not** the patched element can take over another element of the customer page → the destination is unprovable |
| 9-H3 | **High** | Repository runtime DOM and style delivery | `const img=document.querySelector('#target');if(img&&img.hasAttribute('alt'))img.classList.add('overlay');` with `.overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647}` → the same valid / harm-null / verified / write result; the inline-style twin, a service worker that intercepted `/styles.css`, and a CSS-in-JS build did the same | The runtime-style detector knew style-element creation, `insertRule(…)`, adopted stylesheets and style-text assignment — but not a script that **mutates the patched element at runtime**, nor a service worker that supplies stylesheet bytes. The isolated axe browser cannot observe repository JavaScript | `src/lib/github.ts` now classifies a repository script that **conditionally mutates** an element (a state read — `hasAttribute(…)`, `getAttribute(…)`, `matches(…)`, an attribute selector — together with a class, attribute or inline-style mutation) as an unanalysable runtime source when it names an attribute the fix adds, and a script that **names the patched element by its id** as an unconditional takeover. A **service worker** (`navigator.serviceWorker.register(…)`, a `fetch`/`install` listener, `caches.open(…)`) and a **CSS-in-JS** library (`styled-components`, `@emotion`, `createGlobalStyle`, `makeStyles`) are runtime style sources. Every one of them makes the destination unprovable → 0 fixes, 0 writes |
| 9-M1 | Medium | URI attribute preservation | `<img id="target" src="x" alt="Photo" attributionsrc="http://127.0.0.1:<port>/attribution-pixel">` → valid / verified / 1 write; the customer browser then issued `GET /attribution-pixel` | `URI_ATTRIBUTES` in `src/lib/github-pr.ts` omitted `attributionsrc`, so the scheme allowlist, the original-vs-new comparison, the duplicate handling and the list grammar never inspected it | `attributionsrc` joined `URI_ATTRIBUTES` and is parsed with the **space-separated URL list** grammar the browser uses (like `ping`). A newly introduced, changed, masked or dropped remote destination is refused; a preserved or relative destination stays allowed |
| 9-M2 | Medium | Customer-side CSS resource activation | `[alt]{background-image:url(http://127.0.0.1:<port>/background-pixel)}` → valid / verified / 1 write; the customer browser then issued `GET /background-pixel` | The destination analyser judged geometry and hiding, but never the **network-bearing declarations** of a rule the fix activates; the isolated verification browser blocks every request and therefore never sees it | A rule the fix activates is now checked for a **resource-bearing declaration** (`url(…)`, `image-set(…)`): the request happens in the customer browser, so the destination is unprovable |
| 9-M3 | Medium | Repository paint and hiding preservation | Six repository-CSS variants each validated, verified with confidence 1, applied one fix and performed one write while Chromium measured customer-visible harm: `[aria-label]{color:transparent}`, `[alt]{margin-inline-start:-10000px}`, `[alt]{position:absolute;left:-9999px;top:0}`, `[alt]{width:0}`, `[alt]{display:contents}` and `[alt]{animation:hide 100ms reverse forwards}` with `@keyframes hide{from{opacity:0}to{opacity:1}}` (computed opacity 0) | The destination state model omitted the repository transparent-colour path, the logical margins, the negative positional offsets, a zero single dimension, `display:contents`, and the animation **direction** when it chose the visible frame | The state model now judges the repository's own **transparent colour** (`transparent`, an alpha of zero, a hex alpha of zero) on a text-bearing element, the **logical margins**, the **negative positional offsets**, a **single zero dimension**, `display:contents` on a replaced element, and the visible frame of an animation **by its direction** (a reversed animation ends at its first frame; the `animation-direction` longhand is read too) |

### Closure evidence

| Fix | Root cause | Permanent regression |
|---|---|---|
| Destination geometry (`src/lib/css-context.ts`) | The logical inset longhands and the oversized sizes were unknown | `css-context.test.ts` — the logical inset longhands, the fixed-pixel, viewport and font-relative sizes above the viewport |
| Activated rules (`src/lib/css-context.ts`) | Only the subject compound of a selector was judged | `css-context.test.ts` — the sibling combinator the fix activates, the repository resource the fix activates |
| Repository runtime (`src/lib/github.ts`) | The repository's scripts were only inspected for a style they create | `github.test.ts` — the conditional class mutation, the conditional inline-style mutation, the mutation through a tag selector, the sibling activated by the added attribute, the service worker, the CSS-in-JS library, the mutation by id — and an ordinary script that mutates an unrelated element still gets the fix |
| URI semantics (`src/lib/github-pr.ts`) | `attributionsrc` was not a URI attribute | `github-pr.test.ts` — the remote `attributionsrc`, the list with a remote destination, the changed, dropped, preserved, relative and duplicate `attributionsrc` |
| Paint and geometry (`src/lib/css-context.ts`) | The repository transparent colour, logical margins, negative offsets, zero dimension, `display:contents` and the animation direction were unknown | `css-context.test.ts` — the transparent repository colour, the logical margin, the negative offset, the single zero dimension, `display:contents`, the reversed animation |

### Gate status

The sixth, seventh, eighth and ninth review closures are shipped. The **release gate
is still closed**: it opens only when a **tenth** independent review returns READY
(Critical 0, High 0) against the closure tree. Every ninth-review reproduction is
blocked in the unsafe direction by the shipped regressions, and the temporary
payload re-run (the 25 writer-level unsafe payloads of the fourth to the ninth
reviews, the validator-level payloads and the 12 legitimate behaviour groups)
passed 42/42 and was deleted after the run.

## Eighth independent security review (2026-11-22)

**Verdict: NOT READY — Critical 0, High 4, Medium 2, Low 0.** The READY gate
requires Critical 0 and High 0. This tree was **not releasable** until every High
reproduction is blocked in the unsafe direction and a fresh independent review
returns READY.

The reviewed tree was `08ab9ef` (`vol: releases — V23: volume log entry for the
seventh-review closure cycle`), against the requested baseline `cdb246a`; the
checkout at review time was `46bd701`. The reviewer's own artifact is
`.ai/SECURITY-REVIEW-8.md` (report only — no shipped source, docs, CI, dependency
or environment file was changed by the reviewer). Every reproduction used local
synthetic repositories, a mocked GitHub transport, local Chromium and
`127.0.0.1` listeners. No production, third-party or public target was scanned,
no live repository was mutated, no external GitHub Markdown service was called,
and **no Strix result is claimed** (every configured provider refused the run:
quota / EOL model / no credits).

### Reproduced findings and their closure

| ID | Severity | Surface | Reproduced unsafe result | Root cause | Closure |
|---|---|---|---|---|---|
| 8-H1 | **High** | Destination CSS geometry semantics | `styles.css` = `[role="button"]{position:fixed;inset:0 0;z-index:2147483647}` with the `role="button"` remediation → `validation:true`, `harm:null`, verified with confidence 1, 1 fix, 1 write, Chromium measured a fixed `1280×720` overlay; the logical-sizing twin `[alt]{position:fixed;top:0;left:0;inline-size:100vw;block-size:100vh;z-index:2147483647}` did the same | `stateOf` recognised only the exact value `0` as zero for `inset`, so the browser-valid **two-value** shorthand `0 0` did not establish all four edges; `inline-size` and `block-size` were absent from the relevant-property and viewport-coverage semantics | `insetEdges` / `insetBlockEdges` / `insetInlineEdges` assign the shorthand edges the way the browser assigns them (one value sets every edge, two the block and the inline edges, three and four the browser's own assignment); `inline-size`, `block-size`, `min-inline-size` and `min-block-size` joined `RELEVANT_PROPERTIES`, `JUDGEMENT_PROPERTIES` and `GEOMETRY_PROPERTIES` — `inline-size` covers the X axis and `block-size` the Y axis in a horizontal writing mode. A geometry value the analyser cannot compute makes the changed destination **unprovable**, never harmless |
| 8-H2 | **High** | Remediation / destination style composition | Remediation `<img id="target" src="x" alt="Photo" style="width:100%;height:100%">` with `#target{position:fixed;z-index:2147483647}` → the same valid / harm-null / verified / write result and a `1280×720` fixed overlay; the custom-property twin `style="--pos:fixed;--w:100%;--h:100%;--z:2147483647"` with `#target{position:var(--pos);width:var(--w);height:var(--h);z-index:var(--z)}` did the same | `destinationCssHarm` evaluated **only** the repository's rules — the remediation's inline declarations were never applied, so the effective style of the patched element was never computed; `var()` was only unprovable when the fix changed that CSS property, and here the fix supplies the custom-property value | The effective style of the patched element is the repository's rules **plus the remediation's inline declarations** (`inlineStyleOf` → `parseDeclarations`); the custom properties the fix defines — and those a rule that provably matches defines — resolve the `var()` references of the repository's rules (`resolveCustomProperties`); an inline style that is not a plain CSS declaration list (the JSX object form `style={{ … }}`) cannot be read, so the destination is **unprovable** |
| 8-H3 | **High** | JSX class-token handling | `Card.tsx` = `<img id="target" src="x" />`, remediation `<img id="target" src="x" alt="Photo" className="overlay" />`, repository CSS `.overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647}` → valid / harm-null / verified with confidence 1 / 1 write, Chromium measured a fixed `1280×720` overlay | The added-class guard in `github-pr.ts` **and** the CSS element descriptor in `css-context.ts` read only the HTML `class` attribute; React maps `className` to the browser's `class` attribute, so the new class hook was invisible to validation and to destination matching but active in the customer browser | `classTokensOf` (`src/lib/github-pr.ts`) and `describeElements` (`src/lib/css-context.ts`) read **`className` as a class-token carrier** in both the HTML and the JSX dialect; a new class token no longer bypasses either gate |
| 8-H4 | **High** | Runtime-created repository style | Repository `app.js` = `const css='[alt]{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647}';const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);` → the `alt` fix validated, verified with confidence 1, applied 1 fix and performed 1 write; Chromium applied the overlay | The destination style collector read CSS files, literal `<style>` blocks, linked stylesheets and `@import` chains — it never inspected the repository's **scripts** for a style element the script creates at runtime. The style activates only after the accessibility fix changes the selector match | `src/lib/github.ts` classifies a repository script that creates a style at runtime (`createElement('style')`, `insertRule(…)`, `adoptedStyleSheets`, a `style.textContent` / `innerHTML` / `cssText` assignment, a `<style` string) as a **dynamic style source** — the CSS is built at runtime, so the analyser cannot read it. The destination becomes unprovable and the repository receives **no** write |
| 8-M1 | Medium | URI attribute and list semantics | A duplicate `src` changed the browser-effective first value from `/safe.png` to `http://127.0.0.1:9/pixel` while a later `src="/other.png"` remained (the customer browser hit `/pixel`); a `ping="/safe http://127.0.0.1:9/pixel"` remediation requested the remote URL; a duplicate `href` put `mailto:attacker@example.com` first and Chromium followed it — each validated, verified with confidence 1 and written | `canonicalUriMap` stored **one** value per attribute name, so a later duplicate overwrote the browser-effective first duplicate; and it treated `ping` as a single URI although browsers parse it as a **space-separated** URL list. The scheme check had the same single-value assumption | `uriCandidates` parses each URI attribute with the list grammar the browser uses (`srcset` comma separated, `ping` space separated, everything else one URL); `canonicalUriMap` keeps **every** occurrence in **source order** and the scheme check uses the same grammar. A changed, masked, dropped, duplicated or newly introduced remote destination is refused; a preserved destination, a relative destination and an inert image `data:` URI stay allowed |
| 8-M2 | Medium | Rendered visibility and paint preservation | Six browser-confirmed hiding variants each validated, verified with confidence 1, applied one fix and performed one write: `color:oklch(0 0 0 / 0%)` (computed `oklch(0 0 0 / 0)`, 0 dark pixels), `width:0;height:0` (image rect `0×0`), `height:0;overflow:hidden` (target height 0 while the unpainted text range kept `69.75×17`), `margin-left:-10000px` (left `-9992`), repository `[alt]{translate:-100vw}` (left `-1272`), and repository `[alt]{animation:hide 100ms forwards}` with `@keyframes hide{from{opacity:1}to{opacity:0}}` (computed opacity 0) | The static colour parser did not understand the modern `oklch()` alpha syntax; the browser check did not reject a **zero-area** target, did not account for **clipping** when it tested a text range, and did not treat a large negative margin or a viewport-unit translation as off-screen; the destination CSS only treated an animation frame as harmful when it changed **geometry**, so an opacity-only fade was judged harmless | The static guard (`checkStyleAttribute`) reads the alpha of the modern colour syntaxes (the slash form of any functional syntax, with or without a percent sign), refuses a zero width or height on the **patched** element and a large negative margin (the existing off-screen threshold). The browser verdict (`checkRenderedElement` and the rendered-text helper) resolves the colour alpha with a **1×1 canvas** (the browser's own answer), rejects a target whose border box has no area or does not intersect the viewport, requires the painted text range to intersect the **client box** of an element that clips its content, and lets the animations of the snippet reach their **end state** before the page is judged. The destination CSS reader treats a large negative margin and a viewport-unit translation as hidden and reads the hiding properties of the animation's end frame |

### Closure evidence

| Fix | Root cause | Permanent regression |
|---|---|---|
| Destination geometry (`src/lib/css-context.ts`) | The `inset` shorthand and the logical sizing properties were unknown | `css-context.test.ts` — the two-value, three-value and four-value `inset` shorthand, the logical sizing properties |
| Style composition (`src/lib/css-context.ts`) | The remediation's inline declarations were never composed with the repository's rules | `css-context.test.ts` — the inline style composed with the repository CSS, the custom properties the fix defines, a style that is not a CSS declaration list |
| JSX class carrier (`src/lib/css-context.ts`, `src/lib/github-pr.ts`) | Only the HTML `class` attribute was read | `css-context.test.ts` — a class rule reached through `className`; `github-pr.test.ts` — a new JSX class token is refused |
| Runtime styles (`src/lib/github.ts`) | The repository's scripts were never inspected for a style they create | `github.test.ts` — `createElement('style')` and `insertRule(…)` keep the fix out of the repository; a repository with an ordinary script is still patched |
| URI semantics (`src/lib/github-pr.ts`) | One value per attribute name; `ping` read as a single URI | `github-pr.test.ts` — the duplicate `src`, the `ping` list, the duplicate `href` |
| Paint preservation (`src/lib/github-pr.ts`, `src/lib/fix-verification.ts`) | Modern colour alpha, zero-area targets, clipping, negative margins and animation end states were unknown | `github-pr.test.ts` — the modern zero-alpha colour, the zero-size target, the zero size with clipping, the negative margin; `fix-verification.test.ts` — the browser verdict for the transparent colour, the zero-area target, the clipped text, the negative margin, the viewport translation and the opacity animation endpoint |

### Gate status

The sixth, seventh and eighth review closures are shipped. The **release gate is
still closed**: it opens only when a **ninth** independent review returns READY
(Critical 0, High 0) against the closure tree. Every eighth-review reproduction
is blocked in the unsafe direction by the shipped regressions, and the temporary
payload re-run (the 12 fourth-review, 6 fifth-review, 8 sixth-review and 8
seventh-review reproductions, the eighth-review reproductions and the 9
legitimate behaviours) passed 78/78 and was deleted after the run.

## Seventh independent security review (2026-11-22)

**Verdict: NOT READY — Critical 0, High 3, Medium 4, Low 0.** The READY gate
requires Critical 0 and High 0. This tree was **not releasable** until every High
reproduction is blocked in the unsafe direction and a fresh independent review
returns READY.

The reviewed tree was `cdb246a` (`vol: releases — V23: volume log entry for the
sixth-review closure cycle`), against the requested baseline `0650188`; the
checkout at review time was `5a1b83e`. The reviewer's own artifact is
`.ai/SECURITY-REVIEW-7.md` (report only — no shipped source, docs, CI, dependency
or environment file was changed by the reviewer). Every reproduction used local
synthetic repositories, a mocked GitHub transport, local Chromium and
`127.0.0.1` listeners. No production, third-party or public target was scanned,
no live repository was mutated, no external GitHub Markdown service was called,
and **no Strix result is claimed** (every configured provider refused the run:
quota / EOL model / no credits).

### Reproduced findings and their closure

| ID | Severity | Surface | Reproduced unsafe result | Root cause | Closure |
|---|---|---|---|---|---|
| 7-H1 | **High** | Destination CSS declaration semantics | `styles.css` = `[alt]{position:fixed!important;inset:0;width:100%;height:100%;z-index:999999}` → `harm:null`, 1 write, Chromium measured `position:fixed`, `1280×720`, `z-index:999999`; the logical-viewport twin (`100vi`/`100vb`) did the same | The CSS reader kept the priority suffix in the declaration value (`fixed!important` is not the browser value `fixed`), did not know the logical viewport units, and left an unsupported value harmless instead of unprovable | `src/lib/css-context.ts` strips the priority suffix (`!important` and `! important`), knows every logical / small / large viewport unit (`vi`, `vb`, `sv*`, `lv*`), and makes a value, unit or keyword it cannot compute **unprovable** when the fix changes that property — an unprovable destination never receives a write |
| 7-H2 | **High** | Destination CSS relational selectors | `body:has(#target[alt]){position:fixed;inset:0;width:100%;height:100%}` → `harm:null`, 1 write, Chromium matched the ancestor (`body`) as a full-viewport fixed overlay | The analyser judged only the subject compound of a selector and ignored the ancestor relationship `:has()` creates — the accessibility attribute activates the customer-owned rule | Any selector containing `:has(` (also inside `:is(…)` / `:where(…)`) makes the destination **unprovable**, so the writer refuses the repository write |
| 7-H3 | **High** | Dynamic repository style carrier | `App.jsx` with `<style>{css}</style>` → `styleBlocks:["{css}"]`, `cssRules:0`, `harm:null`, 1 write, Chromium applied the overlay | `extractStyleBlocks` captured the raw body of a `<style>` element; a JSX expression body produced no rule and was silently treated as an empty, proven stylesheet | `collectStyleSources` marks a JSX expression body and a `dangerouslySetInnerHTML` style as **dynamic**; `src/lib/github.ts` treats a dynamic source as an unresolvable stylesheet problem → the destination is unprovable and the repository receives no write |
| 7-M1 | Medium | URI / navigation preservation | `//127.0.0.1:9/pixel?token=local`, `http:/127.0.0.1:9/pixel?token=local` and `http:\\127.0.0.1:9\\pixel` each validated, applied and hit the customer browser; `href="/account"` → `href="mailto:attacker@example.com"` was verified with confidence 1 and written | The remote-URL comparison matched the raw string against `^https?://` after a limited normalisation instead of resolving the URL the way a browser does, and it ignored the non-HTTP allowed schemes | `canonicalizeUri` (`src/lib/html-attributes.ts`) resolves the value with the platform `URL` parser against a fixed base (backslash separator, protocol-relative, single-slash `http:/host`); `src/lib/github-pr.ts` compares the **resolved** destination per attribute: changed, dropped or newly added destinations are refused, a changed-to-remote keeps the remote-URL wording, and a relative / `data:` destination stays allowed |
| 7-M2 | Medium | Visible-content preservation | `style="font-size:0;line-height:0;overflow:hidden"` and the repository twin `[aria-label]{font-size:0;line-height:0;overflow:hidden}` verified with confidence 1 while the text range measured `0×0`; `content-visibility:hidden`, `translate:-9999px`, `filter:opacity(0)` and `scale:0` did the same | The static style guard and the browser verifier knew `display:none`, `visibility:hidden`, element `opacity:0` and transparent text — but not zero-size text, paint suppression, content-visibility suppression or off-screen / zero-scale rendering | The static guard (`checkStyleAttribute`) and the browser verdict (`checkRenderedElement`, plus the rendered-text helper) now refuse `font-size:0`, `line-height:0`, `content-visibility:hidden`, `filter:opacity(0)`, `scale:0`, an off-screen `translate` / `text-indent` (≤ -1000 absolute units, ≤ -100 %) and a zero-area or off-screen **text range** (`document.createRange()`); the repository CSS reader (`stateOf`) treats the same values as hidden |
| 7-M3 | Medium | Rule-target / media preservation | `<textarea><img …></textarea>`, `<title><img …></title>` and `<!bogus <img …>>` were accepted, verified with confidence 1 and written (Chromium created `images:0`); `<img id="target" alt="Photo">` (the `src` dropped) did the same | The `image-alt` rule check found the `<img>` token lexically, so a raw-text or bogus-comment carrier passed, and it never required the original media source to remain | `validateFixForRule('image-alt')` now reads the **live** tag attributes (`liveTagAttributes()` — `parseHtmlTags` + `liveTagStarts`) and refuses a fix that does not contain a live `<img>`; it also refuses a fix that removes or changes the original `src` / `srcset` (compared canonically) |
| 7-M4 | Medium | Live HTML source mapping | `<html><frameset><img id="target" src="x"></frameset></html>` → scanner count 1, 1 write, Chromium reported `images:0`, `framesets:1` | The live-context scanner did not implement the frameset parsing state — the content of a frameset is frame content, not body content, so the browser creates no element for it | `frameset` is in `INERT_CONTENT_TAGS` (`src/lib/ast-patch.ts`): the occurrence count is 0, no patch is written, and the fix is not reported as applied |

### Closure evidence

| Fix | Root cause | Permanent regression |
|---|---|---|
| Browser-equivalent URI resolution (`src/lib/html-attributes.ts`, `src/lib/github-pr.ts`) | The destination comparison compared raw strings instead of resolved URLs | `html-attributes.test.ts` (`canonicalizeUri`), `github-pr.test.ts` (protocol-relative, one-slash, backslash, mailto mutation, destination preserved, destination added, relative added) |
| Hiding-value guard (`src/lib/github-pr.ts`, `src/lib/fix-verification.ts`) | Only four hiding forms were known | `github-pr.test.ts` (eight hiding styles), `fix-verification.test.ts` (painted-nowhere browser cases, the confidence gate) |
| Live element + media source (`src/lib/fix-validation.ts`) | The rule check was lexical and did not require the media source | `fix-validation.test.ts` (raw-text / bogus-comment carriers, a dropped source) |
| Frameset parsing state (`src/lib/ast-patch.ts`) | The inert-content list did not carry the frameset | `ast-patch.test.ts` (frameset counts 0, an ordinary body still counts 1), `github-pr.test.ts` (nothing is written into a frameset document) |
| CSS declaration semantics + relational selector + dynamic carrier (`src/lib/css-context.ts`, `src/lib/github.ts`) | The reader kept the priority suffix, missed the logical viewport units, judged only the selector subject and treated a dynamic `<style>` as empty | `css-context.test.ts` (priority suffix, logical viewport units, relational selector, unknown unit / keyword, dynamic style source, the hiding values), `github.test.ts` (no write for a dynamic style source, a hiding stylesheet, a priority / logical-unit stylesheet) |

**Reviewer-payload re-run:** 1 temporary file, **39/39 assertions** — the 12
fourth-review payloads, the 6 fifth-review payloads, the 8 sixth-review payloads
and the 8 seventh-review reproductions are all blocked in the unsafe direction,
and the 9 legitimate behaviours still pass. The file was deleted after the run;
every case it covered is now a permanent regression.

**Gate evidence (seventh-review closure):** `npx tsc -p tsconfig.check.json --noEmit`
exit 0 · `npm run lint` exit 0 · `npx vitest run --coverage` 53 files / 703 tests,
0 failed · coverage 64.94 / 56.85 / 66.88 / 66.50 (thresholds 55 / 50 / 58 / 57) ·
`npm run build` exit 0 · `npx playwright test --project=chromium` 79/79 ·
`npm audit --audit-level=high` Critical 0, High 0 (15 moderate).

**Release verdict: still NOT READY.** The gate opens only when an **eighth
independent review** returns READY (Critical 0, High 0).

## Sixth independent security review (2026-11-22)

**Verdict: NOT READY — Critical 0, High 2, Medium 6, Low 0.** The READY gate
requires Critical 0 and High 0. This tree is **not releasable** until both High
findings below are fixed at their root causes and every working reproduction is
blocked in the unsafe direction.

The reviewed tree was `0650188` (`vol: releases — V23: volume log entry for the
fifth-review closure cycle`). The source under review is the fifth-review
closure (`c62dc08..0650188` changes the five expected security modules, their
regressions and documentation). No shipped source was changed by this reviewer.
Every attack used local synthetic data, mocked GitHub writes, local Chromium and
`127.0.0.1` listeners. No production, third-party or public target was scanned,
no live repository was mutated, no external GitHub Markdown service was called,
and no Strix result is claimed.

### Reproduced findings

| ID | Severity | Surface | Working reproduction and observed result | Root cause / impact |
|---|---|---|---|---|
| 6-H1 | **High** | Destination CSS collection | Repository `index.html` contained `<img id="target" src="x">`; repository `site.scss` contained `[alt]{position:fixed;inset:0;width:100%;height:100%;z-index:999999}`; remediation was `<img id="target" src="x" alt="Photo">`. Observed: `{"fixesAppliedTotal":1,"writeCount":1,"writtenPath":"index.html","reads":["index.html","site.scss"],"scssReadForUniqueness":true,"scssIncludedInDestinationCssContext":false,"directHarmIfScssWereScanned":"the repository stylesheet can turn the patched element into a full-viewport overlay","computed":{"position":"fixed","width":1280,"height":720}}`. A linked local stylesheet variant produced `{"fixesAppliedTotal":1,"writes":1,"cssHits":1,"computed":{"position":"fixed","width":1280,"height":720}}`. | `src/lib/github.ts` reads every text blob for uniqueness but builds the destination CSS context only from `.css` files and `<style>` blocks in `.html`. A repository-owned preprocessor stylesheet is therefore read but never judged; the linked stylesheet is not fetched. The linked/CDN case was already disclosed as residual risk, but the SCSS case shows repository-owned style is also outside the promised destination context. The patch can turn the customer page into a full-viewport UI takeover. |
| 6-H2 | **High** | Browser-equivalent CSS semantics | Ten browser-valid rules were accepted by the writer with `harm:null` while Chromium computed `position:fixed`, `width:1280`, `height:720`: a comment opener inside a CSS string, escaped selector `[a\\6c t]`, escaped property `p\\6fsition`, escaped value `fix\\65 d`, negated selector, `100dvw`/`100dvh`, `min-width:100vw`/`min-height:100vh`, custom properties, native nested CSS, and `[alt="Photo"]` when `alt` already existed with another value. The writer applied the first variant once. The cascade variant observed `{"completedReads":["index.html","danger.css","safe.css"],"writerContextOrder":"danger.css then safe.css (completion order)","browserCascadeOrder":"safe.css then danger.css (link order)","harmInWriterOrder":null,"computedInBrowserOrder":{"position":"fixed","width":1280,"height":720}}`; the writer applied it once. | The hand-written analyzer is not browser-equivalent: it strips comments without string awareness, does not resolve CSS escapes/nesting/custom properties/modern viewport or minimum sizing, does not model a changed attribute value, and merges declarations in fetch-completion order rather than the destination cascade and specificity. The fifth-review class-token overlay remains reachable through equivalent `.css` syntax and stylesheet order. |
| 6-M1 | Medium | HTML source integrity / content loss | Remediation `<img id="target" src="x" alt="Photo"><!--` in `<html><body><img id="target" src="x"><button>Continue</button></body></html>` produced `{"validation":{"valid":true},"verification":{"status":"verified","confidence":1},"fixesApplied":1,"before":{"buttonCount":1},"after":{"buttonCount":0},"writtenContainsCommentOpener":true}`. | The remediation validator accepts an HTML comment opener. In the destination, the unclosed `<!--` comments out the rest of the document. The isolated snippet verifies because it contains no later UI, while the customer page loses the content after the target. This is the source-integrity equivalent of 4-M2's `plaintext` content loss. |
| 6-M2 | Medium | Visible-content preservation | Both `<img id="target" src="x" alt="Photo" hidden>` and `<img id="target" src="x" alt="Photo" style="display:none">` produced validation `valid:true`, axe `status:"verified"`, `confidence:1`, `fixesApplied:1`, computed `display:"none"`, `width:0`, `height:0`, `clientRects:0`. | The style guard rejects `opacity:0` but not `display:none`; the `hidden` attribute is not rejected in a remediation. The visible-text guard only protects text, and an image is a void element. Axe excludes the hidden image, so the fix is reported verified while removing the customer image. |
| 6-M3 | Medium | Visible-content preservation | Remediation `<a id="target" href="/about" aria-label="Read more" style="color:transparent">Read more</a>` produced `{"validation":{"valid":true},"verification":{"status":"verified","confidence":1},"fixesApplied":1,"computed":{"opacity":"1","visibility":"visible","color":"rgba(0, 0, 0, 0)","width":69.75,"height":17,"clientRects":1}}`. | `color:transparent` is not rejected, and the verification browser's computed-visibility check does not inspect text color. The link keeps its layout box and accessible name but the user can no longer read it. This is the color-equivalent of the opacity variants closed in 4-M6 and 5-M2. |
| 6-M4 | Medium | Customer-side network isolation | Remediation `<img id="target" src="http://127.0.0.1:<port>/sixth-review/pixel?token=local" alt="Photo">` produced `{"validation":{"valid":true},"verification":{"status":"verified","confidence":1},"fixesApplied":1,"hitsAfterVerification":0,"hitsAfterCustomerRender":1,"paths":["/sixth-review/pixel?token=local"]}`. | The URI allowlist permits HTTP(S) on an ordinary image and does not compare a proposed URI with the original element. The isolated verification browser blocks the request, so verification proves nothing about the customer browser; after merge, the customer browser makes the request. This reopens 4-M3's customer-side tracking/internal-request primitive through a still-accepted element type. |
| 6-M5 | Medium | Live HTML context | Sources `<!bogus <img src="x">>`, `<![CDATA[<img src="x">]]>` and `<template><div data-x="</template>"><img src="x"></template>` each produced `countedOccurrences:1`, `fixesApplied:1`, `browserImageCount:0`. | The live-tag scanner does not implement bogus-comment or HTML-CDATA parsing and treats a `</template>` sequence inside a quoted attribute as the real template end. Non-live markup is patched and counted as applied although Chromium creates no document image. This reopens 5-M3's false-applied/wrong-target path. |
| 6-M6 | Medium | Complete source scan | A tree with `index.html` and `payload.dat`, both containing `<img src="x">`, produced `{"fixesAppliedTotal":1,"writes":1,"writtenPath":"index.html","reads":["index.html"],"payloadDatRead":false}`. | The binary-extension denylist trusts the `.dat` suffix and skips the blob before it is read. A `.dat` file can be text or serve source-like content, so the duplicate is omitted and the remaining match looks unique. This is the same wrong-file path as 4-M5 and 5-M4. |

Variants that share one root cause are grouped above rather than counted more
than once. No Critical finding was reproduced.

### Exact fifth-review payload re-run

All six fifth-review payloads were re-run against `0650188`. The temporary suite
observed **6/6 blocked**; none reached a repository write in the unsafe
direction.

| Fifth-review item | Current-tree result |
|---|---|
| 5-H1 — added class and repository destination CSS | **BLOCKED**: added-class validation is false; the destination-CSS case applies 0 fixes and performs 0 writes. |
| 5-H2 — server-template remediation and destination | **BLOCKED**: template remediation validation is false; the template destination applies 0 fixes and performs 0 writes. |
| 5-M1 — entity-encoded input type | **BLOCKED**: validation is false with reason `remediation code introduces an <input> whose type carries an entity`. |
| 5-M2 — `opacity:0!important` | **BLOCKED**: validation is false with reason `remediation code hides the element with opacity: 0`. |
| 5-M3 — live HTML contexts | **BLOCKED**: template, iframe, script-prefix and never-closed-script cases each count 0 occurrences and apply 0 fixes. |
| 5-M4 — complete text-blob scan | **BLOCKED**: the unknown-extension duplicate and the submodule each apply 0 fixes and perform 0 writes. |

### Exact fourth-review payload re-run

All twelve fourth-review cases were re-run against `0650188`. The temporary
suite observed **12/12 blocked**; the three-H and nine-M payloads did not reach
a repository write in their unsafe direction.

| Fourth-review item | Current-tree result |
|---|---|
| 4-H1 — named-entity CSS overlay | **BLOCKED**: validation is false and 0 fixes are applied. |
| 4-H2 — alternate `--!>` comment terminator | **BLOCKED**: 0 fixes are applied and the literal alternate terminator is absent. |
| 4-H3 — JSX brace / TypeScript quote injection | **BLOCKED**: JSX validation is false; the unproven TypeScript destination applies 0 fixes and performs 0 writes. |
| 4-M1 — GFM bare URL | **BLOCKED**: escaped output is `https&#58;//evil.test/phishing` and contains no bare live URL. |
| 4-M2 — `plaintext` | **BLOCKED**: validation is false. |
| 4-M3 — `video` / `audio` / `source` / `track` / `input[type=image]` | **BLOCKED**: all five validations are false. The ordinary-image HTTP(S) equivalent is 6-M4. |
| 4-M4 — `encoding:'none'` | **BLOCKED**: the scan is incomplete; 0 fixes and 0 writes. |
| 4-M5 — duplicate in `.mjs` | **BLOCKED**: both files are read, the match is ambiguous, and 0 fixes/0 writes occur. The skipped-extension equivalent is 6-M6. |
| 4-M6 — `opacity:0` | **BLOCKED**: validation is false. The transparent-color equivalent is 6-M3. |
| 4-M7 — “Read more” reduced to “R” | **BLOCKED**: 0 fixes are applied and the original text remains. |
| 4-M8 — swapped remediations for identical copies | **BLOCKED**: 0 fixes are applied and neither copy receives the other's remediation. |
| 4-M9 — element inside an HTML comment | **BLOCKED**: 0 fixes are applied and no write occurs. The other non-live contexts are 6-M5. |

### Legitimate behavior checked

| Behavior | Result |
|---|---|
| Ordinary `image-alt` fix in HTML | PASS — one fix is applied and `alt="Photo"` is written. |
| Ordinary `image-alt` fix in TSX and in a `.js` file containing JSX | PASS — one fix is applied in each. |
| Legitimate `https:` and `mailto:` hrefs | PASS — both remediations validate. |
| Three identical copies selected together | PASS — all three are patched. |
| Two of three identical copies selected | PASS — neither is patched; the match is not provable. |
| Twelve additional server-template spellings | PASS — `<%`, `<?`, `{{`, `{%`, `{#`, whitespace-control and `{{!` forms are all rejected. |
| Symlink whose mocked GitHub response has no inline content | PASS — the scan is incomplete, so 0 fixes and 0 writes occur. |

### Verification evidence

| Command / check | Result |
|---|---|
| `npx vitest run src/lib/__tests__/tmp-sixth-security-review-evidence.test.ts --reporter=verbose` | exit 0 — 1 temporary file, 14/14 tests; includes all six fifth-review payloads, all twelve fourth-review payloads, every reproduced finding and the legitimate checks. The file was deleted after the run. |
| Focused symlink closure check in the same temporary suite | exit 0 — 1/1 test; 0 fixes and 0 writes. |
| `npx vitest run --coverage --reporter=dot` | exit 0 — 53 shipped files, 634/634 tests passed. |
| Coverage | PASS — statements 63.83% (threshold 55) · branches 55.16% (50) · functions 66.04% (58) · lines 65.29% (57). |
| `npx tsc -p tsconfig.check.json --noEmit` | exit 0. |
| `npm run lint` | exit 0 — 0 errors. |
| `npm run build` | exit 0 — Next 16.4.6 compiled successfully and generated 116 static pages. |
| `npm audit --audit-level=high --json` | exit 0 — Critical 0, High 0, Moderate 15, Low 0. |
| Tracked-file secret scan | 773 tracked files scanned without printing values. No live high-confidence secret was found. One AWS-key-shaped string is the known documentation example under `.openclaw/skills/`; the tracked `.env.example` contains placeholder instructions, not a discovered live credential. |

### OWASP/security-surface disposition for this scoped pass

| Surface | Result |
|---|---|
| Injection / XSS / source integrity | **FAIL** — 6-H1, 6-H2 and 6-M1 write destination-controlled behavior or remove source content; 6-M5 also reports a non-live target as applied. |
| SSRF / network isolation | The service-side verification isolation still blocked the local request, but the **customer-repository boundary fails** through 6-M4. |
| Broken access control / RBAC / tenant isolation | PASS in the scoped route: the existing `requireVerifiedEmail(..., CREATE_PR)` guard, repository allow-list and `project.orgId = auth.user.orgId` scope were unchanged. This is not a fresh full-product authorization audit. |
| Auth / sessions / OAuth / CSRF / cookies / CORS / headers | No changed code in these surfaces in this scoped diff. The route retains authenticated, verified-email and permission checks. No fresh full-product CSRF, OAuth, cookie, CORS or security-header audit is claimed. |
| SQL injection | The reviewed route uses Prisma parameters and the scoped modules contain no raw SQL; no SQLi reproduction was found. |
| Command injection / uploads | No shell execution or upload path changed in the reviewed baseline; no reproduction was attempted outside scope. |
| Rate limits / resource bounds | The existing request cap, per-user rate limit and two-browser semaphore were unchanged; no new concurrency reproduction was found. |
| Audit trail | The route ordering and three-attempt retry semantics were unchanged; no new persistent-audit failure was injected in this pass. |
| Dependencies / secrets | `npm audit` has no High/Critical finding; the tracked-file scan found no live secret. |

### Required closure criteria

1. Make the destination CSS decision cover every repository-owned style source
   (including preprocessors and style blocks outside HTML), or fail closed when
   such a source cannot be judged. A linked/CDN residual must not be the reason a
   repository-owned stylesheet is omitted.
2. Use browser-equivalent CSS parsing and cascade evaluation, or fail closed for
   syntax the analyzer cannot prove. CSS escapes, comments in strings, nesting,
   custom properties, modern/minimum viewport sizing, changed attribute values,
   stylesheet order and specificity must be covered by permanent regressions.
3. Reject an unterminated HTML comment opener in a remediation; reject a
   remediation that hides its own target; and extend the visibility decision to
   transparent text and equivalent visual hiding methods.
4. Do not introduce a new HTTP(S) resource URL. Compare proposed URI attributes
   with the original element and keep customer-side network isolation effective
   after merge.
5. Replace the remaining live-context approximations with browser-equivalent
   HTML parsing or fail closed for contexts the scanner cannot prove.
6. Do not trust an extension suffix as proof that a blob cannot contain
   source-like text. An omitted/ambiguous blob must make uniqueness fail closed.
7. Add permanent regressions for every reproduction above and re-run all six
   fifth-review and twelve fourth-review payloads before the next independent
   review.

### Untested / out of scope

- No production, third-party or public target was scanned; live GitHub writes
  were mocked. No Strix finding is claimed.
- No Sass/Less compiler was run. The SCSS proof uses a valid plain-CSS subset
  in a `.scss` file and proves the collection omission; it does not claim a
  particular build pipeline's output.
- FreeMarker-style `<#...>` grammar is not recognized by
  `containsTemplateGrammar`, but no FreeMarker execution proof was available;
  it is not counted as a finding.
- GitHub Markdown rendering was not exercised because external services were
  out of scope; only local escaping behavior and the exact 4-M1 payload were
  checked.
- The symlink result uses the documented no-inline-content GitHub response
  shape; no live GitHub repository was queried.
- The `<select><img>` candidate was not counted: local Chromium created the
  image (`browserImageCount:1`), so it was not a non-live context.
- No full Playwright E2E, Docker image/SBOM, multi-instance concurrency or
  container-Chromium run was performed in this pass.
- This was a focused V23 verified-fix/GitHub-writer audit, not a fresh
  full-product review of authentication, session lifecycle, CSRF, OAuth, CORS,
  uploads, SQLi or command injection.

### Cleanup

The temporary review file was deleted. Immediately after deletion,
`git diff --name-only -- src` and `git ls-files --others --exclude-standard` were
both empty. No commit, push, checkout, reset, destructive Git command, Strix
run, production change or secret modification was performed. This report is the
only intended repository change.

## Sixth-review closure (2026-11-22)

**Status: all eight sixth-review findings (High 2, Medium 6) are fixed at their
root cause and every working reproduction is blocked in the unsafe direction.**
The release gate stays **closed**: it reopens only when a **seventh independent
review** returns READY (Critical 0, High 0). The findings themselves are kept
verbatim above.

| ID | Severity | Root-cause closure | Permanent regression |
|---|---|---|---|
| 6-H1 | High | The destination CSS context is no longer built from `.css` files alone. `src/lib/github.ts` collects **every** repository-owned style source: the stylesheet files (`.css`, `.scss`, `.sass`, `.less`, `.pcss`, `.styl`, `.stylus`, `.sss`, `.postcss`), the `<style>` block of **every** file type, the stylesheets a file links (`<link rel="stylesheet">`, resolved against the tree) and the stylesheets they import (`@import`). A source that cannot be read or resolved (an external or unresolvable reference) makes the destination **unprovable**, so no source patch is written into it. | `src/lib/__tests__/github.test.ts` — a preprocessor stylesheet and a linked stylesheet each keep the fix out of the repository; a stylesheet whose syntax the analyser cannot resolve does the same. |
| 6-H2 | High | The hand-written analyzer was replaced by a browser-equivalent reader in `src/lib/css-context.ts`: CSS escapes are decoded in selectors, properties and values; comments are stripped outside strings only; native nesting is flattened (`&` is the parent selector, a nested selector without `&` is a descendant); the dynamic viewport units (`dvw`/`dvh`/`svw`/`lvh`), the minimum viewport sizing and the viewport edges are read; a changed attribute value is compared with the original element; the cascade is not simulated — the values of the rules that apply are unioned, so the verdict does not depend on the order the stylesheets were read in; the frames of an animation are judged when the element animates with them (only their geometry, so an ordinary fade does not block a fix). A value the analyser cannot compute (`var()`, an unknown function) makes the destination unprovable **when the fix changes that property** — an unchanged `width:var(--w)` of the customer is not something the fix introduced. | `src/lib/__tests__/css-context.test.ts` — the ten variants of the finding (escaped selector, escaped property, escaped value, negated selector, dynamic viewport units, minimum viewport sizing, custom properties, native nesting, changed attribute value, comment opener inside a string), the independence of the verdict from the stylesheet order, the harmless animation and the animation that covers the screen. |
| 6-M1 | Medium | `validateRemediation` rejects HTML comment syntax (`<!--`, `-->`, `--!>`): a comment ends at the first `-->`, so a comment opener in the fix swallows the markup behind it in the customer's page. | `src/lib/__tests__/github-pr.test.ts` — a remediation that carries a comment opener is invalid. |
| 6-M2 | Medium | A fix may not hide the element it patches: the `hidden` attribute and `display:none` / `visibility:hidden` on the patched element are rejected in `validateRemediation` and in `checkStyleAttribute`, `ast-patch.hidesContent` judges the element's own attributes, `applyFixesToFile` skips a replacement that hides its own target, and the verification browser judges the rendered element from the computed style (`checkRenderedElement`). | `src/lib/__tests__/github-pr.test.ts` (validation and the write path), `src/lib/__tests__/ast-patch.test.ts` (`hidesOwnTarget`), `src/lib/__tests__/fix-verification.test.ts` (the rendered element in a real browser). |
| 6-M3 | Medium | Transparent text is rejected statically (`color:transparent`, a colour with an alpha of zero — `rgba(0,0,0,0)`, `hsla(0,0%,0%,0)` — and `-webkit-text-fill-color:transparent`) and judged in the browser from the computed colour and the computed `-webkit-text-fill-color`. | `src/lib/__tests__/github-pr.test.ts` (the four spellings) and `src/lib/__tests__/fix-verification.test.ts` (the computed colour in a real browser). |
| 6-M4 | Medium | A fix may not introduce a remote URL the original element does not have: every URI attribute (`src`, `srcset`, `href`, `poster`, `data`, …) of the remediation is compared with the original element, with the scheme read the way the browser reads it (entities decoded, control characters removed). The URL that the original element already carried is kept. | `src/lib/__tests__/github-pr.test.ts` — a new remote URL is invalid, the URL of the original element is valid. |
| 6-M5 | Medium | The live-context scanner follows the browser: a markup declaration that is not a comment (`<!bogus …>`, a CDATA section) is a **bogus comment** that ends at the next `>`, and an end tag inside a quoted attribute value (`<template><div data-x="</template>">`) belongs to the attribute, not to the element. | `src/lib/__tests__/ast-patch.test.ts` — the bogus comment, the CDATA section and the quoted end tag each count zero occurrences. |
| 6-M6 | Medium | The extension suffix is no longer proof that a blob cannot hold source-like text: a blob whose name does not say (`.dat`, `.bin`) is **read**, and the **content** decides — a NUL byte cannot appear in a text file, so a binary blob cannot hold the element and is left out of the scan, while a text blob holds it and makes the match ambiguous. | `src/lib/__tests__/github.test.ts` — the ambiguous blob is read in both cases; a text blob makes the match ambiguous (0 fixes), a binary blob does not. |

### Sixth-review closure — verification evidence

| Command / check | Result |
|---|---|
| Temporary reviewer-payload re-run (`src/lib/__tests__/tmp-reviewer-payload-rerun.test.ts`) | exit 0 — 1 temporary file, **36/36 assertions**: the six fifth-review payloads (9 assertions), the twelve fourth-review payloads (12 assertions), the eight sixth-review reproductions (10 assertions) are all blocked in the unsafe direction, and the eight legitimate behaviours still pass (an ordinary HTML/TSX/JS fix, `https:`/`mailto:` hrefs, three identical copies patched, two of three left alone, twelve template spellings rejected, a symlink fails closed). The file was deleted after the run — every case is covered by a permanent regression. |
| `npx vitest run` | PASS — 53 files, 667/667 tests (was 53/634; the new regressions are permanent, no temporary file remains). |
| `npx vitest run --coverage` | PASS — statements 64.80% (threshold 55) · branches 56.21% (50) · functions 66.80% (58) · lines 66.34% (57). |
| `npx tsc -p tsconfig.check.json --noEmit` | exit 0. |
| `npm run lint` | exit 0 — 0 errors. |
| `npm run build` | exit 0 — Next standalone build. |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed. |
| `npm audit --audit-level=high` | exit 0 — Critical 0, High 0 (15 moderate, dev toolchain). |
| Seventh independent security review | PENDING — the release gate opens only on READY (Critical 0, High 0). |

### Sixth-review closure — residual risk

- A stylesheet that the analyser cannot judge (a preprocessor at-rule, an unknown
  at-rule, a variable or an interpolation it cannot resolve) makes the whole
  destination **unprovable**: the fix stays a review suggestion. This is the
  fail-closed direction the review allows, but it means that a repository whose
  stylesheets use such syntax receives fewer source patches than before.
- A repository whose tree holds an **ambiguous blob** that the GitHub contents
  API cannot inline (`encoding: 'none'`) makes the scan incomplete, so no file is
  patched. The blob is read before that decision is taken, which is what the
  finding asks for; the incompleteness is the documented fail-closed behaviour.
- The CSS reader is a static reader: it judges the rules it can read, not the
  rendered result. A rule that only becomes an overlay through a runtime value
  (a custom property the analyser cannot resolve, a script that writes a style)
  is either unprovable (custom property) or outside the reader's reach (script).

## Fifth-review closure (2026-11-22)

**Status: all six fifth-review findings are fixed at their root cause, and every
working reproduction is blocked in the unsafe direction.** The release gate stays
**closed**: it reopens only when a **sixth independent review** returns READY
(Critical 0, High 0). The findings themselves are kept verbatim below.

| ID | Severity | Root-cause closure | Permanent regression |
|---|---|---|---|
| 5-H1 | High | The repository's own CSS is part of the destination. `src/lib/css-context.ts` collects every rule of every `.css` file and every `<style>` block (comments stripped, `@media`/`@supports`/`@layer` groups recursed into) and judges the patched element against it: a rule that can make it a full-viewport overlay (a positioned element that spans the viewport) or hide it (`display:none`, `visibility:hidden`, `opacity:0`) keeps the fix out of the repository. The rules of a utility stylesheet are read together, so `fixed inset-0 w-screen h-screen` is caught even when no single rule covers the viewport. As a second, cheap layer, a remediation may not add a class token the original element does not have. | `src/lib/__tests__/css-context.test.ts` (11 cases) · `src/lib/__tests__/github.test.ts` (overlay, hidden, harmless-stylesheet, write-allowed) · `src/lib/__tests__/github-pr.test.ts` (new-class rejection, class kept) |
| 5-H2 | High | Two layers. The remediation is rejected when it carries server-template grammar (`<%`, `%>`, `<?`, `?>`, `{{`, `}}`, `{%`, `%}`, `{#`, `#}`) — the template engine of the customer's build evaluates it. And an HTML destination that carries that grammar is not a proven HTML destination: nothing is written into it at all, not the patch and not the review comment, because the engine would evaluate the comment as well. | `src/lib/__tests__/github-pr.test.ts` (template grammar rejected, template destination untouched) · `src/lib/__tests__/github.test.ts` (template destination, no write) |
| 5-M1 | Medium | The `type` attribute is read the way the browser reads it: the value is entity-decoded before it is classified, and any `<input>` whose raw `type` carries an entity is rejected, because a partial entity table cannot mirror a browser. | `src/lib/__tests__/github-pr.test.ts` (entity-encoded image type rejected) |
| 5-M2 | Medium | The CSS priority suffix (`! important`) is stripped before the hidden-content checks in both the writer (`checkStyleAttribute`) and the AST guard (`hidesContent`), so `opacity:0!important` is the same declaration as `opacity:0` and is rejected outright. The verification browser now decides visibility from the **computed style** (opacity, visibility, display, client rects) instead of `innerText` alone, and compares against the original visible text, entity-decoded, normalised and case-insensitive. | `src/lib/__tests__/github-pr.test.ts` (`opacity:0!important` rejected) · `src/lib/__tests__/ast-patch.test.ts` (priority suffix hides content) · `src/lib/__tests__/fix-verification.test.ts` (a text the user cannot see fails the verification) |
| 5-M3 | Medium | The live-context scanner follows the browser: `iframe`/`noembed`/`noframes` are raw-text elements, the content of `template`/`object`/`applet` is inert (depth-aware skip to the matching close tag), a raw-text end tag has to be a real end tag (`</scripture>` does not close a script), and an element that is never closed keeps the rest of the document as its text. | `src/lib/__tests__/ast-patch.test.ts` (template, iframe, script-prefix, never-closed) |
| 5-M4 | Medium | The uniqueness scan reads **every text blob** of the tree instead of an extension allowlist (known-binary extensions are skipped), and a tree entry that is not a blob — a submodule, `type:"commit"` — marks the scan incomplete. An incomplete scan fails closed: no file is written. | `src/lib/__tests__/github.test.ts` (unknown extension scanned, submodule blocks every write) |

### Closure verification evidence

| Command / check | Result |
|---|---|
| Temporary exact-payload reproduction suite (all six fifth-review findings plus the twelve fourth-review payloads) | exit 0 — 1 temporary file, 8/8 tests. The sixth case asserts the legitimate fix still lands. The file was deleted after the run. |
| `npx vitest run --coverage` | exit 0 — 53 shipped files, 634/634 tests, 0 failed |
| Coverage | PASS — statements 63.83% (threshold 55) · branches 55.16% (50) · functions 66.04% (58) · lines 65.29% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | exit 0 |
| `npm run lint` | exit 0 — 0 errors |
| `npm run build` | exit 0 — Next standalone build |
| `npx playwright test --project=chromium` | exit 0 — 79 passed, 0 failed |
| `npm audit --audit-level=high` | exit 0 — Critical 0, High 0 (15 moderate, dev toolchain) |

### Residual risk accepted by this closure

- The destination CSS judgement is **static**: CSS-in-JS, CDN stylesheets, inline
  `style` attributes that already exist on the element, and structural
  pseudo-class selectors are outside it. They are documented, not silently claimed.
- A repository larger than the 5 MB scan budget, a tree the API reports as
  `truncated`, an unreadable file and a submodule all fail closed: the fix stays a
  review suggestion instead of being written.
- The AST is parsed per file per violation; there is still no AST cache (the 60 s
  batch deadline bounds the cost).

## Fifth independent security review (2026-11-22)

> **Historical — the six fifth-review findings are fixed.** The verdict below was
> NOT READY (Critical 0, High 2, Medium 4, Low 0) against tree `c62dc08`. The
> closure and its evidence are at the top of this file; the review report is kept
> verbatim below as the finding contract.

**Verdict: NOT READY — Critical 0, High 2, Medium 4, Low 0.** The READY gate
requires Critical 0 and High 0. This tree is **not releasable** until both High
findings below are fixed and their working reproductions are blocked.

The requested baseline was `8afc55a..ea21622`. The reviewed source was
`c62dc08`; `git diff --name-only ea21622..HEAD -- src` is empty, so the shipped
source under review is identical to `ea21622`. The committed HEAD differed from
`ea21622` only in `.ai/SECURITY-STATUS.md`. No shipped source was changed by
this reviewer. Every attack used local synthetic data and mocked GitHub writes;
no production, third-party or public target was scanned, no live repository was
mutated, and no Strix result is claimed.

### Reproduced findings

| ID | Severity | Surface | Working reproduction and observed result | Root cause / impact |
|---|---|---|---|---|
| 5-H1 | **High** | Destination CSS context | Remediation `<img id="target" src="data:image/gif;base64,…" alt="Photo" class="overlay">`; repository source `<style>.overlay{position:fixed;inset:0;width:100%;height:100%;z-index:999999}</style><img id="target" src="x">` → `{"validation":true,"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writtenClass":true,"computed":{"position":"fixed","zIndex":"999999","width":1280,"height":720}}`. | The overlay denylist inspects only an inline `style` attribute. The isolated axe document does not contain the repository's stylesheet, so adding an existing class verifies cleanly; after the write, Chromium applies that class and covers the complete viewport. This is the class-driven equivalent of 4-H1 and can turn an accessibility fix into a customer UI takeover. |
| 5-H2 | **High** | Destination template grammar | Remediation `<img src="x" alt="Photo"><span data-note="<%= globalThis.__fifthTemplateInjection = true %>"></span>`; repository source `<% const pageTitle = "Home"; %><img src="x">` in `template.html` → `{"validation":true,"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writtenExpression":"globalThis.__fifthTemplateInjection = true","templateExecuted":true}`. | `.html` is treated as proven HTML even when it is a server template. EJS-style `<%= … %>` contains no rejected brace, survives validation, is inert in the isolated browser, and is written into the template. Evaluating the exact written expression in Node's `vm` set the flag to `true`. A standard EJS-style renderer would therefore execute attacker-controlled server code; this is the template equivalent of 4-H3. |
| 5-M1 | Medium | Resource-loader safety | Remediation `<img … alt="Photo"><input type="im&#97;ge" src="http://127.0.0.1:<port>/pixel">` → `{"validation":true,"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writtenEncodedType":true,"customerRequests":["/pixel"]}`. | The `input[type=image]` check compares the raw `type` attribute with `image`; it does not decode the HTML entity first. Chromium decodes `im&#97;ge` to `image` and issues the request in the customer browser. This reopens the client-side tracking/internal-request primitive from 4-M3 through entity encoding. |
| 5-M2 | Medium | Visible-content preservation | Remediation `<button style="opacity:0!important">Read more</button>` → `{"validation":true,"preservesVisibleContent":true,"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"rendered":{"opacity":"0","innerText":"Read more"}}`. | The static opacity guard accepts only a value ending immediately after `0`; the CSS priority suffix `!important` defeats it. `innerText` still contains opacity-zero text, so axe also accepts it. The label is written but visually invisible, reopening 4-M6 through a CSS suffix. |
| 5-M3 | Medium | Live HTML context | Sources `<template><img src="x"></template>`, `<iframe><img src="x"></iframe>` and `<script></scripture><img src="x"></script>` → `{"template":{"countedOccurrences":1,"fixesAppliedTotal":1,"documentImages":0},"iframe":{"countedOccurrences":1,"fixesAppliedTotal":1,"documentImages":0},"script-prefix":{"countedOccurrences":1,"fixesAppliedTotal":1,"documentImages":0}}`. | The hand-written live-tag scanner is not browser-equivalent: template content and iframe fallback content are treated as live, and the raw-text close search accepts the `</script` prefix of `</scripture>`. Each inert occurrence is patched and counted as applied although Chromium creates no document image. This reopens 4-M9's false-applied/wrong-target path. |
| 5-M4 | Medium | Complete source scan | A tree with `index.html` and a duplicate `page.hbs`, and a tree with `index.html` plus `components/ui` (`type:"commit"`) → `{"omittedHbs":{"fixesAppliedTotal":1,"reads":["index.html"],"wrote":"index.html"},"omittedSubmodule":{"fixesAppliedTotal":1,"reads":["index.html"],"wrote":"index.html"}}`. | The writer filters tree entries to an extension allowlist and `type:"blob"` before loading them. An omitted template extension and a submodule are therefore never fetched and never set `scanIncomplete`; the duplicate in `index.html` looks unique and the wrong file is written. This reopens 4-M4/4-M5's incomplete-scan path. |

Variants that share one root cause are grouped above rather than counted more
than once. No Critical finding was reproduced.

### Exact fourth-review payload re-run

All twelve fourth-review cases were re-run against `c62dc08`. The temporary
suite observed **12/12 blocked**; the three-H and nine-M payloads did not reach
a repository write in their unsafe direction.

| Fourth-review item | Current-tree result |
|---|---|
| 4-H1 — named-entity CSS overlay | **BLOCKED**: validation is false and 0 fixes are applied. |
| 4-H2 — alternate `--!>` HTML comment terminator | **BLOCKED**: the terminator is neutralized and Chromium does not execute the script. |
| 4-H3 — JSX brace / TypeScript quote injection | **BLOCKED**: braces are rejected and unproven TypeScript destinations are not patched. |
| 4-M1 — GFM bare URL | **BLOCKED**: the escaped output contains `https&#58;//`, not a bare live URL. |
| 4-M2 — `plaintext` | **BLOCKED**: validation is false. |
| 4-M3 — `video` / `audio` / `source` / `track` / `input[type=image]` | **BLOCKED** in their literal form; the entity-encoded input variant is 5-M1. |
| 4-M4 — `encoding:'none'` | **BLOCKED**: the scan is incomplete and no write occurs. |
| 4-M5 — duplicate in `.mjs` | **BLOCKED**: `.mjs` is scanned and no write occurs. |
| 4-M6 — `opacity:0` | **BLOCKED** in its literal form; the `!important` variant is 5-M2. |
| 4-M7 — “Read more” reduced to “R” | **BLOCKED**: the visible-text guard rejects it. |
| 4-M8 — swapped remediations for identical copies | **BLOCKED**: 0 fixes and no write. |
| 4-M9 — element inside an HTML comment | **BLOCKED**: 0 fixes and no write. |

Two additional closure candidates were also checked. The `<!-->` variant is
**blocked** because it contains the literal `-->` suffix and the neutralizer
rewrites it (`{"fixesApplied":0,"literalTerminatorPresent":false,"scriptExecuted":false}`).
The `java&NewLine;script:` URI is **blocked** after entity decoding
(`{"valid":false,"reason":"remediation code contains an active URI scheme in href: javascript:"}`).
Neither is a fifth-review finding.

### Legitimate behavior checked

| Behavior | Result |
|---|---|
| Ordinary `image-alt` fix in HTML | PASS — one fix is applied and `alt="Photo"` is written. |
| Ordinary `image-alt` fix in TSX and in a `.js` file containing JSX | PASS — one fix is applied in each and the file still parses. |
| Legitimate `https:` and `mailto:` hrefs; ordinary Markdown prose | PASS — the URIs remain valid and ordinary prose is unchanged. |
| Three identical copies selected together | PASS — all three are patched. |
| Two of three identical copies selected | PASS — neither is patched; the match is not provable. |
| BOM/CRLF source | PASS — the exact element is still located. |
| Oversized tree and unreadable file | PASS — both fail closed with no write. |

One already-documented functional limitation remains outside the security
count: replacing a JSX element can drop source-only props such as `onClick` and
`style`. It is part of the existing “verified fix can still break surrounding
code” residual risk, not a new security-boundary crossing.

### Verification evidence

| Command / check | Result |
|---|---|
| `npx vitest run src/lib/__tests__/tmp-fifth-security-review.test.ts --reporter=verbose` | exit 0 — 1 temporary file, 36/36 review assertions; the file was deleted after the run. |
| Focused final reproduction suite | exit 0 — 1 temporary file, 7/7 tests, including all six findings and the `<!-->` / `&NewLine;` closure checks; the file was deleted after the run. |
| `npx vitest run --reporter=dot` (with the 36-test review file) | exit 0 — 53 files, 641/641 tests passed. |
| `npx vitest run --reporter=dot` (after temporary-file deletion) | exit 0 — 52 shipped files, 605/605 tests passed. |
| `npx tsc -p tsconfig.check.json --noEmit` | exit 0. |
| `npm run lint` | exit 0 — 0 errors. |
| `npm run build` | exit 0 — Next standalone build compiled successfully and generated 116 static pages. |
| `npm audit --audit-level=high --json` | exit 0 — Critical 0, High 0, Moderate 15, Low 0. |
| Tracked-file secret scan | 771 tracked text files scanned without printing values. No live secret was found. One AWS-key-shaped string is a documentation example under `.openclaw/skills/`; its value was redacted during classification. |

### OWASP/security-surface disposition for this scoped pass

| Surface | Result |
|---|---|
| Injection / source integrity | **FAIL** — 5-H1 and 5-H2 write destination-controlled CSS/template behavior into customer source; 5-M1 and 5-M2 also pass both gates with unsafe customer-visible effects. |
| SSRF / network isolation | The service-side verification isolation remains in force, but the **customer-repository boundary fails** through 5-M1's encoded resource loader. |
| Broken access control / RBAC / tenant isolation | PASS in the scoped route: the existing `requireVerifiedEmail(..., CREATE_PR)` guard and `project.orgId = auth.user.orgId` scope were unchanged. This is not a fresh full-product authorization audit. |
| Auth / sessions / CSRF / OAuth / cookies / CORS / headers | No changed code in these surfaces in this scoped review; no independent full-product re-audit is claimed. |
| SQL injection | The reviewed route uses Prisma parameters and the scoped modules contain no raw SQL; no SQLi reproduction was found. |
| Command injection / uploads | No shell execution or upload path changed in the reviewed baseline; no reproduction was attempted outside scope. |
| Rate limits / resource bounds | The existing request cap, per-user rate limit and two-browser semaphore were unchanged; no new concurrency reproduction was found. |
| Audit trail | The route ordering and retry semantics were unchanged; no new audit-write fault was injected in this pass. |
| Dependencies / secrets | `npm audit` has no High/Critical finding; the tracked-file scan found no live secret. |

### Required closure criteria

1. Make verification destination-aware for repository CSS classes and server
   template grammars, or reject class/style/template semantics that cannot be
   proved safe in the isolated snippet.
2. Decode HTML entities before classifying resource-loader element types.
3. Parse CSS priority suffixes when deciding whether content is visually hidden,
   and use computed visibility rather than `innerText` alone.
4. Replace the incomplete live-context scanner with browser-equivalent handling
   for template, iframe and raw-text end states.
5. Treat every omitted source-like tree entry (unknown extension or submodule)
   as an incomplete scan; uniqueness must fail closed until it is scanned.

### Untested / out of scope

- No production, third-party or public target was scanned; live GitHub writes
  were mocked. No Strix finding is claimed.
- The 5-H2 proof uses the standard EJS `<%= expression %>` form and executes the
  exact expression extracted from the written file in Node's `vm`; no EJS
  package was installed and no customer framework build was run. It proves that
  executable server-template source is written, not a particular framework's
  sandbox policy.
- GitHub Markdown rendering was not exercised because this review was restricted
  to local/mock-only targets; only the local escaping behavior was checked.
- No full Playwright E2E, coverage, Docker image/SBOM, multi-instance
  concurrency or container-Chromium run was performed in this pass.
- This was a focused V23 verified-fix/GitHub-writer audit, not a fresh
  full-product review of authentication, session lifecycle, CSRF, OAuth, CORS,
  uploads, SQLi or command injection.

### Cleanup

Both temporary review files were deleted. `git diff --name-only -- src` and
`git ls-files --others --exclude-standard` were both empty immediately after
deletion. This report and the accompanying state/report updates are
documentation-only changes.

## Fourth independent security review (2026-11-22)

> **Historical — the literal fourth-review payloads are fixed.** The verdict below
> was NOT READY (Critical 0, High 3, Medium 9, Low 0) against tree `8afc55a`.
> The fifth review later found equivalent paths and returned **NOT READY (High 2,
> Medium 4)**; the current verdict and evidence are at the top of this file.

**Verdict: NOT READY — Critical 0, High 3, Medium 9, Low 0.** The READY gate
requires Critical 0 and High 0. This tree was **not releasable** until the three
High findings below were fixed and their working reproductions were blocked.

The requested baseline was `456d375`, but a concurrent process committed the
review fixes while this review was running. The final results below were
re-run against the actual tree at `8afc55a` (`456d375..8afc55a` changes the
five reviewed source modules, their tests and CI/docs). No shipped source was
changed by this reviewer. All attacks were local, used synthetic data and
mocked GitHub writes, and touched no production or third-party target.

### Reproduced findings

| ID | Severity | Surface | Working reproduction and observed result | Root cause / impact |
|---|---|---|---|---|
| 4-H1 | **High** | Overlay-style safety | `<img id="overlay" src="x" alt="A" style="position&sol;&ast;x*&sol;:fixed;width:100%;height:100%">` → validation `valid:true`, axe confidence `1`, `fixesApplied:1`, repository write `index.html / 1`; Chromium computed `position:fixed`, `width:1280px`, `height:720px`. | The browser decodes the complete HTML entity set before CSS parsing, but the checker's named-entity table omits `ast`. The checker therefore sees `position/&ast;x*/` while Chromium sees `position/*x*/` and resolves `position:fixed`. A full-viewport overlay can be written into customer source. |
| 4-H2 | **High** | Untrusted source comment | A violation description containing `evil --!> <script>globalThis.__repositoryCommentBreakout = true</script>` → the review comment written into `index.html` contained both `--!>` and `<script>`; Chromium executed the script (`__repositoryCommentBreakout === true`). | `neutralizeCommentTerminator()` removes only the literal `-->`. HTML parsers also accept `--!>` as a comment end, so untrusted text closes the generated comment and turns the remainder into active markup in the customer repository. |
| 4-H3 | **High** | Source-language context | TSX: `<div role="button">Hello{globalThis.__jsxInjection = true}</div>` → validation `valid:true`, axe confidence `1`, `fixesApplied:1`, repository write `Card.tsx / 1`; rendering the component set `__jsxInjection === true`. TS: `<div role="button">Hello';globalThis.__tsInjection = true;//</div>` → `valid:true`, `fixesApplied:1`; executing the written module set `__tsInjection === true`. | Remediation is validated as HTML, then inserted into JSX or a TypeScript string without validating the destination lexical context. Braces and quote/line-comment escapes become executable customer code. |
| 4-M1 | Medium | Markdown injection | `escapeMarkdownText('https://evil.test/phishing')` → GitHub's Markdown API returned `href="https://evil.test/phishing"`. The same escaped prose is used for attacker-controlled descriptions in the PR body and fix document. | The Markdown escaper does not neutralize GFM bare-URL autolinks. The exact code-span selector injection is closed, but untrusted prose can still create a live attacker-controlled link. |
| 4-M2 | Medium | Active/raw-text element safety | `<img src="x" alt="A"><plaintext></plaintext>` → validation `valid:true`, axe confidence `1`, `fixesApplied:1`; Chromium reported `buttonCount:0` and rendered the later `<button>Continue</button>` as plain text. | `plaintext` is absent from the active-tag list. Its browser parsing semantics consume the rest of the customer document, so one accepted remediation can remove the remaining UI. |
| 4-M3 | Medium | Customer-side remote resource loading | Accepted `video`, `audio` and `input[type=image]` elements reached a local HTTP server; `source` and `track` are accepted as well. The verification browser blocks the request, but the accepted markup issues the request when the customer repository is served. | The active-tag list does not reject resource-loader elements and the HTTP(S) URI allowlist does not distinguish an unchanged customer resource from a newly introduced attacker/internal URL. The result is a client-side tracking and internal-network request primitive after merge. |
| 4-M4 | Medium | Complete source scan | `getContent` for `a.html` returned `{content:'', encoding:'none'}` while `b.html` contained the target → `filesModified:[{path:'b.html',fixesApplied:1}]` and one GitHub write. | The reader treats the presence of `content` as readable content. GitHub uses `encoding:'none'` when the Contents API cannot inline a large file; the empty value was cached as a successfully scanned file, so uniqueness was not proven. |
| 4-M5 | Medium | Complete source scan / file set | A tree containing `app.mjs` and `index.html`, both with the same target → only `index.html` was fetched and patched. `app.mjs` was silently outside the scan. | The source extension allowlist omits common source extensions (`.mjs`; the same family includes `.cjs`, `.mts` and `.cts`). A duplicate in an omitted file can make the remaining match look unique. |
| 4-M6 | Medium | Visible-content preservation | `<button><span>Read more</span></button>` → `<button><span style="opacity:0">Read more</span></button>` → `preservesVisibleContent:true`, `fixesApplied:1`; Chromium computed `opacity:0` and the accessible button name remained `Read more`. | The static guard only recognizes `hidden`, `display:none` and `visibility:hidden`; the verification gate checks `innerText`, which still contains opacity-zero text. The label can be made visually invisible while passing both gates. |
| 4-M7 | Medium | Visible-content preservation | `<button>Read more</button>` → `<button>R</button>` → axe confidence `1`, `fixesApplied:1`; the page body became `R`. | The guard only asks whether any replacement text exists. It does not preserve the original label, so almost all user-visible meaning can be removed while the fix is reported as verified and applied. |
| 4-M8 | Medium | Wrong occurrence | Two selected identical `<img src="same.jpg">` elements with remediations `Second` then `First` → `fixesApplied:2`; the first occurrence received `Second` and the second received `First`. | When every duplicate is selected, occurrence identity is still assigned from request order. The writer does not consume `elementSelector`, and the route's database query has no deterministic occurrence order, so the remediation can land on the wrong copy. |
| 4-M9 | Medium | Wrong target / applied counter | `<!-- <img src="a.jpg"> -->` → `fixesApplied:1` and the comment contained the patched image, but Chromium found `img` count `0`. | The plain-HTML locator is substring-based and does not exclude comments. A non-live target is patched and reported as applied, overstating the fix and leaving the real violation unchanged. |

### Exact findings and required variants re-run

| Original item | Current-tree result |
|---|---|
| H1 — CSS-escaped full-viewport overlay | **BLOCKED before write**: validation is false and `applyFixesToFile` applies 0 fixes. Direct CSS comments, numeric entities and the standard escape variants are also blocked. The named-entity variant above remains open. |
| H2 — `frame`/`frameset` remote document | **BLOCKED before write**: validation is false, 0 fixes, no frame written. `portal`, `fencedframe` and `math` are blocked. The raw-text and remote-loader variants above remain open. |
| M1 — backtick selector injection | **BLOCKED**: the PR body and fix document were rendered through GitHub's Markdown API and contained neither `href="https://a.test"` nor `>x</a>`. Sized inline-code fences and adversarial backtick runs are blocked. GFM bare-URL autolinking remains open as 4-M1. |
| M2 — truncated tree and unreadable file | **BLOCKED before write**: both reproductions produce `filesModified:[]` and no GitHub write. The `encoding:none` and omitted-extension variants remain open as 4-M4/4-M5. |
| M3 — `aria-hidden` label deletion | **BLOCKED**: the exact replacement is rejected, 0 fixes are applied and `Read more` remains. The opacity and label-reduction variants remain open as 4-M6/4-M7. |
| M4 — audit write failure | **PASS against the stated acceptance criterion**: `createAuditLogWithRetry` makes exactly 3 attempts with 250 ms and 500 ms delays. The route honestly reports `auditRecorded:false` after exhaustion. Residual risk: the PR still exists without an audit row when the database remains unavailable; this is not counted as a new finding because retry was the required closure. |
| M5 — one selected occurrence among two duplicates | **BLOCKED before a source patch**: 0 fixes; both elements remain unchanged and the fallback is a review comment. When both duplicates are selected, request-order and comment-target variants remain open as 4-M8/4-M9. |

### Verification evidence

| Command / check | Result |
|---|---|
| `npx vitest run src/lib/__tests__/tmp-security-review.test.ts src/app/api/github/create-pr/__tests__/tmp-security-review.test.ts --reporter=verbose` | exit 0 — 2 files, 32/32 review reproductions passed. A passing reproduction asserts that the unsafe behavior is still present; the exact H1/H2/M1–M5 cases assert that the write is blocked. |
| `npx vitest run --reporter=dot` (with the two temporary review files) | exit 0 — 54 files, 612/612 tests passed. |
| `npx vitest run --reporter=dot` (after temporary-file deletion) | exit 0 — 52 shipped files, 580/580 tests passed. |
| `npx tsc -p tsconfig.check.json --noEmit` | exit 0. |
| `npm run lint` | exit 0. |
| `npm run build` | exit 0 — Next 16.4.6 compiled successfully and generated 116 static pages. |
| `npm audit --audit-level=high --json` | exit 0 — Critical 0, High 0, Moderate 15, Low 0. |
| Tracked-file secret scan | 771 tracked text files scanned without printing values. No live secret was found. One AWS-key-shaped string is a documentation example under `.openclaw/skills/`; no `.env`, key, PEM, credential or service-account JSON file is tracked. |
| GitHub Markdown API | `gh api markdown --method POST --input -` returned HTTP 200 for every adversarial PR/fix rendering. |

### OWASP/security-surface disposition for this scoped pass

| Surface | Result |
|---|---|
| Injection / XSS | **FAIL** — 4-H1 through 4-H3 reproduce in Chromium or by executing the written customer source. |
| SSRF / network isolation | Verification isolation remains blocked for the exact H2 path; **FAIL at the customer-repository boundary** because 4-M3 can introduce customer-side requests. |
| Auth / session / CSRF / OAuth / cookies / CORS / headers | No changed code in these surfaces in this scoped review; not independently re-audited in this pass. The reviewed route continues to use the existing verified-email RBAC guard. |
| SQL injection | The reviewed route uses Prisma parameters and no raw SQL; no SQLi reproduction was found in scope. |
| Command injection / uploads | No shell execution or upload path exists in the reviewed module; no reproduction was attempted outside scope. |
| Rate limits / resource bounds | The existing request cap, per-user rate limit and two-browser semaphore were unchanged; no new concurrency reproduction was found in this pass. |
| RBAC / tenant isolation | The route scopes violations through `project.orgId = auth.user.orgId`; no cross-tenant bypass was reproduced in the reviewed path. |
| Audit trail | Retry semantics pass the stated criterion; the persistent-database-failure residual is recorded above. |
| Dependencies / secrets | `npm audit` has no High/Critical finding; the tracked-file scan found no live secret. |

### Untested / out of scope

- No production, third-party or public target was scanned; live GitHub writes were mocked. No Strix finding is claimed.
- No full Playwright E2E, coverage, Docker image/SBOM, multi-instance concurrency or container-Chromium run was performed in this pass.
- GitHub Markdown rendering was tested through GitHub's API, but no pull request was opened and no GitHub repository was mutated.
- Vue/Svelte/Angular framework event-directive execution was not run in a framework runtime; the finding count relies on the reproduced JSX and TypeScript source-context executions.
- This was a focused V23 verified-fix/GitHub-writer audit, not a fresh full-product review of authentication, session lifecycle, CSRF, OAuth, CORS, uploads, SQLi or command injection.

### Cleanup

Both temporary review files were deleted. Immediately after deletion,
`git status --short` showed only the pre-existing `.ai/DEPLOYMENT.md` change; no
temporary test or source change remained. This report and the accompanying
state/report updates are documentation-only changes made by the reviewer.

### Fourth-review closure (2026-11-22)

All twelve findings of the fourth review are fixed. Each fix is a **root-cause**
fix in the shared code, not a payload-specific block, and each has a permanent
regression test that fails on the old code.

| ID | Root cause | Fix |
|---|---|---|
| 4-H1 | The overlay check decoded the attribute with a **partial** named-entity table, so an entity the table did not know (`&ast;`) was read as literal text while the browser resolved it as a CSS comment | The style check no longer decodes entities at all: a style value that carries an **entity (`&`), a CSS escape (`\`) or a CSS comment (`/*`)** is **rejected**. A partial table cannot mirror the browser, so the value is not guessed (`src/lib/github-pr.ts`, `checkStyleAttribute`) |
| 4-H2 | `neutralizeCommentTerminator` neutralized only `-->`; an HTML comment also ends at `--!>` | Both terminators are neutralized (`-->`, `--!>`) |
| 4-H3 | The remediation was validated as HTML and then written into a JSX file or a TypeScript string without a destination-lexical check | A remediation may not contain a **brace** (it opens a JSX expression and a template interpolation). A fix is only written into a file whose destination context can be **proven**: an HTML file or a JSX file. A TypeScript module or a mixed component file (`.ts`, `.mts`, `.cts`, `.vue`, `.svelte`, `.astro`) has no proven context — the element text can sit inside a string or an expression — so the fix ships as a **review suggestion**. JSX attribute values additionally escape `&` and `"` so a value cannot break out of the attribute |
| 4-M1 | GFM autolinks a bare URL without any Markdown syntax, so escaping Markdown syntax was not enough | `escapeMarkdownText` neutralizes the scheme of a URL (`https&#58;//`, `www&#46;`). Verified against GitHub's own Markdown API: the escaped text renders as plain text, the control still renders as a live link |
| 4-M2 | `plaintext` was missing from the active-tag list | `plaintext`, `xmp`, `listing`, `noscript` and `noembed` were added to the list |
| 4-M3 | Resource-loader elements were accepted | `video`, `audio`, `source`, `track` and `input[type=image]` are rejected |
| 4-M4 | `encoding:'none'` was cached as a successfully scanned (empty) file | `encoding:'none'` counts as **unreadable** → the scan is incomplete → nothing is patched |
| 4-M5 | The source-extension allowlist omitted `.mjs`/`.cjs`/`.mts`/`.cts` | The scan covers `html, htm, tsx, jsx, ts, js, mjs, cjs, mts, cts, vue, svelte, astro`. Files that are scanned but never patched still count, so a duplicate in one of them keeps the remaining match ambiguous |
| 4-M6 | The static visibility guard knew `hidden`, `display:none` and `visibility:hidden`; `opacity:0` keeps the text in the DOM, so the rendered-text check does not catch it | `opacity:0` counts as hidden in the static guard (CSS and JSX-object form) and the **root element's** own hidden state is checked, not only its children |
| 4-M7 | The guard asked only whether the replacement had *any* text | The replacement has to **keep** the original text (normalized, case-insensitive): "Read more" → "R" is rejected. A replacement that keeps the text next to more text is accepted |
| 4-M8 | The occurrence identity came from the request order, which is not the occurrence order | Two selected copies of the same element with **different** remediations cannot be mapped at all, so they stay review suggestions (`conflictingRemediationKeys`) |
| 4-M9 | The HTML locator was substring-based and matched markup inside a comment | A **live-tag scanner** (`liveTagStarts`) excludes markup inside a comment (both terminators), inside a raw-text element (`script`, `style`, `textarea`, `title`, `xmp`, `plaintext`, `noscript`) and inside another tag's attribute value. Such an element is neither patched nor counted |

The reviewer's exact payloads were re-run as a temporary suite after the fixes:
all twelve are blocked, and the temporary file was deleted afterwards. The
permanent regression tests are in `src/lib/__tests__/github-pr.test.ts`,
`src/lib/__tests__/ast-patch.test.ts` and `src/lib/__tests__/github.test.ts`.

## Third independent security review (2026-11-22)

**Verdict: NOT READY — Critical 0, High 2, Medium 5.** The READY gate requires
Critical 0 and High 0, so this tree is **not releasable** until both High findings
are fixed and the reproductions below pass again.

> **Status: the literal third-review findings below were fixed and their exact
> reproductions were blocked.** The fourth independent review then found
> equivalent paths that remain open; its verdict is recorded in the section
> above and in `.ai/FINAL-REPORT.md`.

Requested baseline: `dbd7927`. The reviewed application source was unchanged in
`dbd7927..456d375`; the only scoped-file difference was the Docker runner's npm
CLI upgrade. All reproductions were local, used synthetic data and mocks, and
changed no shipped source, `.env` file or production secret. Temporary test files
were deleted after the run.

### Findings

| ID | Severity | Surface | Reproduction and observed result | Root cause / impact |
|---|---|---|---|---|
| H1 | **High** | Overlay-style safety | `<img src="x" alt="A" style="p\6fsition:fixed;l\65 ft:0;t\6fp:0;z-\69 ndex:2147483647;width:100%;height:100%">` → `{"validation":{"valid":true},"fixesApplied":1,"writtenOverlay":true,"verification":{"status":"verified","confidence":1},"computed":{"position":"fixed","left":"0px","top":"0px","zIndex":"2147483647","width":"1280px","height":"720px"}}`; the repository writer also accepted and wrote the escaped overlay. | `checkStyleAttribute` compares the literal CSS property/value text. A browser resolves CSS escapes, so `p\6fsition` becomes `position` and bypasses the overlay denylist. The fix verifies the target axe rule but not visual safety, then can write a full-viewport overlay into customer source. |
| H2 | **High** | Active/embedding-content safety | `<html lang="en"><head></head><frameset><frame src="http://127.0.0.1:<port>/attacker"></frame></frameset></html>` → `{"validation":{"valid":true},"verification":{"status":"verified","confidence":1},"filesModified":[{"path":"index.html","fixesApplied":1}],"appliedFixIds":["v1"],"wroteFrame":true,"frameCount":1,"hits":["/attacker"]}`. | The active-tag denylist omits `frame`, `frameset`, `portal` and `fencedframe`. A remote frame therefore passes validation, verifies for `html-has-lang`, and is written into a customer repository. If merged, it can replace or frame the customer UI with attacker content. |
| M1 | Medium | Markdown injection | An attacker-controlled axe selector `img[data-mark="`` [x](https://a.test)"]` was reproduced from scanned HTML. GitHub's Markdown renderer returned status 200 and `<a href="https://a.test" ...>x</a>` for both the PR body inline-code line and the raw selector in the fix document. | `inlineCode` always uses two ticks when the value contains any backtick, so an embedded two-tick run closes the span. `generateFixFile` also writes the raw selector outside a fence. The result is attacker-controlled link injection in PR Markdown. |
| M2 | Medium | Complete source scan | A failed `getContent` for `a.html` still produced `{"filesModified":[{"path":"b.html","fixesApplied":1}],"appliedFixIds":["v1"]}`. A GitHub tree with `truncated: true` also produced `{"filesModified":[{"path":"a.html","fixesApplied":1}],"appliedFixIds":["v1"]}`. | File-fetch failures are swallowed and `git.getTree(...).truncated` is ignored. A partial scan can therefore look unique and patch the wrong remaining file, contradicting the documented “incomplete scan never patches a file” guarantee. |
| M3 | Medium | Visible-content preservation | `<button><span aria-hidden="true">Read more</span></button>` → `<button aria-label="Action"></button>` produced `{"fixesApplied":1,"deletedReadMore":true,"verification":{"status":"verified","confidence":1},"beforeText":"Read more","afterText":""}`. | `aria-hidden` hides content from the accessibility tree, not from sighted users, but the static guard treats it as visually hidden. Because the original visible text is classified as empty, the content-loss guard never runs; axe still verifies the accessible name. |
| M4 | Medium | Audit-trail failure semantics | With `createAuditLog` returning false, the route still returned `{"status":200,"success":true,"prCreated":1,"auditRecorded":false}` after opening the PR. | The PR is created before the audit write and an audit failure does not fail or queue the request. The response is honest, but an opened repository mutation can exist with no audit entry and no retry/alert path. |
| M5 | Medium | Wrong occurrence | Two identical `<img src="same.jpg">` elements with a violation selected for the second occurrence produced `{"filesModified":[{"path":"index.html","fixesApplied":1}],"appliedFixIds":["v2"],"firstHasSelectedFix":true}` and wrote the fix to the first element. | The repository writer does not consume `elementSelector`; it infers occurrence from request order. A selected duplicate can therefore be patched at the wrong occurrence while reporting the selected fix id as applied. |

### Required attack-surface result

| # | Surface | Result |
|---|---|---|
| 1 | Event handlers and active URI schemes | **PASS** — carried/spaced/slash-separated handlers, encoded `javascript:`, script spellings, and percent-encoded pseudo-schemes were rejected; template fixes stripped carried handlers. |
| 2 | Overlay and active/embedding-content safety | **FAIL** — H1 and H2. |
| 3 | Verification-browser network isolation | **PASS** — real Chromium observed `hits: []`, `upgrades: 0`, WebSocket state `3`; HTTP, WS, form, frame, meta-refresh, CSS URL, image and srcset requests did not reach the local server. |
| 4 | Confidence, cap, rate-limit and concurrency gates | **PASS** — unverified/null confidence opened no PR (`400`), a rejected rate limit opened no PR (`429`), 26 ids were rejected before verification (`400`, zero verification calls), and the existing two-batch semaphore tests passed. |
| 5 | Wrong target / wrong file | **FAIL** — M2 and M5. |
| 6 | Audit trail and link-failure semantics | **FAIL** — M4. The violation-row update failure itself is reported as `violationsUpdated: 0` and the audit is attempted first. |
| 7 | Markdown injection | **FAIL** — M1. |
| 8 | Visible-content preservation | **FAIL** — M3. |
| 9 | VPAT tenant isolation and manual-check truth | **PASS** — a foreign scan returned `404` with no violation query; project+scan scoping, catalog-id manual pass/fail, and the critical/serious manual-pass guard passed. |
| 10 | Docker secret handling and dependency audit | **PASS** — a synthetic build sentinel and the placeholder DB URL were absent from `.next`; the built image had no `NEXTAUTH_SECRET`/`DATABASE_URL` environment and no 128-hex value in `.next` or image history; the temporary image was deleted. `npm audit`: Critical 0, High 0, Moderate 15 (dev toolchain). |

### Disposition — every finding fixed (2026-11-22)

| ID | Fix | Evidence |
|---|---|---|
| H1 | `decodeCssEscapes()` decodes CSS escapes before the overlay-property check (`src/lib/github-pr.ts`) | The reproduction payload now fails validation with `remediation code sets an overlay-capable style property: position`; `applyFixesToFile` applies 0 fixes and writes no overlay. Regression test in `src/lib/__tests__/github-pr.test.ts`. |
| H2 | `frame`, `frameset` and `noframes` are rejected like every other embedding element | The reproduction payload now fails validation with `remediation code introduces a <frame> element`; 0 fixes are applied and no frame is written. Regression test in `src/lib/__tests__/github-pr.test.ts`. |
| M1 | `inlineCode()` uses a fence longer than the longest backtick run in the value (and pads a value that starts or ends with a backtick); the fix document writes the selector as an inline code span | Rendered through GitHub's own Markdown API (`POST /api/v1/markdown`, mode `gfm`): the old two-tick span produced `<a href="https://a.test">x</a>`, the new three-tick span produces `<code>…</code>` and no link. Regression test in `src/lib/__tests__/github-pr.test.ts`. |
| M2 | A truncated tree returns immediately; a file that cannot be read marks the scan incomplete; an incomplete scan never patches a file (`src/lib/github.ts`) | The reproductions now produce `filesModified: []` and no write; regression tests in `src/lib/__tests__/github.test.ts`. |
| M3 | `hidesContent()` no longer treats `aria-hidden` as visually hidden (`src/lib/ast-patch.ts`) | The reproduction payload is rejected (`fixesApplied: 0`), the visible text `Read more` is preserved. Regression test in `src/lib/__tests__/ast-patch.test.ts`. |
| M4 | `createAuditLogWithRetry()` retries the audit write (3 attempts, growing delay) before the route reports a missing trail (`src/lib/audit.ts`) | Regression test in `src/lib/__tests__/audit-retry.test.ts`; the route test asserts the retried call. |
| M5 | A fix is only written when every occurrence of its element in the file is covered by a selected fix (`countElementOccurrences` in `src/lib/ast-patch.ts`, the selected-per-key count in `applyFixesToFile`) | The reproduction now applies 0 fixes; the two source elements stay untouched and the fix is offered as a review comment. Regression test in `src/lib/__tests__/github-pr.test.ts`. |

Two further defects of the same class were found while fixing the above. The
summary file now escapes the rule id and encodes the file name. The review
comment originally neutralized the literal `*/` / `-->` terminator; the fourth
review reproduced HTML's alternate `--!>` terminator, so comment neutralization
is **not closed** (4-H2 above).

### Verification evidence

- `npm test -- --reporter=dot` → 51 files, 566 tests passed.
- `npm run lint` → exit 0; `npx tsc -p tsconfig.check.json --noEmit` → exit 0.
- Synthetic production build → exit 0; Docker image build → exit 0.
- `npm audit --json` → `{critical:0, high:0, moderate:15}`.
- No Strix result is claimed: no autonomous scan was run in this review.

### Untested / out of scope

- No production, third-party or public target was scanned; live GitHub writes were mocked.
- No multi-instance rate-limit/semaphore test, no verification browser run inside the runtime container, no full Playwright E2E suite and no independent Trivy/SBOM verification were performed in this pass.
- This was a focused V23 review of the verified-fix/GitHub/VPAT/build surfaces, not a new full-product auth, session, CSRF, OAuth, CORS, upload, SQLi or command-injection audit.

## Independent re-review of the V23 hardening (2026-11-22)

The first hardening pass was reviewed again against the shipped code (`7498d46..HEAD`).
The verdict was **NOT READY (High 2, Medium 7, Low 1)**: the first pass had closed the
*literal* reproductions, but equivalent paths were still open. Every finding of that
re-review is fixed in `8cb32db` and covered by a regression test.

| # | Finding | Reproduction | Fix |
|---|---|---|---|
| H1 | A handler the **scanned page already carried** survived into the fix, executed in the verification browser and was written into customer repositories; `/onerror=` bypassed the old regex; an entity encoded `javascript:` URI was executable in HTML and TSX | `<img src=x onerror=globalThis.__pwned=1>` → `verified / confidence 1`; `<img src=x /onerror=…>` → executed; `<a href=&#106;avascript:…>` → executed on click | Event handlers are rejected **unconditionally** and the attributes are parsed the way a browser parses them (`src/lib/html-attributes.ts`). URI attributes are checked against a scheme allowlist after entity decoding and whitespace normalisation. Overlay capable styles are rejected. The template fallback strips the handlers of the scanned element. The verification document carries a restrictive CSP (`connect-src 'none'`) |
| H2 | WebSocket traffic escaped the HTTP route interception and reached an internal endpoint | A local server saw `WS /internal` during `verifyFixes` | `context.routeWebSocket('**/*')` closes every socket, the document CSP forbids every connection, service workers are blocked, and the HTTP route abort stays in place (`createVerificationContext`) |
| M1 | The request count limit did not bound concurrent browser work | 20 concurrent requests → 20 Chromium instances | A global semaphore runs at most two verification batches, a batch has a 60 s budget, and a request waits at most 30 s for a slot |
| M2 | A violation was linked to a PR without an accepted artifact | `createFile` fails for the fix file → the violation is still linked | A violation is linked only when GitHub accepted an artifact for it (a patched source file or its fix document); `fixesWithoutArtifact` reports the rest |
| M3 | The locator could still select the wrong element or the wrong file | Two `<img src="x">` with different classes → the first was patched; the target file as the 51st tree entry → the first file was patched | Every identity attribute the report carries is compared (class, `aria-label`, `role`, `data-testid` included) and the **whole** source tree is scanned, bounded by a byte budget instead of a file count; an incomplete scan never patches a file |
| M4 | An opened PR was not guaranteed to have an audit entry | `db.violation.updateMany` fails after the PR exists → no audit call | The audit entry is written **before** the violations are linked, `createAuditLog` returns whether the entry was stored, and the response reports `auditRecorded` |
| M5 | Markdown injection survived in untrusted prose | `![tracking pixel](https://attacker.example/pixel)` kept its link in the PR body | Untrusted prose is escaped for Markdown as well as for HTML; code samples keep a sized fence and a selector is an inline code span that cannot be broken out of |
| M6 | Hidden text satisfied the visible-content check | `<span hidden>Read more</span>` → the visible label was gone but the patch was accepted | The visible-text check ignores hidden content (`hidden`, `aria-hidden`, `display:none`, `visibility:hidden`) and the verification browser compares the **rendered** text, so a fix that hides the label fails |
| M7 | The VPAT `scanId` was not tenant isolated | `projectId` of tenant A + `scanId` of tenant B → a report built from B's violations | The scan is verified to belong to the authorized project (`404` otherwise) and the violations are queried by project **and** scan |
| L1 | The documented manual-check override was not wired | The generator looked up WCAG ids (`1.1.1`), the manual checks are stored under catalog ids (`meaningful-alt`) | The stored id is resolved through the catalog to the WCAG criterion it assesses; a real manual pass clears minor/moderate findings, a manual fail marks the criterion not supported, and a pass never clears a critical or serious finding |

### Disposition of the first review's findings

| First review item | Disposition |
|---|---|
| H1 — unsafe remediation execution | **Not closed** by the first pass (equivalent execution through a carried handler) → closed by the re-review fix |
| H2 — verification browser SSRF | **Not closed** by the first pass (HTTP blocked, WebSocket open) → closed by the re-review fix |
| H3 — cap / rate limit | **Partially closed** (concurrency unbounded) → closed by the re-review fix |
| M1 — overstated counters | **Partially closed** (PR linkage overstated) → closed by the re-review fix |
| M2 — wrong element / file | **Not closed** (class and file-list variants) → closed by the re-review fix |
| M3 — audit trail | **Partially closed** (failure paths) → closed by the re-review fix |
| M4 — Markdown injection | **Not closed** (raw HTML escaped, Markdown not) → closed by the re-review fix |
| L1 — VPAT false support | Automated path closed in the first pass; the manual override was incomplete → closed by the re-review fix |
| QA P0-3 — visible content deletion | **Not closed** (hidden text variant) → closed by the re-review fix |

## Independent review of V23 (QA + security review, before the hardening pass)

Two independent reviews of the V23 diff (`21a1d00..HEAD`) were run. Both found
reproducible defects. The security review's verdict was **NOT READY (High 3)**; the QA
review's verdict was **PARTIAL** with three reproduced P0 defects. The table below
states what the first hardening pass fixed; the rows that were not fully closed are
marked and were closed by the re-review fix above.

### High — fixed

| # | Finding | Reproduction | Fix |
|---|---|---|---|
| H1 | Unsafe remediation executed in the verification browser before the safety checks and could fake an axe pass | `<img src="x" alt="A"><script/x>globalThis.__pwned=1</script>` → `verified / confidence 1` | The safety, rule and placeholder checks now run **before** anything is rendered (`verifyFixes` rejects first). The script check covers every spelling (`<script>`, `<script/x>`, `< script >`); active elements (`iframe`, `object`, `embed`, `applet`, `base`, `svg`, `style`, `link`, `meta`) are rejected; URI schemes are checked against an allowlist; **every** event handler is rejected (see the re-review fix for the handler that was carried by the scanned page) |
| H2 | The verification browser was a server-side SSRF and active-content primitive | A local server received `GET /internal` for `<img src="http://127.0.0.1:…/internal">` | The verification context aborts **every** network request and closes every WebSocket; the document carries a restrictive CSP; each render and axe run has a 15 s deadline; the Chromium sandbox stays on except where it cannot be used (Docker runs as root) |
| H3 | The per-request work limit was applied after the expensive work, and the route had no rate limit | Every submitted violation cost a browser launch and an axe run | The cap (`MAX_FIXES_PER_PR = 25`) is applied **before** verification, the request may not carry more than 25 violations, the route is rate limited per user (`rateLimits.remediation`) and a global semaphore bounds the concurrent browsers |

### Medium / low — fixed

| # | Finding | Fix |
|---|---|---|
| M1 | The "verified" / "applied" counters overstated reality | A failed GitHub write is no longer counted as modified or applied; only accepted files are counted; the PR summary now says "the remediation snippet was re-scanned for the rule it targets" and states that verification is rule-level, not a full re-scan |
| M2 | The locator could patch the wrong element or the wrong file | Every identity attribute the report carries must now match; an element found in more than one file is left to a human; the whole tree is scanned under a byte budget |
| M3 | The automated verified-fix path wrote no audit trail | Every opened PR writes a `github_pr_created` audit entry with the verified and skipped counts and the rules involved — written before the violations are linked |
| M4 | Untrusted descriptions, explanations and remediation text could inject misleading Markdown into the PR | Raw HTML **and** Markdown syntax in untrusted fields are escaped, and code fences are sized to the content they wrap |
| L1 | The VPAT could show "Supports" for a criterion that still had a violation | Any unresolved violation now yields "Partially Supports"; only a manual check can clear minor/moderate findings, and never a critical or serious one |

### P0 defects reproduced by QA — fixed

| # | Finding | Fix |
|---|---|---|
| P1 | Unsafe remediation was rendered before validation (see H1) | Validation moved before rendering |
| P2 | The AST matcher returned after the first distinguishing attribute, so two elements with the same `src` but different `id` patched the wrong one | Every identity attribute the report carries must match |
| P3 | An axe-verified replacement could delete the visible content of the element (`Read more` → `aria-label` + empty element) | A patch that empties an element with visible text is rejected — hidden text does not count as visible text |

## Findings fixed in the V23 cycle

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | The confidence gate treated `null` (unknown confidence, every template fix) as "good enough", so unverified fixes were written into customer repositories | High (trust) | FIXED — the gate reads verification confidence; `null` never passes (`src/lib/fix-verification.ts`) |
| 2 | A "fix" identical to the original element counted as applied | Medium (trust) | FIXED — no-op detection in `applyFixesToFile` |
| 3 | Fixes containing `TODO` / `{{…}}` / `YOUR_ALT_TEXT` were written into customer repositories | Medium | FIXED — placeholder rejection before patching |
| 4 | Patches were exact-string replacements of axe DOM HTML into source files, so JSX was patched by accident or not at all | High (correctness) | FIXED — AST-aware location for JSX/JS, re-parse guard discards a patch that breaks the file |
| 5 | `applyFixesToRepository` re-read the original file per violation, so a second fix in the same file overwrote the first | High (data loss in the PR) | FIXED — one fetch and one write per file |
| 6 | The VPAT PDF declared untested criteria out of scope | High (legal) | FIXED — the PDF reuses `generateVPATData` (`not-evaluated` + remarks) and is labelled a draft |

## Residual risk

| Risk | Rating | Why it is accepted |
|---|---|---|
| The Docker image runs Chromium as root, so the OS sandbox is disabled there | 🟡 MEDIUM | The verification document carries a restrictive CSP, the context aborts every HTTP request and closes every WebSocket, only validated markup is rendered, every run has a deadline, and the route is rate limited. Running the container as a non-root user is the follow-up (it also needs the Chromium sandbox packages). |
| Verification is rule-level on the remediation snippet, not on the patched file | 🟠 HIGH | **Open after the fifth review:** destination CSS classes (5-H1) and server-template grammars (5-H2) are absent from the isolated verification document. The customer's build is not available to the service, so unsafe destination semantics must be rejected or proven destination-aware before a source write. |
| The element is located by content, not by a source map from the scanned URL | 🟠 HIGH | **Open after the fifth review:** template/iframe/raw-text contexts can still be misclassified as live (5-M3), and omitted template extensions or submodules do not make the scan incomplete (5-M4). A stable source-map identity and a fail-closed complete-tree scan remain the real fix. |
| The AST is re-parsed per fix and per file | 🟢 LOW | Bounded by the 60 s batch budget and the 5 MB scan budget. Caching the parsed AST per file is on the roadmap. |
| A repository larger than the scan budget is never patched in place | 🟢 LOW | A complete scan is required to prove uniqueness; a tree that does not fit stays a review suggestion. Reported as `fixesWithoutArtifact` / a review file, never as a silent patch. |
| Two selected copies of the same element with different remediations cannot be mapped | 🟢 LOW | **Closed after the fourth review:** the request order is not an occurrence identity, so such fixes stay review suggestions and the source is never patched with a swapped remediation (4-M8). |
| A fix is never written into a TypeScript module or a mixed component file | 🟢 LOW | **Accepted for those extensions:** the element text can sit inside a string or an expression there, so the destination context cannot be proven. The fix ships as a review suggestion and the file is still scanned. This protection does not cover a server-templated `.html` file (5-H2). |

## Dependency audit

```
npm audit --audit-level=high   → exit 0
Critical: 0 · High: 0 · Moderate: 15 (dev-toolchain only)
```

## External scan coverage

| Scanner | Where it runs | Status |
|---|---|---|
| `npm audit --audit-level=high` | local + CI (`.github/workflows/ci.yml`) | pass — Critical 0, High 0 |
| Independent security-engineer review of the V23 diff | local (CTO loop) | run five times: the first pass returned NOT READY (High 3) and all findings were fixed; the **re-review of that hardening** returned NOT READY (High 2, Medium 7, Low 1) — every finding fixed and covered by regression tests; the **third review** returned NOT READY (High 2, Medium 5) — every finding fixed and the exact reproductions blocked; the **fourth review** returned **NOT READY (High 3, Medium 9)** with 32 working reproductions; the **fifth review** returned **NOT READY (High 2, Medium 4)** with six new working reproductions (2 High, 4 Medium) |
| Independent QA-engineer review of the V23 diff | local (CTO loop) | run once: 3 reproduced P0 defects, all fixed and covered by tests |
| Strix autonomous pentest (OSS CLI 1.6.2) | local (CTO loop) | **BLOCKED — the scan did not run.** The CLI is installed and the target was a sanitized export of the commit (no `.env` in the sandbox), but every configured provider refused the run: the default Gemini free tier is quota-exhausted (429, retry in ~14 h), NVIDIA's `meta/llama-3.3-70b-instruct` returns 410 Gone (model end-of-life 2026-08-26), and the OpenAI key has no credits left. No Strix finding exists for this cycle — do not cite Strix as evidence. Re-run it when a provider has quota. CI wiring has the same gap: the step needs an LLM secret the repository does not have, so it is not added rather than added broken. |

V23 dependency change: `typescript` and `axe-core` were promoted to production
dependencies (they are imported by runtime code; the lockfile diff is 9 lines, no new
packages were downloaded).

Upgrades applied for the published advisories:

| Package | Before | After | Advisory |
|---|---|---|---|
| next | 16.3.4 | 16.4.6 | RCE in `next/og` ImageResponse; `use cache` draft-mode leak |
| @sentry/nextjs | 10.66.0 | 10.78.0 | Middleware bypass with tunnel route |
| zod | 4.4.3 | 4.6.7 | Memory exhaustion on oversized constrained collections |
| prisma / @prisma/client | 6.11.1 | 6.19.3 | ReDoS via `effect` (override `effect ^3.22.1`) |
| sharp (override) | 0.35.4 | 0.35.5 | librsvg CVE-2026-96889 |
| vite (override) | 8.2.0 | 8.3.8 | launch-editor command execution / fs checks |
| source-map-js (override) | 1.2.1 | 1.2.4 | Event-loop denial of service |
| brace-expansion (nested overrides) | 1.1.18 / 5.0.9 | 1.1.22 / 5.0.13 | Quadratic expansion + stack exhaustion |

## Findings fixed in this cycle

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Public onboarding endpoints (`/api/onboarding/scan`, `/api/onboarding/vpat`) claimed rate limiting but had none — each request spawns a real browser scan | High (compute abuse) | FIXED — 5/min per client, shared bucket, covered by `src/app/api/onboarding/onboarding-rate-limit.test.ts` |
| 2 | Scan-auth credentials (login script, login credentials) were stored unencrypted | High | FIXED — AES-256-GCM at rest, `src/lib/scan-auth.ts` |
| 3 | Scan-auth GET returned the login script when no `scriptConfig` was set | High | FIXED — scripts and credentials are never returned; values are masked |
| 4 | Scan-auth used a hand-rolled permission check instead of the RBAC guard | Medium | FIXED — `requireVerifiedEmail(..., { permission: MANAGE_SETTINGS })` |
| 5 | Audit whitelist test matched non-audit `action:` fields | Low (test defect) | FIXED — the test now anchors on audit writes only |
| 6 | `projectId` was read from the unvalidated request body | Low | FIXED — validated by the Zod schema |
| 7 | 9 audit actions had no UI label (`audit-actions-diff` reported MISSING_LABELS=9) | Low | FIXED — labels added to `messages/en.json` + `messages/hi.json` (MISSING_LABELS=0) |
| 8 | Fresh-database deploy was broken (`Organization.pagesQuota` missing; agency/integration schema never migrated) | High (release blocker) | FIXED — two idempotent migrations, fresh DB reaches zero drift |

## Scan-auth credential handling (current design)

- Guard: verified email + `manage_settings` permission on every verb, project scoped to the caller's org.
- At rest: cookie values, sensitive header values, the login script and the login credentials are encrypted (AES-256-GCM).
- In transit: reads mask secrets (`••••••••`); the script and credentials are omitted.
- In the scanner: decrypted only when the browser context is prepared.
- Audit trail: `scan_auth_created` / `scan_auth_updated` / `scan_auth_deleted`.

## Not verified in this cycle

- Strix pentest — the CLI is installed but every configured provider refused the run
  (quota exhausted / model end-of-life / no credits). The independent reviews above
  cover the changed code paths; no Strix finding exists for this cycle.
- The **fifth** independent review has returned **NOT READY (High 2, Medium 4)**.
  Its six equivalent-path findings and working outputs are at the top of this
  file. The release gate stays closed until those findings are fixed and a new
  independent pass returns READY.
