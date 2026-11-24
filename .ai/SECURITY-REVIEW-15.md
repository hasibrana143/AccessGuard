# AccessGuard — Fifteenth Independent Security Review

Date: 2026-11-24

## 1. Verdict

**NOT READY — Critical 0, High 4, Medium 5, Low 0.**

The release gate requires **Critical 0 and High 0**. Four independently
reproduced High root causes pass remediation validation and destination
analysis, are accepted and applied by the repository writer with one source
write, and reach the real create-PR route. Local Chromium confirms a
viewport-wide customer-page takeover in every High variant. The real route was
exercised with a mocked GitHub transport and the isolated verification result
stubbed to a verified confidence, so the downstream writer and pull-request
path could be observed without claiming a new Strix or browser-engine result.

The four High root causes are:

1. alternate but statically resolvable `getAttribute` call syntaxes bypass the
   runtime state-read gate;
2. `dataset` bracket and `Reflect.get` property reads bypass the reflected
   attribute gate;
3. an id introduced on the patched target is not treated as an introduced id;
4. an indexed collection receiver bypasses the runtime-mutated document-base
   gate.

Five Medium root causes also violate the required fail-closed direction: modern
slash-alpha transparency, removal through nested negation, an `@font-face`
resource, accessibility-tree hiding through browser-decoded/ancestor/inert
semantics, and removal of `autofocus`.

This tree is not releasable until every High reproduction is blocked in the
unsafe direction, permanent regressions cover every root cause, and a fresh
independent review returns READY.

This is the fifteenth-review security artifact. The existing
`.ai/SECURITY-STATUS.md` and every other existing `.ai/` file were intentionally
not changed.

## 2. Reviewed trees and boundary

| Item | Value |
|---|---|
| Requested baseline | `08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c` (`vol: releases — V23: volume log entry for the seventh-review closure cycle`) |
| Reviewed closure tree | `d16797c54fd022c1fce3d645fdf2ba07a50da186` (`vol: security — V23: close the fourteenth review's runtime, stylesheet, validation and verification findings`) |
| Current checkout at report time | `2da3e0079f14d79d7c809cdf1a84a5ccc03f16e5` (`vol: releases — V23: record the fourteenth-review closure in the volume chain`) |
| Current `origin/main` | `2da3e0079f14d79d7c809cdf1a84a5ccc03f16e5` |
| Closure-tree-to-checkout identity | `git diff --quiet d16797c..HEAD -- src` returned **exit 0**. The later checkout changed no scoped or other `src` file. |
| Baseline-to-closure source diff | 15 files changed, 7,247 insertions and 459 deletions: the destination/runtime, writer, route/audit and regression files changed by the fourteenth-review closure. |
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
2. re-run every literal fourth- through fourteenth-review payload in its unsafe
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

No Critical finding was reproduced. The four High and five Medium findings
below are independent root causes; equivalent payloads are grouped under the
affected root cause.

The accepted fail-closed false positives in `.ai/RISKS.md` rows 46–61 were
checked in both directions and remain documented. The findings below are not
those accepted cases:

- every method/property/id/collection name used by 15-H1 through 15-H4 is
  statically resolvable, so this is not the accepted unresolved-name trade-off;
- 15-H3 concerns a new id on the patched target, not the accepted broad
  structural-selector case;
- 15-H4 identifies the base element deterministically, not an unresolved
  receiver;
- 15-M1, 15-M2, and 15-M3 use browser-valid CSS that the static reader claims
  to understand; and
- 15-M4 and 15-M5 are explicit browser accessibility/focus semantics, not
  generic unknown state.

The ordinary script file, linked script that does not react, `:hover`,
`:focus-within`, unrelated runtime mutation, unchanged base, and unrelated
`Reflect.get` all remain writable or harmless as required.

## 4. Reproduced findings

### 4.1 Result matrix

