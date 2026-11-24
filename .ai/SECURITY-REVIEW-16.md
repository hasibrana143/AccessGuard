# AccessGuard — Sixteenth Independent Security Review

Date: 2026-11-24

## 1. Verdict

**NOT READY — Critical 0, High 7, Medium 4, Low 0.**

The release gate requires **Critical 0 and High 0**. Seven independently
reproduced High root causes pass remediation validation and destination
analysis and are accepted and applied by the repository writer with one source
write. Representative cases reach the real create-PR route. Local Chromium
confirms a viewport-wide customer-page takeover in every High variant. The
real route was exercised with a mocked GitHub transport and the isolated
verification result stubbed to a verified confidence, so the downstream writer
and pull-request path could be observed without claiming a new Strix or
browser-engine result.

The seven High root causes are:

1. chained and optional computed `dataset` receivers bypass the
   reflected-attribute gate;
2. computed and optional `Reflect.get` call forms bypass the property-read
   gate;
3. an optional member chain in an attribute-read call bypasses the call parser;
4. an introduced id written as a concatenation of string literals bypasses the
   literal-id check;
5. a literal runtime tag selector reaches a remediation-introduced element;
6. alternate base-`href` mutation APIs bypass the base resolver; and
7. a base created by repository runtime bypasses the static-has-base gate.

Four Medium root causes also violate the required fail-closed direction:
`color-mix()` transparency, an activated `font` shorthand, the wrong winner
among duplicate `@font-face src` declarations, and an `:enabled` transition
that activates a customer-side request.

This tree is not releasable until every High reproduction is blocked in the
unsafe direction, permanent regressions cover every root cause, and a fresh
independent review returns READY.

This is the sixteenth-review security artifact. The existing
`.ai/SECURITY-STATUS.md` and every other existing `.ai/` file were intentionally
not changed.

## 2. Reviewed trees and boundary

| Item | Value |
|---|---|
| Requested baseline | `08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c` (`vol: releases — V23: volume log entry for the seventh-review closure cycle`) |
| Reviewed closure tree | `b4bd811` (`vol: security — V23: close the fifteenth review's runtime, CSS and validation findings`) |
| Current checkout at report time | `9ae2a3a48eec9fb3f5a5c4b1125a53f29d274b6c` (`vol: releases — V23: record the fifteenth-review closure in the volume chain`) |
| Current `origin/main` | `9ae2a3a48eec9fb3f5a5c4b1125a53f29d274b6c` |
| Closure-tree-to-checkout identity | `git diff --quiet b4bd811..HEAD -- src` returned **exit 0**. The later checkout changed no scoped or other `src` file. |
| Baseline-to-closure source diff | 15 files changed, 8,154 insertions and 472 deletions: the destination/runtime, writer, route/audit and regression files changed by the fifteenth-review closure. |
| Review scope | `src/lib/css-context.ts`, `src/lib/github.ts`, `src/lib/github-pr.ts`, `src/lib/ast-patch.ts`, `src/lib/fix-validation.ts`, `src/lib/fix-verification.ts`, `src/lib/html-attributes.ts`, and `src/app/api/github/create-pr/route.ts`, including the directly related validation, verification, write, authorization, rate-limit, and audit call path |
| Reviewer changes | Report only. No shipped source, permanent test, dependency, lockfile, CI, environment, schema, or existing `.ai/` file was changed. No commit, push, deployment, database migration, or secret change was performed. |

Every reproduction used a local synthetic repository, a mocked GitHub/Octokit
transport, local Playwright Chromium, and listeners bound only to `127.0.0.1`.
No production, public, customer, or third-party target was scanned. No live
repository was mutated. No external GitHub Markdown service was called. The npm
advisory registry was used only for `npm audit`; it was not a test target. No
`.env` value was inspected or printed.

**Strix/self-scan status:** skipped as required by the review request. **No
Strix result, finding, confidence, or pass is claimed.** Chromium was the only
browser engine; no Safari, Firefox, or WebKit result is claimed.

## 3. Threat model and method

The review tests the V23 verified-fix/GitHub-writer chain: an accessibility
remediation is generated for customer-owned source, validated, verified with
axe-core in an isolated Chromium document, and then written into a connected
customer repository. The security boundary is not only “does axe stop firing?”
A remediation must also preserve the customer's content, navigation, network
behavior, focus behavior, semantics, accessibility-tree presence, and rendering
after the **repository's own CSS** and the **repository's own runtime code** are
combined with the generated fix.

The unsafe direction for every prior and equivalent case below is strict:

- the unsafe remediation must fail validation (`validation: false`) or produce
  a non-null destination-harm reason;
- it must not be reported as verified/applied;
- it must apply **0 fixes**; and
- it must perform **0 repository writes**.

The method was:

1. establish the requested baseline, reviewed closure tree, and current source
   identity;
2. re-run every literal fourth- through fifteenth-review payload in its unsafe
   direction and re-check the legitimate behaviours;
3. exercise equivalent CSS selector, structural-element, painted-surface
   geometry, resource-base, runtime-carrier, runtime-state-read, focus-state,
   link-state, animation-timing, URI-resource, writer-budget, and route/audit
   paths;
4. require an observable Chromium geometry/paint/computed-style/accessibility
   result or a local `127.0.0.1` request before counting a candidate as a
   finding;
5. run the source-only typecheck, lint, full unit suite, coverage gate,
   standalone build, Chromium E2E suite, dependency audit, and non-secret-
   printing tracked-file secret scan; and
