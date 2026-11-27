# AccessGuard — Twentieth Independent Security Review

Date: 2026-11-27

## 1. Verdict

**NOT READY — Critical 0, High 6, Medium 0, Low 2.**

The release gate in `.ai/SECURITY-STATUS.md` opens only at **Critical 0 and High 0**.
This review reproduced **six independent High root causes** and **two Low
(fail-closed) root causes** in the shipped V23 tree at `c5a6c4c`.

Three of the six Highs and one of the two Lows are **new regressions of the
nineteenth-review closure itself**: the closure introduced the first cascade
implementation of the product (`compoundSpecificity`, `matchingSpecificity`,
`cascadeWinners`, `compareCascade` — all new in `88afebd..c5a6c4c`), and that
implementation resolves the cascade against the **repository's scan order** and
**over-counts an escaped identifier**, so the analyser now judges a cascade the
browser does not apply. On the pre-closure tree `88afebd` those same repositories
were **refused**; on the reviewed tree they are **written**.

| ID | Severity | Root cause | Effect in the customer browser |
|---|---:|---|---|
| 20-H1 | **High** | the `Object.*` write family is recognised only when the receiver chain is literally `Object` (`src/lib/github.ts:1873`) | the `alt` the fix adds is **emptied** — the fix is lost |
| 20-H2 | **High** | the markup read (`outerHTML`) is not a generic state read (`src/lib/github.ts:473-474`, `:1983-1993`) | the runtime takes the page over: **1280×720 fixed, `z-index: 2147483647`** |
| 20-H3 | **High** | the destination cascade is computed from the **repository scan order**, not the document order, and the stylesheets of **different documents** are merged (`src/lib/github.ts:2897-2899`, `:2967-2990`) | the fix activates a **customer-side request** (`GET /evil-font`) |
| 20-H4 | **High** | an **escaped CSS identifier** is not consumed by the specificity computation (`src/lib/css-context.ts:2049-2054`) | the fix activates a **customer-side request** (`GET /evil-font`) |
| 20-H5 | **High** | the `.call` / `.apply` branch reads the method from the **wrong chain segment** (`src/lib/github.ts:1900-1915`) | the `alt` the fix adds is **removed** — the fix is lost |
| 20-H6 | **High** | a **tagged-template** call is not a call at all (`src/lib/github.ts:658-661`) | the `alt` the fix adds is **removed** — the fix is lost |
| 20-L1 | **Low** | a `:root` / `html` rule makes the whole destination unprovable (`src/lib/css-context.ts:2204`, `:4408-4411`) | none — a **fail-closed** refusal of every fix that activates a rule |
| 20-L2 | **Low** | the read of an unrelated attribute through `.apply` is refused | none — a **fail-closed** refusal |

**Severity calibration.** The brief of this review defines a *Medium* as "a real,
reachable effect that is **not** a takeover, a loss of the fix, or a customer-side
request". Every High above is exactly one of those three classes, and every Low is
a fail-closed false positive. The nineteenth review rated the customer-side-request
class Medium; this review's brief forbids that rating, so 20-H3 and 20-H4 are High.
No finding is rated on the plausibility of a code reading: every one of them has a
working proof (a synthetic repository, the real planner, the real
`POST /api/github/create-pr` route, and a measured local-Chromium result).

**What the closure did fix.** Seven of the eight nineteenth-review closure claims
are closed (section 5): the attribute-read family, the reflective write, the
ancestor reach, the iteration/focus helpers, the transitive custom-property chain,
the cascade winner and the cascaded font declarations all behave as claimed. The
eighth — 19-H4, the object utilities — is **not** closed: the three direct
spellings are refused, but five equivalent spellings of the same write are written
(20-H1). The closure also **broke three things it did not touch before** (20-H3,
20-H4, 20-L1), because the cascade it introduced resolves against the wrong order
and the wrong specificity.

This tree is not releasable until every High reproduction is blocked in the unsafe
direction, permanent regressions cover all eight root causes, and a fresh
independent review returns READY.

## 2. The reviewed tree and the boundary

| Item | Value |
|---|---|
| Reviewed closure tree | `c5a6c4c31867e4f752830a0d16e380e466a7d906` (`vol: releases — V23: record the nineteenth-review closure in the volume chain`) |
| Baseline (pre-closure) tree | `88afebdfa05d87f2b48782dc9586a915dcf662fa` (`vol: state — V23: correct the eighteenth-review regression count and record the head runs`) |
| Closure diff | `88afebd..c5a6c4c` — **21 files**, +2476 / −73. Shipped source: `src/lib/github.ts` (+317), `src/lib/css-context.ts` (+430), **new** `src/lib/element-ancestors.ts` (+347), three test files (+436). The rest is `.ai/`, `docs/` and the runner image. |
| New code in the closure | `compoundSpecificity`, `specificityOfSelector`, `matchingSpecificity`, `compareSpecificity`, `compareCascade`, `cascadeWinners`, `closeCustomPropertyChain`, `consumesCustomProperty` (`src/lib/css-context.ts`) — the **first cascade implementation of the product**; `src/lib/element-ancestors.ts` (the ancestor reader). |
| Branch / working tree | `main`; `git status --short` shows **no** modification of any shipped file (only this artifact) |
| Review scope | `src/lib/github.ts` (repository runtime reader and writer), `src/lib/css-context.ts` (destination CSS/font analyser), `src/lib/element-ancestors.ts` (ancestor reader), `src/lib/github-pr.ts` (remediation validator), `src/lib/fix-verification.ts` (verification browser), `src/app/api/github/create-pr/route.ts` (create-PR route and audit flow) |
| Documents read first | `.ai/SECURITY-REVIEW-19.md` (the previous artifact), the review brief, `docs/ai/FIX_VERIFICATION.md` §11–§12, `docs/ai/VALIDATION_ENGINE.md`, root `AGENTS.md` |
| Reviewer changes | Report only. No shipped source, permanent test, dependency, lockfile, CI configuration, environment value, schema or existing `.ai/` file was changed. No commit, push, deployment, database migration or secret change was performed. The only file this review wrote is `.ai/SECURITY-REVIEW-20.md`. |

Every reproduction used a **local synthetic repository**, a **mocked GitHub/Octokit
transport** (`vi.mock('@octokit/rest')`, mirroring the shipped
`src/lib/__tests__/github.test.ts` pattern), **local Playwright Chromium**, and
listeners bound only to `127.0.0.1`. No production, public, customer or third-party
target was scanned, and no live repository was mutated. The npm advisory registry was
used only for `npm audit`; it was not a test target. No `.env` value was inspected or
printed, and no secret was modified.

**Strix/self-scan status:** skipped. **No Strix result, finding, confidence or pass
is claimed.** Chromium was the only browser engine; no Safari, Firefox or WebKit
result is claimed.

## 3. The method

The dangerous surface is unchanged: a remediation that is written into a customer's
repository must not (a) take over the customer's page, (b) destroy or neutralise the
fix itself, or (c) trigger a customer-side resource request the isolated
verification browser blocks. The unsafe direction for every case below is strict:

- the unsafe remediation must fail validation or produce a non-null destination-harm reason;
- it must not be reported as verified/applied;
- it must be **refused** (`refusedFixIds`), not silently applied and not sent to human review;
- it must apply **0 fixes** and perform **0 repository writes**.