| ID | Severity | Exact harmful variants | Writer result | Chromium / local observable |
|---|---:|---:|---|---|
| 15-H1 | High | 3 | applied, 1 fix, `index.html` write | target fixed at `1280×720`, class `overlay` |
| 15-H2 | High | 2 | applied, 1 fix, `index.html` write | target fixed at `1280×720`, class `overlay` |
| 15-H3 | High | 1 | applied, 1 fix, `index.html` write | target fixed at `1280×720`, class `overlay` |
| 15-H4 | High | 2 | applied, 1 fix, `index.html` write | target fixed at `1280×720`; requests included `/sub/theme.bin` and `/sub/x` |
| 15-M1 | Medium | 1 | applied, 1 fix, `index.html` write | computed color `rgba(0, 0, 0, 0)` |
| 15-M2 | Medium | 1 | applied, 1 fix, `index.html` write | local `GET /pixel` |
| 15-M3 | Medium | 1 | applied, 1 fix, `index.html` write | local `GET /font` |
| 15-M4 | Medium | 4 | applied, 1 fix, `index.html` write | repaired target absent from the accessibility tree / role `none`, ignored |
| 15-M5 | Medium | 1 | applied, 1 fix, `index.html` write | initial focus changed from `BUTTON#target` to `BODY` |

Sixteen harmful variants were reproduced. Three controls were also tested: a
changed target id and a `hidden` target were refused with 0 fixes and 0 writes;
a `role="presentation"` ancestor did not hide the child image in Chromium and
was not counted as harmful.

### 4.2 15-H1 — alternate `getAttribute` syntaxes bypass the runtime state-read gate (High)

The three exact expressions were:

```js
Element.prototype.getAttribute.call(img,'alt')
img.getAttribute?.('alt')
img['get'+'Attribute']('alt')
```

Each was placed in this repository shape:

```html
<html><head><style>.overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}</style></head><body><img id="target" src="x"><script>document.querySelectorAll('img').forEach(function(img){if(EXPRESSION)img.classList.add('overlay')});</script></body></html>
```

The ordinary remediation was:

```html
<img id="target" src="x" alt="Photo">
```

**Observed result.** All three candidates passed validation, passed destination
analysis, were applied, planned one `index.html` write, and performed one
source write. In the final merged HTML, Chromium reported the repaired image at
`x=0, y=0, width=1280, height=720` with class `overlay`: a full-viewport
customer-page takeover. The real create-PR route reproduced the
`Element.prototype.getAttribute.call` variant as a source write and pull
request.

**Shipped-code root cause.** `src/lib/github.ts:468-482` defines
`RUNTIME_STATE_READ_PATTERN` and `ATTRIBUTE_NAME_READ_PATTERN`. The patterns
require the literal method name to be followed directly by `(`. They therefore
do not recognize a prototype receiver with `.call`, an optional call, or a
computed method name. `src/lib/github.ts:1231-1244` classifies a mutating
script as conditional only when the state-read pattern matches, and
`src/lib/github.ts:1440-1445` consults the raw attribute-name match only for
that already-classified set. The script is therefore treated as an ordinary
runtime mutation rather than a fix-activated state read.

### 4.3 15-H2 — `dataset` bracket and `Reflect.get` reads bypass the reflected-attribute gate (High)

The exact expressions were:

```js
img.dataset['state']
Reflect.get(img.dataset,'state')
```

The repository and remediation were:

```html
<html><head><style>.overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}</style></head><body><img id="target" src="x"><script>document.querySelectorAll('img').forEach(function(img){if(EXPRESSION)img.classList.add('overlay')});</script></body></html>
```

```html
<img id="target" src="x" alt="Photo" data-state="active">
```

**Observed result.** Both candidates passed validation and destination
analysis, applied one fix, and wrote `index.html`. In the final merged HTML,
Chromium reported the target at `1280×720` with class `overlay`. The real
route reproduced the bracket form as a source write and pull request.

**Shipped-code root cause.** `src/lib/github.ts:918-971` models a reflected
attribute through `attributePropertyAliases()` and
`scriptReadsAttributeProperty()`. The `data-state` alias is only the literal
dot form `dataset.state`. The bracket form is not matched. The `Reflect.get`
path compares the reflected property name with an attribute name or a
non-dataset alias; it does not interpret `Reflect.get(img.dataset,'state')` as
the `data-state` attribute. The reader therefore misses a statically
resolvable state read.

### 4.4 15-H3 — a remediation-added id on the patched target is not checked (High)

The exact repository and remediation were:

