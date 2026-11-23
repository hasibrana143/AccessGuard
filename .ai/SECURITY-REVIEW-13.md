# AccessGuard — Thirteenth Independent Security Review

Date: 2026-11-23

## 1. Verdict

**NOT READY — Critical 0, High 5, Medium 2, Low 0.**

The release gate requires **Critical 0 and High 0**. Five independently
reproduced High findings pass validation and isolated axe verification, are
reported as verified with confidence `1`, and reach the real repository
writer with one applied fix and one mocked source write. Local Chromium
confirms a viewport-wide customer UI takeover in each High case. The real
create-PR route also opens a pull request for a representative case of every
High root cause.

Two Medium findings also violate the required fail-closed direction: a large
`inset` shorthand moves the patched customer content off-screen, and the
writer's ten-candidate source budget lets an unsafe later candidate bypass
destination analysis and receive repository review artifacts.

This tree is not releasable until every High reproduction is blocked in the
unsafe direction, permanent regressions cover the root causes, and a fresh
independent review returns READY.

This is the thirteenth-review security artifact. The existing
`.ai/SECURITY-STATUS.md` and every other existing `.ai/` file were intentionally
not changed.

## 2. Reviewed trees and boundary

| Item | Value |
|---|---|
| Requested baseline | `08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c` (`vol: releases — V23: volume log entry for the seventh-review closure cycle`) |
| Reviewed closure tree | `11065e4ab8966c4055d705d3e735ea8e0aad3941` (`vol: security — V23: close the twelfth review's runtime, geometry and validator findings`) |
| Current checkout at report time | `d2a7cda10405c5bb65ac359301983ecb461fe448` (`vol: releases — V23: record the twelfth-review closure in the volume chain`) |
| Current `origin/main` | `d2a7cda10405c5bb65ac359301983ecb461fe448` |
| Closure-tree-to-checkout identity | `git diff --quiet 11065e4..HEAD -- src` returned **exit 0**. The later checkout changed no scoped or other `src` file. |
| Baseline-to-closure source diff | 13 files, 4,405 insertions and 240 deletions: the destination/runtime, writer, route/audit and regression files changed by the twelfth-review closure |
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
2. re-run every literal fourth- through twelfth-review payload in its unsafe
   direction and re-check the legitimate behaviours;
3. exercise equivalent CSS selector, painted-surface geometry, resource-base,
   runtime-carrier, runtime-state-read, focus-state, animation-timing,
   URI-resource, writer-budget, and route/audit paths;
4. require an observable Chromium geometry/paint/computed-style result or a
   local `127.0.0.1` request before counting a candidate as a finding; and
5. run the source-only typecheck, lint, full unit suite, coverage gate,
   standalone build, Chromium E2E suite, dependency audit, and non-secret-
   printing tracked-file secret scan.

No Critical finding was reproduced. The five High and two Medium findings
below are independent root causes; equivalent variants are grouped under the
affected root cause.

The brief accepts the fail-closed false positives recorded in `.ai/RISKS.md`
rows 46–48. They remain documented and were not counted as findings. The
computed runtime-read finding below is the narrower residual described by row
41, not the accepted generic-enumeration case in row 46; it is counted because
the brief accepts only rows 46–48 and the reproduced path reaches a concrete
viewport takeover. The focusability finding uses the explicitly allowed pure
in-page fragment `#main`; it reports the newly introduced focusability
transition, not the accepted URI-introduction trade-off in row 48.

## 4. Reproduced findings

### 4.1 Equivalent-path result matrix

For 13-H1 through 13-M1, the observed writer result was:

```text
validation=true
destination harm=null
verification={status:"verified", confidence:1}
fixesAppliedTotal=1
mocked source writes=1
```

