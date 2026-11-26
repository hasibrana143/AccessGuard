# AccessGuard — Eighteenth Independent Security Review

Date: 2026-11-26

## 1. Verdict

**NOT READY — Critical 0, High 1, Medium 1, Low 1.**

The release gate requires **Critical 0 and High 0**. One independently
reproduced High root cause and one independently reproduced Medium root cause
are still open in the shipped V23 tree, plus one Low fail-closed false
positive.

The High root cause is **the mutation side of the seventeenth-review closure
(17-H1)**: the seventeenth closure replaced the closed `RUNTIME_MUTATION_PATTERN`
with the richer `runtimeMutations()` reader, but the new reader is still a
**closed list of spellings**. Every statically resolvable way of mutating an
element that is *not* in that list is invisible to the writer: a repository
script that reads the attribute the fix adds and then mutates the patched
element through `Element.prototype.setAttribute.call(...)`, through
`Reflect.set(...)`, through a bound method, through `remove()` /
`removeChild()`, through an IDL attribute assignment (`img.alt = ''`) or through
`document.write(...)` is never analysed. The remediation passes validation,
passes destination analysis, is written into the customer's repository and opens
a pull request, and the customer's own runtime then takes the page over, deletes
the repaired element or empties the alternative text the pull request adds.
Local Chromium measured a `1280×720` fixed takeover in every browser-observable
variant, and the real create-PR route reproduced the source write and the pull
request.

The Medium root cause is **the activated custom property of the font
activation chain**: the seventeenth closure taught the analyser that an
activated `font-family` resolves to the resource of its `@font-face`, but the
activation is still evaluated **per rule**. A repository that defines the font
family in a custom property of an **activated** rule and consumes it in a
**different** rule (`[aria-label]{--f:Evil} button{font-family:var(--f)}`) has
no rule the analyser judges as harmful, so the fix is written and the customer
browser requests the font after the merge. The local `127.0.0.1` listener
received no request before the merge and `GET /evil-font` after it.

The Low finding is a **fail-closed false positive**: a repository script with an
unrelated computed method call (`fns[0]()`, `fns[i]()`) makes the writer refuse
every fix in the repository. It fails closed, so it is not a security defect,
but it is a new accepted-risk boundary that is not yet documented.

This tree is not releasable until every High reproduction is blocked in the
unsafe direction, permanent regressions cover both root causes, and a fresh
independent review returns READY.

This is the eighteenth-review security artifact. The existing
`.ai/SECURITY-STATUS.md` and every other existing `.ai/` file were intentionally
not changed by this review.

## 2. Reviewed trees and boundary

| Item | Value |
|---|---|
| Requested baseline | `53e2af0a0b2a5a3a799f2a382fce79a24771bef9` (`vol: state — V23: record the seventeenth-review closure evidence`) |
| Reviewed closure tree | `5e30641` (`vol: security — V23: close the seventeenth review's runtime and font-face findings`) |
| Current checkout at report time | `24db2a11a629e4843bb606fdbd34b5432fbb06ef` (`vol: releases — V23: record the seventeenth-review closure in the volume chain`) |
| Current `origin/main` | `24db2a11a629e4843bb606fdbd34b5432fbb06ef` |
| Branch | `main`; the working tree carries no modification of any shipped source file |
| Baseline-to-checkout identity | `git diff --name-only 53e2af0..24db2a1` lists **only** `.ai/DEPLOYMENT.md`, `.ai/FINAL-REPORT.md`, `.ai/SECURITY-STATUS.md`, `.ai/STATE.md`, `.ai/TASKS.md`, `.ai/TEST-STATUS.md` and `docs/VOLUMES.md`. **No `src/` file and no dependency changed** — the reviewed code is exactly the `53e2af0` code. |
| Review scope | `src/lib/github.ts` (repository runtime reader and writer), `src/lib/css-context.ts` (destination CSS/font analyser), `src/lib/github-pr.ts` (remediation validator and patcher), `src/lib/ast-patch.ts` (element locator and patcher), `src/lib/fix-verification.ts` (verification browser), and `src/app/api/github/create-pr/route.ts` (create-PR route and audit flow) |
| Reviewer changes | Report only. No shipped source, permanent test, dependency, lockfile, CI, environment, schema or existing `.ai/` file was changed by this review. No commit, push, deployment, database migration or secret change was performed. |