```html
<html><head><style>.overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}</style></head><body><img src="x"><script>document.getElementById('activated').classList.add('overlay');</script></body></html>
```

```html
<img id="activated" src="x" alt="Photo">
```

**Observed result.** The candidate passed validation and destination analysis,
applied one fix, and wrote `index.html`. In the final merged HTML, Chromium
reported the newly identified target at `1280×720` with class `overlay`. The
real route reproduced it as a source write and pull request.

**Shipped-code root cause.** `src/lib/github.ts:1394-1429` checks the
original element's id and then collects introduced ids only from
`patchedElements.slice(1)`. The patched target is `patchedElements[0]`, so a
new id introduced on that target is excluded from `introducedIds`. The later
attribute-read checks do not model `getElementById('activated')` as a read of
the `id` attribute. The runtime can therefore reach a target that exists only
after the fix.

### 4.5 15-H4 — indexed collection receivers bypass the runtime base gate (High)

The exact receivers were:

```js
document.querySelectorAll('base')[0].href='/sub/';
document.getElementsByTagName('base')[0].href='/sub/';
```

The repository shape was:

```html
<html><head><base id="base"><script>RECEIVER</script><link rel="stylesheet" href="theme.bin"></head><body><img id="target" src="x"></body></html>
```

with the analysed root stylesheet `theme.bin` containing `img{color:red}` and
the base-relative `sub/theme.bin` containing:

```css
[alt]{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}
```

**Observed result.** Both candidates passed validation and destination
analysis, applied one fix, and wrote `index.html`. In the final merged HTML,
Chromium loaded both the original and base-relative resources: the listener
observed `/theme.bin`, `/x`, `/sub/theme.bin`, and `/sub/x`. The repaired
target was fixed at `1280×720`. The real route reproduced the
`querySelectorAll` form as a source write and pull request.

**Shipped-code root cause.** `src/lib/github.ts:716-718` defines
`HREF_PROPERTY_ASSIGNMENT_PATTERN`; its receiver grammar does not include an
indexed collection expression. `src/lib/github.ts:740-757` and
`src/lib/github.ts:820-845` recognize direct `querySelector*` and
`getElementsByTagName` calls, but neither the expression resolver nor
`receiverMayBeBase()` interprets the following `[0]`. The statically
identifiable base is consequently not marked as runtime-mutable, and the
writer analyses a stylesheet the browser does not load.

### 4.6 15-M1 — modern slash-alpha transparency is missed (Medium)

The exact repository and remediation were:

```html
<html><head><style>[aria-label]{color:rgba(0 0 0 / 0)}</style></head><body><button id="target">Save</button></body></html>
```

```html
<button id="target" aria-label="Save">Save</button>
```

**Observed result.** The candidate passed validation and destination analysis,
applied one fix, and wrote `index.html`. In the final merged HTML, Chromium
computed the repaired button's color as `rgba(0, 0, 0, 0)`: the visible text
became transparent although axe still found the accessible name. The real
route reproduced it as a source write and pull request.

**Shipped-code root cause.** `src/lib/css-context.ts:1473-1499` implements
`isTransparentColor()`. The legacy comma branch matches `rgba(...)`, splits
only on commas, and returns `false` when fewer than four parts are present.
For `rgba(0 0 0 / 0)` it returns before the later modern slash-alpha grammar
can be evaluated.

### 4.7 15-M2 — class removal through nested negation is missed (Medium)

The exact repository and remediation were:

```html
<html><head><style>button:is(:not(.armed)){background-image:url(/pixel)}</style></head><body><button id="target" class="armed">Save</button></body></html>
```

```html
<button id="target" aria-label="Save">Save</button>
```

**Observed result.** The candidate passed validation and destination analysis,
applied one fix, and wrote `index.html`. In the final merged HTML, the local
listener observed `GET /pixel` after the fix activated the rule by removing
`.armed`. The real route reproduced it as a source write and pull request.

**Shipped-code root cause.** `src/lib/css-context.ts:1255-1335` implements
`compoundActivatedByFix()`. `positiveRequirementRemoved()` does not traverse a
candidate's `negated` requirements, and the final negated check only examines
the root requirements. A class removal that makes a nested `:not()` true is
therefore not recognized as activating `button:is(:not(.armed))`.