6. run the writer and route against the **final merged HTML**, not against a
   mutated DOM after an inline script had already executed.

No Critical finding was reproduced. The seven High and four Medium findings
below are independent root causes; equivalent payloads are grouped under the
affected root cause.

The accepted fail-closed false positives in `.ai/RISKS.md` rows 46–66 were
checked in both directions and remain documented. The findings below are not
those accepted cases:

- risk 62 says every statically resolvable attribute-read call shape is now
  read; the optional/computed call forms below contradict that boundary;
- risk 63 says a dataset key that resolves is mapped to its `data-*`
  attribute; the chained/optional dataset receivers below contradict it;
- risk 61 covers a base assignment whose receiver cannot be resolved; the
  base mutations below have statically resolvable receivers or statically
  resolvable APIs;
- risk 55 covers a **CSS structural selector** plus an introduced element. The
  introduced-tag finding below is a literal **runtime** selector and the
  introduced element's tag is known, so a precise comparison can close it;
- risk 52 specifically preserves `:hover` and `:focus-within`; `:enabled` is a
  fix-activated control-state transition, not a user-interaction pseudo-class;
- risk 65 says an activated font family resolves to its resource; the font
  shorthand and duplicate-`src` variants below contradict it; and
- the ordinary script file, linked script that does not react, `:hover`,
  `:focus-within`, unrelated runtime mutation, unchanged base, unrelated
  `Reflect.get`, unrelated `getAttribute`, unrelated dataset key, unchanged
  id, and introduced id the runtime does not name all remain writable or
  harmless as required.

## 4. Reproduced findings

### 4.1 Result matrix

| ID | Severity | Browser-observable harmful variants | Writer result | Chromium / local observable |
|---|---:|---:|---|---|
| 16-H1 | High | 2 | applied, 1 fix, `index.html` write | target fixed at `1280×720`, class `overlay` |
| 16-H2 | High | 3 | applied, 1 fix, `index.html` write | target fixed at `1280×720`, class `overlay` |
| 16-H3 | High | 2 | applied, 1 fix, `index.html` write | target fixed at `1280×720`, class `overlay` |
| 16-H4 | High | 1 | applied, 1 fix, `index.html` write | target fixed at `1280×720`, class `overlay` |
| 16-H5 | High | 1 | applied, 1 fix, `index.html` write | introduced element fixed at `1280×720`, class `overlay` |
| 16-H6 | High | 2 | applied, 1 fix, `index.html` write | target fixed at `1280×720`; requests included `/sub/theme.bin` and `/sub/x` |
| 16-H7 | High | 1 | applied, 1 fix, `index.html` write | target fixed at `1280×720`; requests included `/sub/theme.bin` and `/sub/x` |
| 16-M1 | Medium | 1 | applied, 1 fix, `index.html` write | computed color `color(srgb 0 0 0 / 0)` |
| 16-M2 | Medium | 1 | applied, 1 fix, `index.html` write | local `GET /font` |
| 16-M3 | Medium | 1 | applied, 1 fix, `index.html` write | local `GET /font2` |
| 16-M4 | Medium | 1 | applied, 1 fix, `index.html` write | local `GET /pixel-enabled`; computed `background-image` pointed at it |

Sixteen harmful variants were reproduced. In every case the remediation passed
rule validation and destination analysis: the writer's plan applied it rather
than refusing it or sending it to human review. The literal closure controls
were refused with 0 fixes and 0 writes, and the unrelated benign twins stayed
writable.

### 4.2 16-H1 — chained/optional computed dataset receivers bypass the reflected-attribute gate (High)

The two exact expressions were:

```js
img['dataset']['state']
img.dataset?.state
```

The repository shape was:

```html
<html><head><style>.overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}</style></head><body><img id="target" src="x"><script>document.querySelectorAll('img').forEach(function(img){if(EXPRESSION)img.classList.add('overlay')});</script></body></html>
```

The ordinary remediation was:

```html
<img id="target" src="x" alt="Photo" data-state="active">
```

**Observed result.** Both candidates passed validation and destination
analysis, applied one fix, and wrote `index.html`. In the final merged HTML,
Chromium reported the repaired image at `x=0, y=0, width=1280, height=720`
with class `overlay`: a full-viewport customer-page takeover. The real route
reproduced the computed-receiver form as a source write and pull request.

**Shipped-code root cause.** `src/lib/github.ts:649-650` defines
`COMPUTED_PROPERTY_READ_PATTERN`; `computedPropertyReads()` at
`src/lib/github.ts:737-750` records one computed member and its preceding
receiver. It does not preserve a second computed member in a chain, so
`img['dataset']['state']` is not understood as a read of the `data-state`
attribute. The reflected-property regex at `src/lib/github.ts:1111-1142`
requires the literal dot form `dataset.state`, so `img.dataset?.state` is
also missed. `scriptReadsDatasetAttribute()` at
`src/lib/github.ts:1084-1104` consequently sees no matching `data-*` read.

### 4.3 16-H2 — computed/optional `Reflect` calls bypass the property-read gate (High)

The three exact expressions were:

```js
Reflect['get'](img,'alt')
Reflect?.get(img,'alt')
Reflect.get?.(img,'alt')
```

The repository and remediation were:

```html
<html><head><style>.overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}</style></head><body><img id="target" src="x"><script>document.querySelectorAll('img').forEach(function(img){if(EXPRESSION)img.classList.add('overlay')});</script></body></html>
```

```html
<img id="target" src="x" alt="Photo">
```

