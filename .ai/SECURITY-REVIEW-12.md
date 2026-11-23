# AccessGuard — Twelfth Independent Security Review

Date: 2026-11-23

## 1. Verdict

**NOT READY — Critical 0, High 6, Medium 3, Low 0.**

The release gate requires **Critical 0 and High 0**. Six independently
reproduced High findings pass validation and isolated axe verification, are
reported as verified with confidence `1`, and reach the real repository
writer with one applied fix and one mocked source write. Local Chromium
confirms a viewport-wide customer UI takeover for each High case. The real
create-PR route also opens a pull request for three representative High
cases.

Three Medium findings also violate the required fail-closed direction: large
positive offsets move patched customer content off-screen, a newly introduced
same-origin destination creates a customer-side navigation/request, and a
nested `hidden` attribute removes the patched image from the rendering.

This tree is not releasable until every High reproduction is blocked in the
unsafe direction, permanent regressions cover the root causes, and a fresh
independent review returns READY.

This is the twelfth-review security artifact. The existing
`.ai/SECURITY-STATUS.md` and every other existing `.ai/` file were intentionally
not changed.

## 2. Reviewed trees and boundary

| Item | Value |
|---|---|
| Requested baseline | `08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c` (`vol: releases — V23: volume log entry for the seventh-review closure cycle`) |
| Reviewed closure tree | `d429c6bf6b80a3d0470eab8fb482350a044084eb` (`vol: security — V23: close the eleventh review's runtime and painted-surface findings`) |
| Brief's checkout | `435f72ed0d6b75d19e81f90873004c0cd6a03fc1` (`vol: releases — V23: volume log entry for the eleventh-review closure cycle`) |
| Current checkout at report time | `2dce09debed639a4b147250832c420b1bca629b2` (`vol: state — V23: record the eleventh-review pipeline evidence`) |
| Current `origin/main` | `2dce09debed639a4b147250832c420b1bca629b2` |
| Closure-tree-to-checkout identity | `git diff --quiet d429c6b..HEAD -- src` returned **exit 0**. The later checkout changed no scoped or other `src` file. |
| Brief-checkout-to-current identity | `git diff --quiet 435f72e..HEAD -- src` returned **exit 0**. The intervening commit is state-only. |
| Baseline-to-closure source diff | 11 files, 3,707 insertions and 187 deletions: the destination/runtime, writer, route/audit and regression files changed by the eleventh-review closure |
| Review scope | `src/lib/css-context.ts`, `src/lib/github.ts`, `src/lib/github-pr.ts`, `src/lib/ast-patch.ts`, `src/lib/fix-validation.ts`, `src/lib/fix-verification.ts`, `src/lib/html-attributes.ts`, and `src/app/api/github/create-pr/route.ts`, including the directly related validation, verification, write, authorization, rate-limit, and audit call path |
| Reviewer changes | Report only. No shipped source, permanent test, dependency, lockfile, CI, environment, schema, or existing `.ai/` file was changed. No commit, push, deployment, database migration, or secret change was performed. |

Every reproduction used a local synthetic repository, a mocked GitHub/Octokit
transport, local Playwright Chromium, and listeners bound only to `127.0.0.1`.
No production, public, customer, or third-party target was scanned. No live
repository was mutated. No external GitHub Markdown service was called. The npm
advisory registry was used only for `npm audit`; it was not a test target. No
`.env` value was inspected or printed.

**Strix/self-scan status:** skipped as required by the review request. **No
Strix result, finding, confidence, or pass is claimed.** The local working
reproductions and the shipped regression evidence in this report are the only
security-test evidence claimed.

## 3. Scope, threat model, and method

The review tests the V23 verified-fix/GitHub-writer chain: an accessibility
remediation is generated for customer-owned source, validated, verified with
axe-core in an isolated Chromium document, and then written to a connected
customer repository. The security boundary is not only “does axe stop firing?”
A remediation must also preserve the customer's content, navigation, network
behavior, focus behavior, and rendering after the **repository's own CSS** and
the **repository's own runtime code** are combined with the generated fix.

The unsafe direction for every prior and equivalent case below is strict:

- the unsafe remediation must fail validation (`validation: false`) or produce
  a non-null destination-harm reason;
- it must not be reported as verified/applied;
- it must apply **0 fixes**; and
- it must perform **0 repository writes**.

The method was:

1. establish the requested baseline, reviewed closure tree, and current source
   identity;
2. re-run every literal fourth- through eleventh-review payload in its unsafe
   direction and re-check the legitimate behaviours;
