# AccessGuard — Fourteenth Independent Security Review

Date: 2026-11-24

## 1. Verdict

**NOT READY — Critical 0, High 4, Medium 6, Low 0.**

The release gate requires **Critical 0 and High 0**. Four independently
reproduced High root causes pass remediation validation and the isolated
axe-core verifier, are reported as verified with confidence `1`, and reach the
real repository writer with one applied fix and one mocked source write. Local
Chromium confirms a viewport-wide customer UI takeover in every High variant.
The real create-PR route returns HTTP `200`, writes the customer source, creates
a branch and pull request, and records both audit events for every reproduced
variant.

The four High root causes are:

1. a `Reflect.get(...)` computed-property read bypasses the runtime state-read
   gate;
2. two browser-valid `<link rel="stylesheet">` spellings bypass stylesheet
   discovery;
3. a runtime-mutated `<base href>` changes which repository stylesheet the
   browser loads; and
4. a remediation-introduced element shifts `:nth-child()` and activates a
   full-viewport sibling overlay while isolated verification evaluates the
   introduced element instead of the patched target.

Six Medium findings also violate the required fail-closed direction: native
semantics and keyboard focus can be removed, a remediation can introduce a CSS
resource request, a quoted escaped `]` in a CSS attribute selector can hide an
activated resource, adding `href` can activate `:link`, a `99vw` offset can move
the patched content off-screen, and `aria-hidden="true"` can hide a supposedly
repaired image from the accessibility tree.

This tree is not releasable until every High reproduction is blocked in the
unsafe direction, permanent regressions cover every root cause, and a fresh
independent review returns READY.

This is the fourteenth-review security artifact. The existing
`.ai/SECURITY-STATUS.md` and every other existing `.ai/` file were intentionally
not changed.

## 2. Reviewed trees and boundary

| Item | Value |
|---|---|
| Requested baseline | `08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c` (`vol: releases — V23: volume log entry for the seventh-review closure cycle`) |
| Reviewed closure tree | `be81d02b2264ecb19098a59fe2a3aea8b3d0f709` (`vol: security — V23: close the thirteenth review's runtime, geometry and budget findings`) |
| Current checkout at report time | `f6db8f76bde36016ed1cd9d2e1ed1f1d804c689a` (`vol: state — V23: record the thirteenth-review pipeline evidence`) |
| Current `origin/main` | `f6db8f76bde36016ed1cd9d2e1ed1f1d804c689a` |
| Closure-tree-to-checkout identity | `git diff --quiet be81d02..HEAD -- src` returned **exit 0** and `SOURCE_UNCHANGED=1`. The later checkout changed no scoped or other `src` file. |
| Baseline-to-closure source diff | 13 files changed, 5,485 insertions and 291 deletions: the destination/runtime, writer, route/audit and regression files changed by the thirteenth-review closure. |
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
behavior, focus behavior, semantics, and rendering after the **repository's own
CSS** and the **repository's own runtime code** are combined with the generated
fix.

The unsafe direction for every prior and equivalent case below is strict:

- the unsafe remediation must fail validation (`validation: false`) or produce
  a non-null destination-harm reason;
- it must not be reported as verified/applied;
- it must apply **0 fixes**; and
- it must perform **0 repository writes**.

The method was:

1. establish the requested baseline, reviewed closure tree, and current source
   identity;
2. re-run every literal fourth- through thirteenth-review payload in its unsafe
   direction and re-check the legitimate behaviours;
3. exercise equivalent CSS selector, structural-element, painted-surface
   geometry, resource-base, runtime-carrier, runtime-state-read, focus-state,
   link-state, animation-timing, URI-resource, writer-budget, and route/audit
   paths;
4. require an observable Chromium geometry/paint/computed-style/accessibility
   result or a local `127.0.0.1` request before counting a candidate as a
   finding; and
5. run the source-only typecheck, lint, full unit suite, coverage gate,
   standalone build, Chromium E2E suite, dependency audit, and non-secret-
   printing tracked-file secret scan.

No Critical finding was reproduced. The four High and six Medium findings
below are independent root causes; equivalent payloads are grouped under the
affected root cause.

The accepted fail-closed false positives in `.ai/RISKS.md` rows 46–53 were
checked in both directions and remain documented. In particular, an ordinary
script file, a linked script that does not react, `:hover`, and `:focus-within`
remain writable or harmless. The findings below are not those accepted cases:

- the `Reflect.get` property name is statically resolvable (`'al' + 't'`), so
  this is not the accepted “name cannot be resolved” case;
- a runtime-mutated base is not a static base that the reader could parse and
  refuse;
- `:link` changes match state because the remediation adds `href`, whereas
  `:hover` and `:focus-within` do not transition because of the remediation; and
- the structural finding is repository CSS, not the accepted indirect runtime
  mutation trade-off.

## 4. Reproduced findings

### 4.1 Equivalent-path result matrix

For every final unsafe variant below, the observed writer and real-route state
was:

```text
validation=true
destination analysis=not refused
verification={status:"verified", confidence:1}
fixesAppliedTotal=1
mocked source writes=1 (index.html)
route=HTTP 200 success:true
route source write=index.html
branch=created
pull request=created
audit=github_pr_intent before mutation; github_pr_created after PR
```

