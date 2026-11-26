# AccessGuard — Seventeenth Independent Security Review

Date: 2026-11-26

## 1. Verdict

**NOT READY — Critical 0, High 1, Medium 1, Low 0.**

The release gate requires **Critical 0 and High 0**. One independently
reproduced High root cause and one independently reproduced Medium root cause
are still open in the shipped V23 tree. Both are **equivalent paths of root
causes that earlier reviews already closed**, so those closures are incomplete
rather than absent: the High root cause is the **mutation** side of the
sixteenth-review conditional-mutation chain (16-H1 and 16-H6), whose general
mutation vocabulary was never closed, and the Medium root cause is the
duplicate-`font-family` descriptor spelling of the same descriptor-order
defect the sixteenth review closed for `src` (16-M3) and the fifteenth review
closed for family/resource resolution (accepted risk 65).

The High root cause is the **mutation vocabulary of the repository runtime
reader**. `RUNTIME_MUTATION_PATTERN` recognises `classList.add(...)`,
`className =`, `setAttribute(...)`, `removeAttribute(...)`,
`toggleAttribute(...)`, `style.<property> =`, `style.setProperty(...)` and
`style.cssText =` — and nothing else. Every other statically resolvable way of
mutating an element (`setAttributeNS(...)`, `element.style = ...`,
`className += ...`, `attributes.<name>.value = ...`, `outerHTML = ...`,
`Object.assign(element.style, ...)`) is invisible to the reader. A repository
script that reads an attribute the fix adds and then mutates the element
through one of those spellings is therefore never analysed: the remediation
passes validation, passes destination analysis, is written into the
customer's repository, and the customer's own runtime then takes the whole page
over. Local Chromium measured a `1280×720` fixed takeover in every browser
variant. The real create-PR route reproduced the source write and the pull
request.

The Medium root cause is the **`@font-face` descriptor reader**. The
sixteenth-review closure applied CSS declaration order to the `src` descriptor
of a face but left the `font-family` descriptor on `declarations.find(...)`,
which keeps the **first** declaration while the browser keeps the **last**. A
face that declares its family twice therefore disappears from the analyser's
family table, an activated `font-family` resolves to "no face", and the
customer-side font request the fix activates is judged harmless and written
into the repository.

This tree is not releasable until every High reproduction is blocked in the
unsafe direction, permanent regressions cover both root causes, and a fresh
independent review returns READY.

This is the seventeenth-review security artifact. The existing
`.ai/SECURITY-STATUS.md` and every other existing `.ai/` file were intentionally
not changed by this review.

## 2. Reviewed trees and boundary

| Item | Value |
|---|---|
| Requested baseline | `08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c` (`vol: releases — V23: volume log entry for the seventh-review closure cycle`) |
| Reviewed closure tree | `8604c32` (`vol: security — V23: close the sixteenth review's runtime and CSS findings`) |
| Current checkout at report time | `a02ba63f91129ad2aef97d83090d0a7fc7496198` (`vol: releases — V23: record the sixteenth-review closure in the volume chain`) |
| Current `origin/main` | `a02ba63f91129ad2aef97d83090d0a7fc7496198` |
| Branch | `main`, working tree clean for every shipped source file |
| Closure-tree-to-checkout identity | `git diff --quiet 8604c32..HEAD -- src` returned **exit 0**. The three later commits (`c219880`, `2f17ad7`, `a02ba63`) changed only `.ai/` and `docs/` files; no scoped or other `src` file changed. |
| Baseline-to-checkout size | 50 commits, 40 files changed, 17,375 insertions and 789 deletions — the destination/runtime, writer, route/audit and regression files changed by the ninth- through sixteenth-review closures. |
| Review scope | `src/lib/github.ts` (repository runtime reader and writer), `src/lib/css-context.ts` (destination analyser), `src/lib/github-pr.ts` (remediation validator and PR writer), `src/lib/fix-validation.ts` (rule validator), `src/lib/fix-verification.ts` (verification browser), `src/lib/ast-patch.ts` (AST patcher), `src/lib/html-attributes.ts` (attribute reader), and `src/app/api/github/create-pr/route.ts` (create-PR route and audit flow), including the directly related validation, verification, write, authorization, rate-limit and audit call path |
| Reviewer changes | Report only. No shipped source, permanent test, dependency, lockfile, CI, environment, schema or existing `.ai/` file was changed by this review. No commit, push, deployment, database migration or secret change was performed. |