| Candidate | Browser / local-request proof |
|---|---|
| 13-H1 — document `<base href>` changes the stylesheet actually loaded | The local listener observed `/sub/theme.bin`; the patched target became fixed `1280×720`, and the viewport center became the target. |
| 13-H2a — computed property read `img["al"+"t"]` | The target changed from no `overlay` class to `overlay`, from a non-painted `0×0` image to fixed `1280×720`; the viewport center became the target. |
| 13-H2b — computed selector read `img.matches("["+"al"+"t"+"]")` | The same class and `1280×720` takeover occurred, and the viewport center became the target. |
| 13-H3a — negated attribute-value transition | The sibling changed from less than `1280` wide to fixed `1280×720`; the viewport center became the sibling. |
| 13-H3b — `:nth-child(... of [alt])` transition | The sibling changed from less than `1280` wide to fixed `1280×720`; the viewport center became the sibling. |
| 13-H3c — nested `:not(:not([alt]))` transition | The sibling changed from less than `1280` wide to fixed `1280×720`; the viewport center became the sibling. |
| 13-H4 — added `href` changes focusability | Before the fix, Tab did not focus the anchor; after the fix, Tab focused it and the sibling became fixed `1280×720` at the viewport center. |
| 13-H5 — large painted `outline` | Computed `outline-width` was `100000px`; the screenshot origin and midpoint changed from white `[255,255,255]` to the opaque outline color `[255,0,255]`. |
| 13-M1 — large `inset` shorthand | The target's left and top edges changed from `8` to less than `-9000`; computed `left` and `top` were `-9999px`. |

The real create-PR route returned HTTP `200 success:true`, created a branch,
performed the source write, and opened a pull request for representative
13-H1, 13-H2, 13-H3, 13-H4, and 13-H5 payloads.

### 4.2 13-H1 — document base URL is not used for repository resources (High)

**Exact payload:**