Every reproduction used a local synthetic repository, a mocked GitHub/Octokit
transport, local Playwright Chromium, and listeners bound only to `127.0.0.1`.
No production, public, customer or third-party target was scanned. No live
repository was mutated. The npm advisory registry was used only for `npm audit`;
it was not a test target. No `.env` value was inspected or printed.

**Strix/self-scan status:** skipped. **No Strix result, finding, confidence or
pass is claimed.** Chromium was the only browser engine; no Safari, Firefox or
WebKit result is claimed.

## 3. Threat model and method

The review tests the V23 verified-fix/GitHub-writer chain: an accessibility
remediation is generated for customer-owned source, validated, verified with
axe-core in an isolated Chromium document, and then written into a connected
customer repository. The security boundary is not only "does axe stop firing?".
A remediation must also preserve the customer's content, navigation, network
behaviour, focus behaviour, semantics, accessibility-tree presence and
rendering after the **repository's own CSS** and the **repository's own runtime
code** are combined with the generated fix.

The unsafe direction for every case below is strict:

- the unsafe remediation must fail validation (`validation: false`) or produce
  a non-null destination-harm reason;
- it must not be reported as verified/applied;
- it must be **refused** (`refusedFixIds`), not silently applied and not sent to
  human review;
- it must apply **0 fixes**; and
- it must perform **0 repository writes**.

The method was:

1. establish the requested baseline, reviewed closure tree and current source
   identity;
2. re-run the recovered closure matrices of the tenth through the sixteenth
   reviews and the recovered 118-assertion matrix, in both directions;
3. enumerate the **equivalent spellings** of the mutation vocabulary the
   seventeenth closure introduced, plus the equivalent spellings of the
   `@font-face` activation chain it introduced;
4. require an observable Chromium geometry/paint/DOM/request result or a local
   `127.0.0.1` request before counting a candidate as a finding;
5. run the writer and the real route against the **final merged HTML**, not
   against a mutated DOM after an inline script had already executed; and
6. run the source-only typecheck, lint, full unit suite with the coverage gate,
   the standalone build, the Chromium E2E suite and the dependency audit.

No Critical finding was reproduced. The High and the Medium finding below are
independent root causes; equivalent payloads are grouped under the affected
root cause.

The accepted fail-closed false positives in `.ai/RISKS.md` rows 46–66 were
checked in both directions and remain documented. The findings below are not
those accepted cases:

- risk 46/50/62 cover a script that **enumerates** attributes or reads a
  computed **name**; the High finding is on the **mutation** side of the same
  chain, where the mutation itself is invisible, so the script never enters any
  of those lists;
- risk 65 covers a font family the reader cannot resolve and an `@font-face`
  without a readable family; the Medium finding is on a font family that **is**
  readable and an `@font-face` that **is** readable, but that is reached
  through a custom property of a different rule;
- the ordinary script file, the linked script that does not react, the unrelated
  runtime mutation, the unchanged base, the unrelated `Reflect.get`, the
  unrelated dataset key, the unchanged id, the introduced id the runtime does
  not name, the font family without a resource and the ordinary `image-alt` /
  `button-name` fixes all remain writable or harmless as required.

## 4. Reproduced findings

### 4.1 Result matrix

| ID | Severity | Unsafe payloads | Writer result | Chromium / local observable |
|---|---:|---:|---|---|
| 18-H1 | High | 10 spellings, 8 of them with an observable effect | applied, 1 fix, `index.html` write | target fixed at `1280×720`, class `overlay`, `position: fixed`, `z-index: 2147483647`; the patched element deleted; the alternative text emptied |
| 18-M1 | Medium | 2 spellings | applied, 1 fix, `index.html` write | local `GET /evil-font` after the merge, nothing before it |
| 18-L1 | Low | 2 spellings | refused (fail closed) | none — no unsafe effect |