Thirteen unsafe variants were checked. The real-route harness passed **13/13**
assertions across two temporary harnesses; every assertion above was observed.
The direct equivalent-path harness observed the same writer result for every
variant except the discarded empty-span structural candidate, whose isolated
verifier rejected it. A visible introduced span removes that accidental
verification rejection and is the High case below.

| Candidate | Browser / local-request proof |
|---|---|
| 14-H1 — `Reflect.get` reads the added `alt` attribute | The target changed from static `16×16` at `(8,8)` to fixed `1280×720` at `(0,0)`; the viewport center became the target. |
| 14-H2a — entity-encoded stylesheet `rel` | The target changed from static `16×16` to fixed `1280×720`; the viewport center became the target. The browser requested `/theme.bin`. |
| 14-H2b — quoted `>` in a stylesheet-link attribute | The target changed from static `16×16` to fixed `1280×720`; the viewport center became the target. The browser requested `/theme.bin`. |
| 14-H3 — runtime `<base href>` mutation | The target changed from static `16×16` to fixed `1280×720`; the viewport center became the target. The listener observed `/theme.bin` and the effective `/sub/theme.bin`. |
| 14-H4 — remediation-introduced element shifts `:nth-child()` | The sibling changed from static `1264×18` to fixed `1280×720`; the viewport center became the sibling. |
| 14-M1a — native button replaced by a `div` | Before the fix, Tab focused the `BUTTON` (`tabIndex=0`); after the fix, the element was a `DIV`, `tabIndex=-1`, and Tab did not focus it. |
| 14-M1b — `tabindex="0"` changed to `"-1"` | Before the fix, Tab focused the target (`tabIndex=0`); after the fix, `tabIndex=-1` and Tab did not focus it. |
| 14-M2a — remediation style uses `var(--pixel)` | The after-fix `127.0.0.1` listener observed `GET /pixel`. |
| 14-M2b — remediation style uses `image-set()` | The after-fix `127.0.0.1` listener observed `GET /pixel`. |
| 14-M3 — escaped `]` in a CSS attribute value | The after-fix `127.0.0.1` listener observed `GET /pixel`. |
| 14-M4 — added `href` activates `:link` | The after-fix `127.0.0.1` listener observed `GET /pixel`; the anchor also became keyboard-focusable. |
| 14-M5 — `99vw` off-screen offset | The target's left edge changed from `8` to `-1259.1875`; computed `left` was `-1267.2px`. |
| 14-M6 — `aria-hidden` suppresses the repaired image | Chromium's accessibility tree changed the target from role `image`, `ignored:false` to role `none`, `ignored:true`. |

### 4.2 14-H1 — `Reflect.get` bypasses the runtime state-read gate (High)

**Exact payload:**

```html
<!-- index.html -->
<html><body><img id="target" src="x"><script>document.querySelectorAll('img').forEach(function(img){if(Reflect.get(img,'al'+'t'))img.classList.add('overlay')});</script></body></html>
```

```css
/* styles.css */
.overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}
```

Original/remediation:

```html
<img id="target" src="x">
<img id="target" src="x" alt="Photo">
```

**Observed result:** The candidate validated, was not refused by destination
analysis, was verified with confidence `1`, applied one fix, and performed one
mocked source write. The real route returned HTTP `200 success:true`, wrote
`index.html`, created a branch and pull request, and wrote both audit events.
In Chromium, the target changed from static `16×16` to fixed `1280×720` and
occupied the viewport center.

**Root cause:** `COMPUTED_PROPERTY_READ_PATTERN` in `src/lib/github.ts`
recognises only bracket notation such as `img["al"+"t"]`. The
`RUNTIME_STATE_READ_PATTERN` list does not include `Reflect.get`, and
`scriptReadsAttributeProperty()` recognises dot properties and bracket
properties but not the `Reflect.get(object, propertyName)` API. The runtime
mutation is therefore recorded, but the conditional-mutation decision never
sees a state read. The isolated axe browser contains no repository runtime, so
it reports confidence `1` while the customer page is taken over after merge.

This is not the accepted unresolved-name trade-off: the argument is the
statically resolvable string `'al' + 't'`, and only the API spelling escapes
the reader.

### 4.3 14-H2 — stylesheet-link discovery is not browser-equivalent (High)

**Exact payload A — entity-encoded `rel`:**

```html
<!-- index.html -->
<html><head><link rel="styles&#x68;eet" href="theme.bin"></head><body><img id="target" src="x"></body></html>
```

```css
/* theme.bin */
[alt]{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}
```

**Exact payload B — quoted greater-than in another attribute:**

```html
<!-- index.html -->
<html><head><link title=">" rel="stylesheet" href="theme.bin"></head><body><img id="target" src="x"></body></html>
```

```css
/* theme.bin */
[alt]{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}
```

Original/remediation:

```html
<img id="target" src="x">
<img id="target" src="x" alt="Photo">
```

**Observed result:** Both candidates validated, were not refused, were verified
with confidence `1`, applied one fix, and performed one mocked source write.
The real route returned HTTP `200 success:true`, wrote `index.html`, created a
branch and pull request, and wrote both audit events. Chromium loaded
`/theme.bin`; in both cases the patched target became fixed `1280×720` at the
viewport center.

