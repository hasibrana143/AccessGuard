# AccessGuard — Nineteenth Independent Security Review

Date: 2026-11-27

## 1. Verdict

**NOT READY — Critical 0, High 3, Medium 2, Low 2.**

The release gate in `.ai/SECURITY-STATUS.md` opens only at **Critical 0 and
High 0**. The nineteenth review reproduced **three independent High root
causes** and **two independent Medium root causes** in the shipped V23 tree,
plus **two new fail-closed false positives** that the eighteenth closure
introduced. The eighteenth-review closure is therefore **not complete by
construction**: the writer now decides by *reach and effect* instead of by a
closed list of spellings, but the model still loses the effect at three
statically resolvable places, and the destination analyser still resolves the
activated custom-property chain one level deep and without the cascade.

The three High root causes are independent of each other and of the
eighteenth review's own root causes:

1. **19-H1 — the read side of the reach model is still a closed list of five
   method names.** `isAttributeReadMethod()` knows `hasAttribute`,
   `getAttribute`, `getAttributeNode`, `toggleAttribute` and `getNamedItem`
   and **not** `getAttributeNS`. A repository script that reads the attribute
   the fix adds through `getAttributeNS` and then writes is invisible to
   `scriptReadsFixAttribute()`, so `scriptReactsToFix()` never fires and the
   fix is written. Chromium measured a **1280×720 fixed takeover**
   (`z-index: 2147483647`) and the deletion of the repaired element; the real
   create-PR route returned **HTTP 200**, wrote `index.html`, created a branch
   and a pull request and wrote both audit events.
2. **19-H2 — the `Reflect.apply` branch of `scriptWrites()` drops the effect of
   the write.** It records the write as an element write but with
   `property: null`, `attribute: null`, `attributeMethod: false` and
   `destroys: false`, so neither the neutralisation by name nor the
   destruction by reach can see it. `Reflect.apply(Element.prototype.removeAttribute, img, ['alt'])`
   and its direct twin `img.removeAttribute('alt')` — the second is refused —
   both reach the customer repository.
3. **19-H3 — the destruction reach is compared with the patched element only,
   never with its ancestors.** `reachMayInclude()` matches the reach against
   the patched element's own tag, id and classes, so a script that removes the
   **container** of the patched element is judged harmless while the script
   that removes the patched element itself is refused.

The two Medium root causes are the two ways in which the activated
custom-property chain is still resolved per rule instead of as a chain:

4. **19-M1 — the chain is not transitive.** A property that an *activated* rule
   defines and a **second** property in the *consuming* rule references
   (`--a` → `--b` → `font-family`) is not followed, because the consumption
   filter only knows the properties the activated rules define.
5. **19-M2 — the cascade winner of the property is not computed.** The
   analyser lets the consuming rule's own definition override the activated
   rule's definition without comparing specificity or source order, so a
   repository whose `[aria-label]` rule is the more specific one still
   activates a customer-side font download.

In both Medium cases the local `127.0.0.1` listener received **no** request
before the merge and **`GET /evil-font`** after it, and Chromium computed
`font-family: Evil` on the patched control.

The two Low findings are **fail-closed** false positives that the eighteenth
closure introduced (they were writable on the pre-closure tree `24db2a1`): a
script that merely iterates over an element collection and reads the added
attribute now refuses every fix of the repository (19-L1), and a repository
whose later rule overrides the font family now refuses a fix the browser would
have applied safely (19-L2).

This tree is not releasable until every High reproduction is blocked in the
unsafe direction, permanent regressions cover all five root causes, and a
fresh independent review returns READY.

This is the nineteenth-review security artifact. The existing
`.ai/SECURITY-STATUS.md` and every other existing `.ai/` file were
intentionally **not** changed by this review, as the review contract requires;
the line that records the nineteenth review as *PENDING* in
`.ai/SECURITY-STATUS.md` is therefore still open and has to be closed by the
release workflow, not by this artifact.

## 2. Reviewed tree and boundary

| Item | Value |
|---|---|
| Reviewed closure tree | `b16dafd` (`vol: security — V23: close the eighteenth-review findings at their root cause`) |
| Current checkout at report time | `88afebdfa05d87f2b48782dc9586a915dcf662fa` (`vol: state — V23: correct the eighteenth-review regression count and record the head runs`) |
| Current `origin/main` | `88afebdfa05d87f2b48782dc9586a915dcf662fa` |
| Branch | `main`; the working tree carries no modification of any shipped source file |
| Closure-to-checkout identity | `git diff --quiet b16dafd..HEAD -- src` exits **0** — the reviewed code is exactly the `b16dafd` code. `git diff --name-only b16dafd..HEAD` lists only `.ai/DECISIONS.md`, `.ai/DEPLOYMENT.md`, `.ai/FINAL-REPORT.md`, `.ai/RISKS.md`, `.ai/SECURITY-STATUS.md`, `.ai/STATE.md`, `.ai/TASKS.md`, `.ai/TEST-STATUS.md`, `docs/VOLUMES.md`, `docs/ai/FIX_VERIFICATION.md` and `docs/ai/VALIDATION_ENGINE.md`. **No `src/` file and no dependency changed.** |
| Review scope | `src/lib/github.ts` (repository runtime reader and writer), `src/lib/css-context.ts` (destination CSS/font analyser), `src/lib/github-pr.ts` (remediation validator and patcher), `src/lib/ast-patch.ts` (element locator and patcher), `src/lib/fix-verification.ts` (verification browser) and `src/app/api/github/create-pr/route.ts` (create-PR route and audit flow) |
| Documents read first | `.ai/SECURITY-REVIEW-18.md`, `.ai/SECURITY-REVIEW-17.md`, `.ai/SECURITY-REVIEW-16.md`, `.ai/SECURITY-STATUS.md`, `docs/ai/FIX_VERIFICATION.md` §10–11, `docs/ai/VALIDATION_ENGINE.md`, `docs/development/CODING_STANDARDS.md`, root `AGENTS.md` |
| Reviewer changes | Report only. No shipped source, permanent test, dependency, lockfile, CI configuration, environment value, schema or existing `.ai/` file was changed. No commit, push, deployment, database migration or secret change was performed. The only file this review wrote is `.ai/SECURITY-REVIEW-19.md`. |