The eighteenth-review matrix ran **39 cases: 12 failed (the open findings) and
27 passed (the closed spellings and the legitimate behaviours)**. The Chromium
proof harness ran **11 cases, all passed** (the harm is proven, not asserted).
The recovered prior matrices ran **209 tests, all passed**, and the recovered
118-assertion matrix reported **pass 118, fail 0**.

### 4.2 18-H1 — the runtime mutation reader still knows only a closed list of spellings (High)

The repository shape was:

```html
<html><head><style>.overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}</style></head><body><img id="target" src="x"><script>document.querySelectorAll('img').forEach(function(img){if(img.getAttribute('alt'))MUTATION})</script></body></html>
```

The ordinary remediation was:

```html
<img id="target" src="x" alt="Photo">
```

**Writer result.** The mutation below the `if` is the only difference between
the cases. The reader sees the `getAttribute('alt')` read, but it never
recognises the mutation, so `runtimeMutations()` returns `mutates: false`, the
script is pushed into **none** of `runtimeMutationScripts`,
`conditionalMutationScripts`, `selectorMutationScripts` and
`genericStateReadMutationScripts`, and every downstream gate that could refuse
the candidate is skipped. The plan applied the fix and wrote `index.html`.

| ID | The mutation the runtime performs | Writer | Chromium on the merged page |
|---|---|---|---|
| 18-H1a | `Element.prototype.setAttribute.call(img,'class','overlay')` | applied, 1 fix, 1 write | image at `x=0, y=0, 1280×720`, `position: fixed`, `z-index: 2147483647` |
| 18-H1b | `Element.prototype.setAttribute.apply(img,['class','overlay'])` | applied, 1 fix, 1 write | image at `x=0, y=0, 1280×720`, `position: fixed`, `z-index: 2147483647` |
| 18-H1c | `Reflect.set(img,'className','overlay')` | applied, 1 fix, 1 write | image at `x=0, y=0, 1280×720`, `position: fixed`, `z-index: 2147483647` |
| 18-H1d | `var set=img.setAttribute.bind(img);set('class','overlay')` | applied, 1 fix, 1 write | image at `x=0, y=0, 1280×720`, `position: fixed`, `z-index: 2147483647` |
| 18-H1m | `var add=img.classList.add.bind(img.classList);add('overlay')` | applied, 1 fix, 1 write | image at `x=0, y=0, 1280×720`, `position: fixed`, `z-index: 2147483647` |
| 18-H1e | `img.remove()` | applied, 1 fix, 1 write | `document.querySelectorAll('img').length` goes from **1** to **0** — the repaired element is deleted |
| 18-H1f | `img.parentNode.removeChild(img)` | applied, 1 fix, 1 write | `document.querySelectorAll('img').length` goes from **1** to **0** — the repaired element is deleted |
| 18-H1j | `document.write('<div class="overlay" style="position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f"></div>')` | applied, 1 fix, 1 write | the written element is painted at `x=0, y=0, 1280×720` — the document is replaced |
| 18-H1h | `img.alt=''` | applied, 1 fix, 1 write | the merged page carries `alt=""`; the same merged file with the repository runtime removed carries `alt="Photo"`. The alternative text the pull request adds is gone at runtime, and axe stops reporting `image-alt` because an empty `alt` marks the image decorative — the automated check can no longer see the loss. |
| 18-H1i | `img.textContent=''` | applied, 1 fix, 1 write | the reader does not see it either; for the tested `<img>` target the effect is inert, so it is reported as a vocabulary gap without an independent proof of harm |

The "before" measurement of every case is the same page without the fix: the
image is at `x=8, y=8, 16×16`, `position: static`, `z-index: auto`. The
remediation is therefore the trigger of every observed effect, exactly as in
the seventeenth review.

**Real-route evidence.** The same repository through the real
`POST /api/github/create-pr` route:

| Case | HTTP | Success | GitHub writes | Pull request | Audit actions |
|---|---:|---|---:|---:|---|
| 18-H1a `Element.prototype.setAttribute.call(img,'class','overlay')` | 200 | true | `index.html` + per-fix Markdown + summary | 1 | `github_pr_intent`, `github_pr_created` |
| 18-C1 the closed spelling `img.classList.add('overlay')` | 400 | false | 0 | 0 | none |

**Shipped-code root cause.** `runtimeMutations()` at `src/lib/github.ts:1025`
recognises:

- the attribute-writing methods of `ATTRIBUTE_WRITING_METHODS`
  (`src/lib/github.ts:938`): `setAttribute`, `setAttributeNS`,
  `removeAttribute`, `removeAttributeNS`, `toggleAttribute`, `setAttributeNode`,
  `removeAttributeNode`;
- the `classList` writing methods (`:950`), the `style` writing methods (`:953`);
- the element mutation methods of `ELEMENT_MUTATION_METHODS` (`:956`):
  `after`, `append`, `appendChild`, `before`, `insertAdjacentElement`,
  `insertAdjacentHTML`, `insertBefore`, `prepend`, `replaceChildren`,
  `replaceChild`, `replaceWith`;
- `Object.assign(object, …)`;
- the attribute-value assignment `element.attributes.<name>.value = …`;
- the `className = …`, `style = …`, `style.<property> = …`, `outerHTML = …` and
  `innerHTML = …` assignments.

Everything else is invisible, and four concrete gaps follow from that:

1. **No `.call` / `.apply` unwrapping on the write side.** The **read** side
   unwraps them (`attributeReadCalls`, `src/lib/github.ts:649`:
   `if (method.name !== null && (method.name === 'call' || method.name === 'apply') …)`),
   so `Element.prototype.getAttribute.call(img,'alt')` is read as a read
   (16-H3b, shipped regression). The **write** side has no equivalent, so
   `Element.prototype.setAttribute.call(img,'class','overlay')` ends in the
   member `call`, whose receiver is `setAttribute` — neither is in any set, and
   the call is not a mutation the reader can follow. The asymmetry between the
   read side and the write side of the same chain is the defect.
2. **No element removal.** `remove()` and `removeChild()` are not in
   `ELEMENT_MUTATION_METHODS`, although `replaceChild()` and `replaceWith()`
   are. A runtime that deletes the patched element is invisible.
3. **No IDL attribute / dataset property writes.** `img.alt = ''`,
   `img.id = '…'`, `img.src = '…'` and `img.dataset.state = 'on'` are property
   assignments; the reader only knows the `attributes.<name>.value` spelling.
4. **No alias and no reflective write.** A method that is bound and stored in a
   variable (`var set = img.setAttribute.bind(img); set('class','overlay')`) has
   no member chain the reader can follow, and `Reflect.set(obj, name, value)` is
   not modelled at all — although the **read** side models `Reflect.get` and
   `Reflect.getOwnPropertyDescriptor` (16-H2).

`document.write()` is a fifth gap of the same class: it is a document-level
write that the reader does not model, and it is not caught by
`RUNTIME_STYLE_PATTERN` either, because that pattern only recognises a style
element or a style property.

Because `runtimeMutations()` returns `mutates: false` for all of these, the
script never reaches the gates that the seventeenth closure installed
(`src/lib/github.ts:2023-2131`): the patched-element-id check (`:2038`), the
introduced-id check (`:2066`), the introduced-element selector check (`:2080`),
the added-attribute check (`:2098`) and the introduced-attribute check
(`:2110`). The destination analyser cannot compensate either: the repository
rule that takes the page over is selected by a **class** the runtime adds at run
time, not by an attribute or a class the fix adds, so no rule is "activated by
the fix" and `destinationCssHarm()` returns `null`.

### 4.3 18-M1 — the activated custom property of a different rule activates a font resource (Medium)

The exact repository and remediation were:

```html
<html><head><style>@font-face{font-family:Evil;src:url(/evil-font)} [aria-label]{--f:Evil} button{font-family:var(--f)}</style></head><body><button id="target">Save</button></body></html>
```