3. exercise equivalent CSS selector, painted-surface geometry, runtime-carrier,
   runtime-state-read, focus-state, animation-timing, URI-resource, writer, and
   route/audit paths;
4. require an observable Chromium geometry/paint/focus/computed-style result
   or a local `127.0.0.1` request before counting a candidate as a finding; and
5. run the source-only typecheck, lint, full unit suite, coverage gate,
   standalone build, Chromium E2E suite, dependency audit, and non-secret-
   printing tracked-file secret scan.

No Critical finding was reproduced. The six High findings are independent
root causes; equivalent variants are grouped under the affected root cause.

## 4. Reproduced findings

### 4.1 New equivalent-path matrix

Every row below produced the same writer result:

```text
validation=true
destination harm=null
verification={status:"verified", confidence:1}
fixesAppliedTotal=1
mocked source writes=1
```

| Candidate | Browser / local-request proof |
|---|---|
| 12-H1a — dynamically constructed attribute-name read | The target changed from no `overlay` class to `overlay`, from a non-painted `0×0` image to fixed `1280×720`; the viewport center became the target image. |
| 12-H1b — generic `hasAttributes()` read | The button changed from `46.390625×21` to fixed `1280×720`; the viewport center became the button. |
| 12-H2a — `:is([aria-label])` sibling activation | The sibling changed from `1264×18` to fixed `1280×720`; the viewport center became the sibling. |
| 12-H2b — removed-class/`:not()` sibling activation | The sibling changed from `1264×18` to fixed `1280×720`; the viewport center became the sibling. |
| 12-H3 — added-`tabindex` focus transition | Before the fix, `document.activeElement` was `BODY`; after the fix and focus, it was the target and the sibling was fixed `1280×720`. |
| 12-H4 — non-positioned `scale:100` | The target changed from `64×64` to `6400×6400`; computed `scale` was `100` and the viewport center was the target. |
| 12-H5 — nonstandard script extension | The target changed from `16×16` with no class to `overlay` at fixed `1280×720`; the viewport center became the target. The browser requested `/runtime.php` and `/styles.css`. |
| 12-H6 — remediation-added element plus runtime mutation | Before the fix the overlay did not exist; after the fix it was fixed `1280×720` and the viewport center was the remediation-added overlay. |
| 12-M1a — positive relative offset | The target's left edge changed from `8` to `10007`; computed `left` was `9999px`. |
| 12-M1b — positive margin offset | The target's left edge changed from `8` to `10007`; computed `margin-left` was `9999px`. |
| 12-M2 — newly introduced relative destination | The local listener received no `/destination` request before the fix and received `GET /destination` after the patched link was clicked. |
| 12-M3 — nested hidden image | The target changed from `64×64` to `0×0`; computed `display` became `none`. |

### 4.2 Findings

#### 12-H1 — runtime state-read completeness (High)

**Exact payload A:**

```html
<html><body><img id="target" src="x"><script>document.querySelectorAll('img[id="target"]').forEach(function(img){if(img.hasAttribute('a'+'lt'))img.classList.add('overlay')});</script></body></html>
```

```css
.overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;background:#f0f}
```

Original/remediation:

```html
<img id="target" src="x">
<img id="target" src="x" alt="Photo">
```

**Exact payload B:**

```html
<html><body><button>Save</button><script>document.querySelectorAll('button').forEach(function(button){if(button.hasAttributes())button.classList.add('overlay')});</script></body></html>
```

```css
.overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;background:#f0f}
```

Original/remediation:

```html
<button>Save</button>
<button aria-label="Save">Save</button>
```

**Observed result:** Both candidates validated, had null destination harm, were
verified with confidence `1`, applied one fix, and performed one mocked source
write. In Chromium, payload A changed the target to a fixed `1280×720`
maximum-z-index element; payload B did the same to the button. The real
create-PR route for payload A returned HTTP `200 success:true`, created a
branch, performed the source/artifact writes, opened a pull request, and wrote
both the `github_pr_intent` and `github_pr_created` audit records.

**Root cause:** `src/lib/github.ts` recognizes runtime state reads with
regular expressions. `scriptNamesAttribute()` searches for a literal attribute
word, so the browser-equivalent expression `'a'+'lt'` does not contain the
literal token `alt`. `RUNTIME_STATE_READ_PATTERN` and
`RUNTIME_GENERIC_STATE_READ_PATTERN` do not recognize the standard
`Element.hasAttributes()` API. The conditional-mutation gate therefore sees
neither case as a read that can react to the attribute the fix adds. The fix
activates latent customer runtime code that takes over the page.