**Observed result.** All three candidates passed validation and destination
analysis, applied one fix, and wrote `index.html`. In the final merged HTML,
Chromium reported the repaired image at `1280×720` with class `overlay`.

**Shipped-code root cause.** `RUNTIME_STATE_READ_PATTERN` at
`src/lib/github.ts:468-469` and `REFLECT_PROPERTY_READ_PATTERN` at
`src/lib/github.ts:701-703` require the literal `Reflect.` member syntax.
`reflectPropertyReads()` at `src/lib/github.ts:711-724` therefore cannot
normalize a computed `Reflect['get']`, an optional `Reflect?.get`, or an
optional call `Reflect.get?.(...)`. The reflected-property check at
`src/lib/github.ts:1132-1142` never sees the `alt` property read.

### 4.4 16-H3 — an optional member chain in an attribute-read call bypasses the call parser (High)

The two exact expressions were:

```js
Element.prototype.getAttribute?.call(img,'alt')
Element.prototype['getAttribute']?.call(img,'alt')
```

The repository and remediation were the same `1280×720` overlay shape used
in 16-H2, with the ordinary `alt` remediation.

**Observed result.** Both candidates passed validation and destination
analysis, applied one fix, and wrote `index.html`. In the final merged HTML,
Chromium reported the repaired image at `1280×720` with class `overlay`.

**Shipped-code root cause.** `METHOD_CALL_PATTERN` at
`src/lib/github.ts:594-595` permits an optional call only immediately before
the final `(`. It does not model an optional member between two members.
`calleeMembers()` at `src/lib/github.ts:546-591` likewise has no optional
member state. `attributeReadCalls()` at `src/lib/github.ts:607-642`
therefore does not identify `getAttribute` as the method in
`getAttribute?.call(...)`, and the receiver/attribute arguments are not
resolved.

### 4.5 16-H4 — a concatenated introduced id bypasses the literal-id check (High)

The exact repository and remediation were:

```html
<html><head><style>.overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}</style></head><body><img src="x"><script>document.getElementById('act'+'ivated').classList.add('overlay');</script></body></html>
```

```html
<img id="activated" src="x" alt="Photo">
```

**Observed result.** The candidate passed validation and destination
analysis, applied one fix, and wrote `index.html`. In the final merged HTML,
Chromium reported the newly identified target at `1280×720` with class
`overlay`. The real route reproduced it as a source write and pull request.
The sibling writer path `document.querySelector('#'+'activated')` was also
accepted with one fix and one write; it is supporting evidence for the same
root cause, not an additional counted variant.

**Shipped-code root cause.** `scriptRefersToElementId()` at
`src/lib/github.ts:823-829` compares the introduced id only with a literal
quoted `getElementById(...)` argument or a literal selector. The writer
already has `resolveStringExpression()` at `src/lib/github.ts:481-526`, but
this id-reference check does not use it. The introduced-id collection and
decision at `src/lib/github.ts:1582-1605` therefore misses the runtime
reference even though the id resolves to `activated` statically.

### 4.6 16-H5 — a literal runtime tag selector reaches a remediation-introduced element (High)

The exact repository and remediation were:

```html
<html><head><style>.overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}</style></head><body><img id="target" src="x"><script>document.querySelector('span').classList.add('overlay');</script></body></html>
```

```html
<span data-state="active"></span><img id="target" src="x" alt="Photo">
```

**Observed result.** The candidate passed validation and destination
analysis, applied one fix, and wrote `index.html`. In the final merged HTML,
Chromium reported the introduced `span` at `x=0, y=0, width=1280, height=720`
with class `overlay`. The real route reproduced it as a source write and pull
request.

**Shipped-code root cause.** The runtime checks at
`src/lib/github.ts:1563-1637` identify the original target by id, introduced
elements by literal id, and introduced attributes by attribute read. They do
not compare an introduced element's tag with a literal runtime selector. The
`selectorMutationScripts` set is consulted for an attribute the patched
target receives, not for a selector that reaches an introduced element. A
literal `span` selector and an introduced `span` are statically comparable,
so this is not an unresolved-name false positive.

### 4.7 16-H6 — alternate base-`href` mutation APIs bypass the base resolver (High)

The two exact runtime expressions were:

```js
document.querySelector('base').setAttributeNS(null,'href','/sub/')
document.getElementById('base').attributes.href.value='/sub/'
```

The repository shape was:

```html
<html><head><base id="base" href="/"><script>EXPRESSION</script><link rel="stylesheet" href="theme.bin"></head><body><img id="target" src="x"></body></html>
```

The analysed root stylesheet `theme.bin` contained `img{color:red}` and the
base-relative `sub/theme.bin` contained:

```css
[alt]{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}
```

**Observed result.** Both candidates passed validation and destination
analysis, applied one fix, and wrote `index.html`. In the final merged HTML,
the local listener observed `/theme.bin`, `/x`, `/sub/theme.bin`, and `/sub/x`.
The repaired target was fixed at `1280×720`.

**Shipped-code root cause.** `HREF_PROPERTY_ASSIGNMENT_PATTERN` at
`src/lib/github.ts:832-834` recognizes `.href` and `['href']` assignment.
`SET_ATTRIBUTE_PATTERN` at `src/lib/github.ts:836-838` recognizes
`setAttribute(...)`, but not `setAttributeNS(...)`; neither pattern models an
`Attr.value` assignment. `scriptMutatesBaseHref()` at
`src/lib/github.ts:984-1000` therefore returns false for both forms even
though the receiver and the base are statically resolvable.

### 4.8 16-H7 — a runtime-created base bypasses the static-has-base gate (High)