```html
<button id="target" aria-label="Save">Save</button>
```

and the shorthand twin:

```html
<html><head><style>@font-face{font-family:Evil;src:url(/evil-font)} [aria-label]{--f:16px Evil} button{font:var(--f)}</style></head><body><button id="target">Save</button></body></html>
```

**Observed result.** Both candidates passed validation and destination
analysis, applied one fix and wrote `index.html`. The local `127.0.0.1`
listener received **no** request before the merge and **`GET /evil-font`** after
it. Before the merge the `--f` custom property is not defined on the button
(the `[aria-label]` rule does not match), so `font-family: var(--f)` is invalid
at computed-value time and no face is selected; after the merge the rule
matches, `--f` resolves to `Evil`, and the `@font-face` of that family loads
its resource in the customer browser — a request the isolated verification
browser blocks and never sees.

**Shipped-code root cause.** The font-resource check of the seventeenth closure
runs **inside the activated-rule loop** of `destinationCssHarm()`
(`src/lib/css-context.ts:3954-4022`): for every rule the fix activates, the
analyser looks at that rule's own declarations and, for a `font-family` or a
`font` declaration, resolves the family against the face table
(`fontFamilyResourceState`, `src/lib/css-context.ts:1640`) and against the face
table's completeness flag (`fontFacesComplete`, set by `collectFontFace()` at
`src/lib/css-context.ts:525`). The activated rule of the reproduction declares
`--f: Evil` — a custom property, not a `font-family` — so the loop skips it
(`if (declaration.property !== 'font-family' && declaration.property !== 'font') continue;`,
`src/lib/css-context.ts:3999`). The rule that **consumes** the property
(`button{font-family:var(--f)}`) is not activated by the fix (it already
matched), so it is never examined. `font-family` is not a member of
`RELEVANT_PROPERTIES` (`src/lib/css-context.ts:1954`), so the effective-style
path does not pick it up either.

The custom-property indirection is exactly the shape the eleventh review closed
for a *resource* (`[aria-label]{background-image:var(--pixel)}` with
`:root{--pixel:url(…)}`, 11-M2): that closure resolves the `var()` references
of a declaration against the definitions that can reach the element. It does
**not** follow a custom property from the activated rule into a *different*
rule that consumes it, and the font path re-introduces the gap.

The seventeenth-review closure of the duplicate `font-family` descriptor
(17-M1) and of the duplicate `src` descriptor (16-M3) was verified as closed
and stays closed (see section 5).

### 4.4 18-L1 — an unrelated computed method call refuses every fix of the repository (Low)

A repository whose script contains an unrelated computed call — `fns[0]()` or
`fns[i]()` — is refused every fix:

```js
var fns = [function () {}];
var i = 0;
fns[i]();
```

`calleeMembers()` (`src/lib/github.ts:550`) resolves a computed member only
when its content is a string literal, so `fns[0]` and `fns[i]` both resolve to
`null`; `runtimeMutations()` then treats the call as a mutation with an
unreadable name (`mutates = true; dynamic = true;`,
`src/lib/github.ts:1037-1043`) and the script enters
`genericStateReadMutationScripts`, which refuses every candidate whose fix adds
an attribute (`src/lib/github.ts:2101`, `:2116`). The effect is a **fail-closed
false positive**: the repository receives review suggestions instead of source
patches. It is not a security defect — it cannot produce an unsafe write — but
it is a new boundary that the accepted-risk list does not yet carry. The
readable twin `fns['0']()` stays writable, and the equivalent *mutation*
spelling `img['set'+'Attribute']('class','overlay')` is correctly refused.

## 5. Closure verification of the seventeenth review

The seventeenth review returned **NOT READY — Critical 0, High 1, Medium 1**
and required (a) every High reproduction blocked in the unsafe direction, (b)
permanent regressions for both root causes and (c) a fresh independent review.