#### 12-H2 — functional pseudo-class and removed-class activation (High)

**Exact payload A:**

```html
<html><body><input id="target" type="text"><div class="overlay">owned</div></body></html>
```

```css
input:is([aria-label]) ~ .overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;background:#f0f}
```

Original/remediation:

```html
<input id="target" type="text">
<input id="target" type="text" aria-label="Name">
```

**Exact payload B:**

```html
<html><body><img id="target" class="card" src="x"><div class="overlay">owned</div></body></html>
```

```css
#target:not(.card) ~ .overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;background:#f0f}
```

Original/remediation:

```html
<img id="target" class="card" src="x">
<img id="target" src="x" alt="Photo">
```

**Observed result:** Both candidates validated, had null destination harm, were
verified with confidence `1`, applied one fix, and performed one mocked source
write. Chromium changed each sibling from `1264×18` to fixed `1280×720` and
put the sibling at the viewport center. The real route for the equivalent
button form returned HTTP `200 success:true`, created a branch and pull
request, and reported one applied fix.

**Root cause:** `parseSubject()` in `src/lib/css-context.ts` treats every
functional pseudo-class as one opaque `conditional` marker and skips its
argument. It therefore does not see the `[aria-label]` inside `:is()` or the
`.card` inside `:not()`. `changesBetween()` records added attributes and
classes but not removed classes. Consequently, `compoundActivatedByFix()`
cannot recognize either browser transition. The same parser limitation makes
`:where()` an equivalent of `:is()` here.

#### 12-H3 — added-`tabindex` focusability transition (High)

**Exact payload:**

```html
<html><body><div id="target" role="button"><span aria-hidden="true">x</span></div><div class="overlay">owned</div></body></html>
```

```css
div[role="button"]:focus ~ .overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;background:#f0f}
```

Original/remediation:

```html
<div id="target" role="button"><span aria-hidden="true">x</span></div>
<div id="target" role="button" aria-label="Name" tabindex="0"><span aria-hidden="true">x</span></div>
```

**Observed result:** The candidate validated, had null destination harm, was
verified with confidence `1`, applied one fix, and performed one mocked source
write. Before the fix, `document.activeElement` was `BODY` and the sibling was
`1264×18`. After the fix and focus, `document.activeElement` was the target
and the sibling was fixed `1280×720` at the viewport center.

**Root cause:** `changesBetween()` in `src/lib/css-context.ts` sets its
`focus` transition only when the remediation adds `autofocus`.
`compoundActivatedByFocus()` therefore cannot model a rule activated when the
fix makes a previously unfocusable element focusable with `tabindex="0"`.
The isolated verifier confirms the ARIA rule but does not compose the
repository's focus rule.

#### 12-H4 — effective painted surface of non-positioned elements (High)

**Exact payload:**

```html
<html><body><img id="target" src="x" width="64" height="64"></body></html>
```

```css
[alt]{scale:100;background:#f0f}
```

Original/remediation:

```html
<img id="target" src="x" width="64" height="64">
<img id="target" src="x" width="64" height="64" alt="Photo">
```

**Observed result:** The candidate validated, had null destination harm, was
verified with confidence `1`, applied one fix, and performed one mocked source
write. Chromium changed the target from `64×64` to `6400×6400`, computed
`scale` was `100`, and the viewport center was the target.

**Root cause:** `paintedBoxOf()` in `src/lib/css-context.ts` returns before
composing padding, borders, scale, transform, and zoom whenever
`state.positioned` is false. `coversViewport()` also requires a positioned
state. The model therefore judges only fixed/absolute/sticky elements, even
though a large scaled or grown static replaced element can paint over the
customer viewport.

#### 12-H5 — runtime script carrier identified by file extension (High)

**Exact payload:**

```html
<html><head><script src="/runtime.php"></script><link rel="stylesheet" href="/styles.css"></head><body><img id="target" src="x"></body></html>
```

```text
runtime.php:
document.addEventListener("DOMContentLoaded",function(){document.querySelectorAll('img[id="target"]').forEach(function(img){if(img.hasAttribute('alt'))img.classList.add('overlay')})});
```

```css
.overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;background:#f0f}
```

Original/remediation:

```html
<img id="target" src="x">
<img id="target" src="x" alt="Photo">
```

The local server returned the `runtime.php` path with an executable JavaScript
MIME type.