**Root cause:** `extractStylesheetLinks()` in `src/lib/css-context.ts` uses
`/<link\b([^>]*)>/gi`. That expression stops at the first `>` even when it is
inside a quoted attribute, so payload B truncates the tag before `rel` and
`href`. It also compares the raw `rel` value without HTML-entity decoding, so
payload A's browser-decoded `stylesheet` token is not recognized. The writer
therefore never adds `theme.bin` to the CSS context. The browser uses the same
`html-attributes.ts` entity and quoted-tag semantics that this discovery
function does not.

### 4.4 14-H3 — a runtime-mutated document base bypasses resource resolution (High)

**Exact payload:**

```html
<!-- index.html -->
<html><head><base id="base"><script>document.getElementById("base").href="/sub/";</script><link rel="stylesheet" href="theme.bin"></head><body><img id="target" src="x"></body></html>
```

```css
/* theme.bin — the stylesheet the writer analysed */
img{color:red}
```

```css
/* sub/theme.bin — the stylesheet Chromium loaded */
[alt]{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}
```

Original/remediation:

```html
<img id="target" src="x">
<img id="target" src="x" alt="Photo">
```

**Observed result:** The candidate validated, was not refused, was verified with
confidence `1`, applied one fix, and performed one mocked source write. The
real route returned HTTP `200 success:true`, wrote `index.html`, created a
branch and pull request, and wrote both audit events. The local listener
observed `/theme.bin` and the effective `/sub/theme.bin`; the patched target
became fixed `1280×720` at the viewport center.

**Root cause:** `resolveDocumentBase()` in `src/lib/github.ts` reads a static
`href` attribute. This `<base>` has no static `href`; the repository script
sets `base.href` before the following `<link>` is parsed. The runtime scanner
does not treat a base-element property assignment as a runtime mutation, so it
keeps the document URL as the base and analyses the benign root stylesheet.
The browser applies the mutated base and loads the unreviewed `sub/theme.bin`.
Rows 49 and 53 cover a static base that points outside the repository or
cannot be parsed; they do not cover a base whose effective value is created by
repository runtime code.

### 4.5 14-H4 — an introduced element changes structural CSS and misdirects verification (High)

**Exact payload:**

```html
<!-- index.html -->
<html><body><img id="target" src="x"><div id="overlay">owned</div></body></html>
```

```css
/* styles.css */
img:nth-child(2) ~ #overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}
```

Original/remediation:

```html
<img id="target" src="x">
<span aria-hidden="true">x</span><img id="target" src="x" alt="Photo">
```

**Observed result:** The candidate validated, was not refused by destination
analysis, was verified with confidence `1`, applied one fix, and performed one
mocked source write. The real route returned HTTP `200 success:true`, wrote
`index.html`, created a branch and pull request, and wrote both audit events.
Before the fix, the overlay was static `1264×18`; after the fix, the introduced
span made the image the second child, the overlay became fixed `1280×720`, and
the viewport center became the overlay.

**Root cause:** The destination model in `src/lib/css-context.ts` compares
attributes and classes of the patched element, but it does not model the DOM
position or sibling relationships created by a remediation-introduced element.
The writer's introduced-element logic in `src/lib/github.ts` checks only an
introduced element's `id` and attributes for correlation with runtime scripts;
it does not evaluate structural CSS. Separately,
`checkRenderedElement()` in `src/lib/fix-verification.ts` declares the **first**
rendered element to be the patched target. The introduced visible span becomes
that first element, so axe evaluates the span rather than the repaired image.
The result is a verified source patch that takes over the customer viewport.

### 4.6 14-M1 — native semantics and keyboard focus can be removed (Medium)

**Exact payload A — native button replaced by a `div`:**

```html
<!-- index.html -->
<html><body><button id="target"><span aria-hidden="true">x</span></button></body></html>
```

Original/remediation:

```html
<button id="target"><span aria-hidden="true">x</span></button>
<div id="target" aria-label="Save"><span aria-hidden="true">x</span></div>
```

**Exact payload B — keyboard focus removed:**

```html
<!-- index.html -->
<html><body><button id="target" tabindex="0"><span aria-hidden="true">x</span></button></body></html>
```

Original/remediation:

```html
<button id="target" tabindex="0"><span aria-hidden="true">x</span></button>
<button id="target" tabindex="-1" aria-label="Save"><span aria-hidden="true">x</span></button>
```

**Observed result:** Both candidates validated, were verified with confidence
`1`, applied one fix, and performed one mocked source write. The real route
returned HTTP `200 success:true`, wrote `index.html`, created a branch and pull
request, and wrote both audit events. In Chromium, Tab focused the original
button in both cases. After payload A, the element was a `DIV` with
`tabIndex=-1`; after payload B, it remained a button but had `tabIndex=-1`.
Tab focused neither repaired element.