### 4.8 15-M3 — an `@font-face` resource is disconnected from the activated rule (Medium)

The exact repository and remediation were:

```html
<html><head><style>@font-face{font-family:Evil;src:url(/font)} button[aria-label]{font-family:Evil}</style></head><body><button id="target">Save</button></body></html>
```

```html
<button id="target" aria-label="Save">Save</button>
```

**Observed result.** The candidate passed validation and destination analysis,
applied one fix, and wrote `index.html`. In the final merged HTML, the local
listener observed `GET /font`. The real route reproduced it as a source write
and pull request.

**Shipped-code root cause.** `src/lib/css-context.ts:415-459` classifies
`@font-face` as a `VALUE_AT_RULE` and `collectInto()` discards its body at
line 458. The activated-rule resource check at
`src/lib/css-context.ts:3555-3604` examines only ordinary rule declarations;
it does not associate a `font-family` with the `@font-face` `src:url(...)`
that supplies it. The resource is invisible to the writer.

### 4.9 15-M4 — the repaired element can be hidden from the accessibility tree (Medium)

The four exact harmful remediations were:

```html
<img id="target" src="x" alt="Photo" aria-hidden="&#116;rue">
<img id="target" src="x" alt="Photo" role="&#112;resentation">
<div aria-hidden="true"><img id="target" src="x" alt="Photo"></div>
<img id="target" src="x" alt="Photo" inert>
```

**Observed result.** All four candidates passed validation and destination
analysis, applied one fix, and wrote `index.html`. In the final merged HTML,
the Chromium accessibility tree no longer exposed the repaired target: it was
absent or represented by role `none` with `ignored:true`. The repair therefore
removed the very content it claimed to restore from the accessibility tree.
The real route reproduced the entity, ancestor, and inert forms as source
writes and pull requests.

The control `<div role="presentation"><img id="target" src="x" alt="Photo">`
was not harmful: Chromium retained the image with role `image`. It is not
counted.

**Shipped-code root cause.** `src/lib/fix-validation.ts:23-34` stores the raw
attribute value returned by `parseHtmlTags()`. `src/lib/fix-validation.ts:150-155`
compares the raw `aria-hidden` and `role` values with literal `true`,
`presentation`, and `none`; it does not browser-decode numeric entities. The
image-alt check at `src/lib/fix-validation.ts:270-290` checks only the target
element's attributes and does not inspect a remediation ancestor. It also has
no `inert` branch. The browser applies all three hiding semantics.

### 4.10 15-M5 — removing `autofocus` changes initial focus (Medium)

The exact original and remediation were:

```html
<button id="target" autofocus><span aria-hidden="true">x</span></button>
```

```html
<button id="target" aria-label="Save"><span aria-hidden="true">x</span></button>
```

**Observed result.** The candidate passed validation and destination analysis,
applied one fix, and wrote `index.html`. A focused Chromium comparison showed
`document.activeElement` was `BUTTON#target` in the original and `BODY` in the
merged remediation. The fix silently removed the page's initial focus target.
The real route reproduced it as a source write and pull request.

**Shipped-code root cause.** `src/lib/github-pr.ts:560-577` models keyboard
focusability, and `src/lib/github-pr.ts:741-765` rejects only a loss of that
focusability. It does not compare the presence of `autofocus`. The unrelated
`src/lib/css-context.ts:1226` focus flag records only an **added**
`autofocus`, because its purpose is to model focus-rule activation; it is not
used to reject removal.

### 4.11 Finding-to-code map