**Observed result:** The candidate validated, had null destination harm, was
verified with confidence `1`, applied one fix, and performed one mocked source
write. Chromium requested `/runtime.php`; before the fix the target was `16×16`
with no class, while after the fix it had class `overlay`, was fixed
`1280×720`, and occupied the viewport center. The real route returned HTTP
`200 success:true`, created a branch and pull request, and reported one
applied fix.

**Root cause:** `SCRIPT_FILE_PATTERN` in `src/lib/github.ts` recognizes only
a fixed list of JavaScript/TypeScript extensions. The repository scanner does
not follow a `<script src>` target from the HTML into the tree and judge that
file as runtime code regardless of its filename. A browser executes the
response according to its MIME type, not its suffix, so the extension allowlist
hides a real runtime carrier.

#### 12-H6 — runtime mutation of an element introduced by the remediation (High)

**Exact payload:**

```html
<html><body><img id="target" src="x"><script>document.getElementById('overlay').classList.add('overlay');</script></body></html>
```

```css
.overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;background:#f0f}
```

Original/remediation:

```html
<img id="target" src="x">
<img id="target" src="x" alt="Photo"><div id="overlay"></div>
```

**Observed result:** The candidate validated, had null destination harm, was
verified with confidence `1`, applied one fix, and performed one mocked source
write. Before the fix, the overlay did not exist. After the fix, the inline
script found the remediation-added element, applied `overlay`, and Chromium
measured it at fixed `1280×720`; the viewport center was that element.

**Root cause:** the runtime gate in `src/lib/github.ts` correlates mutation
scripts only with the original target's static id and with attributes added
to that first target element. It does not analyze elements introduced by the
remediation, nor a runtime operation whose success depends on such an element
now existing. The rule-specific validator also permits the extra element as
long as a live `<img alt>` remains present.

#### 12-M1 — large positive off-screen offsets (Medium)

**Exact payload A:**

```html
<html><body><img id="target" src="x" width="64" height="64"></body></html>
```

```css
[alt]{position:relative;left:9999px;background:#f0f}
```

**Exact payload B:**

```html
<html><body><img id="target" src="x" width="64" height="64"></body></html>
```

```css
[alt]{margin-left:9999px;background:#f0f}
```

Original/remediation:

```html
<img id="target" src="x" width="64" height="64">
<img id="target" src="x" width="64" height="64" alt="Photo">
```

**Observed result:** Both candidates validated, had null destination harm,
were verified with confidence `1`, applied one fix, and performed one mocked
source write. Chromium moved the target's left edge from `8` to `10007`;
computed `left` was `9999px` in A and computed `margin-left` was `9999px` in
B. The user-visible image was outside the viewport.

**Root cause:** `isLargeNegativeOffset()` and the corresponding `stateOf()`
branches in `src/lib/css-context.ts` recognize only negative offsets and
margins. A large positive relative offset or margin moves content off-screen
in the opposite direction but is classified as harmless.

#### 12-M2 — newly introduced same-origin destination (Medium)

**Exact payload:**

```html
<html><body><a id="target">Text</a></body></html>
```

Original/remediation:

```html
<a id="target">Text</a>
<a id="target" href="/destination">Text</a>
```

**Observed result:** The candidate validated, had null destination harm, was
verified with confidence `1`, applied one fix, and performed one mocked source
write. The local listener received no `/destination` request before the fix;
after the patched link was clicked, it received `GET /destination`.

**Root cause:** the URI preservation code in `src/lib/github-pr.ts` compares
existing URI attributes with the remediation and rejects a new remote or
foreign destination. `isForeignDestination()` deliberately treats a
same-origin relative URL as safe, so the “new URI attribute” branch allows a
remediation to introduce `href` where the original element had none. The fix
therefore changes navigation and customer-browser network behavior even though
the requirement is to preserve the original destination.

#### 12-M3 — nested hidden target (Medium)

**Exact payload:**

```html
<html><body><img id="target" src="x" width="64" height="64"></body></html>
```

Original/remediation:

```html
<img id="target" src="x" width="64" height="64">
<span style="display:block;width:64px;height:64px"><img id="target" src="x" width="64" height="64" alt="Photo" hidden></span>
```

**Observed result:** The candidate validated, had null destination harm, was
verified with confidence `1`, applied one fix, and performed one mocked source
write. Chromium changed the target from `64×64` to `0×0`; computed `display`
became `none`.

**Root cause:** `validateRemediation()` in `src/lib/github-pr.ts` marks only
the first tag as the target, so it does not reject a `hidden` attribute on a
nested live element. `hidesOwnTarget()` in `src/lib/ast-patch.ts` likewise
inspects only the first opening tag of the replacement. The rule checker finds
a live `<img alt>` and the isolated axe run passes, while the actual patched
image is hidden.