**Root cause:** `validateFixForRule()` has no `button-name` branch. Its default
branch only checks that one of a small set of tags remains, so replacing a
native `button` with a `div` is valid. The general remediation validator does
not preserve native interactive semantics. Separately, `changesBetween()` in
`src/lib/css-context.ts` records a focusability transition only when the fix
**gains** focusability; it has no loss transition, and `validateRemediation()`
does not compare `tabindex`. The axe rule passes because `aria-label` supplies
a name, independently of whether the customer can still reach or activate the
control.

### 4.7 14-M2 — the remediation can introduce a CSS resource request (Medium)

**Exact payload A — custom-property reference:**

```html
<!-- index.html -->
<html><head><style>:root{--pixel:url(/pixel)}</style></head><body><img id="target" src="x"></body></html>
```

Original/remediation:

```html
<img id="target" src="x">
<img id="target" src="x" alt="Photo" style="background-image:var(--pixel)">
```

**Exact payload B — `image-set()`:**

```html
<!-- index.html -->
<html><body><img id="target" src="x"></body></html>
```

Original/remediation:

```html
<img id="target" src="x">
<img id="target" src="x" alt="Photo" style="background-image:image-set('/pixel')">
```

**Observed result:** Both candidates validated, were verified with confidence
`1`, applied one fix, and performed one mocked source write. The real route
returned HTTP `200 success:true`, wrote `index.html`, created a branch and pull
request, and wrote both audit events. In both cases the after-fix
`127.0.0.1` listener observed `GET /pixel`.

**Root cause:** `checkStyleAttribute()` in `src/lib/github-pr.ts` rejects an
inline style containing a literal `url(`, but it does not resolve `var()`
references and does not recognize `image-set()`. The repository CSS analyser
already knows how to resolve custom properties and recognize `image-set()` for
repository rules, but that check is not applied to the remediation's own inline
style. The verification browser blocks the request, so the customer browser
issues it after merge.

### 4.8 14-M3 — a quoted escaped `]` defeats CSS attribute-selector analysis (Medium)

**Exact payload:**

```html
<!-- index.html -->
<html><body><img id="target" src="x"><div id="overlay">owned</div></body></html>
```

```css
/* styles.css */
img[alt="\]"] ~ #overlay{background-image:url(/pixel)}
```

Original/remediation:

```html
<img id="target" src="x">
<img id="target" src="x" alt="]">
```

**Observed result:** The candidate validated, was not refused, was verified with
confidence `1`, applied one fix, and performed one mocked source write. The
real route returned HTTP `200 success:true`, wrote `index.html`, created a
branch and pull request, and wrote both audit events. The after-fix
`127.0.0.1` listener observed `GET /pixel`.

**Root cause:** The attribute-selector branch of `parseSubject()` in
`src/lib/css-context.ts` finds the end of a selector with
`selector.indexOf(']', i)`. A quoted CSS escape `\]` is valid inside the
attribute value, but the reader treats that escaped bracket as the end of the
selector. The resulting body is malformed, so the positive attribute
requirement is not recognized and the activated rule's resource is not
analysed. A selector whose attribute syntax cannot be read must be
unprovable, not harmless.

### 4.9 14-M4 — adding `href` activates `:link` (Medium)

**Exact payload:**

```html
<!-- index.html -->
<html><body><a id="target"><span aria-hidden="true">x</span></a></body></html>
```

```css
/* styles.css */
a:link{background-image:url(/pixel)}
```

Original/remediation:

```html
<a id="target"><span aria-hidden="true">x</span></a>
<a id="target" href="#main" aria-label="Text"><span aria-hidden="true">x</span></a>
```

**Observed result:** The candidate validated, was not refused, was verified with
confidence `1`, applied one fix, and performed one mocked source write. The
real route returned HTTP `200 success:true`, wrote `index.html`, created a
branch and pull request, and wrote both audit events. The after-fix
`127.0.0.1` listener observed `GET /pixel`; the repaired anchor also became
keyboard-focusable.

**Root cause:** `parseSubject()` records `:link` as an opaque conditional state,
not as a focus pseudo-class. `changesBetween()` observes that the added
`href` makes the anchor focusable, but `compoundActivatedByFix()` and
`compoundActivatedByFocus()` do not model a link-state transition. This is not
the accepted non-functional-pseudo-class trade-off: `:hover` and
`:focus-within` remain harmless because the remediation does not change their
match state, while adding `href` changes `:link` from false to true.

### 4.10 14-M5 — a `99vw` offset moves the patched content off-screen (Medium)

**Exact payload:**

```html
<!-- index.html -->
<html><body><img id="target" src="x" width="64" height="64"></body></html>
```

```css
/* styles.css */
[alt]{position:relative;left:-99vw;background:#f0f}
```

Original/remediation:

```html
<img id="target" src="x" width="64" height="64">
<img id="target" src="x" width="64" height="64" alt="Photo">
```

**Observed result:** The candidate validated, was not refused, was verified with
confidence `1`, applied one fix, and performed one mocked source write. The
real route returned HTTP `200 success:true`, wrote `index.html`, created a
branch and pull request, and wrote both audit events. Chromium changed the
target's left edge from `8` to `-1259.1875`; computed `left` was
`-1267.2px`. The repaired image was outside the viewport.