The exact runtime expression was:

```js
const b=document.createElement('base');b.href='/sub/';document.head.appendChild(b)
```

The repository had **no static `<base>`**:

```html
<html><head><script>EXPRESSION</script><link rel="stylesheet" href="theme.bin"></head><body><img id="target" src="x"></body></html>
```

The two stylesheet resources were the same as in 16-H6.

**Observed result.** The candidate passed validation and destination
analysis, applied one fix, and wrote `index.html`. The listener observed
`/theme.bin`, `/x`, `/sub/theme.bin`, and `/sub/x`; the repaired target was
fixed at `1280×720`.

**Shipped-code root cause.** `documentBaseInfo` is populated from static
markup at `src/lib/github.ts:1432-1447`. The runtime base-mutation pass at
`src/lib/github.ts:1470-1490` begins with `if (!info?.hasBase) continue;`.
A document that has no static base is therefore never inspected for a base
that repository runtime creates later.

### 4.9 16-M1 — `color-mix()` can make activated text fully transparent (Medium)

The exact repository and remediation were:

```html
<html><head><style>[aria-label]{color:color-mix(in srgb,rgb(0 0 0 / 0),rgb(0 0 0 / 0))}</style></head><body><button id="target">Save</button></body></html>
```

```html
<button id="target" aria-label="Save">Save</button>
```

**Observed result.** The candidate passed validation and destination
analysis, applied one fix, and wrote `index.html`. In the final merged HTML,
Chromium computed the repaired button's color as
`color(srgb 0 0 0 / 0)`: the visible text became transparent although axe
still found the accessible name.

**Shipped-code root cause.** `isTransparentColor()` at
`src/lib/css-context.ts:1553-1593` accepts only the function names in
`COLOR_FUNCTIONS` at `src/lib/css-context.ts:1561-1564`.
`color-mix(...)` is not in that set and is not parsed as a nested color
expression, so its zero-alpha result is missed.

### 4.10 16-M2 — an activated `font` shorthand is not connected to its font-face (Medium)

The exact repository and remediation were:

```html
<html><head><style>@font-face{font-family:Evil;src:url(/font)} [aria-label]{font:16px Evil}</style></head><body><button id="target">Save</button></body></html>
```

```html
<button id="target" aria-label="Save">Save</button>
```

**Observed result.** The candidate passed validation and destination
analysis, applied one fix, and wrote `index.html`. The local listener observed
`GET /font`.

**Shipped-code root cause.** The activated-resource loop at
`src/lib/css-context.ts:3686-3712` connects a declaration to an `@font-face`
only when `declaration.property === 'font-family'`. The `font` shorthand also
selects the family, but the analyzer does not parse its family component and
therefore never asks `fontFamilyResourceState()` about it.

### 4.11 16-M3 — the wrong duplicate `@font-face src` declaration wins in the analyzer (Medium)

The exact repository and remediation were:

```html
<html><head><style>@font-face{font-family:Evil;src:local("Arial");src:url(/font2)} [aria-label]{font-family:Evil}</style></head><body><button id="target">Save</button></body></html>
```

```html
<button id="target" aria-label="Save">Save</button>
```

**Observed result.** The candidate passed validation and destination
analysis, applied one fix, and wrote `index.html`. The local listener observed
`GET /font2`: the browser used the later URL declaration, while the analyzer
treated the first local declaration as the only source.

**Shipped-code root cause.** `collectFontFace()` at
`src/lib/css-context.ts:515-530` uses `declarations.find(...)` for `src`, so
it retains the first duplicate declaration. CSS declaration order makes the
later `src` win in the browser. `fontSourceState()` at
`src/lib/css-context.ts:1451-1461` then reports that first source as absent
because it contains only `local(...)`.

### 4.12 16-M4 — an `:enabled` transition is not modeled (Medium)

The exact repository and remediation were:

```html
<html><head><style>button:enabled{background-image:url(/pixel-enabled)}</style></head><body><button id="target" disabled><span aria-hidden="true">x</span></button></body></html>
```

```html
<button id="target" aria-label="Save"><span aria-hidden="true">x</span></button>
```

**Observed result.** The candidate passed validation and destination
analysis, applied one fix, and wrote `index.html`. In the final merged HTML,
the local listener observed `GET /pixel-enabled`, and Chromium computed the
button's `background-image` as the local pixel URL. Removing `disabled`
activated the repository rule and caused the request.

**Shipped-code root cause.** `parseSubject()` at
`src/lib/css-context.ts:856-933` treats an unknown simple pseudo-class as
`opaqueConditional` but does not model its state transition.
`compoundActivatedByFix()` at `src/lib/css-context.ts:1285-1371` models
removed classes, removed/changed attributes, focus, and link state, but not
the `disabled`/`enabled` control-state transition. The activated rule is
therefore not recognized as newly matching.

### 4.13 Finding-to-code map