### 4.3 Finding-to-code map

| Finding | Primary shipped-code path |
|---|---|
| 12-H1 | `src/lib/github.ts` — `RUNTIME_STATE_READ_PATTERN`, `RUNTIME_GENERIC_STATE_READ_PATTERN`, `scriptNamesAttribute()`, `scriptReadsAttributeProperty()`, and the conditional-mutation gate in `planRepositoryFixes()` |
| 12-H2 | `src/lib/css-context.ts` — `parseSubject()`, `changesBetween()`, `compoundActivatedByFix()`, and the activated-rule loop in `destinationCssHarm()` |
| 12-H3 | `src/lib/css-context.ts` — the `focus` transition in `changesBetween()`, `compoundActivatedByFocus()`, and the activated-rule loop |
| 12-H4 | `src/lib/css-context.ts` — `paintedBoxOf()`, `coversViewport()`, and the non-positioned early return |
| 12-H5 | `src/lib/github.ts` — `SCRIPT_FILE_PATTERN` and the file-carrier branch that never follows `<script src>` targets |
| 12-H6 | `src/lib/github.ts` — the original-target-only runtime correlation in `planRepositoryFixes()`; `src/lib/github-pr.ts` — `validateRemediation()`; `src/lib/ast-patch.ts` — `hidesOwnTarget()` |
| 12-M1 | `src/lib/css-context.ts` — `isLargeNegativeOffset()` and the positional/margin branches in `stateOf()` |
| 12-M2 | `src/lib/github-pr.ts` — `canonicalUriMap()`, `isForeignDestination()`, and the new-URI branch in `validateRemediation()` |
| 12-M3 | `src/lib/github-pr.ts` — first-tag-only `isTarget` checks; `src/lib/ast-patch.ts` — first-tag-only `hidesOwnTarget()` |

`src/lib/fix-verification.ts` builds an isolated document from the remediation
snippet (`buildVerificationDocument()` and the `page.setContent()` path), so
its confidence `1` result proves only the rule in isolation. It cannot supply
the repository CSS/runtime context whose absence causes these findings.

## 5. Exact prior-payload re-run

All literal prior-review payloads were re-run against the reviewed source. The
unsafe direction means that the payload must not validate/remain eligible, must
not be verified/applied, and must not reach a repository write.

### Eleventh-review closure matrix — 37/37 passed

The recovered closure matrix contained the eleventh-review unsafe writer
reproductions, the corresponding destination-harm assertions, and the
legitimate twins. Every unsafe writer payload produced 0 fixes and 0 writes;
every destination-harm case was non-null; every legitimate twin remained
allowed.

### Eleventh-review route/audit closure matrix — 9/9 passed

The recovered route matrix confirmed destination refusal, intent-audit
failure, closing-audit failure, branch failure, planning failure, pull-request
failure, and refused-source-write behavior. In particular, the literal
inline-handler and zoom cases created no branch, no write, and no pull request;
the intent audit preceded the branch; and a closing-audit failure retained the
recoverable intent.

### Tenth-review and ninth-review closure matrices — 61/61 passed

The recovered matrices contained 42 ninth-review closure cases and 19
tenth-review closure cases. Every unsafe writer payload produced 0 fixes and 0
writes; every validator payload was refused; and every legitimate behaviour
remained allowed.

### Prior/legitimate assertion matrix — 118/118 passed after a harness-only correction

The recovered fourth-to-eighth-review matrix contains 94 unsafe assertions
across 40 payload groups and 24 legitimate assertions across 13 behaviour
groups. The recovered original harness first produced **117/118** because one
assertion expected confidence `0` for a candidate rejected before
verification, while the current API correctly returns confidence `null`. This
was a harness expectation error, not a product result. The temporary harness
was corrected to assert the required unsafe direction directly: validation
false or non-null harm, no eligible/verified fix, 0 fixes, and 0 writes. The
corrected rerun produced **118/118**.

### New equivalent-path and route evidence

| Harness | Result |
|---|---|
| Writer/verifier/Chromium equivalent-path harness | **4/4 passed** — twelve candidate rows, ten Chromium geometry/focus/computed-style cases, one local navigation request case, and one local runtime-script case were recorded. Every candidate reached one fix/write. |
| Route/audit harness with the literal closure plus new route probes | **12/12 passed** — the nine literal route cases passed, and the dynamic-state-read, functional-pseudo-class, and nonstandard-script-extension cases each returned HTTP `200 success:true`, created a branch, performed the source/artifact writes, opened a pull request, and recorded intent/closing audit entries. |