**Root cause:** `isLargeOffset()` in `src/lib/css-context.ts` treats a viewport
unit as off-screen only at `100` units or more. The model does not compose a
large viewport-unit offset with the element's declared size. A `99vw` shift is
already enough to move this `64×64` target completely outside the viewport, so
the threshold is not a safe proof of visibility.

### 4.11 14-M6 — `aria-hidden` can suppress the repaired image (Medium)

**Exact payload:**

```html
<!-- index.html -->
<html><body><img id="target" src="x"></body></html>
```

Original/remediation:

```html
<img id="target" src="x">
<img id="target" src="x" alt="Photo" aria-hidden="true">
```

**Observed result:** The candidate validated, was verified with confidence `1`,
applied one fix, and performed one mocked source write. The real route returned
HTTP `200 success:true`, wrote `index.html`, created a branch and pull request,
and wrote both audit events. Chromium's accessibility tree changed the target
from role `image`, `ignored:false` to role `none`, `ignored:true`. The image
remained painted for sighted users but was removed from the accessibility tree;
axe no longer reports `image-alt` because the element is hidden from that tree.

**Root cause:** The `image-alt` branch of `validateFixForRule()` in
`src/lib/fix-validation.ts` accepts `aria-hidden="true"` independently of the
`alt` value because of the boolean structure of its decorative-image
condition. That permits a remediation to hide the very element it claims to
repair. The rendered-element check in `fix-verification.ts` evaluates CSS
visibility, not accessibility-tree visibility, so it does not catch the
regression.

### 4.12 Finding-to-code map

| Finding | Primary shipped-code path |
|---|---|
| 14-H1 | `src/lib/github.ts` — `RUNTIME_STATE_READ_PATTERN` (lines 459–460), `COMPUTED_PROPERTY_READ_PATTERN` and `propertyNameReads()` (lines 541–558), `scriptReadsAttributeProperty()` (lines 710–732), and the conditional-mutation gate (lines 1156–1173) |
| 14-H2 | `src/lib/css-context.ts` — `extractStylesheetLinks()` (lines 90–101); the browser-like tag/entity helpers in `src/lib/html-attributes.ts` are not used by this function |
| 14-H3 | `src/lib/github.ts` — `resolveDocumentBase()` (lines 303–337), `extractEventHandlerAttributes()` (lines 345–446), `RUNTIME_MUTATION_PATTERN` (lines 615–617), and stylesheet resolution (lines 1057–1067) |
| 14-H4 | `src/lib/css-context.ts` — `changesBetween()` (lines 1087–1128) and `compoundActivatedByFix()` (lines 1137–1211); `src/lib/github.ts` — introduced-element correlation (lines 1130–1185); `src/lib/fix-verification.ts` — first-element target assumption (lines 319–325) |
| 14-M1 | `src/lib/fix-validation.ts` — `validateFixForRule()` default branch (lines 298–305); `src/lib/github-pr.ts` — `validateRemediation()` (lines 516–711); `src/lib/css-context.ts` — `canReceiveFocus()` (lines 1034–1058) and `changesBetween()` (lines 1115–1128) |
| 14-M2 | `src/lib/github-pr.ts` — `checkStyleAttribute()` (lines 313–408), especially the literal `url(` test at line 346; `src/lib/css-context.ts` — `carriesResource()` and `resourceState()` (lines 1254–1273) are not applied to the remediation's inline style |
| 14-M3 | `src/lib/css-context.ts` — the attribute-selector branch of `parseSubject()` (lines 706–729), `compoundActivatedByFix()` (lines 1137–1211) |
| 14-M4 | `src/lib/css-context.ts` — `FOCUS_PSEUDO_CLASSES` (line 603), `parseSubject()` pseudo-class handling (lines 731–805), `changesBetween()` (lines 1087–1128), and `compoundActivatedByFocus()` (lines 1213–1223) |
| 14-M5 | `src/lib/css-context.ts` — `isLargeOffset()` (lines 2058–2074) and the offset branches of `stateOf()` (lines 2920–2967) |
| 14-M6 | `src/lib/fix-validation.ts` — the `image-alt` branch (lines 162–201), especially lines 192–199; `src/lib/fix-verification.ts` — `checkRenderedElement()` (lines 192–389) |

## 5. Prior-payload and legitimate-behaviour evidence

### 5.1 Recovered fourth- through thirteenth-review payloads

All recovered harness files were copied temporarily into matching repository
test directories, run with the real writer/route and mocked GitHub transport,
and then deleted. No recovered assertion was edited.