Every reproduction used a local synthetic repository, a mocked GitHub/Octokit
transport (`vi.mock('@octokit/rest')`, mirroring the shipped
`src/lib/__tests__/github.test.ts` pattern), local Playwright Chromium, and
listeners bound only to `127.0.0.1`. No production, public, customer or
third-party target was scanned. No live repository was mutated. The npm
advisory registry was used only for `npm audit`; it was not a test target. No
`.env` value was inspected or printed, and no secret was modified.

**Strix/self-scan status:** skipped. **No Strix result, finding, confidence or
pass is claimed.** Chromium was the only browser engine; no Safari, Firefox or
WebKit result is claimed.

## 3. Threat model and method

The review tests the V23 verified-fix/GitHub-writer chain: an accessibility
remediation is generated for customer-owned source, validated, verified with
axe-core in an isolated Chromium document, and then written into a connected
customer repository. The boundary is not only "does axe stop firing?". A
remediation must also preserve the customer's content, navigation, network
behaviour, focus behaviour, semantics, accessibility-tree presence and
rendering after the **repository's own CSS** and the **repository's own runtime
code** are combined with the generated fix.

The unsafe direction for every case below is strict:

- the unsafe remediation must fail validation (`validation: false`) or produce
  a non-null destination-harm reason;
- it must not be reported as verified/applied;
- it must be **refused** (`refusedFixIds`), not silently applied and not sent
  to human review;
- it must apply **0 fixes**; and
- it must perform **0 repository writes**.

The main question of this cycle was whether the eighteenth-review closure is
complete **by construction** — that is, whether the writer's decision is a
function of the *reach* and the *effect* of a runtime, so that every
statically resolvable spelling of the same reach and effect gets the same
verdict, instead of a list of spellings that happens to be long.

The method was:

1. establish the requested baseline, the reviewed closure tree and the current
   source identity (`git diff --quiet b16dafd..HEAD -- src` → 0);
2. re-run the recovered closure matrices of the tenth through the sixteenth
   reviews, the seventeenth and the eighteenth reviews, in the unsafe
   direction, through the real `planRepositoryFixes()` /
   `applyRepositoryFixPlan()` pair and the real
   `destinationCssHarm()` / `buildCssContext()` pair;
3. enumerate the **equivalent spellings** of the read, write and destruction
   vocabulary the eighteenth closure introduced, and the equivalent shapes of
   the custom-property activation chain it introduced;
4. for every candidate, measure the **observable Chromium behaviour** of the
   merged file (element geometry, `position`, `z-index`, element count,
   attribute values, computed `font-family`, and the requests a `127.0.0.1`
   listener received) **before** and **after** the merge, and write the
   **direct twin** of every candidate so that the finding is a *differential*
   and not a boundary choice;
5. drive the **real** `POST /api/github/create-pr` route with the real planner
   and a mocked GitHub transport for one representative harmful case and one
   refused control;
6. compare the shipped tree with the pre-closure tree `24db2a1` (a detached
   throwaway worktree) to tell a **persistent gap** from a **new regression**;
7. run the source-only typecheck, lint, the full unit suite with the coverage
   gate, the standalone build, the Chromium E2E suite and the dependency audit
   **after every temporary harness had been deleted**.

No Critical finding was reproduced. The High findings are independent root
causes; equivalent payloads are grouped under the affected root cause.

## 4. Reproduced findings

### 4.1 Result matrix

| ID | Severity | Unsafe payloads | Writer result | Chromium / local observable |
|---|---:|---:|---|---|
| 19-H1 | **High** | 4 spellings (`getAttributeNS` read + write) | applied, 1 fix, `index.html` write | target fixed at `1280×720`, class `overlay`, `position: fixed`, `z-index: 2147483647`; the patched element deleted (1 → 0 images) |
| 19-H2 | **High** | 4 spellings (`Reflect.apply` of an attribute writer / a remover) | applied, 1 fix, `index.html` write | the added `alt` removed (`alt=null`) or emptied (`alt=""`); the patched element deleted (1 → 0 images) |
| 19-H3 | **High** | 3 spellings (removal of an ancestor of the patched element) | applied, 1 fix, `index.html` write | the patched element deleted with its container (1 → 0 images) |
| 19-M1 | **Medium** | 1 spelling (second level of the custom-property chain) | applied, 1 fix, `index.html` write | computed `font-family: Evil` and local `GET /evil-font` after the merge, nothing before it |
| 19-M2 | **Medium** | 1 spelling (the cascade winner of the property) | applied, 1 fix, `index.html` write | computed `font-family: Evil` and local `GET /evil-font` after the merge, nothing before it |
| 19-L1 | **Low** | 4 benign scripts | refused (fail closed) | none — no unsafe effect |
| 19-L2 | **Low** | 1 benign stylesheet | refused (fail closed) | none — the browser uses `Local` and requests nothing |

**Matrix numbers.** The nineteenth-review matrix ran **67 cases: 19 failed (the
open findings plus one boundary observation) and 48 passed** — 12 eighteenth-review
spellings re-run, 26 new candidates, 17 benign scripts and 12 custom-property
cases. The control-twin matrix ran **10 cases: 5 written, 5 refused**. The
recovered prior matrix ran **49 cases: 49 refused, 0 written, 0 writes**. The
Chromium proof harness measured **24 distinct cases** (32 page loads across the
before / after-fix / after variants). The real-route harness ran **4 cases**.