Every reproduction used a local synthetic repository, a mocked GitHub/Octokit
transport, local Playwright Chromium, and listeners bound only to `127.0.0.1`.
No production, public, customer or third-party target was scanned. No live
repository was mutated. No external GitHub Markdown service was called. The npm
advisory registry was used only for `npm audit`; it was not a test target. No
`.env` value was inspected or printed.

**Strix/self-scan status:** skipped. **No Strix result, finding, confidence or
pass is claimed.** Chromium was the only browser engine; no Safari, Firefox or
WebKit result is claimed.

## 3. Threat model and method

The review tests the V23 verified-fix/GitHub-writer chain: an accessibility
remediation is generated for customer-owned source, validated, verified with
axe-core in an isolated Chromium document, and then written into a connected
customer repository. The security boundary is not only "does axe stop firing?"
A remediation must also preserve the customer's content, navigation, network
behaviour, focus behaviour, semantics, accessibility-tree presence and
rendering after the **repository's own CSS** and the **repository's own runtime
code** are combined with the generated fix.

The unsafe direction for every prior and equivalent case below is strict:

- the unsafe remediation must fail validation (`validation: false`) or produce
  a non-null destination-harm reason;
- it must not be reported as verified/applied;
- it must apply **0 fixes**; and
- it must perform **0 repository writes**.

The method was:

1. establish the requested baseline, reviewed closure tree and current source
   identity;
2. re-run every literal sixteenth-review payload in its unsafe direction and
   re-check the legitimate behaviours;
3. exercise equivalent CSS selector, structural-element, painted-surface
   geometry, resource-base, runtime-carrier, runtime-state-read, **runtime
   mutation**, focus-state, link-state, animation-timing, URI-resource,
   writer-budget and route/audit paths;
4. require an observable Chromium geometry/paint/computed-style/accessibility
   result or a local `127.0.0.1` request before counting a candidate as a
   finding;
5. run the source-only typecheck, lint, full unit suite, coverage gate,
   standalone build, Chromium E2E suite, dependency audit, and a non-secret-
   printing tracked-file secret scan; and
6. run the writer and route against the **final merged HTML**, not against a
   mutated DOM after an inline script had already executed.

No Critical finding was reproduced. The High and the Medium finding below are
independent root causes; equivalent payloads are grouped under the affected
root cause.

The accepted fail-closed false positives in `.ai/RISKS.md` rows 46–66 were
checked in both directions and remain documented. The findings below are not
those accepted cases:

- risk 63 says a dataset key that resolves is mapped to its `data-*`
  attribute; the dataset read side is closed. The finding below is on the
  **mutation** side of the same conditional-mutation gate and was never
  covered by that risk;
- risk 61 covers a base assignment whose receiver cannot be resolved; the
  sixteenth-review closure modelled `setAttributeNS` and `Attr.value` **for
  the document base only**. The general mutation reader was not changed, which
  is the gap below;
- risk 65 says an activated font family resolves to its resource; the
  duplicate-`src` spelling is closed, the duplicate-`font-family` spelling is
  not, which is the Medium finding below; and
- the ordinary script file, linked script that does not react, `:hover`,
  `:focus-within`, unrelated runtime mutation, unchanged base, unrelated
  `Reflect.get`, unrelated `getAttribute`, unrelated dataset key, unchanged
  id, and introduced id the runtime does not name all remain writable or
  harmless as required.

## 4. Reproduced findings

### 4.1 Result matrix

| ID | Severity | Browser-observable harmful variants | Writer result | Chromium / local observable |
|---|---:|---:|---|---|
| 17-H1 | High | 6 | applied, 1 fix, `index.html` write | target fixed at `1280×720`, class `overlay`, `position: fixed`, `z-index: 2147483647` |
| 17-M1 | Medium | 1 | applied, 1 fix, `index.html` write | local `GET /evil-font` after the merge, nothing before it |

Seven harmful variants were reproduced. In every case the remediation passed
rule validation and destination analysis: the writer's plan applied it rather
than refusing it or sending it to human review. The literal closure controls
were refused with 0 fixes and 0 writes, and the unrelated benign twins stayed
writable.