The literal fourth- through eleventh-review results are therefore unchanged
from the closure evidence; the six High and three Medium findings above are
newly found equivalent paths, not re-openings of the literal prior payloads.

## 6. Legitimate behavior checked

The legitimate groups in the recovered matrices and the distinct remediation
shapes in the route harness passed:

| Behavior | Result |
|---|---|
| Ordinary `image-alt` fix in HTML | PASS — one fix applied; `alt="Photo"` written. |
| Ordinary `image-alt` fix in TSX / JS containing JSX | PASS — one fix applied. |
| Ordinary `button-name` fix | PASS — one fix applied. |
| Legitimate `https:` and `mailto:` hrefs | PASS — validate. |
| Preserved relative destination | PASS — `/account` remains and validates. |
| Preserved class and benign inline style | PASS — validate and remain allowed. |
| Three identical copies selected together | PASS — all three patched in one write. |
| Two of three identical copies selected | PASS — neither patched; match not provable. |
| Twelve additional server-template spellings | PASS — all twelve rejected. |
| Ordinary repository script and unreadable mocked symlink | PASS — ordinary fix remains allowed; incomplete scan yields 0 fixes/writes. |
| Unrelated runtime mutation | PASS — the fix remains allowed. |
| Handler that does not react to the fix | PASS — the fix remains allowed. |
| Small box growth | PASS — harmless growth remains allowed. |
| Harmless focus rule | PASS — an outline-only focus rule remains allowed. |
| Custom property without a resource | PASS — remains allowed. |
| Scale of one | PASS — remains allowed. |
| Small box shadow | PASS — remains allowed. |
| Non-zero maximum size | PASS — remains allowed. |
| Zero maximum size without clipping | PASS — remains allowed. |
| Aspect ratio with both axes declared | PASS — remains allowed. |
| Running animation that ends visible | PASS — remains allowed. |
| Positive delay without backwards fill | PASS — remains allowed. |

## 7. Verification commands and evidence

All commands were run from `C:\PROJECTS\AccessGuard` with `cmd /c`, using
`npm`/`node`/`npx` rather than `bun`.

### Tree and source-identity commands

```text
cmd /c "git rev-parse HEAD && git rev-parse origin/main && git diff --quiet d429c6b..HEAD -- src && echo SOURCE_UNCHANGED=1 || echo SOURCE_UNCHANGED=0"
cmd /c git diff --quiet 435f72e..HEAD -- src
cmd /c git diff --stat 08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c d429c6b -- src
cmd /c git diff --numstat 08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c d429c6b -- src
```

Observed: current HEAD and `origin/main` were
`2dce09debed639a4b147250832c420b1bca629b2`; both source-identity checks
returned **exit 0**. The baseline-to-closure diff was 11 files, 3,707
insertions and 187 deletions. The working tree was clean before this report
was created.

### Build, typecheck, lint, tests, browser suite, and dependencies

```text
cmd /c npx tsc -p tsconfig.check.json --noEmit
cmd /c npm run lint
cmd /c npx vitest run --coverage
cmd /c npm run build
cmd /c npx playwright test --project=chromium
cmd /c npm audit --audit-level=high
```

| Check | Observed result |
|---|---|
| Source-only typecheck | PASS — exit 0. |
| Lint | PASS — exit 0; 0 errors. |
| Vitest with coverage | PASS — 53 files, 799/799 tests passed. Statements 66.59% (threshold 55); branches 59.20% (50); functions 69.02% (58); lines 68.30% (57). |
| Build | PASS — exit 0; Next.js 16.4.6; 116 static pages generated. |
| Playwright Chromium | PASS — 79/79 tests passed in 4.3 minutes. |
| `npm audit --audit-level=high` | PASS for the release gate — Critical 0, High 0, Moderate 15, Low 0. |

### Local reproduction commands

The recovered and new harnesses were copied temporarily into the repository or
piped to `tsx` from the approved temporary directory, run against the real
writer/route with mocked GitHub transport, and deleted after the review. Local
Chromium was used for browser evidence and the only application listeners were
bound to `127.0.0.1`.

```text
cmd /c npx vitest run src/lib/__tests__/tmp-review12-11-closure.test.ts src/app/api/github/create-pr/tmp-review12-11-route-closure.test.ts --reporter=verbose
cmd /c npx vitest run src/lib/__tests__/tmp-review12-evidence.test.ts --reporter=verbose
cmd /c npx tsx -  # recovered 118-assertion prior/legitimate matrix
```