| Finding | Shipped code | Missed condition | Required correction |
|---|---|---|---|
| 16-H1 | `src/lib/github.ts:649-650`, `:737-750`, `:1084-1104`, `:1111-1142` | a computed/optional member chain loses its receiver or its `dataset` alias | parse member chains; map the resolved dataset key to `data-*`; fail closed when a chain cannot be resolved |
| 16-H2 | `src/lib/github.ts:468-469`, `:701-724`, `:1132-1142` | only literal `Reflect.get`/`.getOwnPropertyDescriptor` syntax is recognized | normalize dot, computed, and optional `Reflect` calls; resolve receiver and property; fail closed when unresolved |
| 16-H3 | `src/lib/github.ts:546-595`, `:607-642` | an optional member between callee members ends the call match | parse optional/computed member chains and preserve the attribute-read receiver and argument |
| 16-H4 | `src/lib/github.ts:481-526`, `:823-829`, `:1582-1605` | an id argument/selector is compared only as a literal | resolve literal concatenations before comparing an introduced id; fail closed when unresolved |
| 16-H5 | `src/lib/github.ts:1563-1637` | introduced elements are checked by id/attribute but not by statically resolvable tag selector | compare introduced tags with literal runtime selectors and refuse a match; do not blanket-refuse unrelated selectors |
| 16-H6 | `src/lib/github.ts:832-838`, `:984-1000` | only `.href` assignment and `setAttribute(...)` are base mutations | model `setAttributeNS`, `Attr.value`, and equivalent base-`href` writes; make a resolvable base mutation unprovable |
| 16-H7 | `src/lib/github.ts:1432-1447`, `:1470-1490` | runtime is inspected only when static markup already has `<base>` | detect runtime creation/insertion of a base and make the document base unprovable |
| 16-M1 | `src/lib/css-context.ts:1553-1593` | `color-mix()` is not a supported alpha grammar | parse nested color functions or fail closed on an unreadable color function |
| 16-M2 | `src/lib/css-context.ts:3686-3712` | only a `font-family` longhand is connected to a font face | parse the family in the `font` shorthand and resolve it to the font-face resources |
| 16-M3 | `src/lib/css-context.ts:515-530`, `:1451-1461` | the first duplicate `src` declaration is retained | apply CSS declaration order and evaluate the effective `src` descriptor |
| 16-M4 | `src/lib/css-context.ts:856-933`, `:1285-1371` | removal of `disabled` does not activate `:enabled` | model control-state pseudo-class transitions; keep user-interaction pseudo-classes harmless |

### 4.14 Route and write-path evidence

The real route was exercised with the normal writer/plan/apply path and a
mocked Octokit transport; only the isolated axe verification was stubbed to a
verified confidence so that the route's own writer path could be observed.
Three representative High cases passed:

| Case | HTTP | Success | Source fixes | GitHub writes | Pull request | Audit actions |
|---|---:|---|---:|---:|---:|---|
| 16-H1 computed dataset receiver | 200 | true | 1 | 3 (`index.html`, per-fix Markdown, summary) | 1 | `github_pr_intent`, `github_pr_created` |
| 16-H4 concatenated introduced id | 200 | true | 1 | 3 | 1 | `github_pr_intent`, `github_pr_created` |
| 16-H5 introduced tag selector | 200 | true | 1 | 3 | 1 | `github_pr_intent`, `github_pr_created` |

The route itself is not the root cause.
`src/app/api/github/create-pr/route.ts` authenticates and checks `CREATE_PR`
at line 102, scopes violations by `auth.user.orgId` at lines 105–119,
rate-limits the user at lines 135–146, checks the org's connected-repository
allowlist at lines 184–204, verifies GitHub write access at lines 217–224,
verifies candidates at lines 245–257, plans every source change before
mutation at lines 278–312, and records the intent audit before branch creation
at lines 317–350. The findings occur because the planner's safety analysis
returns an unsafe plan; the route then faithfully applies that plan.

## 5. Prior-payload and legitimate-behaviour evidence

### 5.1 Recovered fourth- through fifteenth-review payloads

| Harness / matrix | Result | Interpretation |
|---|---:|---|
| recovered `prior-118-matrix-corrected.ts` | **118/118 passed** | 94 literal unsafe fourth- through eighth-review assertions and 24 legitimate assertions; every unsafe case was refused/non-harmful with 0 fixes and 0 writes |
| ninth-review writer matrix | **42/42 passed** | all unsafe ninth-review payloads blocked in the unsafe direction; legitimate cases remained writable |
| tenth-review writer matrix | **19/19 passed** | all unsafe tenth-review payloads blocked in the unsafe direction |
| eleventh-review closure matrix | **37/37 passed** | runtime, geometry, resource, animation, and legitimate boundaries held |
| twelfth-review closure matrix | **26/26 passed** | runtime-name, stylesheet, offset, destination, and visibility boundaries held |
| thirteenth-review closure matrix | **21/21 passed** | computed state, selector, base, and writer-budget boundaries held |
| fourteenth-review closure matrix | **23/23 passed** | `Reflect`, stylesheet-link, base, introduced-element, semantics, inline-resource, selector, link-state, offset, and accessibility-tree boundaries held |
| fifteenth-review closure matrix | **24/24 passed** | runtime call/dataset/id/base, CSS color/negation/font, accessibility-tree, and autofocus boundaries held |
| combined writer closure run | **7 files, 192/192 passed** | every listed writer matrix passed together |
| eleventh-review real-route closure | **9/9 passed** | refusal created no branch, document, pull request, or intent audit; failure ordering held |
| twelfth-review real-route closure | **8/8 passed** | route refusals, benign patch, and artifact ordering held |
| combined current route run | **3 files, 24 passed, 2 intentional pre-closure failures** | the old harness expected vulnerable HTTP 200; the closed route returned HTTP 400 |

The intentionally pre-closure eleventh-review harness was also re-run:

- route harness: **2 failed, 7 passed**. The two failures were the old
  assertions that expected vulnerable HTTP `200`; the closed route returned
  HTTP `400`. This confirms the closure and is not a regression.
- writer/Chromium harness: **12 failed, 5 passed**. The failures were the old
  assertions that expected one fix or one write for a now-closed unsafe path;
  the local Chromium harm assertions passed.