| Seventeenth-review criterion | Result | Evidence |
|---|---|---|
| 17-H1a `img.setAttributeNS(null,'class','overlay')` blocked | **CLOSED** | refused, 0 fixes, 0 writes (`18-C1c`) |
| 17-H1b `img.style = 'position:fixed;…'` blocked | **CLOSED** | refused, 0 fixes, 0 writes (`18-C1f`) |
| 17-H1c `img.className += ' overlay'` blocked | **CLOSED** | refused, 0 fixes, 0 writes (`18-C1n`) |
| 17-H1d `img.attributes.class.value = 'overlay'` blocked | **CLOSED** | refused, 0 fixes, 0 writes (`18-C1j`) |
| 17-H1e `img.outerHTML = '<span class="overlay"></span>'` blocked | **CLOSED** | refused, 0 fixes, 0 writes (`18-C1h`) |
| 17-H1f `Object.assign(img.style,{…})` blocked | **CLOSED** | refused, 0 fixes, 0 writes (`18-C1i`) |
| 17-H1g the literal `img.setAttribute('class','overlay')` blocked | **CLOSED** | refused, 0 fixes, 0 writes (`18-C1b`, `18-H1k`) |
| 17-M1 the duplicate `font-family` descriptor | **CLOSED** | refused, 0 fixes, 0 writes (`18-M-a`) |
| 16-M2 the activated font shorthand | **CLOSED** | refused, 0 fixes, 0 writes (`18-M-c`) |
| 16-M3 the duplicate `src` descriptor | **CLOSED** | refused, 0 fixes, 0 writes (`18-M-b`) |
| 15-M3 an activated font family with a resource | **CLOSED** | refused, 0 fixes, 0 writes (`15-M3`, recovered matrix) |
| 15-M3b a font family without a resource stays writable | **CLOSED** | applied, 1 fix, 1 write (`18-M-c1`) |
| The unrelated twins stay writable | **CLOSED** | applied, 1 fix, 1 write (`18-C2a`, `18-C2b`, `18-C2c`, `18-M-c2`) |
| The 10th–16th review closures still hold | **CLOSED** | 209 recovered assertions, all passed |
| The 4th–10th review 118-assertion matrix still holds | **CLOSED** | pass 118, fail 0 |
| The seventeenth review's own High root cause | **NOT CLOSED** | 10 equivalent spellings reach the repository (18-H1) |

## 6. Legitimate behaviours re-checked

| Behaviour | Result |
|---|---|
| The ordinary `image-alt` fix in a repository without a script | PASS — applied, 1 fix, 1 write |
| The ordinary `button-name` fix in a repository without a script | PASS — applied, 1 fix, 1 write |
| An unrelated runtime mutation (`document.querySelectorAll('a').forEach(a => a.classList.add('overlay'))`) | PASS — applied, 1 fix, 1 write |
| An ordinary repository script (`console.log('hello')`) | PASS — applied, 1 fix, 1 write |
| A runtime that reads an unrelated attribute (`img.getAttribute('src')`) | PASS — applied, 1 fix, 1 write |
| A readable computed method name (`fns['0']()`) | PASS — applied, 1 fix, 1 write |
| A font family without a resource (`@font-face{font-family:Local;src:local("Arial")}`) | PASS — applied, 1 fix, 1 write |
| A face whose family the reader cannot read (`font-family:var(--f)`) | PASS — refused (fail closed) |
| A face whose family is a list (`font-family:Evil, Other`) | PASS — refused (fail closed) |
| The face in an imported stylesheet (`@import "faces.css"`) | PASS — refused, 0 fixes, 0 writes |
| The closed mutation spellings (14 variants) | PASS — all refused, 0 fixes, 0 writes |
| The recovered tenth–sixteenth review matrices and the route harnesses | PASS — 209 assertions |
| The recovered 118-assertion matrix | PASS — 118/118 |

## 7. Gate-suite evidence

All six commands were run on the reviewed tree after every temporary harness
had been removed, so the shipped suites ran exactly as they ship.