Observed:

- recovered prior/legitimate matrix — **118/118** after the documented
  harness-only correction;
- recovered ninth-review closure matrix — **42/42**;
- recovered tenth-review closure matrix — **19/19**;
- literal eleventh-review closure matrix — **37/37**;
- literal eleventh-review route/audit matrix — **9/9**;
- new equivalent writer/verifier/Chromium harness — **4/4** tests, twelve
  candidate rows;
- combined literal-closure and new-route harness — **49/49** tests; and
- the full shipped unit suite — **799/799** tests.

### Secret and dependency check

```text
cmd /c git ls-files .env .env.*
cmd /c node <approved-temp>/secret-scan.cjs
```

Observed: 778 tracked files were enumerated; only `.env.example` is tracked in
the `.env*` name family. The actual `.env` file was neither tracked nor
inspected. Of 777 text candidates scanned, the path-only scan found one
AWS-key-shaped string in a tracked documentation example under
`.openclaw/skills/document-generate/SKILL.md`; its value was not printed and
it was not treated as a live credential. No tracked private key, GitHub-token
shape, OpenAI-style key, Google API key, Stripe live key, or Slack token was
found by the same path-only categories. No secret was modified.

## 8. OWASP and security-surface disposition

| Surface | Scoped result |
|---|---|
| Injection / XSS / source integrity | **FAIL** — 12-H1 through 12-H6 write fixes whose composed customer-page effect is a viewport-wide UI takeover. No new or attacker-controlled script injection was reproduced; the runtime cases activate repository-owned code. |
| SSRF / customer-side network isolation | The service-side verification browser continues to block network requests in isolation. The **customer-repository boundary fails** through 12-M2: a newly introduced same-origin destination is requested in the customer browser after merge. |
| Authentication / sessions | The scoped route still requires a NextAuth session or bearer token, verified email, and `CREATE_PR` permission. OAuth token exchange/connect flows were unchanged and were not re-audited end to end. No new auth/session bypass was found in the scoped diff. |
| OAuth | Not re-audited end to end in this focused review. The OAuth callback/connect flow was unchanged; no OAuth finding is claimed. |
| RBAC / tenant isolation | PASS in the scoped route: `requireVerifiedEmail(..., CREATE_PR)`, `project.orgId = auth.user.orgId`, exact violation-count check, connected-repository allow-list, and GitHub write-access validation remain. This is not a fresh full-product authorization audit. |
| CSRF / cookies | The route has no route-local CSRF-token comparison and relies on the existing NextAuth/session behavior, JSON request shape, and non-simple optional `x-github-token` header. The middleware requires authentication for non-public API paths. No fresh browser CSRF test was performed in this focused diff; no CSRF finding is claimed. |
| CORS / headers | The scoped route adds no permissive CORS policy. Global headers include CSP, HSTS, frame denial, nosniff, referrer and permissions policies; API responses are `no-store`. No fresh header-origin matrix was performed in this focused diff. |
| SQL injection | PASS in scope — the route uses Prisma parameterised queries; the scoped modules contain no raw SQL. No SQLi reproduction was found. |
| Command injection / uploads / deserialization | No shell execution, upload path, or unsafe deserialization was changed in the scoped diff. No fresh full-product command-injection/upload audit is claimed. |
| Rate limits / resource bounds | PASS in scope — the request cap, per-user remediation rate limit, browser semaphore, repository scan budgets, and fail-closed truncated/oversized scans remain. No new concurrency exhaustion was reproduced. |
| Audit trail | PASS in scope — the route writes a durable `github_pr_intent` before the branch; an intent failure stops mutation, and a closing-record failure leaves the recoverable intent and reports degraded state. The literal route matrix passed 9/9, and the three new route reproductions recorded both audit actions. |
| Secrets | PASS — no live tracked secret found; no `.env` value inspected; no secret changed. |
| Dependencies | PASS for the release gate — `npm audit` reports High 0 and Critical 0. The 15 Moderate findings remain in the dependency/toolchain risk queue. |

## 9. Required closure criteria

1. **Runtime DOM state reads (12-H1):** recognize standard generic
   attribute-presence APIs such as `hasAttributes()`, and treat a runtime
   mutation gated by an attribute-name expression that cannot be proven
   unrelated to the fix as generic state-dependent mutation. Resolve simple
   constant string concatenation and aliases or fail closed. A fix-activated
   conditional mutation must produce 0 fixes, 0 writes, and no verified/applied
   state.