### 5.2 Equivalent-path writer and Chromium evidence

The final merged-HTML harnesses evaluated the new equivalent paths against
planned final file content. The observed results are in section 4.1. The
literal closure controls were:

- `img.dataset.state` — 0 fixes, 0 writes;
- `img.dataset['state']` — 0 fixes, 0 writes;
- `Reflect.get(img,'alt')` — 0 fixes, 0 writes;
- `Reflect.getOwnPropertyDescriptor(img,'alt')` — 0 fixes, 0 writes;
- `Reflect.getOwnPropertyDescriptor(img.dataset,'state')` — 0 fixes, 0 writes;
- `img.getAttribute?.('alt')` — 0 fixes, 0 writes;
- `Element.prototype.getAttribute.call(img,'alt')` — 0 fixes, 0 writes;
- `img['get'+'Attribute']('alt')` — 0 fixes, 0 writes;
- literal `getElementById('activated')` for an introduced id — 0 fixes, 0
  writes;
- `.item(0)` and indexed base collection controls — 0 fixes, 0 writes; and
- `clip-path:inset(100%)` and an inherited unresolved alpha custom property —
  0 fixes, 0 writes.

The benign unrelated twins stayed writable: `img['dataset']['other']`,
`Reflect?.get(img,'src')`, `img.dataset.other`, and
`img.dataset['other']` each applied one fix and performed one write.

A computed `Reflect.getOwnPropertyDescriptor(img,'alt')` candidate was not
counted: Chromium produced no overlay because the DOM `alt` accessor is not
an own property. A `:local-link` candidate was also not counted because the
test Chromium produced no observable local request. Static writer acceptance
alone was not treated as a finding.

### 5.3 Legitimate behaviours checked

All behaviours required by the brief remained writable or harmless:

1. ordinary `image-alt` and `button-name` fixes remained writable;
2. legitimate `https:` and `mailto:` hrefs remained valid;
3. a preserved relative destination remained valid;
4. a preserved class and a benign inline style remained valid;
5. three selected identical copies produced three fixes and one file write;
6. two selected copies out of three produced zero fixes and zero writes;
7. all twelve server-template spellings were rejected;
8. an ordinary repository script remained writable, including a linked script
   file containing a comparison and an apostrophe;
9. a linked script that does not react to the fix remained writable;
10. a document with no `<base>` remained writable;
11. a `<base href>` that resolves inside the repository remained writable;
12. a `<base>` that no runtime touches remained writable;
13. a runtime mutation of a non-base element remained writable;
14. a `Reflect.get` of an unrelated property remained writable;
15. a `getAttribute` call that reads an unrelated attribute remained writable;
16. dot, bracket, and chained dataset reads of an unrelated key remained
    writable;
17. an unchanged id remained writable;
18. an introduced id the runtime does not name remained writable;
19. an ordinary stylesheet link and a `<link rel="icon">` remained writable;
20. `:hover` and `:focus-within` remained harmless;
21. an unrelated runtime mutation remained writable;
22. a handler that does not react to the fix remained writable;
23. a small box growth remained harmless;
24. a harmless focus rule remained harmless;
25. a custom property without a resource remained harmless when its rule
    already applied;
26. a scale of one remained harmless;
27. small, inset, and `none` box shadows remained harmless;
28. a non-zero maximum size remained harmless;
29. a zero maximum size without clipping remained harmless;
30. an aspect ratio with both axes declared remained harmless;
31. a running animation that ends visible remained harmless;
32. a positive delay without the backwards fill remained harmless;
33. a pure in-page fragment `#main` remained valid;
34. a `role="presentation"` ancestor that keeps the repaired image in Chromium's
    accessibility tree remained writable; and
35. an image that the customer had already marked decorative remained allowed
    to keep `alt=""` with its decorative marker.

## 6. Verification commands and observed results

### 6.1 Required gate suite

| Command | Observed result |
|---|---|
| `npx tsc -p tsconfig.check.json --noEmit` | **PASS**, exit 0, no diagnostics |
| `npm run lint` | **PASS**, exit 0, no ESLint errors |
| `npx vitest run --coverage` | **PASS**, exit 0; 53/53 files and 939/939 tests passed in 61.01s; coverage 69.89% statements, 62.75% branches, 72.93% functions, 71.78% lines; configured gates passed |
| `npm run build` | **PASS**, exit 0; Next.js 16.4.6 compiled in 21.5s, TypeScript in 28.4s, 116/116 static pages generated in 5.9s |
| `npx playwright test --project=chromium` | **PASS with one retry**, exit 0; 79 tests, 78 passed, 1 flaky, 0 failed, 8.0m. The flaky authenticated landing CTA passed on retry. |
| `npm audit --audit-level=high` | **PASS**, exit 0; 15 moderate advisories, 0 high, 0 critical |

An additional production-only dependency check,
`npm audit --omit=dev --audit-level=high`, also exited 0: 5 moderate
transitive advisories and 0 high/critical advisories. The 15 total advisories
are a maintenance item, not a Critical/High release-gate failure.

### 6.2 Services and secret checks

- A non-secret-printing scan inspected 786 tracked text files. It found one
  AWS-access-key-shaped **documentation placeholder** in
  `.openclaw/skills/document-generate/SKILL.md`; contextual inspection
  confirmed prose/example text, not a credential. No other private-key, AWS,
  GitHub-token, Slack-token, Google-API-key, or Stripe-secret shape was found.
  No secret value is reproduced in this report. Environment files were
  excluded and not read.