| Finding | Shipped code | Missed condition | Required correction |
|---|---|---|---|
| 15-H1 | `src/lib/github.ts:468-482`, `:1231-1244`, `:1440-1445` | direct-call regexes do not cover `.call`, optional call, or computed method name | recognize all statically resolvable attribute-read call forms; fail closed on an unresolved method/attribute name |
| 15-H2 | `src/lib/github.ts:918-971` | `dataset.state` is the only dataset alias; `Reflect.get(dataset, key)` is not mapped to `data-*` | model dataset bracket access and `Reflect.get` on `dataset`, with unresolved keys fail-closed |
| 15-H3 | `src/lib/github.ts:1394-1429` | introduced ids are collected only from `patchedElements.slice(1)` | include a new/changed id on the patched target and every introduced element in the runtime-reference check |
| 15-H4 | `src/lib/github.ts:716-718`, `:740-757`, `:820-845` | receiver grammar and base resolver do not interpret collection indexes | resolve indexed collection receivers and fail closed when the collection may contain the base |
| 15-M1 | `src/lib/css-context.ts:1473-1499` | legacy comma branch returns false before modern slash-alpha parsing | parse comma and slash alpha in one browser-equivalent grammar |
| 15-M2 | `src/lib/css-context.ts:1255-1335` | removed-class state is not propagated through nested negation | propagate removal through nested `:not()` and `:is()` alternatives |
| 15-M3 | `src/lib/css-context.ts:415-459`, `:3555-3604` | `@font-face` is discarded and no family-to-resource relation exists | collect font faces and resolve an activated `font-family` to its `src` resource |
| 15-M4 | `src/lib/fix-validation.ts:23-34`, `:150-155`, `:270-290` | raw values, target-only checks, and no `inert` handling | browser-decode values; model `aria-hidden`, `role`, and `inert` on the repaired element and its remediation ancestors |
| 15-M5 | `src/lib/github-pr.ts:560-577`, `:741-765` | validation checks focusability, not initial-focus behavior | compare `autofocus` before and after and reject its removal unless explicitly permitted |

### 4.12 Route and write-path evidence

The real route was exercised with the normal writer/plan/apply path and a
mocked Octokit transport; only the isolated axe verification was stubbed to a
verified confidence so that the route's own writer path could be observed.
**11/11 representative harmful cases passed**, covering all nine root causes
(three variants of 15-M4). For every case the route:

- returned HTTP `200` with `success:true`;
- applied one source fix to `index.html`;
- created the branch and pull request;
- wrote `github_pr_intent` before the first mutation; and
- wrote `github_pr_created` after the pull request.

The route itself is not the root cause. `src/app/api/github/create-pr/route.ts`
authenticates and checks `CREATE_PR` at line 102, scopes violations by
`auth.user.orgId` at lines 105-119, rate-limits the user at lines 135-146,
checks the org's connected-repository allowlist at lines 184-204, verifies
GitHub write access at lines 217-224, verifies candidates at lines 245-257,
plans every source change before mutation at lines 278-312, and records the
intent audit before branch creation at lines 317-350. The findings occur
because the planner's safety analysis returns an unsafe plan; the route then
faithfully applies that plan.

## 5. Prior-payload and legitimate-behaviour evidence

### 5.1 Recovered fourth- through fourteenth-review payloads

| Harness / matrix | Result | Interpretation |
|---|---:|---|
| recovered `prior-118-matrix-corrected.ts` | **118/118 passed** | 94 literal unsafe fourth- through eighth-review assertions and 24 legitimate assertions; every unsafe case was refused/non-harmful with 0 fixes and 0 writes |
| ninth-review writer matrix | **42/42 passed** | all unsafe ninth-review payloads blocked in the unsafe direction; legitimate cases remained writable |
| tenth-review writer matrix | **19/19 passed** | all unsafe tenth-review payloads blocked in the unsafe direction |
| eleventh-review closure matrix | **37/37 passed** | runtime, geometry, resource, animation, and legitimate boundaries held |
| twelfth-review closure matrix | **26/26 passed** | runtime-name, stylesheet, offset, destination, and visibility boundaries held |
| thirteenth-review closure matrix | **21/21 passed** | computed state, selector, base, and writer-budget boundaries held |
| fourteenth-review closure matrix | **23/23 passed** | `Reflect`, stylesheet-link, base, introduced-element, semantics, inline-resource, selector, link-state, offset, and accessibility-tree boundaries held |
| eleventh-review real-route closure | **9/9 passed** | refusal created no branch, document, pull request, or intent audit; failure ordering held |
| twelfth-review real-route closure | **8/8 passed** | route refusals, benign patch, and artifact ordering held |
| combined current closure run | **8 files, 185/185 passed** | all listed current closure matrices and route harnesses passed together |

The intentionally pre-closure eleventh-review harness was also re-run:

- route harness: **2 failed, 7 passed**. The two failures were the old
  assertions that expected vulnerable HTTP `200`; the closed route returned
  HTTP `400`. This confirms the closure and is not a regression.
- writer/Chromium harness: **12 failed, 5 passed**. The failures were the old
  assertions that expected one fix or one write for a now-closed unsafe path;
  the local Chromium harm assertions passed.

### 5.2 Equivalent-path writer and Chromium evidence

The final merged-HTML harness evaluated 19 candidates. Seventeen were writable,
two controls were correctly refused with 0 fixes and 0 writes, and the sixteen
harmful writable candidates had the observable results in section 4.1. The
harness served the **planned final file content** to local Chromium; it did
not mutate a DOM after an inline script had already run.

### 5.3 Legitimate behaviours checked

A dedicated temporary harness passed **29/29** checks:

1. ordinary `image-alt` and `button-name` fixes remain writable;
2. legitimate `https:` and `mailto:` hrefs remain valid;
3. a preserved relative destination remains valid;
4. a preserved class and a benign inline style remain valid;
5. three selected identical copies produce three fixes and one file write;
6. two selected copies out of three produce zero fixes and zero writes;
7. all twelve server-template spellings are rejected;
8. an ordinary linked script containing a comparison and an apostrophe remains
   writable;
9. a linked script that does not react to the fix remains writable;
10. a document with no `<base>` remains writable;
11. a `<base href>` that resolves inside the repository remains writable;
12. a `<base>` that no runtime touches remains writable;
13. a runtime mutation of a non-base element remains writable;
14. a `Reflect.get` of an unrelated property remains writable;
15. an ordinary stylesheet link and a `<link rel="icon">` remain writable;
16. `:hover` and `:focus-within` remain harmless;
17. an unrelated runtime mutation remains writable;
18. an event handler that does not react to the fix remains writable;
19. a small box growth remains harmless;
20. a harmless focus rule remains harmless;
21. a custom property without a resource remains harmless when its rule already
    applies;
22. a scale of one remains harmless;
23. small, inset, and `none` box shadows remain harmless;
24. a non-zero maximum size remains harmless;
25. a zero maximum size without clipping remains harmless;
26. an aspect ratio with both axes declared remains harmless;
27. a running animation that ends visible remains harmless;
28. a positive delay without the backwards fill remains harmless; and
29. a pure in-page fragment `#main` remains valid.

The first run of check 21 used an original element without `alt`, which made
the `[alt]` rule newly active and correctly left the unresolved `var()`
unprovable. The correct closure twin keeps the rule already applying before
and after the fix; it passed. No product change was made for this harness
correction.

## 6. Verification commands and observed results

### 6.1 Required gate suite

| Command | Observed result |
|---|---|
| `npx tsc -p tsconfig.check.json --noEmit` | **PASS**, exit 0, no diagnostics |
| `npm run lint` | **PASS**, exit 0, no ESLint errors |
| `npx vitest run --coverage` | **PASS**, exit 0; 53/53 files and 902/902 tests passed in 54.44s; coverage 68.88% statements, 61.78% branches, 72.06% functions, 70.74% lines; configured gates passed |
| `npm run build` | **PASS**, exit 0; Next.js 16.4.6 compiled in 26.4s, TypeScript in 20.4s, 116/116 static pages generated |
| `npx playwright test --project=chromium` | **PASS with retries**, exit 0; 79 tests, 77 passed, 2 flaky, 0 failed, 7.0m. The flaky tests were the dashboard axe check and authenticated landing CTA; both passed on retry. |
| `npm audit --audit-level=high` | **PASS**, exit 0; 15 moderate advisories, 0 high, 0 critical |

An additional production-only dependency check,
`npm audit --omit=dev --audit-level=high`, also exited 0: 5 moderate
transitive advisories and 0 high/critical advisories. The 15 total advisories
are a maintenance item, not a Critical/High release-gate failure.

### 6.2 Services and secret checks

- `cmd /c "docker compose up -d postgres redis"` succeeded; PostgreSQL and Redis
  containers were running.