2. **Functional pseudo-class and removal semantics (12-H2):** evaluate
   browser-equivalent `:is()`, `:where()`, and `:not()` arguments, and track
   added **and removed** attributes/classes when deciding whether a rule starts
   matching. A rule activated on the target or another element must be judged,
   including its paint and resource declarations.
3. **Focusability transitions (12-H3):** model focusability changes, including
   an added or removed `tabindex`, as well as `autofocus`. Focus rules and
   focus-activated resource rules on the target or another element must be
   judged against the customer interaction they enable.
4. **Effective painted surface (12-H4):** compose scale, zoom, transform,
   padding, border, intrinsic/replaced size, and paint extensions for
   non-positioned elements as well as positioned ones. A rule the fix activates
   whose painted surface may cover the viewport must be unprovable, never
   harmless.
5. **Runtime carrier discovery (12-H5):** follow `<script src>` targets from
   repository HTML into the repository tree and inspect the linked code
   regardless of filename extension, or fail closed when the carrier cannot be
   proved inert. A browser-executable script that can react to the fix must
   make the destination unprovable.
6. **Remediation-introduced elements (12-H6):** analyze every live element
   introduced by the remediation against repository CSS and runtime code.
   Runtime code whose success depends on a newly introduced element or id must
   be unprovable; constrain the remediation to the original element unless the
   extra structure is independently proved safe.
7. **Positive off-screen offsets (12-M1):** model large positive and negative
   positional offsets and margins, including relative positioning. A fix that
   moves the target outside the viewport must not pass as visible.
8. **URI preservation (12-M2):** preserve the presence and value of every URI
   attribute, not only its origin. A newly introduced same-origin relative
   destination must be refused or otherwise made unprovable; a preserved
   relative destination must remain allowed.
9. **Target shape and nested hiding (12-M3):** inspect every live element in
   the replacement, not only the first tag. The patched original element must
   remain the same live target and must not be hidden by `hidden`,
   `display:none`, `visibility:hidden`, zero opacity, or an equivalent nested
   construct.
10. For **every reproduction above**, the unsafe remediation must end with
    `validation:false` or a non-null destination-harm reason, 0 fixes, 0
    repository writes, and no verified/applied state.
11. Add permanent regressions for every reproduction. Before the next
    independent review, re-run all fourth- through eleventh-review payloads in
    their unsafe direction, plus the listed legitimate behaviour groups and
    all twelfth-review equivalents.

## 10. Untested / out of scope

- No production, public, customer, or third-party target was scanned. No live
  GitHub repository, GitHub Markdown service, or public URL was called. The npm
  advisory registry was used only for dependency metadata.
- Strix autonomous/self-scan execution was skipped as required. **No Strix
  result is claimed.**
- Chromium was the only browser engine. Safari, Firefox, WebKit, mobile
  engines, and customer build pipelines were not exercised.
- No Sass/Less/Stylus/PostCSS compiler was run. The CSS proofs use valid
  browser CSS and repository source shapes; they do not claim a particular
  preprocessor's output.
- Runtime JavaScript was not exhaustively exercised beyond the proven inline
  handler, inline/external script, DOM state-read, focus, CSS-resource,
  remediation-added-element, and prior class/style/service-worker cases. Other
  language and framework carriers remain residual risk.
- The nonstandard-script proof used a local `127.0.0.1` response with a
  JavaScript MIME type and the `.php` path; no PHP runtime or server-side
  execution was tested.
- GitHub Markdown rendering was not exercised against an external service;
  only local escaping behaviour and the exact 4-M1 payload were checked.
- The symlink result uses a mocked no-inline-content GitHub response shape; no
  live GitHub repository was queried.
- This was a focused V23 verified-fix/GitHub-writer audit, not a fresh
  full-product review of authentication, session lifecycle, CSRF, OAuth, CORS,
  uploads, SQL injection, command injection, or container hardening.
- No Docker image/SBOM, multi-instance concurrency, container-Chromium, or
  infrastructure scan was performed in this pass.

## 11. Cleanup and artifact integrity

Every temporary harness was deleted after its passing run. No shipped source
file, permanent test, generated fix, dependency file, lockfile, database record,
schema, environment file, or existing `.ai/` file was changed. No commit, push,
deployment, database migration, destructive Git command, Strix run, production
change, or secret modification was performed.

Only `.ai/SECURITY-REVIEW-12.md` was created. The final working tree shows
that one untracked report file and no other reviewer change:

```text
?? .ai/SECURITY-REVIEW-12.md
```