- `.env.example` is tracked as a name-only template; its values were excluded
  from the scan and were not inspected.
- No secret, credential, production configuration, dependency, lockfile, or
  environment file was changed.

## 7. OWASP-style disposition of the scoped surfaces

| Surface | Disposition | Evidence |
|---|---|---|
| OWASP A01 Broken Access Control | **No new finding** | `CREATE_PR` permission, org-scoped violation lookup, org-scoped GitHub connection, and repository allowlist all apply before writes |
| OWASP A02 Security Misconfiguration | **No new finding in the scoped call path** | security headers, enforced CSP, API `no-store`, and no credentialed permissive CORS policy were checked; the eleven findings are incomplete trust-boundary design rather than missing route configuration |
| OWASP A03 Software Supply Chain Failures | **No High/Critical advisory** | `npm audit` and production-only audit contain no high/critical result; 15 moderate transitive advisories remain for maintenance |
| OWASP A04 Cryptographic Failures | **No new finding** | the scoped route does not change JWT/session cryptography or secret handling; OAuth state uses HMAC and a timing-safe comparison; no `.env` value was read |
| OWASP A05 Injection | **No new finding** | remediation validation rejects script/event handlers, active/embedding tags, template grammar, braces, and unsafe URI schemes; no new SQL or command injection path was found in scope |
| OWASP A06 Insecure Design | **FAIL — all 11 root causes** | the writer treats a partial static model of repository CSS/runtime/accessibility/focus behavior as proof that a source patch is safe |
| OWASP A07 Authentication Failures | **No new finding** | verified-email session/bearer authentication and permission enforcement precede repository work |
| OWASP A08 Software or Data Integrity Failures | **FAIL — all 11 root causes** | the writer accepts an unproven source change and writes it; the destination can change after merge |
| OWASP A09 Security Logging and Alerting Failures | **No new finding** | durable `github_pr_intent` precedes mutation and `github_pr_created` closes the trail; failure cases retain the intent record |
| OWASP A10 Mishandling of Exceptional Conditions | **No new finding in scope** | planning, branch, write, PR, and audit failure paths were re-run; a refused source write creates no false violation link |

Additional scoped checks:

- **Sessions/cookies:** NextAuth uses a seven-day JWT session. Its default
  session/state cookies are `HttpOnly`, `SameSite=Lax`, path-scoped, and
  secure in production. A cross-site form POST does not carry the ambient
  session cookie. The bearer path is not ambiently attached to a third-party
  origin.
- **CSRF:** no separate `X-CSRF-Token` enforcement exists on this route, but
  cookie-authenticated mutation is protected by the session cookie's
  `SameSite=Lax` behavior and bearer authentication is not cookie-authenticated.
  No reproducible CSRF bypass was found in the scoped route.
- **CORS/headers:** no wildcard or origin-reflection CORS policy was found in
  the scoped source. `next.config.ts` sets `X-Frame-Options: DENY`, `nosniff`,
  a referrer policy, a restrictive permissions policy, HSTS, COOP/CORP, and an
  enforced CSP. The public OpenAPI JSON response alone permits `*` and does
  not allow credentials. The existing CSP still permits inline/eval; that is
  unchanged and outside the writer-chain boundary reviewed here.
- **OAuth/GitHub:** the OAuth start and callback use a signed, HMAC-protected,
  timing-safe-compared state bound to the authenticated user's organization.
  The create-PR route checks the authenticated organization's active
  connection, its repository allowlist, and GitHub write permission. Live
  OAuth and live GitHub behavior were not exercised.
- **RBAC/tenant isolation:** permission and org scope are applied before
  violation lookup, verification, planning, or writing. The review did not
  find a cross-tenant route path.
- **Rate limits/resource budget:** the request is user-rate-limited before
  browser work; the candidate cap is applied before verification and every
  candidate receives safety analysis. No budget bypass was found.
- **XSS:** generated remediation is written to customer source rather than
  rendered by AccessGuard. Script/event-handler/active-tag validation held.
  No new XSS was found in the scoped product path.
- **SQL injection:** the scoped route uses Prisma's structured predicates; no
  raw SQL interpolation was found.
- **Command injection:** no shell, process execution, or command construction
  occurs in the scoped route/writer path.
- **SSRF:** the server does not fetch arbitrary customer URLs from the scoped
  writer path; repository resource resolution is path-constrained. The local
  requests in 16-M2, 16-M3, and 16-M4 occur in the **customer browser**, not
  as a server SSRF.
- **Uploads:** this route accepts no file upload. It writes a generated fix
  and bounded documentation artifacts through the GitHub transport.
- **Secrets:** no live credential was identified or modified.

The findings are therefore primarily **A06 Insecure Design** and **A08
Software or Data Integrity Failures** failures. Authentication, authorization,
tenant isolation, rate limiting, and audit ordering are not the bypass points.

## 8. Required closure criteria

Every criterion below is mandatory. A closure must be made at the shared root
cause, not by blocking only the literal payload.

### 8.1 16-H1

1. Parse a member chain as a chain, including computed and optional members.
2. Resolve `img['dataset']['state']`, `img.dataset?.state`, and equivalent
   spellings to the `data-state` attribute.
3. A chain or dataset key that cannot be resolved must fail closed as a
   generic state read.
4. Keep unrelated dot, bracket, and chained dataset keys writable.
5. Add permanent regressions for both harmful forms and the benign boundary.

### 8.2 16-H2

1. Normalize dot, computed, and optional `Reflect.get` and
   `Reflect.getOwnPropertyDescriptor` calls.