The one mismatch that is **not** a finding is `N23` (the unconditional
`Reflect.apply(Element.prototype.setAttribute, img, ['class','overlay'])`):
its direct twin `N27` (`img.setAttribute('class','overlay')`) is written as
well, and Chromium shows the takeover in **both** variants, with and without
the fix. The takeover is therefore the customer's own unconditional runtime
behaviour, not an effect the remediation creates — the same boundary the
model already draws. It is recorded in section 4.9 so that the next closure
does not "fix" it by accident.

### 4.2 19-H1 — the read side of the reach model is still a closed list of five method names (High)

The repository shape was:

```html
<html><head><style>.overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}</style></head><body><img id="target" src="x"><script>document.querySelectorAll('img').forEach(function(img){if(img.getAttributeNS(null,'alt'))MUTATION})</script></body></html>
```

The ordinary remediation was:

```html
<img id="target" src="x" alt="Photo">
```

**Writer result.** The mutation below the `if` is the only difference between
the cases. The reader sees the `getAttributeNS` call, but
`isAttributeReadMethod()` does not know the name, so `attributeReadCalls()`
returns nothing for it, `scriptReadsFixAttribute()` is false,
`scriptReactsToFix()` returns false and the "runtime reacts to the fix" gate
is skipped. The plan applied the fix and wrote `index.html`.

| ID | The mutation the runtime performs | Writer | Chromium on the merged page (before → after) |
|---|---|---|---|
| 19-H1a (`N1`) | `Element.prototype.setAttribute.call(img,'class','overlay')` | applied, 1 fix, 1 write | `16×16`, `position: static`, `z-index: auto`, class `null` → `class="overlay"`, `1280×720` at `0,0`, `position: fixed`, `z-index: 2147483647` |
| 19-H1b (`N20`) | `img.classList.add('overlay')` | applied, 1 fix, 1 write | `16×16`, `position: static`, class `null` → `class="overlay"`, `1280×720` at `0,0`, `position: fixed`, `z-index: 2147483647` |
| 19-H1c (`N2`) | `Reflect.apply(Element.prototype.setAttribute,img,['class','overlay'])` | applied, 1 fix, 1 write | `16×16`, `position: static`, class `null` → `class="overlay"`, `1280×720` at `0,0`, `position: fixed`, `z-index: 2147483647` |
| 19-H1d (`N3`) | `Reflect.apply(Element.prototype.remove,img,[])` | applied, 1 fix, 1 write | `1` image, `alt="Photo"` → `0` images, the patched element deleted |

**The differential control.** `N24` is the same script with the read spelled
`img.getAttribute('alt')` instead of `img.getAttributeNS(null,'alt')` and the
same `Reflect.apply` write: it is **refused** (0 fixes, 0 writes). The trigger
is therefore the **read**, not the write — the write side already recognises
`Reflect.apply` as an element write, and the reach/effect gate fires as soon
as the read is seen.

**Real-route evidence.** The same repository through the real
`POST /api/github/create-pr` route (real planner, mocked Octokit transport):

| Case | HTTP | Success | GitHub writes | Branch | Pull request | Audit actions |
|---|---:|---|---:|---:|---:|---|
| `route-N20` (`getAttributeNS` + `classList.add`) | 200 | true | `index.html` + 2 artifacts | 1 | 1 | `github_pr_intent`, `github_pr_created` |
| `route-N2` (`getAttributeNS` + `Reflect.apply(setAttribute)`) | 200 | true | `index.html` + 2 artifacts | 1 | 1 | `github_pr_intent`, `github_pr_created` |
| `route-N8` (the ancestor removal of 19-H3) | 200 | true | `index.html` + 2 artifacts | 1 | 1 | `github_pr_intent`, `github_pr_created` |
| `route-R1l` (the closed spelling `img.classList.add`) | 400 | false | 0 | 0 | 0 | none (`skippedRefused: 1`) |

**Shipped-code root cause.** `isAttributeReadMethod()` in
`src/lib/github.ts:543-552` answers "is this method an attribute read?" with
a **closed list of five names**:

```ts
lower === 'hasattribute' || lower === 'getattribute' ||
lower === 'getattributenode' || lower === 'toggleattribute' ||
lower === 'getnameditem'
```

`getAttributeNS` is not among them, and `attributeReadCalls()`
(`src/lib/github.ts:651-686`) — which already unwraps `.call` / `.apply` on
the read side at `:663-672` — therefore drops the call at `:679`
(`if (!isAttributeReadMethod(method.name)) continue;`). The read never
reaches `scriptReadsFixAttribute()` (`src/lib/github.ts:1802-1812`), so
`scriptReactsToFix()` (`:1821-1824`) is false and the planner gate at
`src/lib/github.ts:2917-2930` never refuses the candidate.