The method was:

1. establish the tree identity (`git rev-parse HEAD` → `c5a6c4c`, baseline `88afebd`);
2. re-run the **shipped permanent regressions** of the closure — the `describe('the
   nineteenth review regressions')` blocks and the ancestor reader suite;
3. build a **writer matrix** of **148 cases** and a **destination CSS matrix** of
   **102 cases**, run through the real `planRepositoryFixes()` /
   `applyRepositoryFixPlan()` pair and the real `buildCssContext()` /
   `destinationCssHarm()` pair;
4. run **both matrices on the baseline** in a detached throwaway worktree, so that
   every finding is classified as a **persistent gap** or a **new regression**;
5. for every candidate, measure the **observable Chromium behaviour** of the merged
   file — element geometry, `position`, `z-index`, attribute values, computed
   `font-family`, and the requests a `127.0.0.1` listener received — **before and
   after** the merge, and write the **direct twin** of every candidate so that the
   finding is a *differential* and not a boundary choice;
6. drive the **real** `POST /api/github/create-pr` route with the real planner, the
   real verification browser and a mocked GitHub transport for three representative
   harmful cases and one refused control;
7. run the six gate commands on the reviewed tree **after every temporary harness had
   been deleted**.

**Harness inventory and counts.**

| Harness | What it does | Count |
|---|---|---|
| writer matrix (`src/lib/__tests__/sr20-writer-temp.test.ts`) | 148 repositories through the real planner and applier; 10 groups (`19-H1` 9, `19-H1-control` 9, `19-H2` 8, `19-H3` 9, `19-H4` 28, `writer` 30, `read` 17, `benign` 16, `root` 4, `cascade-order` 18) | **148 cases → 63 written, 82 refused, 3 review** |
| CSS matrix (`src/lib/__tests__/sr20-css-temp.test.ts`) | 102 stylesheets through the real `buildCssContext()` / `destinationCssHarm()`; 11 groups (`19-M1` 2, `19-M2` 2, `19-L2` 2, `19-L2c` 1, `19-L2d` 1, `specificity` 29, `specificity-reversed` 29, `shape` 20, `root` 5, `escape` 4, `writer-check` 7) | **102 cases → 62 harm, 40 null** |
| baseline re-run | both matrices on `88afebd` in a detached worktree | **45 writer verdict changes** and **34 CSS harm changes** of 148 / 102 |
| Chromium harness (`sr20-chromium.mjs`) | 25 before/after page pairs against a `127.0.0.1` listener | **50 measurements** |
| route harness (`src/app/api/github/create-pr/sr20-temp.test.ts`) | 4 cases through the real route | **4 cases** |
| merge probe (`src/lib/__tests__/sr20-order-temp.test.ts`) | captured the exact stylesheet string the analyser receives | **3 repositories** |

**Local targets.** The HTTP listeners bound `127.0.0.1:0` (an ephemeral port) and
served only `/pixel.png`, `/evil-font`, `/a.css` and `/z.css`; every other path
answered `404`. The Chromium runs used `setContent()` with absolute `127.0.0.1`
URLs; no page was ever fetched from the public internet.