| Harness | Observed result |
|---|---|
| Prior / legitimate assertion matrix (fourth–eighth reviews) | **118/118 passed**. The recovered `.ts` file needed an `.mts` copy because the project's CommonJS `tsx` output does not support its top-level `await`; no assertion was changed. |
| Ninth-review writer closure matrix | **42/42 passed**. |
| Tenth-review writer closure matrix | **19/19 passed**. |
| Eleventh-review writer closure matrix | **37/37 passed**. |
| Eleventh-review route closure matrix | **9/9 passed**. |
| Twelfth-review writer closure matrix | **26/26 passed**. |
| Twelfth-review route closure matrix | **8/8 passed**. |
| Thirteenth-review writer closure matrix | **21/21 passed**. |
| Total recovered prior/legitimate assertions | **280/280 passed**. |
| Pre-closure eleventh-review evidence harness | **12 failed, 5 passed**, exactly as expected. The failures assert that the eleventh-review vulnerabilities still exist; they are closure confirmation, not regressions. |
| Listed pre-closure eleventh-review route harness | **2 failed, 7 passed**, exactly as expected. The two failures assert the old HTTP `200` vulnerable route behaviour for the inline-handler and zoom cases. |
| New equivalent-path writer / verifier / Chromium harness | Every final unsafe variant was observed with validation true, no destination refusal, verification confidence `1`, one fix, and one mocked source write. |
| New equivalent-path real-route harness | **13/13 passed** across two temporary harnesses. All 13 variants wrote `index.html`, created a branch and pull request, and wrote the intent and closing audit events. |
| New legitimate-behaviour harness | **18/18 passed**. |

The literal fourth- through thirteenth-review results therefore remain closed;
the ten findings above are newly found equivalent paths, not re-openings of the
literal prior payloads.

### 5.2 Legitimate behaviours checked

| Required behaviour | Result |
|---|---|
| Ordinary `image-alt` HTML fix | PASS — one fix applied and `alt="Photo"` written. |
| Ordinary `button-name` fix | PASS — distinct remediation shape validates and verifies with confidence `1`. |
| `https:` href | PASS — validates. |
| `mailto:` href | PASS — validates. |
| Preserved relative destination | PASS — `/account` remains and validates. |
| Preserved existing class | PASS — validates and remains allowed. |
| Preserved benign inline style | PASS — validates and remains allowed. |
| Three of three identical copies | PASS — all three patched in one write. |
| Two of three identical copies | PASS — neither patched; the match is not provable. |
| Twelve server-template spellings | PASS — all twelve rejected. |
| Ordinary repository script, including a comparison and an apostrophe | PASS — the script file is runtime code, not markup; the ordinary fix remains writable. |
| Linked script that does not react to the fix | PASS — remains writable. |
| Document with no `<base>` element | PASS — remains writable. |
| `<base href>` that resolves inside the repository | PASS — remains writable. |
| Non-functional `:hover` and `:focus-within` | PASS — remain harmless; they do not transition because of the remediation. |
| Unrelated runtime mutation | PASS — remains writable. |
| Event handler that does not react to the fix | PASS — remains writable. |
| Small box growth | PASS — remains harmless. |
| Harmless focus rule | PASS — remains harmless. |
| Custom property without a resource | PASS — remains harmless when the rule already applies. |
| Scale of one | PASS — remains harmless. |
| Small box growth (second check) | PASS — remains harmless. |
| Small, inset, and `none` box shadows | PASS — remain harmless. |
| Non-zero maximum size | PASS — remains harmless. |
| Zero maximum size without clipping | PASS — remains harmless. |
| Aspect ratio with both axes declared | PASS — remains harmless. |
| Running animation that ends visible | PASS — remains harmless. |
| Positive delay without `backwards` fill | PASS — remains harmless. |
| Pure in-page fragment `#main` | PASS — remains allowed; 14-M4 reports only its link-state and resource side effect. |

## 6. Verification commands and observed results

All commands were run from `C:\PROJECTS\AccessGuard` with `cmd /c`, using
`npm`/`node`/`npx` rather than `bun`.

### 6.1 Tree, source identity, and secret checks

```text
cmd /c "git rev-parse HEAD && git rev-parse origin/main && git diff --quiet be81d02..HEAD -- src && echo SOURCE_UNCHANGED=1 || echo SOURCE_UNCHANGED=0"
cmd /c "git diff --shortstat 08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c..be81d02 -- src"
cmd /c node "C:\Users\Hasib Rana\AppData\Local\Temp\opencode\recovered\ses_dfb375437ffebi1n27bXt7JsRU_2529_write_secret-scan.cjs"
```

Observed:

- HEAD and `origin/main` were
  `f6db8f76bde36016ed1cd9d2e1ed1f1d804c689a`.
- The closure-tree-to-checkout source identity check returned **exit 0** and
  `SOURCE_UNCHANGED=1`.
- The baseline-to-closure source diff was **13 files changed, 5,485 insertions,
  291 deletions**.
- The path-only secret scan examined 780 tracked files (779 text files). Only
  `.env.example` was tracked in the `.env*` name family. One AWS-key-shaped
  documentation example was classified under
  `.openclaw/skills/document-generate/SKILL.md`; its value was not printed and
  it is not a live credential. No tracked private key, GitHub-token shape,
  OpenAI-style key, Google API key, Stripe live key, or Slack token was found.

### 6.2 Required gate suite

```text
cmd /c "npx tsc -p tsconfig.check.json --noEmit"
cmd /c "npm run lint"
cmd /c "npx vitest run --coverage"
cmd /c "npm run build"
cmd /c "npx playwright test --project=chromium"
cmd /c "npm audit --audit-level=high"
```