### 4.2 17-H1 — the repository runtime reader recognises only a subset of DOM mutation spellings (High)

The six exact runtime expressions were:

```js
img.setAttributeNS(null,'class','overlay')
img.style = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f'
img.className += ' overlay'
img.attributes.class.value = 'overlay'
img.outerHTML = '<span class="overlay"></span>'
Object.assign(img.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',zIndex:'2147483647',background:'#f0f'})
```

The repository shape was:

```html
<html><head><style>.overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}</style></head><body><img id="target" src="x"><script>document.querySelectorAll('img').forEach(function(img){if(img.getAttribute('alt'))MUTATION});</script></body></html>
```

The ordinary remediation was:

```html
<img id="target" src="x" alt="Photo">
```

**Observed result.** All six candidates passed validation and destination
analysis, applied one fix, and wrote `index.html`. In the final merged HTML,
Chromium reported the repaired image at `x=0, y=0, width=1280, height=720`
with `position: fixed` and `z-index: 2147483647`: a full-viewport customer-page
takeover. Before the fix the same repository rendered the image at
`x=8, y=8, width=16, height=16`, `position: static`, `z-index: auto` — the
remediation is the trigger. The `attributes.class.value` spelling needs a
pre-existing `class` attribute on the original element
(`<img id="target" class="base" src="x">`); the other five do not.

The real route reproduced the `setAttributeNS` form as a source write and a
pull request:

| Case | HTTP | Success | Source fixes | GitHub writes | Pull request | Audit actions |
|---|---:|---|---:|---:|---:|---|
| 17-H1 `setAttributeNS(null,'class','overlay')` | 200 | true | 1 | `index.html` + per-fix Markdown + summary | 1 | `github_pr_intent`, `github_pr_created` |

**Shipped-code root cause.** `RUNTIME_MUTATION_PATTERN` at
`src/lib/github.ts:935-936` enumerates a closed list of mutation spellings:

```js
/\bclassList\s*\.\s*(?:add|remove|toggle|replace)\s*\(|\bclassName\s*=(?![=>])|\b(?:setAttribute|removeAttribute|toggleAttribute)\s*\(|\.\s*style\s*\.\s*[A-Za-z_$][\w$]*\s*=(?![=>])|\.\s*style\s*\.\s*(?:setProperty\s*\(|cssText\s*=(?![=>]))/i
```

`setAttributeNS(` does not match the `setAttribute` alternative (the name is
followed by `NS`, not `(`); `img.style =` and `Object.assign(img.style, …)`
have no member after `style`, so they match neither `style` alternative;
`className +=` is a compound assignment and the pattern requires `=` directly
after the name; `attributes.class.value =` and `outerHTML =` are not in the
list at all.

`inspectRuntimeScript()` at `src/lib/github.ts:1674-1709` only enters its
analysis block when `RUNTIME_MUTATION_PATTERN.test(content)` is true
(`:1685`). A script whose only mutation uses one of the six spellings above is
therefore never pushed into `runtimeMutationScripts`, never into
`conditionalMutationScripts` (`:1690-1692`) and never into
`genericStateReadMutationScripts` (`:1696-1707`). Every downstream gate that
could refuse the candidate reads one of those lists:

- the patched-element-id check (`:1864`),
- the introduced-id check (`:1890-1899`),
- the introduced-element selector check (`:1904-1913`),
- the added-attribute check (`:1922-1932`), which would have matched through
  `conditionalMutationScripts.some(content => scriptNamesAttribute(content, added))`
  because the script names the added attribute `alt`, and
- the introduced-attribute check (`:1934-1947`).

`SET_ATTRIBUTE_NS_PATTERN` and `ATTRIBUTE_VALUE_ASSIGNMENT_PATTERN` exist in
the same file (`:1034-1035`, `:1043-1044`) and are used by
`scriptMutatesBaseHref()` (`:1214-1251`) — but only for the **document base**.
The sixteenth-review closure therefore taught the reader two new mutation
spellings for one receiver and left the general mutation vocabulary untouched.

The destination analyser cannot compensate: the repository rule that takes the
page over is `.overlay{…}`, selected by a **class** the runtime adds at run
time, not by an attribute or a class the fix adds, so no rule is "activated by
the fix" and `destinationCssHarm()` (`src/lib/css-context.ts:3810`) returns
`null`.