2. Resolve the receiver and property name for each normalized form.
3. An unresolved receiver or property must fail closed.
4. Keep a `Reflect` read of an unrelated property writable.
5. Add permanent regressions for all three harmful forms.

### 8.3 16-H3

1. Parse optional and computed members in the middle of a callee chain.
2. Resolve the attribute-read receiver and attribute argument for
   `getAttribute?.call(...)`, a computed prototype member, and equivalent
   spellings.
3. A method or attribute name that cannot be resolved must fail closed.
4. Keep an unrelated attribute read writable.
5. Add permanent regressions for both harmful forms.

### 8.4 16-H4

1. Resolve literal string concatenations in `getElementById(...)` and
   `querySelector*(...)` before comparing an introduced id.
2. Check a new or changed id on the patched target and every introduced
   element against the resolved runtime references.
3. An unresolved id expression must fail closed.
4. Preserve an unchanged id and an introduced id the runtime does not name.
5. Add permanent regressions for the exact section 4.5 payload and the sibling
   selector spelling.

### 8.5 16-H5

1. Model the tag of every remediation-introduced element and compare it with a
   literal runtime selector.
2. A selector that can resolve to an introduced element must refuse the source
   patch with 0 fixes and 0 writes.
3. Do not blanket-refuse a selector that cannot name an introduced element or
   an introduced element the runtime does not name.
4. Add a permanent regression for the exact section 4.6 payload and preserve
   the ordinary child-element/attribute boundary.

### 8.6 16-H6

1. Model every statically resolvable base-`href` write, including
   `setAttributeNS(...)`, an `Attr.value` write, `setAttribute(...)`, and
   `.href`/`['href']` assignment.
2. A statically resolvable base mutation must make the document base
   unprovable; an unresolved receiver must also fail closed.
3. Keep a mutation of another element and an unchanged base writable.
4. Add permanent regressions for both exact section 4.7 expressions.

### 8.7 16-H7

1. Inspect repository runtime in documents even when static markup has no
   `<base>` element.
2. Detect a runtime-created or runtime-inserted base and any subsequent
   `href` assignment; make the document base unprovable.
3. Keep a document with no base and no runtime base creation writable.
4. Add a permanent regression for the exact section 4.8 payload.

### 8.8 16-M1

1. Parse `color-mix()` and its nested color expressions, or fail closed when
   the resulting alpha cannot be computed.
2. A zero-alpha activated color must produce a non-null destination reason,
   0 fixes, and 0 writes.
3. Keep an opaque color harmless and add a permanent regression for the exact
   section 4.9 payload.

### 8.9 16-M2

1. Parse the family component of the `font` shorthand.
2. When an activated `font` shorthand selects a matching family, resolve it
   to the font-face resources through the same fail-closed path as a
   `font-family` longhand.
3. Keep a font family without a resource harmless.
4. Add a permanent regression for the exact section 4.10 payload.

### 8.10 16-M3

1. Apply CSS declaration order to duplicate `@font-face src` descriptors.
2. Evaluate the effective source, including a later URL after an earlier
   `local(...)` declaration.
3. An unresolved effective source must fail closed.
4. Add a permanent regression for the exact section 4.11 payload.

### 8.11 16-M4

1. Model control-state pseudo-class transitions, at minimum the
   `disabled`/`enabled` pair, when the fix removes or adds `disabled`.
2. An activated rule that carries a customer-side resource must produce a
   non-null destination reason, 0 fixes, and 0 writes.
3. Preserve `:hover` and `:focus-within` as harmless user-interaction
   pseudo-classes.
4. Add a permanent regression and an observable Chromium request comparison.

### 8.12 Closure process

For each criterion:

1. add a shipped permanent regression that fails before the fix and passes
   after it;
2. re-run the complete fourth- through sixteenth-review unsafe matrices and
   require 0 fixes and 0 writes in every unsafe direction;
3. re-run the legitimate-behaviour matrix and keep every listed behaviour
   writable or harmless;
4. re-run typecheck, lint, coverage, build, Chromium E2E, and dependency
   audit; and
5. require a fresh independent security review to return **READY with
   Critical 0 and High 0** before the release gate opens.

## 9. Untested / out of scope

- No production, public, customer, or third-party target was scanned.
- No live GitHub repository, OAuth flow, or live pull request was created.
- Chromium was the only browser engine. Safari, Firefox, WebKit, and engine-
  specific behavior were not tested and are not claimed.
- Strix was skipped as required. No Strix result, finding, confidence, or pass
  is claimed.
- The static CSS reader's documented residual limitations remain: a customer
  build pipeline, CDN stylesheet, runtime-generated CSS, service worker, CSS
  in JS, unresolved custom property, and other accepted fail-closed cases were
  not re-engineered.
- No change was made to the application's accepted false-positive policy, CSP,
  cookies, OAuth configuration, rate-limit values, database schema, CI, or
  dependency versions.
- Full-application penetration testing outside the V23 writer/verification/
  route chain, performance/load testing, and infrastructure/cloud configuration
  review were outside this brief.
- The validity of the one documentation-placeholder key shape was not tested
  against any provider; only its local prose context was checked.

## 10. Cleanup and artifact integrity

All temporary repository harnesses were removed after their evidence was
captured. No shipped file, permanent test, dependency, lockfile, workflow,
schema, environment file, or existing `.ai/` file was modified. The only
repository artifact created by this review is this untracked report:

```text
?? .ai/SECURITY-REVIEW-16.md
```