```html
<!-- index.html -->
<html><head><base href="/sub/"><link rel="stylesheet" href="theme.bin"></head><body><img id="target" src="x"></body></html>
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

**Observed result:** The candidate validated, had null destination harm, was
verified with confidence `1`, applied one fix, and performed one mocked source
write. The real route returned HTTP `200 success:true`, created a branch and
pull request, and wrote the source fix. The local Chromium listener observed
the request for `/sub/theme.bin`; the patched target was fixed `1280×720` and
occupied the viewport center.

**Root cause:** `resolveRepositoryPath()` in `src/lib/github.ts` resolves a
reference relative to the containing file's directory. The browser resolves a
document-relative stylesheet or script URL against the document's effective
base URL, which `<base href>` changes. The writer therefore analysed the
benign root `theme.bin` while Chromium loaded the unreviewed `sub/theme.bin`.
The same base mismatch exists on the `<script src>` target path.

### 4.3 13-H2 — computed runtime state reads bypass the mutation gate (High)

**Exact payload A:**

```html
<html><body><img id="target" src="x"><script>document.querySelectorAll("img").forEach(function(img){if(img["al"+"t"])img.classList.add("overlay")});</script></body></html>
```

**Exact payload B:**

```html
<html><body><img id="target" src="x"><script>document.querySelectorAll("img").forEach(function(img){if(img.matches("["+"al"+"t"+"]"))img.classList.add("overlay")});</script></body></html>
```

```css
.overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}
```

Original/remediation:

```html
<img id="target" src="x">
<img id="target" src="x" alt="Photo">
```

**Observed result:** Both candidates validated, had null destination harm,
were verified with confidence `1`, applied one fix, and performed one mocked
source write. In Chromium, each changed the target to class `overlay`, fixed
`1280×720`, at the viewport center. The real route for payload A returned
HTTP `200 success:true`, created a branch and pull request, and wrote the
source fix.

**Root cause:** The runtime scanner's state-read detection is API- and
spelling-specific. `scriptReadsAttributeProperty()` recognises a dot property
such as `.alt`, not a computed bracket property such as `["al"+"t"]`.
`scriptNamesAttribute()` searches for a literal attribute word and does not
resolve the argument of `matches()` or `closest()`. A conditional mutation
whose read resolves to the attribute the fix adds is therefore neither
recognized nor treated as a generic dynamic read. The isolated axe browser
does not include the repository runtime, so verification reports confidence
`1` while the customer page is taken over after merge.

### 4.4 13-H3 — CSS transition semantics remain incomplete (High)

**Exact payload A — negated attribute value:**

```html
<html><body><img id="target" data-state="active" src="x"><div class="overlay">owned</div></body></html>
```

```css
#target:not([data-state="active"]) ~ .overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}
```

Original/remediation:

```html
<img id="target" data-state="active" src="x">
<img id="target" data-state="safe" src="x" alt="Photo">
```

**Exact payload B — `:nth-child(... of selector)`:**

```html
<html><body><img id="target" src="x"><div class="overlay">owned</div></body></html>
```

```css
img:nth-child(1 of [alt]) ~ .overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}
```

Original/remediation:

```html
<img id="target" src="x">
<img id="target" src="x" alt="Photo">
```

**Exact payload C — nested negation:**

```html
<html><body><img id="target" src="x"><div class="overlay">owned</div></body></html>
```

```css
#target:not(:not([alt])) ~ .overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}
```

Original/remediation:

```html
<img id="target" src="x">
<img id="target" src="x" alt="Photo">
```

**Observed result:** All three candidates validated, had null destination
harm, were verified with confidence `1`, applied one fix, and performed one
mocked source write. Chromium changed the sibling from less than `1280` wide
to fixed `1280×720` and placed it at the viewport center. The real route for
payload B returned HTTP `200 success:true`, created a branch and pull
request, and wrote the source fix.

**Root cause:** `parseSubject()` in `src/lib/css-context.ts` reads only the
arguments of `:is()`, `:where()`, and `:not()`. Other functional
pseudo-classes become one opaque marker; the selector list inside
`:nth-child(... of ...)` is never read. The transition model also does not
carry a changed attribute value through a negated requirement, and a nested
negation is not reduced to its browser-equivalent positive requirement.
`changesBetween()` and `compoundActivatedByFix()` consequently report no
activation for all three browser transitions. The validator also accepts the
unrelated `data-state` value change, so the first payload reaches the writer.

### 4.5 13-H4 — an added `href` changes focusability (High)

**Exact payload:**

```html
<html><body><a id="target">Text</a><div class="overlay">owned</div></body></html>
```

```css
a:focus ~ .overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}
```

Original/remediation:

```html
<a id="target">Text</a>
<a id="target" href="#main" aria-label="Text">Text</a>
```

**Observed result:** The candidate validated, had null destination harm, was
verified with confidence `1`, applied one fix, and performed one mocked source
write. Before the fix, Tab did not focus the anchor. After the fix, Tab made
the anchor `document.activeElement`; the sibling became fixed `1280×720` at
the viewport center. The real route returned HTTP `200 success:true`, created
a branch and pull request, and wrote the source fix.

**Root cause:** `changesBetween()` marks a focusability transition only when
the remediation **adds** a `tabindex` attribute. It does not compare the
element's actual focusability before and after the fix. An anchor without
`href` is not keyboard-focusable; adding `href="#main"` makes it focusable.
The same transition is possible through other focusability attributes or a
changed `tabindex` value. The focus-activation decision therefore never sees
the repository's `:focus` rule. Row 39 of `.ai/RISKS.md` does not cover this
case: the fix itself causes the new focusability, and the brief accepts only
rows 46–48.

### 4.6 13-H5 — outline is absent from the painted surface (High)

**Exact payload:**

```html
<html><body><img id="target" src="x" width="64" height="64"></body></html>
```

```css
[alt]{outline:100000px solid #f0f}
```

Original/remediation:

```html
<img id="target" src="x" width="64" height="64">
<img id="target" src="x" width="64" height="64" alt="Photo">
```

**Observed result:** The candidate validated, had null destination harm, was
verified with confidence `1`, applied one fix, and performed one mocked source
write. Chromium computed `outline-width:100000px`, `outline-offset:0px`, and
`outline-color:rgb(255,0,255)`. The screenshot origin and midpoint changed
from white `[255,255,255]` before the fix to opaque `[255,0,255]` after it.
The real route returned HTTP `200 success:true`, created a branch and pull
request, and wrote the source fix.

**Root cause:** `paintedBoxOf()` composes box-shadow growth but not the
outline. `outline` and `outline-width` are absent from the relevant-property
set, and no outline width/offset is added to the painted bounds. An outline
does not affect layout, so the element's `64×64` geometry remains unchanged,
but it paints over the customer viewport. The isolated axe document does not
contain the repository rule.

### 4.7 13-M1 — a large `inset` shorthand moves the target off-screen (Medium)

**Exact payload:**

```html
<html><body><img id="target" src="x" width="64" height="64"></body></html>
```

```css
[alt]{position:relative;inset:-9999px;background:#f0f}
```

Original/remediation:

```html
<img id="target" src="x" width="64" height="64">
<img id="target" src="x" width="64" height="64" alt="Photo">
```

**Observed result:** The candidate validated, had null destination harm, was
verified with confidence `1`, applied one fix, and performed one mocked source
write. Chromium changed the target's left and top edges from `8` to less than
`-9000`; computed `left` and `top` were `-9999px`. The user-visible image was
outside the viewport.

**Root cause:** The physical and logical inset **longhands** call
`isLargeOffset()`, but the `inset`, `inset-block`, and `inset-inline`
**shorthands** only compute zero-valued edges in `stateOf()`. A large offset
expressed through a shorthand is not marked hidden. This contradicts the
claim in `.ai/RISKS.md` row 34 that the inset shorthand was closed.

### 4.8 13-M2 — candidates after the source budget bypass destination analysis (Medium)

**Exact payload:** Eleven distinct image violations were selected. The first
ten were ordinary candidates that the destination analyser refused with
`display:none`; the eleventh was:

```html
<!-- index.html, exact repeated shape -->
<img id="target1" src="x1">...<img id="target11" src="x11">
```

```css
#target1{display:none}...#target10{display:none}
#target11:nth-child(11 of [alt]){position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}
```

The eleventh original/remediation was:

```html
<img id="target11" src="x11">
<img id="target11" src="x11" alt="Photo">
```

**Observed result:** Direct destination analysis of the eleventh candidate
returned a non-null harm reason. Nevertheless, `planRepositoryFixes()` put
`v11` in `reviewFixIds` without validating or analysing it. The real route
returned HTTP `200 success:true`, created a branch and pull request, applied
**0 source fixes**, wrote no `index.html`, but wrote
`accessguard-fixes/image-alt-v11.md` and `accessguard-fixes/summary.md` for the
unsafe candidate. Thus the unsafe remediation still caused repository writes,
which the strict unsafe direction forbids.

**Root cause:** `planRepositoryFixes()` slices the candidates to ten before
the safety decision. Every candidate at index ten or later is added directly
to `reviewFixIds`; only the first ten enter the validation, runtime, and
destination checks. The route includes `reviewFixIds` in `artifactFixIds` and
writes a fix document for each such candidate. The source budget is a resource
bound, but it currently also bypasses the safety bound.

### 4.9 Finding-to-code map

| Finding | Primary shipped-code path |
|---|---|
| 13-H1 | `src/lib/github.ts` — `resolveRepositoryPath()` (lines 548–567), stylesheet-link resolution (lines 831–838), and `<script src>` target resolution (lines 809–818) |
| 13-H2 | `src/lib/github.ts` — `RUNTIME_STATE_READ_PATTERN` (lines 369–375), `resolveStringExpression()` / `attributeNameReads()` (lines 392–425), `scriptNamesAttribute()` (lines 457–468), `scriptReadsAttributeProperty()` (lines 492–517), and the conditional-mutation decision (lines 927–943) |
| 13-H3 | `src/lib/css-context.ts` — `parseSubject()` (lines 602–749), `changesBetween()` (lines 949–977), `compoundActivatedByFix()` (lines 985–1018), and the activated-rule loop (lines 2877–2900) |
| 13-H4 | `src/lib/css-context.ts` — the `focus` / `focusable` transition fields (lines 931–975), `compoundActivatedByFocus()` (lines 1026–1030), and the activation decision (lines 2892–2898) |
| 13-H5 | `src/lib/css-context.ts` — `RELEVANT_PROPERTIES` (lines 1260–1278), `boxShadowGrowthOf()` (lines 2055–2110), and `paintedBoxOf()` (lines 2484–2566) |
| 13-M1 | `src/lib/css-context.ts` — the inset shorthand branches (lines 2620–2633) compared with the longhand `isLargeOffset()` branches (lines 2634–2647) |
| 13-M2 | `src/lib/github.ts` — candidate slicing and the ten-candidate budget (lines 608–622), the destination decision (lines 883–965); `src/app/api/github/create-pr/route.ts` — artifact selection (lines 298–314) and review-document writes (lines 388–425) |

## 5. Prior-payload and legitimate-behaviour evidence

### 5.1 Recovered fourth- through twelfth-review payloads

All recovered harness files were copied temporarily into matching repository
test directories, run with the real writer/route and mocked GitHub transport,
and then deleted. No recovered assertion was edited.

| Harness | Observed result |
|---|---|
| Prior / legitimate assertion matrix (fourth–eighth reviews) | **118/118 passed**. The recovered `.ts` file needed an `.mts` copy because the project's CommonJS `tsx` output does not support its top-level `await`; no assertion was changed. |
| Ninth-, tenth-, eleventh-, and twelfth-review writer closure matrices | **124/124 passed** across four files. Every unsafe writer payload produced 0 fixes and 0 writes; every legitimate twin stayed allowed. |
| Eleventh- and twelfth-review route closure matrices | **17/17 passed** across two files. |
| Total recovered prior/legitimate assertions | **259/259 passed**. |
| Pre-closure eleventh-review evidence harness | **12 failed, 5 passed**, exactly as expected. The failures assert that the eleventh-review vulnerabilities still exist; they are closure confirmation, not regressions. |
| Pre-closure eleventh-review route harness | **2 failed, 7 passed**, exactly as expected. The two failures assert the old HTTP `200` vulnerable route behaviour. |
| New equivalent-path writer / verifier / Chromium harness | **17/17 passed**. All nine unsafe candidates reached one fix and one write, and every Chromium/local-request result above was observed. |
| New equivalent-path route harness | **7/7 passed**. Five representative High cases opened a pull request; the unsafe eleventh candidate produced no source fix but did produce review artifacts. |

The literal fourth- through twelfth-review results therefore remain closed;
the seven findings above are newly found equivalent paths, not re-openings of
the literal prior payloads.

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
| Ordinary repository script | PASS — ordinary fix remains allowed. |
| Linked script that does not react to the fix | PASS — remains allowed. |
| Unrelated runtime mutation | PASS — remains allowed. |
| Event handler that does not react to the fix | PASS — remains allowed. |
| Small box growth | PASS — remains allowed. |
| Harmless focus rule | PASS — remains allowed. |
| Custom property without a resource | PASS — remains allowed. |
| Scale of one | PASS — remains allowed. |
| Small box shadow | PASS — remains allowed. |
| Non-zero maximum size | PASS — remains allowed. |
| Zero maximum size without clipping | PASS — remains allowed. |
| Aspect ratio with both axes declared | PASS — remains allowed. |
| Running animation that ends visible | PASS — remains allowed. |
| Positive delay without `backwards` fill | PASS — remains allowed. |
| Pure in-page fragment `#main` | PASS — remains allowed; 13-H4 reports only its focusability side effect. |

## 6. Verification commands and observed results

All commands were run from `C:\PROJECTS\AccessGuard` with `cmd /c`, using
`npm`/`node`/`npx` rather than `bun`.

### 6.1 Tree, source identity, and secret checks

```text
cmd /c "git rev-parse HEAD && git rev-parse origin/main && git diff --quiet 11065e4..HEAD -- src && echo SOURCE_UNCHANGED=1 || echo SOURCE_UNCHANGED=0"
cmd /c "git diff --shortstat 08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c..11065e4 -- src"
cmd /c node "C:\Users\Hasib Rana\AppData\Local\Temp\opencode\recovered\ses_dfb375437ffebi1n27bXt7JsRU_2529_write_secret-scan.cjs"
```

Observed:

- HEAD and `origin/main` were
  `d2a7cda10405c5bb65ac359301983ecb461fe448`.
- The closure-tree-to-checkout source identity check returned **exit 0** and
  `SOURCE_UNCHANGED=1`.
- The baseline-to-closure source diff was **13 files changed, 4,405
  insertions, 240 deletions**.
- The path-only secret scan examined 779 tracked files (778 text files). Only
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
| Vitest with coverage | **PASS** — 53 files, 829/829 tests passed in 38.06 seconds. |
| Coverage | **PASS** — statements 67.15% (threshold 55); branches 59.74% (50); functions 69.83% (58); lines 68.81% (57). |
| Build | **PASS** — exit 0; Next.js 16.4.6; compiled successfully; 116 static pages generated. |
| Playwright Chromium | **PASS** — 79/79 tests passed in 6.0 minutes. The run emitted the suite's existing expected unauthenticated 401 checks and a transient web-server `ECONNRESET` log; no test failed. |
| `npm audit --audit-level=high` | **PASS for the release threshold** — exit 0; Critical 0, High 0, Moderate 15, Low 0. The moderate advisories are in the Vitest/mocker, fast-copy, glob/minimatch toolchain and are tracked separately from the application finding counts. |

The passing gates do not change the security verdict: the equivalent-path
reproductions above are outside the shipped regression set and expose the
High findings.

## 7. OWASP-style disposition of the scoped surfaces

| Surface | Scoped result |
|---|---|
| Injection / XSS / source integrity | **FAIL** — 13-H1 through 13-H5 write fixes whose composed customer-page effect is a full-viewport UI takeover. No script execution was reproduced. The prior comment/template/JSX injection payloads remain blocked. |
| CSS/UI injection and rendering integrity | **FAIL** — the resource-base mismatch, incomplete selector-transition model, incomplete focusability model, and missing outline paint geometry allow repository CSS to take over or remove customer content. |
| SSRF / customer-side network isolation | The service-side verification browser continues to block network requests in isolation. The only listener in this review was `127.0.0.1`; the base-URL mismatch caused the browser to load a different **repository-owned** stylesheet, not an external target. No service-side SSRF was reproduced. |
| Authentication / sessions / OAuth | The scoped route still requires a verified session/bearer identity, verified email, and `CREATE_PR` permission. OAuth token exchange/connect flows were unchanged and were not re-audited end to end. No auth or session bypass was found in the scoped path. |
| Authorization / RBAC / tenant isolation | PASS in the scoped route: `requireVerifiedEmail(..., CREATE_PR)`, `project.orgId = auth.user.orgId`, exact violation-count checking, connected-repository allow-list, and GitHub write-access validation remain. This is not a fresh full-product authorization audit. |
| CSRF / cookies / CORS / headers | The route has no route-local CSRF-token comparison and relies on the existing NextAuth/session behavior, JSON request shape, and non-simple optional `x-github-token` header. The scoped route adds no permissive CORS policy. No fresh browser CSRF test was performed in this focused review; no CSRF finding is claimed. |
| SQL injection | PASS in scope — the route uses Prisma parameterised queries; the scoped modules contain no raw SQL. No SQLi reproduction was found. |
| Command injection / uploads / deserialization | No shell execution, upload path, or unsafe deserialization was changed in the scoped diff. No fresh full-product command-injection or upload audit is claimed. |
| Rate limits / resource bounds | PASS for resource use — the request cap, per-user remediation rate limit, browser semaphore, repository scan budgets, and fail-closed truncated/oversized scans remain. **FAIL for safety ordering** — 13-M2 shows the source budget bypassing the safety analysis for later candidates. |
| Audit trail | PASS for the tested first-ten path — the durable `github_pr_intent` is written before the branch, the closing record follows the pull request, and a closing failure preserves the intent. The 13-M2 review artifact is still represented in the intent/closing metadata; the defect is the unsafe artifact, not a missing audit record. |
| Secrets | PASS — no `.env` value was inspected or printed, no live tracked secret was found, and no secret was modified. |
| Dependencies | PASS for the release threshold — `npm audit` reports High 0 and Critical 0. The 15 Moderate toolchain advisories remain in the dependency queue. |
| Browser coverage | Chromium only. No Safari, Firefox, or WebKit coverage is claimed. |

## 8. Required closure criteria

1. **Document base URL (13-H1):** resolve repository stylesheet and script
   references with the browser's effective document base, including
   `<base href>`. A base that cannot be resolved from repository source, or
   that points outside the repository, must make the destination unprovable.
   Add a permanent regression with a benign root stylesheet and a harmful
   base-relative stylesheet; the unsafe direction must be validation false or
   non-null harm, 0 fixes, 0 writes, and no verified/applied state.
2. **Computed runtime state reads (13-H2):** recognize computed property
   reads and computed selector reads that may evaluate to an attribute the fix
   adds. A property name or selector argument that cannot be resolved
   statically must be treated as a generic dynamic state read, so a
   conditional mutation becomes unprovable. Add permanent regressions for
   bracket property reads and `matches()` / `closest()` with dynamic
   arguments, with 0 fixes and 0 writes.
3. **Browser-equivalent CSS transition semantics (13-H3):** model an attribute
   **value change** under a negated requirement, nested negation, and the
   selector list of `:nth-child(... of ...)` / `:nth-last-child(... of ...)`.
   A functional pseudo-class whose transition semantics cannot be read must
   not be treated as harmless. Add permanent regressions for all three exact
   payloads, with 0 fixes and 0 writes.
4. **Focusability transitions (13-H4):** compare actual focusability before and
   after the fix. At minimum, an added `href` on an anchor, an added
   `contenteditable`, and a `tabindex` value change to a focusable value must
   reach the same focus-activation decision as an added `tabindex`. The unsafe
   direction must be 0 fixes and 0 writes.
5. **Outline paint geometry (13-H5):** compose `outline-width` and
   `outline-offset` into the effective painted surface; an outline or offset
   the analyser cannot compute must be unprovable. Add a permanent Chromium
   paint regression for the exact `100000px` outline, with 0 fixes and 0
   writes.
6. **Inset shorthand offsets (13-M1):** expand `inset`, `inset-block`, and
   `inset-inline` into their physical edges and apply the same large-offset
   hiding rule used by the longhands. Add a permanent off-screen regression,
   with 0 fixes and 0 writes.
7. **Safety analysis before the source budget (13-M2):** run validation,
   runtime analysis, and destination analysis for **every** candidate before
   classifying candidates beyond the ten-source-write budget. The budget may
   limit source writes; it may not turn an unsafe candidate into an artifact.
   An unsafe eleventh candidate must produce 0 source fixes, 0 repository
   writes, no branch, no pull request, and no linked violation. Add a
   permanent route regression with eleven candidates and only the eleventh
   unsafe.
8. For **every reproduction above**, the unsafe remediation must end with
   `validation:false` or a non-null destination-harm reason, 0 fixes, 0
   repository writes, and no verified/applied state.
9. Preserve every legitimate behaviour listed in section 5.2, re-run all
   literal fourth- through twelfth-review payloads in their unsafe direction,
   and require a fresh independent review to return READY before the release
   gate opens.

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
  computed property/selector reads and the prior event-handler, generic-state,
  focus, CSS-resource, service-worker, and CSS-in-JS cases. Other language and
  framework carriers remain residual risk.
- The base-URL finding was reproduced with a stylesheet. A base-relative
  `<script src>` was identified in the same code path but was not separately
  reproduced in Chromium and is not claimed as a separate observation.
- `Reflect.get`, `contenteditable`, and a `tabindex="-1"` to `"0"` transition
  were identified as plausible variants of 13-H2 and 13-H4 but were not
  separately reproduced; no finding is based on them alone.
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

Only `.ai/SECURITY-REVIEW-13.md` was created. The final working tree shows
that one untracked report file and no other reviewer change.