### 4.3 17-M1 — the `@font-face` reader keeps the first `font-family` descriptor while the browser keeps the last (Medium)

The exact repository and remediation were:

```html
<html><head><style>@font-face{font-family:Decoy;src:local("Arial");font-family:Evil;src:url(/evil-font)} [aria-label]{font-family:Evil}</style></head><body><button id="target">Save</button></body></html>
```

```html
<button id="target" aria-label="Save">Save</button>
```

**Observed result.** The candidate passed validation and destination analysis,
applied one fix, and wrote `index.html`. The local `127.0.0.1` listener
observed **no** request before the merge and `GET /evil-font` after it: the
remediation's added `aria-label` activates the repository's `font-family:Evil`
rule, the browser resolves the face to the **last** `font-family` descriptor
(`Evil`) and loads its URL.

**Shipped-code root cause.** `collectFontFace()` at
`src/lib/css-context.ts:516-533` reads the family with
`declarations.find(declaration => declaration.property === 'font-family')`
(`:518`) — the **first** declaration — while it reads the source with
`declared[declared.length - 1]` (`:529-530`) — the **last** declaration. CSS
declaration order makes the later descriptor win in the browser, so the face is
registered under the family `Decoy` and is invisible under the family `Evil`
that the browser actually uses.

`fontFamilyResourceState()` at `src/lib/css-context.ts:1623-1650` then looks
`Evil` up in the family table, finds nothing and `continue`s (`:1640-1641`),
so it reports the family as `absent` rather than `unknown`. The activated-rule
resource check at `src/lib/css-context.ts:3976-3995` therefore sees no font
resource and lets the candidate through.