| Check | Observed result |
|---|---|
| Source-only typecheck | **PASS** — exit 0, no diagnostics. |
| Lint | **PASS** — exit 0, 0 errors. |
| Vitest with coverage | **PASS** — 53 files, 853/853 tests passed in 28.14 seconds. |
| Coverage | **PASS** — statements 68.02% (threshold 55); branches 60.67% (50); functions 71.05% (58); lines 69.81% (57). |
| Build | **PASS** — exit 0; Next.js 16.4.6; compiled successfully; 116 static pages generated. |
| Playwright Chromium | **PASS** — 79/79 tests passed in 4.6 minutes. The run emitted the suite's existing expected unauthenticated 401 checks; no test failed. |
| `npm audit --audit-level=high` | **PASS for the release threshold** — exit 0; Critical 0, High 0, Moderate 15, Low 0. The moderate advisories are in the Vitest/mocker, fast-copy, glob/minimatch toolchain and are tracked separately from the application finding counts. |

The passing gates do not change the security verdict: the equivalent-path
reproductions above are outside the shipped regression set and expose the High
findings.

## 7. OWASP-style disposition of the scoped surfaces

| Surface | Scoped result |
|---|---|
| Injection / XSS / source integrity | **FAIL** — 14-H1 through 14-H4 write fixes whose composed customer-page effect is a full-viewport UI takeover. No script execution was reproduced. The prior comment/template/JSX injection payloads remain blocked. |
| CSS/UI injection and rendering integrity | **FAIL** — the runtime read, stylesheet discovery, effective-base and structural-element gaps let repository CSS/runtime take over the customer page; the semantic, focus, selector, resource and offset findings remove or relocate repaired content. |
| SSRF / customer-side network isolation | The service-side verification browser continues to block network requests in isolation. The **customer-repository boundary fails** for 14-M2 through 14-M4: the customer browser can be made to issue a same-origin request after merge. No service-side SSRF and no external/public target were reproduced. |
| Authentication / sessions / OAuth | The scoped route still requires a verified session/bearer identity, verified email, and `CREATE_PR` permission. OAuth token exchange/connect flows were unchanged and were not re-audited end to end. No auth or session bypass was found in the scoped path. |
| Authorization / RBAC / tenant isolation | PASS in the scoped route: `requireVerifiedEmail(..., CREATE_PR)`, `project.orgId = auth.user.orgId`, exact violation-count checking, connected-repository allow-list, and GitHub write-access validation remain. This is not a fresh full-product authorization audit. |
| CSRF / cookies / CORS / headers | The route has no route-local CSRF-token comparison and relies on the existing NextAuth/session behavior, JSON request shape, and non-simple optional `x-github-token` header. The scoped route adds no permissive CORS policy. No fresh browser CSRF test was performed in this focused review; no CSRF finding is claimed. |
| SQL injection | PASS in scope — the route uses Prisma parameterised queries; the scoped modules contain no raw SQL. No SQLi reproduction was found. |
| Command injection / uploads / deserialization | No shell execution, upload path, or unsafe deserialization was changed in the scoped diff. No fresh full-product command-injection or upload audit is claimed. |
| Rate limits / resource bounds | PASS for resource use — the request cap, per-user remediation rate limit, browser semaphore, repository scan budgets, and fail-closed truncated/oversized scans remain. The thirteenth-review candidate-after-budget bypass remains closed. |
| Audit trail | PASS for ordering — the durable `github_pr_intent` is written before the branch, the closing record follows the pull request, and a closing failure preserves the intent. The findings above are unsafe writes that are faithfully audited; the defect is the unsafe artifact, not a missing audit record. |
| Secrets | PASS — no `.env` value was inspected or printed, no live tracked secret was found, and no secret was modified. |
| Dependencies | PASS for the release threshold — `npm audit` reports High 0 and Critical 0. The 15 Moderate toolchain advisories remain in the dependency queue. |
| Browser coverage | Chromium only. No Safari, Firefox, WebKit, or mobile-engine coverage is claimed. |

## 8. Required closure criteria

1. **Computed runtime state reads (14-H1):** recognize
   `Reflect.get(object, propertyName)` as a computed property read and resolve
   its property-name argument with the existing string-expression resolver. A
   name that resolves to an attribute the fix adds must refuse the candidate;
   a name that cannot be resolved must be a generic dynamic state read. Add a
   permanent regression for the exact payload, with validation false or
   non-null harm, 0 fixes, 0 writes, and no verified/applied state.
2. **Browser-equivalent stylesheet-link discovery (14-H2):** parse `<link>`
   tags with the browser-like quoted-attribute semantics already available in
   `html-attributes.ts`, decode HTML entities in `rel` and `href`, and treat a
   stylesheet link whose attributes cannot be read as unprovable. Add permanent
   regressions for both exact payloads, with 0 fixes and 0 writes.
3. **Runtime-mutated document base (14-H3):** detect a repository runtime that
   assigns or mutates a `<base>` element's `href` before a repository resource
   is resolved. If the effective base cannot be proven statically, make the
   destination unprovable; do not fall back to the document URL. Add a
   permanent benign-root/harmful-sub-directory regression, with 0 fixes and 0
   writes.