- The tracked-file secret-pattern scan inspected 781 tracked files. It found
  one AWS-access-key-shaped **documentation placeholder** in
  `.openclaw/skills/document-generate/SKILL.md`; contextual inspection
  confirmed prose/example text, not a credential. No other private-key, AWS,
  GitHub-token, Slack-token, or Google-API-key shape was found. No secret value
  is reproduced in this report. Environment files were excluded and not read.
- No secret, credential, production configuration, dependency, lockfile, or
  environment file was changed.

## 7. OWASP-style disposition of the scoped surfaces

| Surface | Disposition | Evidence |
|---|---|---|
| OWASP A01 Broken Access Control | **No new finding** | `CREATE_PR` permission, org-scoped violation lookup, org-scoped GitHub connection, and repository allowlist all apply before writes |
| OWASP A02 Security Misconfiguration | **No new finding in the scoped call path** | security headers, enforced CSP, API `no-store`, and no permissive CORS header were checked; the nine findings are analyzed below as incomplete trust-boundary design rather than missing route configuration |
| OWASP A03 Software Supply Chain Failures | **No High/Critical advisory** | `npm audit` and production-only audit contain no high/critical result; 15 moderate transitive advisories remain for maintenance |
| OWASP A04 Cryptographic Failures | **No new finding** | the scoped route does not change JWT/session cryptography or secret handling; no `.env` value was read |
| OWASP A05 Injection | **No new finding** | remediation validation rejects script/event handlers, active/embedding tags, template grammar, braces, and unsafe URI schemes; no new SQL or command injection path was found in scope |
| OWASP A06 Insecure Design | **FAIL — all 9 root causes** | the writer treats a partial static model of repository CSS/runtime/accessibility/focus behavior as proof that a source patch is safe |
| OWASP A07 Authentication Failures | **No new finding** | verified-email session/bearer authentication and permission enforcement precede repository work |
| OWASP A08 Software or Data Integrity Failures | **FAIL — all 9 root causes** | the writer accepts an unproven source change and writes it; the destination can change after merge |
| OWASP A09 Security Logging and Alerting Failures | **No new finding** | durable `github_pr_intent` precedes mutation and `github_pr_created` closes the trail; failure cases retain the intent record |
| OWASP A10 Mishandling of Exceptional Conditions | **No new finding in scope** | planning, branch, write, PR, and audit failure paths were re-run; a refused source write creates no false violation link |

Additional scoped checks:

- **Sessions/cookies:** NextAuth's session/CSRF/state cookies are `HttpOnly`,
  `SameSite=Lax`, path-scoped, and secure when secure cookies are enabled. A
  cross-site form POST does not carry the ambient session cookie. The bearer
  path is not ambiently attached to a third-party origin.
- **CSRF:** no separate `X-CSRF-Token` enforcement exists on this route, but
  cookie-authenticated mutation is protected by the session cookie's
  `SameSite=Lax` behavior and bearer authentication is not cookie-authenticated.
  No reproducible CSRF bypass was found in the scoped route.
- **CORS/headers:** no wildcard or origin-reflection CORS policy was found in
  the scoped source. `next.config.ts` sets `X-Frame-Options: DENY`,
  `nosniff`, a referrer policy, a restrictive permissions policy, HSTS,
  COOP/CORP, and an enforced CSP. The existing CSP still permits inline/eval;
  that is unchanged and outside the writer-chain boundary reviewed here.
- **OAuth/GitHub:** the create-PR route accepts only repositories on the
  authenticated organization's active connection and independently checks token
  write permission. Live OAuth and live GitHub behavior were not exercised.
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
  requests in 15-M2/15-M3 occur in the **customer browser**, not as a server
  SSRF.
- **Uploads:** this route accepts no file upload. It writes a generated fix
  and bounded documentation artifacts through the GitHub transport.
- **Secrets:** no live credential was identified or modified.

The findings are therefore primarily **A06 Insecure Design** and **A08
Software or Data Integrity Failures** failures. Authentication, authorization,
tenant isolation, rate limiting, and audit ordering are not the bypass points.

## 8. Required closure criteria

Every criterion below is mandatory. A closure must be made at the shared root
cause, not by blocking only the literal payload.

### 8.1 15-H1

1. Recognize direct `getAttribute(...)`, optional `getAttribute?.(...)`,
   prototype-receiver `.call(...)`, and statically resolvable computed method
   names as attribute state reads.