| Gate | Command | Exit code | Evidence |
|---|---:|---:|---|
| Source-only typecheck | `npx tsc -p tsconfig.check.json --noEmit` | **0** | no diagnostics |
| Lint | `npm run lint` | **0** | `eslint .` reported no error and no warning |
| Unit suite + coverage gate | `npx vitest run --coverage` | **0** | 53 test files, **987 tests passed**, 0 failed; coverage 70.4 % statements / 63.13 % branches / 73.41 % functions / 72.53 % lines against the 55 / 50 / 58 / 57 thresholds |
| Standalone build | `npm run build` | **0** | Next.js 16.4.6, compiled in 6.5 s, TypeScript in 9.3 s, **116 static pages** generated, the `public` and `.next/static` copy step completed |
| Chromium E2E | `npx playwright test --project=chromium` | **0** | **79 passed** (3.8 min), 0 failed, 0 skipped |
| Dependency audit | `npm audit --audit-level=high` | **0** | **0 high / 0 critical**; 15 moderate advisories remain, all in the development tooling chain (`vitest` / `@vitest/mocker`, `fast-copy`, `glob` / `minimatch` through `@sentry/nextjs` and the ESLint parser) — none in the shipped runtime path |

The Playwright run started its own dev server on `127.0.0.1:3000` (no server
was listening before the run) and stopped it afterwards; no second server was
started and no server was left running.

## 8. Required closure criteria

The tree is releasable only when all of the following hold:

1. **18-H1 — the mutation vocabulary must be closed by construction, not by
   list.** Either the reader must model the equivalent spellings
   (`.call` / `.apply` on a mutation method, `Reflect.set`, a bound or stored
   method, `remove()` / `removeChild()`, the IDL attribute and `dataset`
   property assignments and `document.write()`), or — the direction this
   codebase already accepts for every other unknown runtime shape — a script
   whose mutation the reader cannot follow must **fail closed** into the
   generic-state-read list instead of being treated as a script that does not
   mutate. Every one of the ten spellings of section 4.2 must be refused with
   0 fixes and 0 writes, and the shipped regressions must cover the
   `.call`/`.apply` unwrap explicitly, because the read side already has one.
2. **18-M1 — the font activation must follow the custom property across
   rules.** The activated custom properties of the element must resolve the
   `font-family` / `font` declarations of the rules that consume them, or a
   family that is only reachable through a custom property must be treated as
   unprovable. Both spellings of section 4.3 must be refused with 0 fixes and
   0 writes, and the customer-side request must be proven absent by a local
   listener after the merge.
3. **18-L1 — the computed-call false positive must be documented** as an
   accepted fail-closed risk (the readable twin stays writable), or narrowed.
4. Permanent regressions must cover every reproduction of this review in the
   shipped test files, the closure must be recorded under the volume chain
   (`docs/VOLUMES.md`), and a **fresh independent review must return READY**.

## 9. Scope statement and limits of this review

- This review is **report only**. No shipped source, test, dependency, CI
  configuration, environment value or existing `.ai/` file was changed; the
  only file this review wrote is `.ai/SECURITY-REVIEW-18.md`. Every temporary
  harness was deleted before the gate suite ran, and `git status` shows no
  modification of any shipped file (only the pre-existing untracked
  `.playwright-mcp/` directory of the parent session).
- **No Strix result is claimed.** Strix was not available and was not run;
  every finding here is a locally reproduced proof, not an agent report.
- Only Chromium was used. Safari, Firefox and WebKit were not exercised, and
  no result is claimed for them.
- The evidence boundary is the V23 verified-fix / GitHub-writer chain and its
  route. The rest of the product (authentication, session handling, CSRF, XSS,
  SQL injection, SSRF, command injection, uploads, rate limits, secret
  handling, CORS, headers, cookies, OAuth, RBAC, tenant isolation and the
  audit trail outside the create-PR path) was not re-audited in this cycle;
  the seventeenth review and the earlier cycles cover those areas and this
  review did not find a reason to reopen them.
- The repository was never mutated: every GitHub write went to a mocked
  Octokit transport, and every listener bound to `127.0.0.1`.