4. **Remediation-introduced structural changes (14-H4):** model the DOM
   position and sibling relationships introduced by a remediation, at least for
   `:nth-child()`, `:nth-last-child()`, and sibling combinators; a structural
   selector whose transition cannot be computed must be unprovable. The
   isolated verifier must identify and judge the patched target rather than
   assuming the first rendered element is the target. Add a permanent
   regression for the exact visible-span payload, with 0 fixes and 0 writes.
5. **Native semantics and focusability (14-M1):** a remediation must preserve
   the native interactive semantics of the element it patches. Add a
   `button-name` rule check that rejects a native button replacement unless
   equivalent native semantics are preserved, and reject a remediation that
   removes keyboard focusability (including a `tabindex` change to a negative
   value) unless the targeted rule explicitly requires it. Add permanent
   regressions for both exact payloads, with 0 fixes and 0 writes.
6. **Remediation-introduced CSS resources (14-M2):** reject a remediation style
   that can load a resource, including a `var()` reference that resolves to a
   `url()` or `image-set()`, a direct `image-set()`, and equivalent nested
   resource functions. The customer browser must not issue a new request that
   the isolated verifier cannot see. Add permanent regressions for both exact
   payloads, with 0 fixes and 0 writes.
7. **CSS attribute-selector decoding (14-M3):** parse the closing bracket of
   an attribute selector with browser-equivalent quote and escape handling. A
   selector whose attribute syntax cannot be read must be unprovable. Add a
   permanent Chromium-request regression for the exact escaped-`]` payload,
   with 0 fixes and 0 writes.
8. **Link-state transitions (14-M4):** compare link-state before and after the
   fix. An added `href` must activate `:link` / `:any-link` rules through the
   same destination decision as other fix-created state. Preserve the accepted
   boundary that `:hover` and `:focus-within` remain harmless when their match
   state does not transition. Add a permanent regression for the exact payload,
   with 0 fixes and 0 writes.
9. **Viewport-unit off-screen offsets (14-M5):** compose a viewport-unit
   offset with the element's declared size, or conservatively refuse an offset
   that may move the target outside the viewport. `99vw` on the exact `64×64`
   target must not be treated as harmless. Add a permanent Chromium-geometry
   regression, with 0 fixes and 0 writes.
10. **Accessibility-tree visibility (14-M6):** do not permit a remediation to
    add `aria-hidden="true"` to a content element merely to suppress the
    targeted axe rule. The decorative exception must require an actually
    decorative original and replacement. Add a permanent Chromium
    accessibility-tree regression, with 0 fixes and 0 writes.
11. For **every reproduction above**, the unsafe remediation must end with
    `validation:false` or a non-null destination-harm reason, 0 fixes, 0
    repository writes, and no verified/applied state.
12. Preserve every legitimate behaviour listed in section 5.2, re-run all
    literal fourth- through thirteenth-review payloads in their unsafe
    direction, and require a fresh independent review to return READY before
    the release gate opens.

## 9. Untested / out of scope

- No production, public, customer, or third-party target was scanned. No live
  GitHub repository, GitHub Markdown service, or public URL was called. The npm
  advisory registry was used only for dependency metadata.
- Strix autonomous/self-scan execution was skipped as required. **No Strix
  result, finding, confidence, or pass is claimed.**
- Chromium was the only browser engine. Safari, Firefox, WebKit, mobile
  engines, and customer build pipelines were not exercised.
- No Sass/Less/Stylus/PostCSS compiler was run. The CSS proofs use valid
  browser CSS and repository source shapes; they do not claim a particular
  preprocessor's output.
- Runtime JavaScript was not exhaustively exercised beyond the proven
  `Reflect.get` case and the prior event-handler, generic-state, focus,
  CSS-resource, service-worker, and CSS-in-JS cases. Other language and
  framework carriers remain residual risk.
- The runtime-base finding was reproduced with a stylesheet. A runtime-mutated
  base affecting a `<script src>` target was identified in the same code path
  but was not separately reproduced in Chromium and is not claimed as a
  separate observation.
- The structural finding was reproduced with `:nth-child()` and a sibling
  combinator. Other structural selector families were not exhaustively
  enumerated.
- The accessibility-tree reproduction used Chromium's DevTools accessibility
  protocol. No claim is made for another browser engine's accessibility tree.
- GitHub Markdown rendering was not exercised against an external service;
  only the recovered local escaping behaviour was re-run.
- The symlink result in the recovered matrix uses a mocked no-inline-content
  GitHub response shape; no live GitHub repository was queried.
- This was a focused V23 verified-fix/GitHub-writer audit, not a fresh
  full-product review of authentication, session lifecycle, CSRF, OAuth, CORS,
  uploads, SQL injection, command injection, or container hardening.
- No Docker image/SBOM, multi-instance concurrency, container-Chromium, or
  infrastructure scan was performed in this pass.

## 10. Cleanup and artifact integrity

Every temporary harness lived outside the repository under the approved
temporary directory or was created temporarily inside the repository and
deleted immediately after its run. No shipped source file, permanent test,
generated fix, dependency file, lockfile, database record, schema, environment
file, or existing `.ai/` file was changed. No commit, push, deployment,
database migration, destructive Git command, Strix run, production change, or
secret modification was performed.

Only `.ai/SECURITY-REVIEW-14.md` was created. The final working tree shows
that one untracked report file and no other reviewer change.