2. Resolve the attribute-name argument for each form. A method or attribute
   name that cannot be resolved must fail closed as a generic state read.
3. For every exact payload in section 4.2, the unsafe remediation must produce
   `validation:false` or a non-null destination reason, apply 0 fixes, write 0
   files, and remain unverified/unapplied.
4. Add permanent regressions for all three spellings and keep an unrelated
   `getAttribute` call writable.

### 8.2 15-H2

1. Model `dataset.state`, `dataset['state']`,
   `Reflect.get(img.dataset,'state')`, and the equivalent
   `getOwnPropertyDescriptor` forms as reads of the `data-state` attribute.
2. Map a dataset key to its `data-*` attribute consistently; an unresolved
   dataset key must fail closed.
3. Keep a `Reflect.get` of an unrelated property writable.
4. Add permanent regressions for both harmful forms and the benign boundary.

### 8.3 15-H3

1. Collect a new or changed id on the patched target as well as ids on every
   remediation-introduced element.
2. If runtime code references any such id, refuse the source patch with 0
   fixes and 0 writes.
3. Preserve an unchanged id and the legitimate case where runtime code does
   not reference the introduced id.
4. Add a permanent regression for the exact section 4.4 payload.

### 8.4 15-H4

1. Parse indexed receivers returned by `querySelectorAll(...)` and
   `getElementsByTagName(...)` when resolving a base-element mutation.
2. A receiver that may contain the base must make the document base
   unprovable; an unresolved collection/index must fail closed.
3. Keep a runtime mutation of an unrelated element and an unchanged base
   writable.
4. Add permanent regressions for both exact section 4.5 receivers.

### 8.5 15-M1

1. Parse legacy comma alpha and modern slash alpha in one browser-equivalent
   color grammar, including `rgb`, `rgba`, `hsl`, `hsla`, `oklch`, `oklab`,
   `lab`, `lch`, and `color()`.
2. A zero-alpha activated color must produce a non-null destination reason,
   0 fixes, and 0 writes.
3. Keep an opaque color harmless and add a permanent regression for
   `rgba(0 0 0 / 0)`.

### 8.6 15-M2

1. Propagate removed classes and changed attribute values through nested
   negation and through `:is()`/`:where()` alternatives.
2. A rule that becomes matching after such a removal must produce a
   non-null destination reason, 0 fixes, and 0 writes.
3. Keep an unrelated class removal harmless and add a permanent regression for
   `button:is(:not(.armed))`.

### 8.7 15-M3

1. Collect `@font-face` descriptors and their `src` resources.
2. When an activated rule selects a matching `font-family`, treat the font's
   resource as an activated customer-side request.
3. An unreadable or unresolved font family/resource must fail closed.
4. Add a permanent regression for the exact section 4.8 payload and keep a
   font family without a resource harmless.

### 8.8 15-M4

1. Browser-decode remediation attribute values before comparing
   `aria-hidden`, `role`, and related accessibility attributes.
2. Inspect the repaired element and its remediation ancestors with
   browser-equivalent accessibility semantics. Reject `aria-hidden="true"` and
   `inert` on the element or an ancestor, and reject `role="presentation"` or
   `role="none"` when it actually removes the target from the accessibility
   tree.
3. Treat `inert` on the repaired element as removing it from the accessibility
   tree.
4. Preserve the legitimate decorative-image cases already accepted by the
   rule; do not blanket-refuse every `alt=""`.
5. Add permanent regressions for the four harmful forms. Keep the harmless
   `role="presentation"` ancestor boundary explicit: a Chromium-observed
   ancestor that leaves the image with role `image` must not be blanket-
   refused.

### 8.9 15-M5

1. Compare `autofocus` on the original and patched target.
2. Removing `autofocus` must be refused with 0 fixes and 0 writes unless the
   product explicitly defines and validates a safe exception.
3. Keep a fix that preserves `autofocus` writable.
4. Add a permanent regression and an observable Chromium focus comparison.

### 8.10 Closure process

For each criterion:

1. add a shipped permanent regression that fails before the fix and passes
   after it;
2. re-run the complete fourth- through fifteenth-review unsafe matrices and
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
?? .ai/SECURITY-REVIEW-15.md
```