The sixteenth-review closure for 16-M3 fixed exactly this class of defect for
the `src` descriptor only (criterion 8.10.1 — "Apply CSS declaration order to
duplicate `@font-face src` descriptors"); the `font-family` descriptor of the
same block still uses `find`.

### 4.4 Finding-to-code map

| Finding | Shipped code | Missed condition | Required correction |
|---|---|---|---|
| 17-H1 | `src/lib/github.ts:935-936`, `:1674-1709`, `:1864`, `:1890-1947` | the mutation vocabulary of `RUNTIME_MUTATION_PATTERN` is a closed list that omits `setAttributeNS(...)`, `element.style =`, `className +=`, `attributes.<name>.value =`, `outerHTML =` and `Object.assign(element.style, …)` | recognise every statically resolvable DOM mutation form in the general runtime reader; fail closed for a mutation form the reader cannot resolve; reuse the base reader's `SET_ATTRIBUTE_NS_PATTERN` / `ATTRIBUTE_VALUE_ASSIGNMENT_PATTERN` so one spelling has one implementation |
| 17-M1 | `src/lib/css-context.ts:516-533`, `:1623-1650`, `:3976-3995` | `collectFontFace()` keeps the **first** `font-family` descriptor while the browser keeps the **last**; a family with no face is reported `absent` instead of `unknown` | apply CSS declaration order to **every** `@font-face` descriptor; a family that the browser can resolve but the analyser cannot must fail closed (`unknown`) |

### 4.5 Route and write-path evidence

The real route was exercised with the normal writer/plan/apply path and a
mocked Octokit transport; only the isolated axe verification was stubbed to a
verified confidence so that the route's own writer path could be observed.

| Case | HTTP | Success | Source fixes | GitHub writes | Pull request | Audit actions |
|---|---:|---|---:|---:|---:|---|
| 17-H1 `setAttributeNS(null,'class','overlay')` | 200 | true | 1 | `index.html` + per-fix Markdown + summary | 1 | `github_pr_intent`, `github_pr_created` |

The written `index.html` contained the patched element
`<img id="target" src="x" alt="Photo">` next to the repository's script.

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

### 5.1 Recovered sixteenth-review payloads

The literal payloads of the sixteenth review's eleven findings were rebuilt in
a temporary harness (local synthetic repositories, mocked GitHub transport)
and re-run in their unsafe direction. Every one of them was refused with 0
fixes and 0 writes, so the sixteenth-review closure holds for the payloads it
names.

| Payload | Result | Interpretation |
|---|---:|---|
| `img['dataset']['state']` | 0 fixes, 0 writes | 16-H1 closed |
| `img.dataset?.state` | 0 fixes, 0 writes | 16-H1 closed |
| `Reflect['get'](img,'alt')` | 0 fixes, 0 writes | 16-H2 closed |
| `Reflect?.get(img,'alt')` | 0 fixes, 0 writes | 16-H2 closed |
| `Reflect.get?.(img,'alt')` | 0 fixes, 0 writes | 16-H2 closed |
| `Element.prototype.getAttribute?.call(img,'alt')` | 0 fixes, 0 writes | 16-H3 closed |
| `Element.prototype['getAttribute']?.call(img,'alt')` | 0 fixes, 0 writes | 16-H3 closed |
| `document.getElementById('act'+'ivated')` | 0 fixes, 0 writes | 16-H4 closed |
| `document.querySelector('span')` on an introduced element | 0 fixes, 0 writes | 16-H5 closed |
| `setAttributeNS(null,'href','/sub/')` on a base | 0 fixes, 0 writes | 16-H6 closed |
| `attributes.href.value='/sub/'` on a base | 0 fixes, 0 writes | 16-H6 closed |
| runtime-created `<base>` | 0 fixes, 0 writes | 16-H7 closed |
| `color-mix()` transparency | 0 fixes, 0 writes | 16-M1 closed |
| activated `font` shorthand | 0 fixes, 0 writes | 16-M2 closed |
| duplicate `@font-face src` | 0 fixes, 0 writes | 16-M3 closed |
| `:enabled` transition | 0 fixes, 0 writes | 16-M4 closed |

**16/16 passed.**

The fourth- through fifteenth-review payloads are covered by the shipped
permanent regressions in `src/lib/__tests__/github.test.ts`,
`css-context.test.ts`, `github-pr.test.ts`, `fix-validation.test.ts` and
`fix-verification.test.ts`; the shipped suite (53 files, 972 tests) passed in
full, so every historical reproduction is still blocked in the unsafe
direction. The two **pre-closure** eleventh-review harnesses that the
sixteenth review recovered are not shipped and were not rebuilt here; their
shipped equivalents are the permanent regressions named above.

### 5.2 Equivalent-path writer and Chromium evidence

Ten runtime-mutation spellings were evaluated against the same repository
shape. The two controls were refused; every other spelling was applied:

| Spelling | Writer result | Chromium |
|---|---|---|
| `img.setAttribute('class','overlay')` (control) | 0 fixes, 0 writes | not reached |
| `img.classList.add('overlay')` (control) | 0 fixes, 0 writes | not reached |
| `img.setAttributeNS(null,'class','overlay')` | 1 fix, 1 write | `1280×720`, `position: fixed`, `z-index: 2147483647`, class `overlay` |
| `img.setAttributeNS(null,'style','…')` | 1 fix, 1 write | accepted (not counted separately) |
| `img.style = '…'` | 1 fix, 1 write | `1280×720`, `position: fixed`, `z-index: 2147483647` |
| `img.className += ' overlay'` | 1 fix, 1 write | `1280×720`, `position: fixed`, class ` overlay` |
| `img.attributes.class.value = 'overlay'` | 1 fix, 1 write | `1280×720`, `position: fixed`, class `overlay` |
| `img.outerHTML = '<span class="overlay"></span>'` | 1 fix, 1 write | `1280×720`, `position: fixed`, class `overlay` |
| `Object.assign(img.style, {…})` | 1 fix, 1 write | `1280×720`, `position: fixed`, `z-index: 2147483647` |
| `img.innerHTML = '…'` | 1 fix, 1 write | no harm: an `<img>` is a replaced element, its children are not rendered |
| `img.insertAdjacentHTML('afterbegin','…')` | 1 fix, 1 write | no harm: same reason |

The two accepted-but-not-harmful spellings (`innerHTML`, `insertAdjacentHTML`)
are **not** counted as findings: no browser-observable harm was produced, and
static writer acceptance alone was not treated as a finding.

Eight CSS destination cases were evaluated. Six behaved correctly, and one
reproduced the Medium finding:

| Case | Writer result | Local observable |
|---|---:|---|
| duplicate `@font-face` **family** descriptor (17-M1) | 1 fix, 1 write | `GET /evil-font` after the merge |
| single `@font-face` family with a URL (control) | 0 fixes, 0 writes | no request |
| two `@font-face` blocks with the same family (control) | 0 fixes, 0 writes | no request |
| family without a face (benign) | 1 fix, 1 write | no request |
| `font: 16px/1.5 Evil` (benign spelling of 16-M2) | 0 fixes, 0 writes | no request |
| `font: italic bold 16px Evil` (benign spelling of 16-M2) | 0 fixes, 0 writes | no request |
| `color-mix(in srgb,transparent,transparent)` (benign spelling of 16-M1) | 0 fixes, 0 writes | no request |
| `color-mix(in srgb,rgba(0 0 0 / 0) 0%,rgba(0 0 0 / 0) 100%)` (benign spelling of 16-M1) | 0 fixes, 0 writes | no request |

### 5.3 Legitimate behaviours checked

All behaviours required by the brief remained writable or harmless:

1. ordinary `image-alt` and `button-name` fixes remained writable;
2. an unrelated dataset key (`img['dataset']['other']`) remained writable;
3. an unrelated `Reflect` read (`Reflect?.get(img,'src')`) remained writable;
4. a document with no `<base>` and no runtime base remained writable;
5. a family without a font face remained writable and caused no request;
6. an ordinary repository script with no state read remained writable;
7. a duplicate of the patched element inside a non-patchable `.ts` file made
   the match ambiguous: 0 fixes, 0 writes, review only;
8. an element inside a `<script>` block was not treated as live markup — only
   the live copy was patched;
9. a remote `src` on an introduced element was refused by the remediation
   validator;
10. a remediation carrying `image-set('http://…')` or `src('http://…')` in its
    inline style is **not** rejected by `validateRemediation()` (the validator
    only rejects `url(` and `expression(`), but it is refused end-to-end by the
    destination analyser, which understands `image-set(` and `src(`: 0 fixes,
    0 writes. This is a single-layer defence, not a finding — no write and no
    customer-side request was reproduced.

## 6. Verification commands and observed results

### 6.1 Required gate suite

| Command | Observed result |
|---|---|
| `npx tsc -p tsconfig.check.json --noEmit` | **PASS**, exit 0, no diagnostics |
| `npm run lint` | **PASS**, exit 0, no ESLint errors |
| `npx vitest run --coverage` | **PASS**, exit 0; 53/53 files and 972/972 tests passed in 32.29s; coverage 70.3% statements, 63.09% branches, 73.36% functions, 72.38% lines; configured gates passed |
| `npm run build` | **PASS**, exit 0; Next.js 16.4.6 compiled in 9.2s, TypeScript in 14.0s, 116/116 static pages generated in 2.6s |
| `npx playwright test --project=chromium` | **PASS with one retry**, exit 0; 79 tests, 78 passed, 1 flaky, 0 failed, 5.8m. The flaky authenticated landing CTA passed on retry. |
| `npm audit --audit-level=high` | **PASS**, exit 0; 15 moderate advisories, 0 high, 0 critical |

The 15 advisories are `vitest`/`@vitest/mocker`, `fast-copy`, `glob` and
`minimatch` transitive toolchain advisories. They are a maintenance item, not
a Critical/High release-gate failure.

### 6.2 Services and secret checks

- A non-secret-printing scan inspected 788 tracked files (786 text files
  scanned; environment files were excluded and not read). It found one
  AWS-access-key-shaped **documentation placeholder** in
  `.openclaw/skills/document-generate/SKILL.md`; contextual inspection
  confirmed prose/example text, not a credential — the same finding the
  sixteenth review recorded. No other private-key, AWS, GitHub-token,
  Slack-token, Google-API-key, Stripe-secret, JWT or npm-token shape was
  found. No secret value is reproduced in this report.
- `.env.example` is tracked as a name-only template; its values were excluded
  from the scan and were not inspected.
- No secret, credential, production configuration, dependency, lockfile or
  environment file was changed.

## 7. OWASP-style disposition of the scoped surfaces

| Surface | Disposition | Evidence |
|---|---|---|
| OWASP A01 Broken Access Control | **No new finding** | `CREATE_PR` permission, org-scoped violation lookup, org-scoped GitHub connection and repository allowlist all apply before writes |
| OWASP A02 Security Misconfiguration | **No new finding in the scoped call path** | security headers, enforced CSP, API `no-store` and no credentialed permissive CORS policy were checked; the two findings are incomplete trust-boundary design rather than missing route configuration |
| OWASP A03 Software Supply Chain Failures | **No High/Critical advisory** | `npm audit` contains no high/critical result; 15 moderate transitive advisories remain for maintenance |
| OWASP A04 Cryptographic Failures | **No new finding** | the scoped route does not change JWT/session cryptography or secret handling; OAuth state uses HMAC and a timing-safe comparison; no `.env` value was read |
| OWASP A05 Injection | **No new finding** | remediation validation rejects script/event handlers, active/embedding tags, template grammar, braces and unsafe URI schemes; no new SQL or command injection path was found in scope |
| OWASP A06 Insecure Design | **FAIL — both root causes** | the writer treats a partial static model of repository CSS/runtime/accessibility/focus behaviour as proof that a source patch is safe |
| OWASP A07 Authentication Failures | **No new finding** | verified-email session/bearer authentication and permission enforcement precede repository work |
| OWASP A08 Software or Data Integrity Failures | **FAIL — both root causes** | the writer accepts an unproven source change and writes it; the destination can change after merge |
| OWASP A09 Security Logging and Alerting Failures | **No new finding** | durable `github_pr_intent` precedes mutation and `github_pr_created` closes the trail; failure cases retain the intent record |
| OWASP A10 Mishandling of Exceptional Conditions | **No new finding in scope** | planning, branch, write, PR and audit failure paths were re-run; a refused source write creates no false violation link |

Additional scoped checks:

- **Sessions/cookies:** NextAuth uses a seven-day JWT session. Its default
  session/state cookies are `HttpOnly`, `SameSite=Lax`, path-scoped and
  secure in production. A cross-site form POST does not carry the ambient
  session cookie. The bearer path is not ambiently attached to a third-party
  origin.
- **CSRF:** no separate `X-CSRF-Token` enforcement exists on this route, but
  cookie-authenticated mutation is protected by the session cookie's
  `SameSite=Lax` behaviour and bearer authentication is not cookie-authenticated.
  No reproducible CSRF bypass was found in the scoped route.
- **CORS/headers:** no wildcard or origin-reflection CORS policy was found in
  the scoped source. `next.config.ts` sets `X-Frame-Options: DENY`, `nosniff`,
  a referrer policy, a restrictive permissions policy, HSTS, COOP/CORP and an
  enforced CSP. The public OpenAPI JSON response alone permits `*` and does
  not allow credentials. The existing CSP still permits inline/eval; that is
  unchanged and outside the writer-chain boundary reviewed here.
- **OAuth/GitHub:** the OAuth start and callback use a signed, HMAC-protected,
  timing-safe-compared state bound to the authenticated user's organization.
  The create-PR route checks the authenticated organization's active
  connection, its repository allowlist and GitHub write permission. Live
  OAuth and live GitHub behaviour were not exercised.
- **RBAC/tenant isolation:** permission and org scope are applied before
  violation lookup, verification, planning or writing. The review did not
  find a cross-tenant route path.
- **Rate limits/resource budget:** the request is user-rate-limited before
  browser work; the candidate cap is applied before verification and every
  candidate receives safety analysis. No budget bypass was found.
- **XSS:** generated remediation is written to customer source rather than
  rendered by AccessGuard. Script/event-handler/active-tag validation held.
  No new XSS was found in the scoped product path.
- **SQL injection:** the scoped route uses Prisma's structured predicates; no
  raw SQL interpolation was found.
- **Command injection:** no shell, process execution or command construction
  occurs in the scoped route/writer path.
- **SSRF:** the server does not fetch arbitrary customer URLs from the scoped
  writer path; repository resource resolution is path-constrained. The local
  request in 17-M1 occurs in the **customer browser**, not as a server SSRF.
- **Uploads:** this route accepts no file upload. It writes a generated fix
  and bounded documentation artifacts through the GitHub transport.
- **Secrets:** no live credential was identified or modified.

The findings are therefore primarily **A06 Insecure Design** and **A08
Software or Data Integrity Failures** failures. Authentication, authorization,
tenant isolation, rate limiting and audit ordering are not the bypass points.

## 8. Required closure criteria

Every criterion below is mandatory. A closure must be made at the shared root
cause, not by blocking only the literal payload.

### 8.1 17-H1

1. The runtime reader must recognise **every** statically resolvable DOM
   mutation form, not a closed list of five spellings. At minimum:
   `setAttributeNS(...)` (the attribute name is the second argument),
   `element.style = ...`, `className += ...` and every other compound
   assignment of a class, `attributes.<name>.value = ...`, `outerHTML = ...`,
   `innerHTML = ...`, `insertAdjacentHTML(...)` and
   `Object.assign(element.style, ...)`.
2. The `setAttributeNS` and `Attr.value` readers that the sixteenth-review
   closure added for the document base must be **shared** with the general
   mutation reader, so one spelling has one implementation and cannot drift
   apart again.
3. A mutation form the reader cannot resolve must fail closed: a script that
   mutates an element through an unreadable form is a runtime source whose
   destination is unprovable.
4. A script that mutates an element through any recognised form and reads an
   attribute the fix adds must refuse the source patch with 0 fixes and 0
   writes, exactly like the `classList.add` and `setAttribute` controls.
5. The benign twins must stay writable: `setAttribute`/`classList` on an
   unrelated element, a script that mutates nothing, and a script that reads an
   attribute the fix does not add.
6. Add permanent regressions for the six harmful spellings of section 4.2 and
   for the benign boundary.

### 8.2 17-M1

1. Apply CSS declaration order to **every** `@font-face` descriptor, not only
   to `src`: the effective `font-family` is the **last** declaration of the
   face.
2. A family that the browser can resolve but the analyser cannot must fail
   closed: `fontFamilyResourceState()` must report `unknown`, not `absent`,
   when a family has no readable face but the face table itself could not be
   read completely.
3. A `@font-face` whose descriptors cannot be read completely must make the
   destination unprovable.
4. Keep a family without a face harmless and keep the duplicate-`src` case
   refused.
5. Add a permanent regression for the exact section 4.3 payload and for the
   duplicate-`src` payload of 16-M3.

### 8.3 Closure process

For each criterion:

1. add a shipped permanent regression that fails before the fix and passes
   after it;
2. re-run the complete fourth- through seventeenth-review unsafe matrices and
   require 0 fixes and 0 writes in every unsafe direction;
3. re-run the legitimate-behaviour matrix and keep every listed behaviour
   writable or harmless;
4. re-run typecheck, lint, coverage, build, Chromium E2E and dependency
   audit; and
5. require a fresh independent security review to return **READY with
   Critical 0 and High 0** before the release gate opens.

## 9. Untested / out of scope

- No production, public, customer or third-party target was scanned.
- No live GitHub repository, OAuth flow or live pull request was created.
- Chromium was the only browser engine. Safari, Firefox, WebKit and
  engine-specific behaviour were not tested and are not claimed.
- Strix was skipped. **No Strix result, finding, confidence or pass is
  claimed.**
- The static CSS reader's documented residual limitations remain: a customer
  build pipeline, CDN stylesheet, runtime-generated CSS, service worker, CSS
  in JS, unresolved custom property and other accepted fail-closed cases were
  not re-engineered.
- No change was made to the application's accepted false-positive policy, CSP,
  cookies, OAuth configuration, rate-limit values, database schema, CI or
  dependency versions.
- Full-application penetration testing outside the V23 writer/verification/
  route chain, performance/load testing and infrastructure/cloud configuration
  review were outside this brief.
- The validity of the one documentation-placeholder key shape was not tested
  against any provider; only its local prose context was checked.
- `src/lib/css-context.ts` contains two literal NUL bytes (line 4010, a
  `join('\u0000')` separator). They are valid TypeScript and compile cleanly;
  they only make some text tools treat the file as binary. They were observed,
  not reported as a finding.

## 10. Cleanup and artifact integrity

All temporary repository harnesses were removed after their evidence was
captured. No shipped file, permanent test, dependency, lockfile, workflow,
schema, environment file or existing `.ai/` file was modified **by this
review**. The only repository artifact created by this review is this
untracked report:

```text
?? .ai/SECURITY-REVIEW-17.md
```

The working tree additionally shows `.ai/DECISIONS.md`, `.ai/FINAL-REPORT.md`,
`.ai/SECURITY-STATUS.md`, `.ai/STATE.md`, `.ai/TASKS.md` and
`.ai/TEST-STATUS.md` as modified: those edits were made by the **parent
session** that commissioned this review while it was running, not by this
review. `.playwright-mcp/` is a pre-existing untracked directory.