**Shipped permanent regressions re-run (the closure's own evidence).**

| Suite | Result |
|---|---|
| `github.test.ts` + `css-context.test.ts`, `-t "nineteenth"` | **39 passed**, 346 skipped, 0 failed |
| `element-ancestors.test.ts` | **8 passed**, 0 failed |
| the three files together | 385 tests collected, 0 failed |

## 4. The reproduced findings

### 4.1 Result matrix

| ID | Severity | Unsafe payloads | Writer result | Chromium / local observable |
|---|---:|---:|---|---|
| 20-H1 | **High** | 4 spellings of the `Object.assign` write | applied, 1 fix, `index.html` write | the added `alt` emptied (`alt=""`) |
| 20-H2 | **High** | 4 spellings of the markup read | applied, 1 fix, `index.html` write | `class="overlay"`, `1280×720` at `0,0`, `position: fixed`, `z-index: 2147483647` |
| 20-H3 | **High** | 3 cascade-order shapes (6 repositories) | applied, 1 fix, `index.html` write | computed `font-family: Evil` and local `GET /evil-font` after the merge, nothing before it |
| 20-H4 | **High** | 3 escaped-identifier shapes | applied, 1 fix, `index.html` write | computed `font-family: Evil` and local `GET /evil-font` after the merge, nothing before it |
| 20-H5 | **High** | 1 spelling of the getter call | applied, 1 fix, `index.html` write | the added `alt` removed (`alt=null`); axe still reports `image-alt` |
| 20-H6 | **High** | 2 tagged-template spellings | applied, 1 fix, `index.html` write | the added `alt` removed (`alt=null`); axe still reports `image-alt` |
| 20-L1 | **Low** | 1 repository shape (`:root` next to an activated rule) | refused (fail closed) | none — no unsafe effect |
| 20-L2 | **Low** | 1 benign repository shape | refused (fail closed) | none — no unsafe effect |

**Matrix numbers.** The writer matrix ran **148 cases** (63 written, 82 refused,
3 review). The CSS matrix ran **102 cases** (62 harm, 40 null). The baseline re-run
of both matrices on `88afebd` changed **45 writer verdicts** and **34 CSS verdicts**,
which separates the six persistent gaps from the three new regressions. The
Chromium harness took **50 measurements** (25 before/after pairs). The real-route
harness ran **4 cases**.

**Real-route evidence** (real route, real planner, real verification browser,
mocked Octokit transport):

| Case | HTTP | Success | GitHub writes | Branch | Pull request | Audit actions |
|---|---:|---|---:|---:|---:|---|
| `route-O-window` (20-H1) | 200 | true | `index.html` + 2 artifacts | 1 | 1 | `github_pr_intent`, `github_pr_created` |
| `route-Q-outerHTML` (20-H2) | 200 | true | `index.html` + 2 artifacts | 1 | 1 | `github_pr_intent`, `github_pr_created` |
| `route-C-cascade` (20-H3) | 200 | true | `index.html` + 2 artifacts | 1 | 1 | `github_pr_intent`, `github_pr_created` |
| `route-control-refused` (the refused twin) | 400 | false | 0 | 0 | 0 | none (`skippedRefused: 1`) |

The refused control also proves the **gate order**: the refusal happens **before**
the first mutation — no branch, no file, no pull request, no audit record.

### 4.2 20-H1 — the object-utility family is recognised only when the receiver chain is literally `Object` (High)

The repository shape was:

```html
<html><head></head><body><img id="target" src="x"><script>
document.querySelectorAll('img').forEach(function(img){ window.Object.assign(img,{alt:''}) })
</script></body></html>
```

The ordinary remediation was `<img id="target" src="x" alt="Photo">`.

| ID | The runtime performs | Writer on `88afebd` | Writer on `c5a6c4c` | Chromium after the merge |
|---|---|---|---|---|
| `O-assign` | `Object.assign(img,{alt:''})` — **the direct twin** | written | **refused** (0 fixes, 0 writes) | `alt=""` |
| `O-window` | `window.Object.assign(img,{alt:''})` | written | **written** (1 fix, 1 write) | `alt=""` |
| `O-globalThis` | `globalThis.Object.assign(img,{alt:''})` | written | **written** (1 fix, 1 write) | `alt=""` |
| `O-alias` | `Object.assign.call(null,img,{alt:''})` | written | **written** (1 fix, 1 write) | `alt=""` |
| `O-alias2` | `const o=Object.assign;o(img,{alt:""})` | written | **written** (1 fix, 1 write) | `alt=""` |
| `O-reflect` | `Reflect.apply(Object.assign,img,[{alt:''}])` | written | **written** (1 fix, 1 write) | `alt="Photo"` — **no effect** (see 4.9) |

Chromium measured the merged page of every harmful spelling: `alt="Photo"` before
the fix, **`alt=""` after it**. An empty `alt` marks the image decorative, so
**axe stops reporting `image-alt`** and the automated check can no longer see that
the alternative text the pull request adds is gone — the same loss the nineteenth
review recorded for `img.alt=''` (19-H2b).

**The differential is exact**: the direct spelling is refused, the four equivalent
spellings are written, and the browser cannot tell them apart.

**Shipped-code root cause.** The object-utility branch of `scriptWrites()` is
`src/lib/github.ts:1870-1896`:

```ts
// `Object.assign(element, source)`, `Object.defineProperty(element, name,
// descriptor)` and `Object.defineProperties(element, descriptors)` write
// to the element they receive as an argument, not to their receiver.
if (receiver.length === 1 && receiver[0]?.name?.toLowerCase() === 'object') {
```

The branch fires only when the receiver chain is **exactly** `Object`:

* `window.Object.assign` / `globalThis.Object.assign` have a receiver chain of
  length 2 → the branch is skipped; the generic call branch (`:1945-1949`) then asks
  `chainObject()` whether `window.Object` can be an element — it cannot — so the
  write is **dropped**;
* `Object.assign.call(null,img,{alt:''})` reaches the `.call` / `.apply` branch
  (`:1900-1915`), which resolves the **receiver argument** (`null`) as the target
  and gives up because `null` is not an element — the *first argument of the
  utility* (`img`) is never read;
* `const o=Object.assign;o(img,{alt:''})` is an alias the model does not resolve;
  the bound-alias branch (`:1805-1818`) only knows `.bind()` aliases, so the call
  falls through to the generic branch and is dropped.

The same restriction exists in the second model of the runtime, `runtimeMutations()`
(`src/lib/github.ts:1133`: `if (name === 'assign' && receiverName === 'object')`),
so the "dynamic" bucket cannot catch these spellings either.

**Closure criterion violated:** §8.1 of the eighteenth review — *"the mutation
vocabulary must be closed by construction, not by list"* — and §8.2 of the
nineteenth review, *"a write whose method or arguments cannot be resolved must fail
closed like an unreadable name"*. The 19-H4 closure claim
(`docs/ai/FIX_VERIFICATION.md` §12.4: *"Their target is their **first argument**,
not the receiver, so `Object.assign` … now write the attributes they name"*) is
true for one spelling of the receiver and false for the other four.

### 4.3 20-H2 — the markup read is not a generic state read (High)

The repository shape was:

```html
<html><head><style>.overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}</style></head><body><img id="target" src="x"><script>
document.querySelectorAll('img').forEach(function(img){ if(img.outerHTML.indexOf('alt')>-1) img.classList.add('overlay') })
</script></body></html>
```

| ID | The runtime reads | Writer | Chromium on the merged page (before → after) |
|---|---|---|---|
| `Q-outerHTML-read` | `img.outerHTML.indexOf('alt')>-1` | **written**, 1 fix, 1 write | `1×1` at `8,21`, `position: static`, class `null` → `class="overlay"`, **`1280×720` at `0,0`**, `position: fixed`, `z-index: 2147483647` |
| `Q-outerHTML-read-2` | `img.outerHTML.includes('alt=')` | **written** | same takeover |
| `Q-outerHTML-read-3` | `img.outerHTML!==h` | **written** | same takeover |
| `Q-outerHTML-read-5` | `img.outerHTML.match(/alt/)!=null` | **written** | same takeover |
| `Q-attributes-outerHTML` | `img.attributes.outerHTML.indexOf('alt')>-1` — **the direct twin** | **refused** (0 fixes, 0 writes) | no takeover: `class=null`, `1×1`, `position: static` |

The takeover is **created by the fix**: before the merge the element's own markup
contains no `alt`, after the merge it does, and the runtime reacts. The image is
gone behind a full-viewport overlay.

**Shipped-code root cause.** The generic state read is a pattern
(`src/lib/github.ts:472-474`):

```ts
/** Reads of every attribute, which can react to any attribute the fix adds. */
const RUNTIME_GENERIC_STATE_READ_PATTERN =
  /\bgetAttributeNames\s*\(|\bhasAttributes\s*\(|\.\s*attributes\b(?!\s*\.\s*getNamedItem\s*\()/i;
```

and the fix-attribute read is `scriptReadsFixAttribute()`
(`src/lib/github.ts:1983-1993`), which consults the by-name read calls, the
reflected property reads and the selector reads. **Neither knows that
`element.outerHTML` contains the attribute the fix adds** — the markup of the
element is a read of the attribute, spelled as markup. The pattern lists three
generic reads (`getAttributeNames`, `hasAttributes`, `.attributes`) and omits the
markup read, so the runtime is invisible to the gate while its sibling
(`img.attributes.outerHTML`) is caught by the `.attributes` branch of the same
pattern.

**Closure criterion violated:** §8.1 of the eighteenth review — the read side must
be closed **by construction**. The shipped promise
(`docs/ai/FIX_VERIFICATION.md` §3, *Repository runtime*) is that the DOM APIs that
read the attributes *generically* are state reads as well; the markup read is the
same read with the same effect and is not in the model.

### 4.4 20-H3 — the cascade is computed from the repository scan order, not the document order (High)

The repository shape was (the `<style>` block first, the linked stylesheet second —
the ordinary "critical CSS inline" layout):

```html
<html><head>
  <style>[class~="card"]{--f:Local}</style>
  <link rel="stylesheet" href="a.css">
</head><body><img id="target" class="card" src="x"></body></html>
```

```css
/* a.css */
@font-face{font-family:Evil;src:url(/evil-font)}
[alt]{--f:Evil}
img{font-family:var(--f)}
```

The remediation was `<img id="target" class="card" src="x" alt="Photo">`.

| ID | The shape | Writer on `88afebd` | Writer on `c5a6c4c` | Chromium after the merge |
|---|---|---|---|---|
| `C-critical-inline` | `<style>` **before** `<link>` | **refused** | **written** (1 fix, 1 write) | `font-family: Evil`, `GET /evil-font` — **harmful** |
| `C-link-order` | two `<link>`s in the reverse tree order | **refused** | **written** (1 fix, 1 write) | `font-family: Evil`, `GET /evil-font` — **harmful** |
| `C-other-page` | the competing rule lives in **another page** of the repository | **refused** | **written** (1 fix, 1 write) | `font-family: Evil`, `GET /evil-font` — **harmful** |
| `C-link-then-style` | `<link>` before `<style>` | refused | refused | `font-family: Local`, no request — **harmless** |
| `C-link-order-control` | the two `<link>`s in the tree order | refused | **written** | `font-family: Local`, no request — **harmless** (the correct verdict after the closure) |

The browser applies the `<style>` block **before** the linked stylesheet, so the
stylesheet's `[alt]{--f:Evil}` wins the specificity tie (`0,1,0` against `0,1,0`,
later source order) and the button computes `font-family: Evil`. The local
`127.0.0.1` listener received **`GET /evil-font`** after the merge and **nothing**
before it. The isolated verification browser blocks every request, so it never sees
it.

**Shipped-code root cause.** The stylesheet sources are collected in two passes
that have nothing to do with the document order:

```ts
// src/lib/github.ts:2897-2899 — every stylesheet FILE of the repository, first
for (const [path, content] of contentCache) {
  if (CSS_FILE_PATTERN.test(path)) addCssSource(path, content);
}

// src/lib/github.ts:2967-2990 — then the <style> blocks and the links
for (const [path, content] of contentCache) {
  for (const source of collectStyleSources(content)) { cssSources.push({ path, css: source.css, … }); }
  …
  for (const href of stylesheetLinks.links) { addCssSource(target, …); }
}

const cssContext = buildCssContext(cssSources.map(source => source.css).join('\n'));  // :3028
```

`addCssSource()` (`src/lib/github.ts:2833-2843`) **dedupes by path**, so a linked
stylesheet is already in the list from the first pass and keeps the position the
first pass gave it; the `<style>` block of the document is always appended
**after** every `.css` file of the repository. The merged string is therefore
ordered by **the order in which the concurrent scan finished reading the files**
(`src/lib/github.ts:2802-2810`, `SCAN_CONCURRENCY = 8`) — with the real API that is
the response order of eight parallel requests, which is neither the tree order nor
the document order.

The merge probe of this review captured the exact string the analyser receives for
the three shapes above:

```
link-order    : "@font-face{…} [alt]{--f:Evil} img{font-family:var(--f)}\n[class~=\"card\"]{--f:Local}"
style-vs-link : "@font-face{…} [alt]{--f:Evil} img{font-family:var(--f)}\n[class~=\"card\"]{--f:Local}"
two-pages     : "@font-face{…} [alt]{--f:Evil} img{font-family:var(--f)}\n[class~=\"card\"]{--f:Local}"
```

— the linked stylesheet **first** in every case, even where the document puts the
`<style>` block first, and the stylesheets of **two different documents** merged
into one cascade (`two-pages`: `index.html` and `other.html`).

The cascade itself is otherwise correct: `compareCascade()`
(`src/lib/css-context.ts:2231-2242`) and `cascadeWinners()`
(`src/lib/css-context.ts:2251-2277`) implement *important → inline → specificity →
source order* faithfully. The defect is **which source order** they are given.

**Closure criterion violated:** §8.5 of the nineteenth review (19-M2) — *"the
value the analyser resolves must be the one the browser computes (specificity,
then **source order**, then inheritance)"*. The browser's source order is the
**document order of the style and link elements**; the analyser's is the repository
scan order. The shipped claim `docs/ai/FIX_VERIFICATION.md` §12.6 — *"then the
**source order**"* — is therefore only true of the merged string, not of the page.

### 4.5 20-H4 — an escaped CSS identifier is over-counted in the specificity (High)

The repository shape was (a Tailwind-style variant class, the colon escaped in the
selector — the browser's spelling):

```html
<html><head><style>
@font-face{font-family:Evil;src:url(/evil-font)}
.md\:flex{--f:Local}
[aria-label]{--f:Evil}
button{font-family:var(--f)}
</style></head><body><button id="target" class="md:flex">Save</button></body></html>
```

The remediation was `<button id="target" class="md:flex" aria-label="Save">Save</button>`.

| ID | The shape | Writer on `88afebd` | Writer on `c5a6c4c` | CSS analyser | Chromium after the merge |
|---|---|---|---|---|---|
| `C-escaped-button` / `S-md-escaped` | `.md\:flex` competes with `[aria-label]` | **refused** | **written** (1 fix, 1 write) | **null** ("no harm") | `font-family: Evil`, `GET /evil-font` — **harmful** |
| `S-md-escaped-reversed` | `.md\:flex` after `[aria-label]` | refused | — | **null** | `font-family: Evil`, `GET /evil-font` |
| `S-hex-escaped-class` / `escape/hex` | `.\000063ard` (the hexadecimal escape of `card`) | **refused** | — | **null** | `font-family: Evil`, `GET /evil-font` |
| `S-md-plain` | `.md:flex` — the **unescaped** spelling (a different class) | refused | — | **harm** (correct) | `font-family: Evil`, `GET /evil-font` |

The browser gives `.md\:flex` the specificity **(0,1,0)** — one class — so it ties
with `[aria-label]` and the later rule wins: `--f` is `Evil`, `font-family` is
`Evil`, and the `@font-face` loads its resource. The analyser computes
**(0,1,1)** — a class *and* a type — so the escaped class rule outranks
`[aria-label]`, the analyser believes `--f` is `Local`, and it judges the
destination harmless.

**Shipped-code root cause.** `compoundSpecificity()`
(`src/lib/css-context.ts:2035-2148`) counts a class and then consumes only
`[\w-]` characters:

```ts
if (character === '.') {
  specificity.classes++;
  index++;
  while (index < compound.length && /[\w-]/.test(compound[index] as string)) index++;
  continue;
}
```

A CSS escape starts with a backslash, which is **not** in `[\w-]`, so the escape is
not consumed. The loop then reaches the backslash in the type-selector branch
(`src/lib/css-context.ts:2132-2141`, `/[A-Za-z_\\]/`), which counts the whole
escaped identifier as a **type selector** and consumes it. The escaped class is
therefore counted as one class plus one type. The same holds for the `#` branch
(`:2042-2047`) and for the hexadecimal escape (`.\000063ard`).

The codebase already has the decoder the fix needs — `decodeCssEscapes()` is used
by `matchingSpecificity()` at `src/lib/css-context.ts:2203` — but the specificity
computation never calls it.

**Closure criterion violated:** §8.5 of the nineteenth review — *"the value the
analyser resolves must be the one the browser computes"* — and the shipped
specificity rule of `docs/ai/FIX_VERIFICATION.md` §12.6 (*"id 100, class /
attribute / pseudo-class 10, type / pseudo-element 1"*), which the escaped class
violates. A class name that contains a colon — every Tailwind variant
(`md:flex`, `hover:bg-blue`, `sm:w-1/2`) — is affected.

### 4.6 20-H5 — the `.call` / `.apply` branch reads the method from the wrong chain segment (High)

The repository shape was:

```html
<html><head></head><body><img id="target" src="x"><script>
document.querySelectorAll('img').forEach(function(img){
  Object.getOwnPropertyDescriptor(Element.prototype,'removeAttribute').value.call(img,'alt')
})
</script></body></html>
```

| ID | The runtime performs | Writer | Chromium after the merge |
|---|---|---|---|
| `W-getter` | `Object.getOwnPropertyDescriptor(Element.prototype,'removeAttribute').value.call(img,'alt')` | **written**, 1 fix, 1 write | `alt="Photo"` → **`alt=null`**; axe reports `image-alt` again — the fix is gone |
| `W-destructure` — **the direct twin** | `const {removeAttribute}=Element.prototype;removeAttribute.call(img,'alt')` | **refused** (0 fixes, 0 writes) | same effect in the browser |

**Shipped-code root cause.** The `.call` / `.apply` branch
(`src/lib/github.ts:1898-1915`) takes the called method from the **last member of
the receiver chain**:

```ts
if ((methodName === 'call' || methodName === 'apply') && receiver.length > 0) {
  const called = receiver[receiver.length - 1] as ChainSegment;
  …
  writes.push(methodWrite(called.name, receiver, object.reach, calledArgs));
```

For the getter form the receiver chain is
`Object.getOwnPropertyDescriptor.value` — the last member is **`value`**, the
property that *holds* the function, not the function. `methodWrite('value', …)`
records a write of an unrelated property (`attributeMethod: false`,
`attribute: null`), so `scriptNeutralisesFix()` cannot see the attribute the fix
adds and the candidate is written. For the destructured twin the chain ends in
`removeAttribute`, the write is recorded with `attributeMethod: true` and
`attribute: 'alt'`, and the candidate is refused.

**Closure criterion violated:** §8.2 of the nineteenth review — *"the reflective
branch must keep the effect of the write … a write whose method or arguments
cannot be resolved must fail closed like an unreadable name"*. The method **is**
resolvable here (`removeAttribute` is the value of the descriptor); the model
simply reads the wrong segment of the chain and therefore loses the effect.

### 4.7 20-H6 — a tagged-template call is not a call (High)

The repository shape was:

```html
<html><head></head><body><img id="target" src="x"><script>
document.querySelectorAll('img').forEach(function(img){ img.removeAttribute`alt` })
</script></body></html>
```

| ID | The runtime performs | Writer | Chromium after the merge |
|---|---|---|---|
| `W-tagged-remove` | `img.removeAttribute`alt`` | **written**, 1 fix, 1 write | `alt="Photo"` → **`alt=null`**; axe reports `image-alt` again |
| `W-tagged-toggle` | `img.toggleAttribute`alt`` | **written**, 1 fix, 1 write | `alt="Photo"` → **`alt=null`**; axe reports `image-alt` again |
| `W-removeAttribute` — **the direct twin** | `img.removeAttribute('alt')` | **refused** | same effect in the browser |
| `W-toggleAttribute` — **the direct twin** | `img.toggleAttribute('alt')` | **refused** | same effect in the browser |

A tagged template is a call with a different syntax: the tag function receives the
template strings array as its first argument, so `img.removeAttribute`alt`` calls
`removeAttribute` with the single argument `['alt']` → the attribute `alt` is
removed. Chromium measured `alt=null` after the merge and `axe` reported
`image-alt` again: **the fix is gone**.

**Shipped-code root cause.** The write scanner recognises a call only through
`METHOD_CALL_PATTERN` (`src/lib/github.ts:657-661`):

```ts
const METHOD_CALL_PATTERN = new RegExp(
  `([A-Za-z_$][\\w$]*(?:${MEMBER_ACCESS_SOURCE}|\\s*\\([^()\\n]*\\))*)\\s*(?:\\?\\.\\s*)?\\(`,
  'g'
);
```

The pattern requires an opening parenthesis. A tagged-template invocation has
**none**, so neither `scriptWrites()` nor `runtimeMutations()` sees the call at
all: the write is invisible, `scriptReactsToFix()` is false and the candidate is
written. The direct twin, which has parentheses, is refused.

**Closure criterion violated:** §8.1 of the eighteenth review — *"the mutation
vocabulary must be closed by construction, not by list"*. The vocabulary now
covers every spelling of a **parenthesised** call and none of the other call
syntaxes.

### 4.8 The two Low findings

#### 20-L1 — a `:root` / `html` rule makes the whole destination unprovable (Low)

| ID | The repository | Writer on `88afebd` | Writer on `c5a6c4c` | Reason |
|---|---|---|---|---|
| `S-root-safe` | a stylesheet with `:root{--brand:#000}` **next to** the rule the fix activates | written | **refused** (0 fixes, 0 writes) | *the repository stylesheet cannot be judged: a selector whose specificity cannot be read* |
| `S-root-control` — **the direct twin** | the same stylesheet **without** the `:root` rule | written | **written** (1 fix, 1 write) | — |

The CSS matrix confirms the reason for the `:root` variants (`R-root-harmless`,
`R-root-list` → *cannot be judged*) and shows that a `:root` rule **alone** does
not refuse the fix (`S-root-only` → written), because the consumer loop that
produces the refusal only runs when the fix activates a rule.

**Shipped-code root cause.** `matchingSpecificity()`
(`src/lib/css-context.ts:2190-2216`) skips the root selectors:

```ts
const global = decodeCssEscapes(trimmed).toLowerCase();
if ((global === ':root' || global === 'html') && element.tag !== 'html') continue;   // :2204
```

and returns `best`, which is **`null`** when **every** part of the selector list
was skipped. The caller treats that `null` as an unreadable specificity
(`src/lib/css-context.ts:4405-4411`):

```ts
const specificity = matchingSpecificity(rule.selector, element);
if (specificity === null) {
  return 'the repository stylesheet cannot be judged: a selector whose specificity cannot be read';
}
```

A `:root` rule is not an unreadable selector — it is a selector that cannot match
the patched element — so it must be **skipped**, not turned into an unprovable
destination. `:root` rules are universal in real stylesheets (design tokens,
resets, Tailwind's preflight), so the effect is a blanket refusal of every fix
that activates a rule in such a repository.

**Closure criterion violated:** §8.6 of the nineteenth review — *"the new
fail-closed false positives must be narrowed or documented as accepted risks"* — and
the shipped promise that a readable selector list must not refuse an ordinary
repository.

#### 20-L2 — the read of an unrelated attribute through `.apply` is refused (Low)

| ID | The repository | Writer on `88afebd` | Writer on `c5a6c4c` |
|---|---|---|---|
| `R-getAttribute-apply-control` | `img.getAttribute.apply(img,['src'])` — a read of an **unrelated** attribute | refused | **refused** |
| `R-getAttribute-apply` — the twin | `img.getAttribute.apply(img,['alt'])` | refused | **refused** (correct) |

The `.apply` spelling of a read cannot be resolved to the attribute it reads, so it
lands in the generic bucket and refuses every fix of the repository — even when the
attribute it reads is not the one the fix adds. The effect is fail closed and the
boundary is not carried by the accepted-risk list. It is **not** a regression of
this closure (the same verdict on `88afebd`).

### 4.9 The boundaries that are **not** findings

* **`Reflect.apply(Object.assign, img, [{alt:''}])`** is written, and the direct
  twin `Object.assign(img,{alt:''})` is refused — but the effect is **different**:
  `Object.assign` is not a method of its receiver, so `Reflect.apply(Object.assign,
  img, …)` calls `Object.assign` with the single argument `[{alt:''}]` and copies
  into a **fresh object**. Chromium measured `alt="Photo"` after the merge — the
  attribute is untouched. The verifier therefore judges the wrong thing, but there
  is no harmful effect, so this is **not** a finding. It is recorded so that the
  next closure does not "fix" it by accident.
* **`Object.defineProperty(img,'alt',{value:''})` and its four alias spellings**
  (`O-window-defineProperty`, `O-globalThis-defineProperty`,
  `O-reflect-defineProperty`, `O-alias-defineProperty`) are written, and the
  direct spelling is refused — but `defineProperty` defines an **own data
  property** named `alt`, it does not change the **content attribute**.
  Chromium measured `alt="Photo"` (via `getAttribute`) after the merge and axe
  reported **no** `image-alt` violation, so the accessible name of the image
  survives. The direct refusal is over-cautious, the alias is harmless: **not** a
  finding.
* **`img.setAttribute`alt``** is written, but Chromium throws
  `TypeError: Failed to execute 'setAttribute' on 'Element': 2 arguments required,
  but only 1 present` — the tag function is called with one argument, so the
  attribute is untouched (`alt="Photo"`, axe clean). **Not** a finding; the
  harmful tagged-template shapes are in 20-H6.
* **`document.body.innerHTML.indexOf('alt')>-1`** is written, but the body's
  markup contains the *script text* with the literal `alt`, so the takeover
  happens **with and without** the fix — the customer's own unconditional runtime
  behaviour, the boundary the nineteenth review drew in §4.9. **Not** a finding.
* **`W-proxy-set` / `W-proxy-apply`** (a `Proxy` around the element or around
  `removeAttribute`) end in `review`, not in an applied fix: the analyser cannot
  follow them and **fails closed** into a human review. **Not** a finding.
* **`B-map`** (`document.querySelectorAll('img').map(...)`) is refused, but
  `NodeList` has **no** `map` method in the DOM: the script throws before it can
  react to anything. **Not** a finding.

### 4.10 The shipped claims this review contradicts

| Shipped claim | Location | Result |
|---|---|---|
| *"Their target is their **first argument**, not the receiver, so `Object.assign`, `Object.defineProperty` and `Object.defineProperties` now write the attributes they name"* | `docs/ai/FIX_VERIFICATION.md` §12.4 | True for the receiver chain `Object`; false for `window.Object`, `globalThis.Object`, `Object.assign.call(null,…)` and a `const` alias — 20-H1 |
| *"The DOM APIs that read an attribute's presence **generically** — `getAttributeNames()`, `getAttributeNode()`, `attributes.getNamedItem()`, `hasAttributes()` and an iteration of `element.attributes` — are state reads as well"* | `docs/ai/FIX_VERIFICATION.md` §3 | The list omits the markup read (`outerHTML`), which reacts to the same attribute — 20-H2 |
| *"A custom property is resolved the way the browser resolves it — `!important` first, then the inline style, then the **specificity** … then the **source order**"* | `docs/ai/FIX_VERIFICATION.md` §12.6 | The source order is the **repository scan order**, not the document order, and the stylesheets of different documents are merged — 20-H3 |
| *"id 100, class / attribute / pseudo-class 10, type / pseudo-element 1"* | `docs/ai/FIX_VERIFICATION.md` §12.6 | An escaped identifier is counted as a class **and** a type — 20-H4 |
| *"A selector whose specificity cannot be read **fails closed** — the destination becomes unprovable"* | `docs/ai/FIX_VERIFICATION.md` §12.6 | A `:root` / `html` rule is not an unreadable selector; the rule turns every fix of an ordinary repository into a refusal — 20-L1 |
| *"A method or an argument list the reader cannot resolve **fails closed** like an unreadable name"* | `docs/ai/FIX_VERIFICATION.md` §12.2 | A tagged-template call and a getter-held method are not resolved **and do not fail closed** — 20-H5, 20-H6 |
| *"the writer now decides by **reach and effect** … a script that removes every `p` does not refuse a fix on an image"* | `.ai/SECURITY-STATUS.md` (18-H1 closure record) | Still true (`D-p` is written); the write side is nevertheless still spelling-bound — 20-H1, 20-H5, 20-H6 |

## 5. The closure verification of the nineteenth review

The nineteenth review returned **NOT READY — Critical 0, High 3, Medium 2,
Low 2** and required seven things (§8 of `.ai/SECURITY-REVIEW-19.md`). The closure
under review makes **eight** claims (the eight above plus its own 19-H4 finding).
Each was reproduced with a **before** (on `88afebd`) and an **after** (on
`c5a6c4c`) measurement.

| Claim | Result | Evidence |
|---|---|---|
| **19-H1** — the attribute-read side is a structural pattern; the namespaced variants read the local name at the **second** argument; `toggleAttribute` left the read family | **CLOSED** | **9 of 9** read spellings refused with 0 fixes and 0 writes (`R-getAttribute`, `R-getAttributeNS`, `R-getAttributeNode`, `R-getAttributeNodeNS`, `R-hasAttribute`, `R-hasAttributeNS`, `R-getNamedItem`, `R-getAttributeNS-call`, `R-getAttribute-apply`); **8 of 9** controls written. Before the closure `R-getAttributeNS`, `R-getAttributeNodeNS`, `R-hasAttributeNS` and `R-getAttributeNS-call` were written. The one control that stays refused is 20-L2. |
| **19-H2** — `Reflect.apply(fn, target, args)` resolves the method, unwraps `.bind()`, reads the arguments and fails closed | **CLOSED** | **8 of 8** reflective spellings refused (`P-removeAttribute`, `P-setAttribute`, `P-setAttributeNS`, `P-remove`, `P-toggleAttribute`, `P-unreadable`, `P-bind`, `P-setAttributeNode`); all eight were written before the closure. |
| **19-H3** — the destruction reach is compared with the patched element **and its ancestors**, read from the repository's own markup; an unestablishable relation fails closed; a removal that cannot contain the element stays writable | **CLOSED** | **8 of 9** destruction spellings refused (`D-card`, `D-div`, `D-query`, `D-innerHTML`, `D-outerHTML`, `D-attr-anon`, `D-body`, `D-img`); `D-p` (the removal of every `p`) stays **written**; `D-card`, `D-div`, `D-query`, `D-innerHTML` and `D-outerHTML` were written before the closure. The ancestor reader `src/lib/element-ancestors.ts` ships with 8 permanent regressions, all passing. |
| **19-H4** — `Object.assign` / `Object.defineProperty` / `Object.defineProperties` write the attributes they name; an unreadable key fails closed | **NOT CLOSED** | The **direct** spellings are refused (16 of the 28 cases: `O-assign`, `O-assign-spread`, `O-assign-unreadable`, `O-defineProperty`, `O-defineProperty-ns`, `O-defineProperties`, `O-assign-quoted`, `O-assign-computed`, `O-bracket`, `O-assign-multi`, `O-self-assign`, `O-assign-null-source`, `O-assign-numeric-key`, `O-assign-nested`, `O-defineProperty-numeric`, `O-defineProperties-spread`), but **five equivalent spellings of the same write are written** (`O-window`, `O-globalThis`, `O-alias`, `O-alias2`, `O-reflect`) and four `defineProperty` spellings are written as well. The four `assign` spellings that have a browser effect are **20-H1**; the `defineProperty` ones have none (4.9). |
| **19-L1** — the iteration helpers and the focus helpers are not writes of the page | **CLOSED** | **15 of 16** benign twins written (`B-log`, `B-state`, `B-title`, `B-focus`, `B-blur`, `B-for-of`, `B-plain`, `B-unrelated-attr`, `B-remove-p`, `B-remove-other-id`, `B-pure-read`, `B-computed-call`, `B-computed-call2`, `B-computed-readable`, `B-plain-repo`); `B-log`, `B-state`, `B-title`, `B-focus` and `B-blur` were **refused** before the closure. `B-map` stays refused, but `NodeList.map` does not exist in the DOM (4.9). |
| **19-M1** — the custom-property consumption set is closed **transitively** | **CLOSED** | `M1-chain` → **harm** (`the repository stylesheet can activate a customer-side request`); `M1-chain-harmless` → null; the two- and three-hop shapes `H-two-properties` / `H-three-properties` → harm (null before the closure). |
| **19-M2** — the resolved custom property is the **cascade winner** (important → inline → specificity → source order) | **CLOSED** | `M2-winner` → **harm**; `M2-winner-harmless` → null; `H-important-property` → harm (null before the closure). The cascade *within* the merged stylesheet is correct — the defect is the order of the merged stylesheet (20-H3). |
| **19-L2** — the applicable font declarations are **cascaded**, not unioned | **CLOSED** | `L2-later` → null (harm before the closure); `L2-later-harmful` → **harm**; `L2c-important-local` → null (harm before the closure); `L2d-important-evil` → **harm**; `H-inline-style` → null (harm before the closure). |

**Summary:** seven of the eight claims are **closed**, 19-H4 is **not closed**
(20-H1). In addition, the closure **introduced three new defects** that were
refused (or harmless) on the baseline:

| New defect | Baseline `88afebd` | Reviewed `c5a6c4c` |
|---|---|---|
| 20-H3 — the cascade is computed from the scan order (9 repositories: `C-critical-inline`, `C-critical-inline-button`, `C-link-order`, `C-link-order-button`, `C-other-page`, `C-other-page-button`, `C-link-order-control`, `C-link-order-button-control`, `C-escaped-button`; plus the CSS shapes `W-merged-style-first`, `W-btn-merged-style-first`) | **refused** | **written** |
| 20-H4 — an escaped identifier is over-counted (`S-md-escaped`, `S-md-escaped-reversed`, `S-hex-escaped-class`, `S-rev-hex-escaped-class`, `S-hex-escaped-id`, `S-rev-hex-escaped-id`) | **harm** (refused) | **null** (written) |
| 20-L1 — a `:root` rule makes the destination unprovable (`S-root-safe`, `R-root-harmless`, `R-root-list`) | **written / null** | **refused / harm** |

The two remaining Highs of the *persistent* class (20-H1, 20-H2, 20-H5, 20-H6) were
written on the baseline as well — the closure did not cause them, but it also did
not close them.

## 6. Legitimate behaviours re-checked

| Behaviour | Result |
|---|---|
| The ordinary `image-alt` fix in a repository without a script | PASS — applied, 1 fix, 1 write (`B-plain-repo`) |
| The ordinary `button-name` fix in a repository without a script | PASS — applied, 1 fix, 1 write (`C-critical-inline-button`, `C-link-order-button`) |
| An ordinary repository script (`console.log('hello')`) | PASS — applied, 1 fix, 1 write (`B-plain`) |
| A runtime that reads an unrelated attribute (`img.getAttribute('src')`) | PASS — applied, 1 fix, 1 write (`B-unrelated-attr`) |
| A runtime that removes every `p` | PASS — applied, 1 fix, 1 write (`D-p`, `B-remove-p`) |
| A runtime that removes an element by an unrelated id | PASS — applied, 1 fix, 1 write (`B-remove-other-id`) |
| A runtime that reads the added attribute and only **logs** (no iteration) | PASS — applied, 1 fix, 1 write (`B-log`) |
| A readable computed method name (`fns['0']()`) | PASS — applied, 1 fix, 1 write (`B-computed-readable`) |
| An unrelated computed call (`fns[0]()`, `fns[i]()`) | PASS — applied, 1 fix, 1 write (`B-computed-call`, `B-computed-call2`) |
| A pure read of the element (`getBoundingClientRect()`, `scrollIntoView()`) | PASS — applied, 1 fix, 1 write (`B-pure-read`) |
| A runtime that writes an **unrelated** attribute (`Object.assign(img,{title:'x'})`) | PASS — applied, 1 fix, 1 write (`O-assign-unrelated`) |
| A runtime that writes a **different** element (`Object.assign(other,{alt:''})`) | PASS — applied, 1 fix, 1 write (`O-assign-other`) |
| A repository whose stylesheet is harmless (`a.css` with `body{color:#000}`) | PASS — applied, 1 fix, 1 write (`C-link-harmless`) |
| The same two stylesheets linked in the tree order (the harmless outcome) | PASS — applied, 1 fix, 1 write (`C-link-order-control`) — Chromium: `font-family: Local`, no request |
| A stylesheet with **only** a `:root` rule | PASS — applied, 1 fix, 1 write (`S-root-only`) |
| A font family without a resource | PASS — `M1-chain-harmless`, `M2-winner-harmless`, `L2-later` → null (written) |
| The closed mutation spellings of the eighteenth review | PASS — all refused, 0 fixes, 0 writes |
| The recovered ninth–seventeenth review destination payloads (the specificity and shape groups) | PASS — 58 of 58 specificity cases and 20 of 20 shape cases agree with the browser or fail closed (`S-…`, `H-…` groups) |
| The 4th–10th review **118-assertion matrix** | **NOT RE-RUN** — the matrix itself is not shipped, so it cannot be recovered from the tree; the shipped permanent regressions and the full unit suite (1064 tests) are the available evidence for it. This is a limit of this review, not a closure. |

## 7. Gate-suite evidence

All six commands were run on the reviewed tree **after every temporary harness had
been deleted** (`git status --short` showed no modification of any shipped file
before the first command), so the shipped suites ran exactly as they ship.

| Gate | Command | Exit code | Evidence |
|---|---:|---:|---|
| Source-only typecheck | `npx tsc -p tsconfig.check.json --noEmit` | **0** | no diagnostics |
| Lint | `npm run lint` | **0** | `eslint .` reported no error and no warning |
| Unit suite + coverage gate | `npx vitest run --coverage` | **0** | **54 test files, 1064 tests passed**, 0 failed, 0 skipped (26.7 s); coverage **70.63 %** statements / **63.08 %** branches / **74.7 %** functions / **72.94 %** lines, above the 55 / 50 / 58 / 57 thresholds |
| Standalone build | `npm run build` | **0** | `next.config.ts` 114 ms, **compiled successfully in 5.0 s**, **116 static pages** generated (1942 ms), the `public` and `.next/static` copy step completed |
| Chromium E2E | `npx playwright test --project=chromium` | **0** | **79 passed** (3.9 min), 0 failed, 0 skipped |
| Dependency audit | `npm audit --audit-level=high` | **0** | **0 high / 0 critical**; 15 moderate advisories remain, all in the development tooling chain (`vitest` / `@vitest/mocker`, `fast-copy`, `glob` / `minimatch`, `typescript-eslint` / `@typescript-eslint/*`) — none in the shipped runtime path |

The Playwright run started and stopped its own dev server: `netstat` shows **no
listener** on port 3000 after the run (only `TIME_WAIT` entries), and no second
server was started. The temporary harnesses
(`src/lib/__tests__/sr20-writer-temp.test.ts`,
`src/lib/__tests__/sr20-css-temp.test.ts`,
`src/lib/__tests__/sr20-order-temp.test.ts`,
`src/app/api/github/create-pr/sr20-temp.test.ts`, `sr20-chromium.mjs`,
`sr20-tagged-probe.mjs`) and the detached baseline worktree
(`…/opencode/ag-baseline-20`, `88afebd`) were **deleted** before the gate suite.

## 8. Required closure criteria

The tree is releasable only when all of the following hold:

1. **20-H1 — the object-utility family must be closed by construction.** The
   analyser must resolve the **target** of `Object.assign` / `Object.defineProperty`
   / `Object.defineProperties` from the **first argument of the utility**,
   whatever the receiver chain is (`Object`, `window.Object`, `globalThis.Object`)
   and whatever the call syntax is (a direct call, a `.call` / `.apply` with the
   utility's own argument list, a `const` alias). A receiver, an alias or an
   argument list the reader cannot resolve must **fail closed** like an unreadable
   name. `window.Object.assign(img,{alt:''})`, `globalThis.Object.assign(img,{alt:''})`,
   `Object.assign.call(null,img,{alt:''})` and `const o=Object.assign;o(img,{alt:''})`
   must be refused with 0 fixes and 0 writes, while `Object.assign(img,{title:'x'})`
   and `Object.assign(other,{alt:''})` must stay writable.
2. **20-H2 — the markup read must be a generic state read.** A runtime that reads
   `element.outerHTML` (or the markup of a container that holds the element) sees
   the attribute the fix adds, so it must be judged like `getAttributeNames()` and
   like an iteration of `element.attributes`. `img.outerHTML.indexOf('alt')>-1` must
   be refused with 0 fixes and 0 writes, and the shipped regressions must cover the
   markup read explicitly.
3. **20-H3 — the cascade must be computed in the document order of the page.**
   The style sources of a document must be ordered the way the browser orders
   them: the `<style>` blocks and the `<link rel="stylesheet">` elements in the
   order they appear in the document, and the stylesheets of **different
   documents** must not share one cascade. The repository's scan order must not
   influence the verdict, and the order must be deterministic. The three shapes of
   section 4.4 (`<style>` before `<link>`, two `<link>`s in the reverse tree order,
   the competing rule on another page) must be refused with 0 fixes and 0 writes,
   while the harmless twins (the same stylesheets linked in the tree order, a
   harmless linked stylesheet) must stay writable, and the customer-side request
   must be proven absent by a local listener after the merge.
4. **20-H4 — the specificity must be the browser's specificity.** A CSS escape
   after `.` or `#` must be consumed (and decoded) as part of the identifier, so
   `.md\:flex` is one class `(0,1,0)` and `.\000063ard` is one class `(0,1,0)` —
   not a class plus a type. The escaped-class repository of section 4.5 must be
   refused with 0 fixes and 0 writes, and the customer-side request must be proven
   absent by a local listener after the merge.
5. **20-H5 — the method of a `.call` / `.apply` must be resolved from the whole
   chain, not from its last segment.** A function held by a property
   (`Object.getOwnPropertyDescriptor(Element.prototype,'removeAttribute').value`)
   or reached through a member that is not the function itself must be resolved to
   the method it is, and a chain the reader cannot resolve must fail closed.
   `Object.getOwnPropertyDescriptor(Element.prototype,'removeAttribute').value.call(img,'alt')`
   must be refused with 0 fixes and 0 writes, exactly like its destructured twin.
6. **20-H6 — every call syntax must be modelled.** A tagged-template invocation
   (`img.removeAttribute`alt``) is a call; the write scanner must recognise it (or
   fail closed on it) like every other call syntax.
   `img.removeAttribute`alt`` and `img.toggleAttribute`alt`` must be refused with
   0 fixes and 0 writes, and the direct twins must stay refused.
7. **20-L1 and 20-L2 — the new fail-closed false positives must be narrowed or
   documented as accepted risks.** A `:root` / `html` rule must be **skipped**
   (it cannot match the patched element) instead of making the destination
   unprovable, and a read whose attribute the `.apply` spelling cannot resolve
   must not refuse a repository whose fix does not touch that attribute. The
   `:root` control repository must be writable again, and the accepted-risk list
   (`.ai/RISKS.md`) must carry whatever boundary remains.
8. Permanent regressions must cover **every** reproduction of this review in the
   shipped test files (the four `Object.*` alias spellings, the four markup-read
   spellings, the three cascade-order shapes and their harmless twins, the three
   escaped-identifier shapes, the getter-call shape, the two tagged-template
   shapes, the `:root` false positive and the `.apply` read false positive, each
   with its direct twin), the closure must be recorded under the volume chain
   (`docs/VOLUMES.md`), and a **fresh independent review must return READY**.

## 9. Scope statement and the limits of the review

- This review is **report only**. No shipped source, test, dependency, CI
  configuration, environment value or existing `.ai/` file was changed; the only
  file this review wrote is `.ai/SECURITY-REVIEW-20.md`. Every temporary harness
  (`src/lib/__tests__/sr20-writer-temp.test.ts`,
  `src/lib/__tests__/sr20-css-temp.test.ts`,
  `src/lib/__tests__/sr20-order-temp.test.ts`,
  `src/app/api/github/create-pr/sr20-temp.test.ts`, `sr20-chromium.mjs`,
  `sr20-tagged-probe.mjs` and their JSON outputs) was deleted before the gate
  suite ran, the detached baseline worktree of `88afebd` was removed, and
  `git status --short` shows no modification of any shipped file.
- **No Strix result is claimed.** Strix was not run (the brief forbids it); every
  finding here is a locally reproduced proof, not an agent report.
- Only Chromium was used. Safari, Firefox and WebKit were not exercised, and no
  result is claimed for them.
- The evidence boundary is the V23 verified-fix / GitHub-writer chain and its
  route. The rest of the product (authentication, session handling, CSRF, XSS,
  SQL injection, SSRF, command injection, uploads, rate limits, secret handling,
  CORS, headers, cookies, OAuth, RBAC, tenant isolation and the audit trail
  outside the create-PR path) was not re-audited in this cycle; the earlier
  cycles cover those areas and this review did not find a reason to reopen them.
- The 4th–10th review **118-assertion matrix** is not shipped and could not be
  recovered from the tree; it was not re-run (section 6). The shipped permanent
  regressions (39 nineteenth-review cases + 8 ancestor cases) and the full unit
  suite (1064 tests) were re-run instead.
- The route harness ran the **real** route, the **real** planner and the **real**
  verification browser, but with a **mocked** GitHub transport and a mocked
  database, session, rate-limit and audit layer. The database-backed tenant
  isolation, the session chain and the audit persistence were therefore exercised
  only through their mocks, and the real Octokit calls, the real GitHub API and a
  live pull request were not.
- The baseline comparison ran on the detached worktree of `88afebd` with the
  **same** harnesses; the file order of the concurrent scan is the order the
  mocked transport resolved the requests in, which coincided with the tree order.
  With the real GitHub API that order is the response order of eight parallel
  requests, so the *merged* stylesheet of a real repository may differ from the
  one measured here — 20-H3 does not depend on that order, it only shows that the
  document order is never used.
- The repository was never mutated: every GitHub write went to a mocked Octokit
  transport, and every listener bound to `127.0.0.1`.