The read side is the **inverse image** the eighteenth closure promised to
build for the write side (`docs/ai/FIX_VERIFICATION.md` §11.1: *"Only the
reads are a list"*). The list was moved, not closed: the write side now
answers a structural question, but the read side is still a list of five
spellings, and `getAttributeNS` is the sixth spelling of the same read.

**Closure criterion violated:** §8.1 of the eighteenth review — *"the mutation
vocabulary must be closed by construction, not by list"*. The vocabulary was
closed for the write side and left open on the read side.

### 4.3 19-H2 — the `Reflect.apply` branch drops the effect of the write (High)

The repository shape was the same, but the script performs its write
**unconditionally**, so that the differential against the direct spelling is
unambiguous:

```html
<html><head><style>.overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}</style></head><body><img id="target" src="x"><script>document.querySelectorAll('img').forEach(function(img){Reflect.apply(Element.prototype.METHOD,img,[ARGS])})</script></body></html>
```

**Writer result and the direct twins.** Every `Reflect.apply` spelling is
written; every direct twin is refused:

| ID | The runtime performs | Writer | Direct twin | Writer | Chromium on the merged page (before → after) |
|---|---|---|---|---|---|
| 19-H2a (`N4`) | `Reflect.apply(Element.prototype.removeAttribute,img,['alt'])` | **written**, 1 fix, 1 write | `N28` `img.removeAttribute('alt')` | **refused**, 0 fixes, 0 writes | `alt="Photo"` → `alt=null`; the image is back to `16×16` |
| 19-H2b (`N5`) | `Reflect.apply(Element.prototype.setAttribute,img,['alt',''])` | **written**, 1 fix, 1 write | `N30` `img.setAttribute('alt','')` | **refused**, 0 fixes, 0 writes | `alt="Photo"` → `alt=""`; the image collapses to `0×0` |
| 19-H2c (`N6`) | `Reflect.apply(Element.prototype.setAttributeNS,img,[null,'alt',''])` | **written**, 1 fix, 1 write | `N30` (same effect) | **refused** | `alt="Photo"` → `alt=""` |
| 19-H2d (`N7`) | `Reflect.apply(Element.prototype.remove,img,[])` | **written**, 1 fix, 1 write | `N29` `img.remove()` | **refused**, 0 fixes, 0 writes | `1` image with `alt="Photo"` → `0` images, the patched element deleted |

The empty `alt` of 19-H2b/19-H2c is the loss the eighteenth review already
documented for `img.alt=''` (18-H1h): an empty `alt` marks the image
decorative, so **axe stops reporting `image-alt`** and the automated check can
no longer see that the alternative text the pull request adds is gone.

**Shipped-code root cause.** The reflective branch of `scriptWrites()` in
`src/lib/github.ts:1695-1715` resolves the target and the reach, and then
records:

```ts
const property = methodName === 'set' && args[1] ? resolveStringExpression(args[1].trim()) : null;
writes.push({
  property,                                    // null for `Reflect.apply`
  attribute: property === null ? null : attributeOfProperty(property),
  attributeMethod: false,                      // never true
  element: true,
  reach: object.reach,
  destroys: false,                             // never true
  ...
});
```

The **called method name and its arguments are dropped**. Three consequences
follow, and each one is a promise the shipped documentation makes:

1. `scriptNeutralisesFix()` (`src/lib/github.ts:1851-1895`) can only neutralise
   a write of the attribute the fix adds when the write is an **attribute
   method** (`:1871-1876`) or carries a resolved attribute (`:1877`). The
   reflective write carries neither, so the attribute the fix adds (`alt`) is
   invisible to it — although the *direct* spelling of the same write is
   refused.
2. The fail-closed rule of `docs/ai/FIX_VERIFICATION.md` §11.2 — *"a write
   whose name the analyser cannot read may be the attribute the fix adds, so it
   fails closed"* — **does not fire**, because `attributeMethod` is `false`
   rather than "unreadable": the reflective write is treated as a write of
   *nothing in particular* instead of a write of an unknown name.
3. `destroys: false` means `Reflect.apply(Element.prototype.remove, img, [])`
   is not a destruction, so the destruction branch of `scriptNeutralisesFix()`
   (`:1866`, with `DESTROYING_METHODS` at `:1171`) never sees it.

`Reflect.set` is handled differently — its property is resolved — which is why
`Reflect.set(img,'alt','')` is refused (`N18`) while `Reflect.apply` is not.
The branch is therefore asymmetric inside itself.

**Closure criterion violated:** §8.1 of the eighteenth review — the effect of a
write must be judged by reach and effect, not by a spelling. Here the
*spelling* `Reflect.apply` decides the effect, and the effect is lost.

### 4.4 19-H3 — the destruction reach is compared with the patched element only (High)

The repository shape put the patched image **inside a container**:

```html
<html><head><style>.overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}</style></head><body><div class="card"><img id="target" src="x"></div><script>document.querySelectorAll('.card').forEach(function(card){card.remove()})</script></body></html>
```

**Writer result and the direct twin.**

| ID | The runtime performs | Writer | Chromium on the merged page (before → after) |
|---|---|---|---|
| 19-H3a (`N8`) | `document.querySelectorAll('.card').forEach(card=>card.remove())` | **written**, 1 fix, 1 write | without the repository runtime the merged file shows `1` image with `alt="Photo"`; with the runtime the patched element is **gone** (`0` images) |
| 19-H3b (`N9`) | `document.querySelectorAll('div').forEach(box=>box.remove())` | **written**, 1 fix, 1 write | the patched element is **gone** (`0` images) |
| 19-H3c (`N11`) | `document.querySelector('.card').remove()` | **written**, 1 fix, 1 write | the patched element is **gone** (`0` images) |
| control (`N31`) | `document.querySelectorAll('img').forEach(img=>img.remove())` — same body | **refused**, 0 fixes, 0 writes | — |

The direct twin is decisive: with the **same** repository body, removing the
image itself is refused and removing its container is written.

**Shipped-code root cause.** The destruction is decided by
`reachMayInclude()` (`src/lib/github.ts:1827-1841`), which compares the reach
of the write with the **patched element**:

```ts
if (reach.ids.size > 0 && !(element.id !== null && reach.ids.has(element.id))) return false;
if (reach.classes.size > 0 && ![...reach.classes].some(name => element.classes.has(name))) return false;
if (reach.tags.size > 0 && !reach.tags.has(element.tag.toLowerCase())) return false;
```

The patched element is `<img id="target">` — it has **no class**, so a reach of
`{classes: {'card'}}` does not match it and the destruction is not recognised.
The model compares the reach with the patched element's **own** tag, id and
classes; it never evaluates the DOM relation "the patched element is a
descendant of the node this write reaches". `scriptNeutralisesFix()` calls it
at `:1866` (`write.destroys && reachMayInclude(write.reach, patched)`) and the
result is `false`, so the candidate is written.

The same reason explains why the harmless twin of this family stays writable:
`document.querySelectorAll('p').forEach(p=>p.remove())` (`B7`) reaches no
ancestor of the patched image and is written, and the direct removal of the
image is refused — the model draws the right line, but it draws it around the
patched element only.

**Closure criterion violated:** §8.1 of the eighteenth review — the
destruction must be decided by **reach**. A reach that names an ancestor
reaches the patched element, and the model cannot say so.

### 4.5 19-M1 — the activated custom-property chain is not transitive (Medium)

The exact repository and remediation were:

```html
<html><head><style>@font-face{font-family:Evil;src:url(/evil-font)} [aria-label]{--a:Evil} button{--b:var(--a);font-family:var(--b)}</style></head><body><button id="target">Save</button></body></html>
```

```html
<button id="target" aria-label="Save">Save</button>
```

**Observed result.** The candidate passed validation and destination
analysis, applied one fix and wrote `index.html`. Before the merge the button
computes `font-family: "Times New Roman"` and the local `127.0.0.1` listener
received **no** request. After the merge the button computes
`font-family: Evil` and the listener received **`GET /evil-font`**: the fix
activates `[aria-label]`, `--a` becomes `Evil`, `--b` resolves to `var(--a)`,
`font-family: var(--b)` resolves to `Evil`, and the `@font-face` of that family
loads its resource in the customer browser — a request the isolated
verification browser blocks and never sees.

**Shipped-code root cause.** The activated-rule loop of
`destinationCssHarm()` collects the custom properties the **activated** rules
define into `introducedDefinitions` (`src/lib/css-context.ts:4010`, filled at
`:4047-4050`) and then judges the rules that apply to the patched element
(`:4073-4100`). The consumption filter is:

```ts
const consumed = declarations.filter(declaration =>
  consumesCustomProperty(declaration.value, introducedDefinitions)   // :4083-4086
);
```

`introducedDefinitions` holds `--a` only. The declaration
`font-family: var(--b)` reads `--b`, which is **not** in that set, so it is
filtered out of `consumed` and is never judged. The declaration `--b: var(--a)`
*is* consumed, but a custom-property declaration carries no `font-family`, so
`declarationHarm()` (`:1683`) has nothing to say about it. The chain
`--a` → `--b` → `font-family` → `@font-face` → customer-side resource is
therefore broken at the second hop: `resolveCustomProperties()`
(`src/lib/css-context.ts:1951-1969`) can resolve a value up to five levels
deep, but the **set of properties that are considered consumed** is only ever
the set the activated rules define, so the resolution is never asked for.

**Closure criterion violated:** §8.2 of the eighteenth review — *"the font
activation must follow the custom property across rules"* and *"a family that
is only reachable through a custom property must be treated as unprovable"*.
The chain is followed across **one** rule, not across the chain.

### 4.6 19-M2 — the cascade winner of the custom property is not computed (Medium)

The exact repository and remediation were:

```html
<html><head><style>@font-face{font-family:Evil;src:url(/evil-font)} [aria-label]{--f:Evil} button{--f:Local;font-family:var(--f)}</style></head><body><button id="target">Save</button></body></html>
```

```html
<button id="target" aria-label="Save">Save</button>
```

**Observed result.** The candidate applied one fix and wrote `index.html`.
Before the merge the button computes `font-family: Local` and the listener
received **no** request. After the merge the button computes
`font-family: Evil` and the listener received **`GET /evil-font`**. The
reason is the cascade: `[aria-label]` (specificity `0,1,0`) beats `button`
(`0,0,1`), so `--f` is `Evil` on the patched button, and `font-family: var(--f)`
resolves to `Evil`.

**Shipped-code root cause.** In the consumer loop the analyser builds the
definitions the consuming rule resolves against as

```ts
const ruleDefinitions = new Map(effectiveDefinitions);          // :4088
for (const [name, value] of customPropertyDefinitions(declarations)) {
  ruleDefinitions.set(name, value);                             // :4090
}
```

The **consuming rule's own definition of `--f` overwrites** the activated
rule's definition, without comparing specificity or source order. The
analyser therefore resolves `font-family: var(--f)` to `Local` and judges it
harmless, while the browser resolves it to `Evil`. The same rule of the
effective-style model ("the applicable rules unioned so the verdict does not
depend on the order") is the reason a *later* declaration cannot win here
either — see 19-L2.

**Closure criterion violated:** §8.2 of the eighteenth review — the value the
analyser resolves must be the value **the browser** resolves.

### 4.7 19-L1 — an iteration call counts as a write, so a benign script refuses every fix (Low)

A repository whose script only iterates over the images and reads the
attribute the fix adds is refused every fix:

```js
document.querySelectorAll('img').forEach(function(img){if(img.getAttribute('alt'))console.log('x')})
```

| ID | The benign script | Writer on `88afebd` | Writer on the pre-closure tree `24db2a1` |
|---|---|---|---|
| `B10` | `…if(img.getAttribute('alt'))console.log('x')` | **refused**, 0 fixes, 0 writes | **written**, 1 fix, 1 write |
| `B11` | `…if(img.getAttribute('alt'))state.count=1` | **refused**, 0 fixes, 0 writes | — |
| `B12` | `…if(img.getAttribute('alt'))document.title='x'` | **refused**, 0 fixes, 0 writes | — |
| `B15` | `…if(img.getAttribute('alt'))img.focus()` | **refused**, 0 fixes, 0 writes | — |

The effect is **fail closed** — the repository receives review suggestions
instead of source patches — so it is not a security defect, but it is a new
boundary that the accepted-risk list does not carry, and it is a **regression
of the eighteenth closure** (the same script was writable before it).

**Shipped-code root cause.** `scriptWrites()` treats **every** method call
whose receiver can be an element as a write, because only the reads are a
list (`src/lib/github.ts:1764-1768`, `PURE_READ_METHODS` at `:1144-1163`).
The iteration helper `forEach` is not in that list, so
`document.querySelectorAll('img').forEach(…)` is recorded as a write **on the
element collection** (`methodWrite('forEach', …)` at `:1575-1605` → `element:
true`). `scriptReactsToFix()` (`:1821-1824`) then pairs that write with the
recognised read of the added attribute and refuses the candidate at the
planner gate `:2917-2930`.

The benign twin that shows the boundary is precise: `B16`
(`var img=document.querySelector('img');if(img.getAttribute('alt'))console.log('x')`)
has the same read and the same benign body and is **written** — the only
difference is that it has no iteration call.

### 4.8 19-L2 — the union of the applicable font declarations refuses a fix the browser applies safely (Low)

```html
<html><head><style>@font-face{font-family:Evil;src:url(/evil-font)} [aria-label]{--f:Evil} button{font-family:var(--f)} button{font-family:Local}</style></head><body><button id="target">Save</button></body></html>
```

The writer **refuses** the candidate (0 fixes, 0 writes). Chromium measured
the merged file with the fix applied: the button computes `font-family: Local`
and the listener received **no** request — the later `button{font-family:Local}`
rule wins the cascade, so the customer browser never selects the `Evil` face.
On the pre-closure tree `24db2a1` the same stylesheet was **written**.

The cause is the effective-style model: the applicable `font-family`
declarations are **unioned** so that the verdict does not depend on the order,
and the consumer loop judges every declaration that consumes the introduced
property (`:4083-4099`) without asking which declaration the browser keeps.
A repository whose later rule overrides the family is therefore refused. The
effect is fail closed.

### 4.9 The boundary that is **not** a finding

`N23` (`Reflect.apply(Element.prototype.setAttribute, img, ['class','overlay'])`,
unconditional) is written, and its direct twin `N27`
(`img.setAttribute('class','overlay')`, unconditional) is written as well.
Chromium measured the takeover in **both** variants — `class="overlay"`,
`1280×720`, `position: fixed`, `z-index: 2147483647` — with and without the
fix. The takeover is the repository's own unconditional runtime behaviour and
is not an effect the remediation creates, so the writer's verdict is
consistent between the two spellings. It is recorded here so that the next
closure does not treat it as a gap; it is **not** counted in the verdict.

### 4.10 The shipped claims this review contradicts

| Shipped claim | Location | Result |
|---|---|---|
| *"Only the **reads** are a list. `PURE_READ_METHODS` names the DOM methods that only read; a method that is not in the list is treated as a write"* | `docs/ai/FIX_VERIFICATION.md` §11.1 | The **read** side of the model is a list of five names (`isAttributeReadMethod`, `src/lib/github.ts:543-552`) and `getAttributeNS` is not one of them — 19-H1 |
| *"`Reflect.set` / `Reflect.apply` on an element … and a `.call` / `.apply` invocation"* are collected as writes | `docs/ai/FIX_VERIFICATION.md` §11.1 | The reflective branch records the write but **drops the method and its arguments**, so the effect is lost — 19-H2 |
| *"a write whose **name the analyser cannot read** may be the attribute the fix adds, so it fails closed"* | `docs/ai/FIX_VERIFICATION.md` §11.2 | The reflective write is not "unreadable", it is *empty* (`attributeMethod: false`), so the fail-closed rule never fires — 19-H2 |
| *"the **destruction** of the patched element … decided by **reach**"* | `docs/ai/FIX_VERIFICATION.md` §11.2 | The reach is compared with the patched element only; a reach that names an ancestor does not match — 19-H3 |
| *"every rule that applies to the element resolves its `var()` references against them"* and *"The chain `--f` → `font-family` → `@font-face` → customer-side resource is followed"* | `docs/ai/FIX_VERIFICATION.md` §11.4 | The chain is followed across one rule and without the cascade — 19-M1, 19-M2 |
| *"`declarationHarm()` is the single place that judges a set of declarations, so the activated-rule path and the consumer path cannot drift"* | `docs/ai/FIX_VERIFICATION.md` §11.4 | They do not drift, but they both judge the **wrong value** (the consuming rule's own definition instead of the cascade winner) — 19-M2 |
| *"the writer now decides by **reach and effect** … a script that removes every `p` does not refuse a fix on an image"* | `.ai/SECURITY-STATUS.md` (18-H1 closure record) | Correct for the sibling of the patched element, wrong for its **ancestor** — 19-H3 |

## 5. Closure verification of the eighteenth review

The eighteenth review returned **NOT READY — Critical 0, High 1, Medium 1,
Low 1** and required four things (§8 of `.ai/SECURITY-REVIEW-18.md`).

| Eighteenth-review criterion | Result | Evidence |
|---|---|---|
| **§8.1** — *"the mutation vocabulary must be closed by construction, not by list"*; *"every one of the ten spellings of section 4.2 must be refused with 0 fixes and 0 writes"*; *"the shipped regressions must cover the `.call`/`.apply` unwrap explicitly"* | **NOT CLOSED** | The **ten literal spellings are all refused** (12 spellings re-run: `R1a`–`R1l`, 12/12 refused, 0 fixes, 0 writes) and the shipped regressions exist (`src/lib/__tests__/github.test.ts:2614`, `describe('the eighteenth review regressions')`). The criterion's substance is **not** met: three statically resolvable paths still reach the customer page — the `getAttributeNS` read (19-H1, 4 cases), the `Reflect.apply` effect (19-H2, 4 cases) and the ancestor reach (19-H3, 3 cases). The model is not closed by construction on the read side, on the reflective branch and on the destruction reach. |
| **§8.2** — *"the font activation must follow the custom property across rules"*; *"both spellings of section 4.3 must be refused with 0 fixes and 0 writes"*; *"the customer-side request must be proven absent by a local listener after the merge"* | **NOT CLOSED** | Both spellings of §4.3 **are** refused (`F1` `--f: Evil` → `font-family: var(--f)`, `F2` the `font` shorthand: 0 fixes, 0 writes) and the local listener receives no request for them. The criterion's substance is **not** met: the chain is not transitive (19-M1, `F5`: `GET /evil-font` after the merge) and the cascade winner is not computed (19-M2, `F7`: `GET /evil-font` after the merge). |
| **§8.3** — *"the computed-call false positive must be documented as an accepted fail-closed risk (the readable twin stays writable), or narrowed"* | **CLOSED** | **Narrowed.** `fns[0]()` (`B2`), `fns[i]()` (`B3`) and the readable twin `fns['0']()` (`B4`) are all **written** (1 fix, 1 write each); the accepted-risk row `.ai/RISKS.md:83` describes the narrowed behaviour, not a blanket refusal. |
| **§8.4** — *"permanent regressions must cover every reproduction of this review in the shipped test files, the closure must be recorded under the volume chain (`docs/VOLUMES.md`), and a **fresh independent review must return READY**"* | **NOT CLOSED** | The permanent regressions exist (30 regressions, 20 in `github.test.ts` and 10 in `css-context.test.ts`; the unit suite grew from 987 to 1017 tests — `docs/ai/FIX_VERIFICATION.md` §11.5) and the closure is recorded under the volume chain (`docs/VOLUMES.md:77`, V23). The third condition fails: **this fresh independent review returns NOT READY**. |

Two further statements of the eighteenth closure were re-checked and hold:
the duplicate `font-family` / duplicate `src` descriptors stay refused
(`17-M1`, `16-M3` in the recovered matrix), and a font family **without** a
resource stays writable (`F3`, `F4`, `F11`).

## 6. Legitimate behaviours re-checked

| Behaviour | Result |
|---|---|
| The ordinary `image-alt` fix in a repository without a script | PASS — applied, 1 fix, 1 write |
| The ordinary `button-name` fix in a repository without a script | PASS — applied, 1 fix, 1 write |
| An unrelated runtime mutation (`document.querySelectorAll('a').forEach(a => a.classList.add('overlay'))`) | PASS — applied, 1 fix, 1 write (`B5`) |
| An ordinary repository script (`console.log('hello')`) | PASS — applied, 1 fix, 1 write (`B1`) |
| A runtime that reads an unrelated attribute (`img.getAttribute('src')`) | PASS — applied, 1 fix, 1 write (`B6`) |
| A runtime that removes every `p` | PASS — applied, 1 fix, 1 write (`B7`); Chromium: the patched image keeps `alt="Photo"` and its `16×16` box |
| A runtime that removes an element by an unrelated id | PASS — applied, 1 fix, 1 write (`B8`) |
| A runtime that reads the added attribute and only **logs** (no iteration) | PASS — applied, 1 fix, 1 write (`B16`, `B17`) |
| A readable computed method name (`fns['0']()`) | PASS — applied, 1 fix, 1 write (`B4`) |
| An unrelated computed method call (`fns[0]()`, `fns[i]()`) | PASS — applied, 1 fix, 1 write (`B2`, `B3`) — the eighteenth review's false positive stays closed |
| A pure read of the element (`getBoundingClientRect()`, `scrollIntoView()`) | PASS — applied, 1 fix, 1 write (`B13`, `B14`) |
| A font family without a resource (`@font-face{font-family:Local;src:local("Arial")}`) | PASS — applied, 1 fix, 1 write (`F3`, `F4`, `F11`) |
| The closed mutation spellings of the eighteenth review (12 spellings) | PASS — all refused, 0 fixes, 0 writes (`R1a`–`R1l`) |
| The recovered tenth–sixteenth review writer payloads (27 cases) | PASS — all refused, 0 fixes, 0 writes |
| The recovered ninth–seventeenth review destination payloads (22 cases) | PASS — all refused (a non-null harm reason) |
| The recovered 118-assertion matrix | **NOT RE-RUN** — the matrix itself is not shipped, so it cannot be recovered from the tree; the shipped permanent regressions and the full unit suite (1017 tests) are the available evidence for it. This is a limit of this review, not a closure. |

## 7. Gate-suite evidence

All six commands were run on the reviewed tree **after every temporary
harness had been deleted**, so the shipped suites ran exactly as they ship.

| Gate | Command | Exit code | Evidence |
|---|---:|---:|---|
| Source-only typecheck | `npx tsc -p tsconfig.check.json --noEmit` | **0** | no diagnostics |
| Lint | `npm run lint` | **0** | `eslint .` reported no error and no warning |
| Unit suite + coverage gate | `npx vitest run --coverage` | **0** | 53 test files, **1017 tests passed**, 0 failed; coverage 70.84 % statements / 63.37 % branches / 74.1 % functions / 73.08 % lines against the 55 / 50 / 58 / 57 thresholds |
| Standalone build | `npm run build` | **0** | compiled successfully in 9.2 s, **116 static pages** generated, the `public` and `.next/static` copy step completed |
| Chromium E2E | `npx playwright test --project=chromium` | **0** | **79 passed** (4.0 min), 0 failed, 0 skipped |
| Dependency audit | `npm audit --audit-level=high` | **0** | **0 high / 0 critical**; 15 moderate advisories remain, all in the development tooling chain (`vitest` / `@vitest/mocker`, `fast-copy`, `glob` / `minimatch` through `@sentry/nextjs` and the ESLint parser) — none in the shipped runtime path |

The Playwright run started its own dev server on `127.0.0.1:3000` (no server
was listening before the run) and stopped it afterwards: `netstat` shows **0**
listeners on port 3000 after the run, and no second server was started.

## 8. Required closure criteria

The tree is releasable only when all of the following hold:

1. **19-H1 — the attribute-read side must be closed by construction.** The
   analyser must answer "does this call read an attribute by name?" with a
   structural question (a DOM method that takes a namespace and a local name,
   or any method the analyser cannot resolve) instead of a list of five names.
   `getAttributeNS(null,'alt')` — and every other statically resolvable
   spelling of the same read — must be refused with 0 fixes and 0 writes, and
   the shipped regressions must cover the read explicitly, because the write
   side already has a structural reader.
2. **19-H2 — the reflective branch must keep the effect of the write.** A
   `Reflect.apply(fn, target, args)` must resolve `fn` to the method it names
   and read that method's arguments, so that the attribute it writes, the class
   it writes and the fact that it removes the element are judged exactly like
   the direct spelling; a write whose method or arguments cannot be resolved
   must fail closed like an unreadable name. `Reflect.apply` of
   `removeAttribute`, `setAttribute`, `setAttributeNS` and `remove` must be
   refused with 0 fixes and 0 writes.
3. **19-H3 — the destruction reach must include the ancestors of the patched
   element.** A write whose reach names a node that contains the patched
   element destroys the fix. The relation must be evaluated against the
   repository's own markup, and a reach that cannot be related to the patched
   element must fail closed. `querySelectorAll('.card').forEach(card =>
   card.remove())`, `querySelectorAll('div').forEach(box => box.remove())` and
   `querySelector('.card').remove()` must be refused with 0 fixes and 0
   writes, while the removal of every `p` must stay writable.
4. **19-M1 — the custom-property chain must be closed transitively.** The set
   of properties a rule consumes must include the properties the consumed
   properties reference, to the depth the analyser can resolve, and a family
   that is reachable only through such a chain must be judged like a declared
   value. The `--a` → `--b` → `font-family` → `@font-face` chain must be
   refused with 0 fixes and 0 writes, and the customer-side request must be
   proven absent by a local listener after the merge.
5. **19-M2 — the resolved property must be the cascade winner.** When several
   rules define the same custom property for the patched element, the value
   the analyser resolves must be the one the browser computes (specificity,
   then source order, then inheritance), not the one the consuming rule
   declares. The `[aria-label]{--f:Evil}` / `button{--f:Local}` case must be
   refused with 0 fixes and 0 writes, and the customer-side request must be
   proven absent by a local listener after the merge.
6. **19-L1 and 19-L2 — the new fail-closed false positives must be narrowed
   or documented as accepted risks.** An iteration helper over an element
   collection must not count as a write of the page (the benign twins `B10`,
   `B11`, `B12` and `B15` must be writable again), and the font-family verdict
   must follow the cascade, so that a repository whose later rule overrides the
   family is not refused (the `F10` twin must be writable again). The
   `fns[0]()` / `fns[i]()` twins must stay writable, and the accepted-risk
   list (`.ai/RISKS.md`) must carry whatever boundary remains.
7. Permanent regressions must cover **every** reproduction of this review in
   the shipped test files (the four read spellings, the four reflective
   spellings, the three ancestor spellings, the two custom-property shapes
   and the two false positives, each with its direct twin), the closure must
   be recorded under the volume chain (`docs/VOLUMES.md`), and a **fresh
   independent review must return READY**.

## 9. Scope statement and limits of this review

- This review is **report only**. No shipped source, test, dependency, CI
  configuration, environment value or existing `.ai/` file was changed; the
  only file this review wrote is `.ai/SECURITY-REVIEW-19.md`. Every temporary
  harness (`src/lib/__tests__/sr19-temp.test.ts`,
  `src/lib/__tests__/sr19-prior-temp.test.ts`,
  `src/lib/__tests__/sr19-controls-temp.test.ts`,
  `src/app/api/github/create-pr/sr19-temp.test.ts`, `sr19-chromium.mjs`,
  `sr19-chromium2.mjs`, `sr19-controls-chromium.mjs` and their JSON outputs)
  was deleted before the gate suite ran, and `git status --short` shows no
  modification of any shipped file (only this artifact and the pre-existing
  untracked `.playwright-mcp/` directory of the parent session). The detached
  worktree of the pre-closure tree `24db2a1` was removed as well.
- **No Strix result is claimed.** Strix was not available and was not run;
  every finding here is a locally reproduced proof, not an agent report.
- Only Chromium was used. Safari, Firefox and WebKit were not exercised, and
  no result is claimed for them.
- The evidence boundary is the V23 verified-fix / GitHub-writer chain and its
  route. The rest of the product (authentication, session handling, CSRF, XSS,
  SQL injection, SSRF, command injection, uploads, rate limits, secret
  handling, CORS, headers, cookies, OAuth, RBAC, tenant isolation and the
  audit trail outside the create-PR path) was not re-audited in this cycle;
  the earlier cycles cover those areas and this review did not find a reason to
  reopen them.
- The 4th–10th review **118-assertion matrix** is not shipped and could not
  be recovered from the tree; it was not re-run (section 6). The recovered
  tenth–seventeenth review matrices (49 cases) and the shipped permanent
  regressions were re-run instead.
- The repository was never mutated: every GitHub write went to a mocked
  Octokit transport, and every listener bound to `127.0.0.1`.
