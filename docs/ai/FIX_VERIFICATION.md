# Volume 5 — Fix Verification and AST Patching

How a proposed fix becomes a pull request, and what the product does **not** claim.

## 1. The chain (as implemented)

```
scan -> violation (axe DOM HTML) -> proposed fix (AI or template)
     -> safety checks (injection, active tags, URIs, event handlers)
     -> rule check + placeholder check
     -> axe verification of the remediation snippet (only what passed the checks is rendered)
     -> branch
     -> locate the element in the repository source, patch it, re-parse the file
     -> PR + audit log
```

Every arrow can stop the chain. A stopped chain never produces a PR.

Order matters: the safety, rule and placeholder checks run **before** anything is
rendered in the verification browser, so unsafe markup is never executed and cannot
fake an axe pass.

## 2. Safety checks (`src/lib/github-pr.ts`)

The attributes of a remediation are **parsed the way a browser parses them**
(`src/lib/html-attributes.ts`), not matched with a regular expression: a slash
before an attribute (`<img src=x /onerror=…>`) is a separator for the browser,
and an entity encoded value (`&#106;avascript:`) is decoded before the browser
looks at the scheme.

A remediation is rejected before it can reach a browser or a repository when it:

- contains a `<script>` tag in any spelling (`<script>`, `<script/x>`, `< script >`),
- contains an active or embedding element (`iframe`, `object`, `embed`, `applet`,
  `base`, `svg`, `style`, `link`, `meta`, `frame`, `frameset`, `noframes`, `portal`,
  `fencedframe`, `math`, `plaintext`, `xmp`, `listing`, `noscript`, `noembed`,
  `video`, `audio`, `source`, `track`, `input[type=image]`),
- contains an `<input>` whose type is an image **after the browser decodes it**
  (`type="im&#97;ge"` is `image`) or whose type carries an entity the decoder does
  not know — the resource loader is rejected instead of guessed,
- contains **server-template syntax** (`<% … %>`, `<? … ?>`, `{{ … }}`, `{% … %}`,
  `{# … #}`, `<# …`): the template engine of the customer's build evaluates it, so the
  remediation would become executable code on the customer's server,
- adds a **class the original element does not have**: a class is a hook into the
  repository's stylesheet, and the effect of that stylesheet is not part of the
  isolated verification. A remediation that keeps the class of the original element
  is allowed — the repository's CSS already applies to it. The JSX spelling
  (`className`) is the same hook: React maps it to the browser's `class`
  attribute, so it is read as a class-token carrier in both dialects,
- contains a **brace**: in JSX it opens an expression and in a template file an
  interpolation, so the remediation would become executable code in the source,
- contains **any** event handler attribute (`onerror`, `onclick`, …) — a handler is
  rejected even when the scanned element already carried one, because the handler
  code belongs to the scanned page, not to AccessGuard,
- carries a URI attribute (`href`, `src`, `action`, `srcset`, …) whose scheme is not
  on the allow list (`http`, `https`, `mailto`, `tel`, `ftp`, inert image data URIs).
  The value is entity decoded and stripped of the whitespace and control characters
  a browser ignores before the scheme is read, so `&#106;avascript:` and
  `java\tscript:` are caught,
- sets a style property that can take over the screen (`position`, `inset`,
  `z-index`, `transform`, `clip-path`, `mask`, viewport units, `url()`). The value
  is read the way the browser reads it: the HTML entities of the attribute value
  are decoded, a CSS comment is treated as whitespace (`position/**/:fixed` is
  `position: fixed`) and the CSS escapes are resolved (`p\6fsition:fixed` is
  `position: fixed`). A partial entity table cannot mirror that, so a style
  value that carries an entity (`&`), an escape (`\`) or a comment (`/*`) is
  rejected instead of guessed,
- hides the element with `opacity: 0` — the priority suffix is not part of the
  value, so `opacity:0!important` is the same declaration. The text stays in the
  document, which is why the rendered-text check does not catch it,
- **hides the element or its text** in any other way: `font-size:0`,
  `line-height:0`, `content-visibility:hidden`, `scale:0`, `filter:opacity(0)`,
  a `translate` or a `text-indent` with a large negative offset (the off-screen
  trick). The content stays in the document while the user reads nothing,
- **hides the element it patches**: the `hidden` attribute, `display:none` and
  `visibility:hidden` on the patched element replace a visible element with an
  invisible one while the rule check still passes,
- makes the **text transparent**: `color:transparent`, a colour with an alpha of
  zero (`rgba(0,0,0,0)`, `hsla(0,0%,0%,0)`) and `-webkit-text-fill-color:transparent`
  keep the text in the document while the user cannot read it. The modern colour
  syntaxes are read as well: the alpha of `rgb()`, `hsl()`, `oklch()`, `oklab()`,
  `lab()`, `lch()` and `color()` is the value after the slash, with or without a
  percent sign (`oklch(0 0 0 / 0%)` is fully transparent),
- gives the **patched element a zero size** (`width:0`, `height:0`) or moves it
  off-screen with a **large negative margin** (`margin-left:-10000px`): the
  element paints nothing where the user looks, so the fix replaces content with
  a blank box,
- carries **HTML comment syntax** (`<!--`, `-->`, `--!>`): a comment ends at the
  first `-->`, so a comment opener in the fix swallows the markup that follows it
  in the customer's page,
- **changes or drops the destination** of a URI attribute the original element
  had, or adds a destination it did not have. The comparison is made on the
  **resolved** URL, the way the browser resolves it (`canonicalizeUri` in
  `src/lib/html-attributes.ts`), so the protocol-relative (`//host/x`), the
  single-slash (`http:/host/x`) and the backslash (`http:\\host\\x`) spelling
  all reach the same host and cannot slip past it. A remote destination is
  refused because the verification browser blocks every network request: it
  would load from the customer's browser (a tracking pixel) once the fix is
  written. A changed `href` is refused as well — the fix may not point the user
  somewhere else (`/account` → `mailto:attacker@example.com`). A relative
  destination the fix adds (a skip link to `#main`) stays on the customer's own
  site and is allowed. **Every** occurrence of a URI attribute is compared, in
  source order: the browser uses the **first** duplicate, so a later duplicate
  cannot hide a remote destination behind it. Each attribute is parsed with the
  list grammar the browser uses — `srcset` is comma separated, `ping` is
  **space** separated — and a remote URL in any item of the list is refused,
- **does not create a live element** for the rule it claims to fix: the rule
  check looks for the element the browser really creates, so an `<img>` inside a
  raw-text element (`textarea`, `title`) or inside a bogus comment is not a fix.
  An `image-alt` fix also has to **keep the media source** of the original
  image — a fix that drops the `src` leaves a broken image behind,
- still contains a placeholder (`TODO`, `FIXME`, `{{…}}`, `YOUR_ALT_TEXT`),
- does not address the rule it claims to fix (per-rule check),
- is empty or longer than 20k characters.

The deterministic template fallback (`src/ai/prompts.ts`) strips the event
handlers of the scanned element, so a fix generated without an AI never carries
the target page's script into a customer repository.

## 3. AST patching (`src/lib/ast-patch.ts`)

The scanner reports DOM HTML; a repository holds source code. For JSX/JS files the
element is located through a real AST (TypeScript compiler API) and the patch is
spliced at AST-derived offsets, so the rest of the file is untouched.

| Property | Behaviour |
| --- | --- |
| Location | JSX/JS: AST match on the tag and **every** identity attribute the report carries (`src`, `href`, `id`, `name`, `class`, `aria-label`, `role`, `data-testid`, and softly `type`/`alt`); a candidate that lacks a supplied identity attribute does not match. The class list is compared as a set, so two copies of the same image with different classes are never confused. HTML: exact element text. |
| Live context | In an HTML file only a **live tag** counts: markup inside a comment, inside a raw-text element (`script`, `style`, `textarea`, `title`, `xmp`, `listing`, `plaintext`, `noscript`, `iframe`, `noembed`, `noframes`) or inside another tag's attribute value is not an element the browser renders, so a fix is never written there. The content of a `template`, `object`, `applet` or **`frameset`** is parsed but never rendered — in a frameset document the content of the frameset is frame content, not body content, so Chromium creates no image for it. A raw-text element that is never closed keeps the rest of the document as its text. The end tag has to be a real end tag: `</scripture>` does not close a script. A markup declaration that is not a comment (`<!bogus …>`, a CDATA section) is read as a **bogus comment** that ends at the next `>`, and an end tag inside a quoted attribute value (`<template><div data-x="</template>">`) belongs to the attribute, not to the element. A file that holds the element only in one of those places is not patched and not counted. |
| Patchable files | A fix is only written into a file whose destination context can be proven: an HTML file (`.html`, `.htm`) or a JSX file (`.tsx`, `.jsx`, `.js`). A TypeScript module or a component file that mixes markup and code (`.ts`, `.mts`, `.cts`, `.vue`, `.svelte`, `.astro`) has no proven context — the element text can sit inside a string or an expression there — so the fix ships as a review suggestion. Those files are still **scanned**, so a duplicate in one of them keeps the remaining match ambiguous. |
| Template destination | An HTML file that carries **server-template syntax** (`<% … %>`, `<? … ?>`, `{{ … }}`, `{% … %}`, `{# … #}`, `<# …` — the FreeMarker directive) is a template, not HTML. Nothing is written into it — not the patch and not the review comment, because the template engine would evaluate the comment as well. The fix ships as a review suggestion. |
| Occurrence aware | Occurrences are counted per rule **and** per element. Three copies of the same image are patched one by one; two different images are patched independently. A fix is only written when **every** occurrence of its element in the file is covered by a selected fix — the fixes are matched to the occurrences in order, so selecting one of two identical elements would otherwise patch the wrong one. Two selected copies of the same element with **different** remediations cannot be mapped at all (the request order is not the occurrence order), so they stay review suggestions too. |
| Ambiguity | If the element exists in more than one file of the repository, the fix is **not** written to any file — it ships in the PR as a review suggestion. A wrong file is worse than no patch. |
| Complete scan | The **whole** repository is scanned, bounded by a byte budget (5 MB) instead of a file count: every text file is read, whatever its extension, because a file the writer does not know (a template, a partial, a content file) can hold the same element. A blob whose name does not say whether it is binary (`.dat`, `.bin`) is read as well and **the content decides**: a NUL byte cannot appear in a text file, so a binary blob cannot hold the element and is left out of the scan, while a text blob holds it and makes the match ambiguous. A tree that does not fit, a tree the API reports as `truncated`, a file that could not be read and a **submodule** (a tree entry of type `commit`, which holds files the tree does not list) never patch a file: an incomplete scan cannot prove uniqueness. |
| Destination stylesheet | The repository's own CSS is part of the destination. **Every** style source the repository owns is read and matched against the patched element: the stylesheet files (`.css`, `.scss`, `.sass`, `.less`, `.pcss`, `.styl`, …), the `<style>` block of **every** file type, the stylesheets a file links (`<link rel="stylesheet">`) and the stylesheets they import (`@import`). A rule that can turn the element into a full-viewport overlay (a positioned element that spans the viewport) or hide it (`display:none`, `visibility:hidden`, `opacity:0`, `content-visibility:hidden`, a zero `scale`, a `filter: opacity(0)`, an off-screen `translate`, a zero `font-size`/`line-height` on a text-bearing element, a large negative `text-indent`) keeps the fix out of the repository. The rules of a utility stylesheet are read together, so `fixed inset-0 w-screen h-screen` is caught even when no single rule covers the viewport, and the verdict does **not** depend on the order the stylesheets were read in. The reader follows the browser: the CSS priority suffix is stripped (`fixed!important` is `fixed`), every logical, small and large viewport unit is known (`100vi`, `100vb`, `100svw`, `100lvh`, …), CSS escapes are decoded (`p\6fsition` is `position`, `fix\65 d` is `fixed`, `[a\6c t]` is `[alt]`), a comment opener inside a string is text and not a comment, native nesting is flattened (`&` is the parent selector), the frames of an animation are judged when the element animates with them, and a value the analyser cannot compute (`var()`, an unknown function, an unknown unit or keyword) makes the destination **unprovable** when the fix changes that property — an unprovable destination never receives a source patch. A **relational selector** (`:has(…)`) depends on DOM context the reader does not model, and the fix can change that context, so it fails closed in the same way. A **dynamic style source** — a JSX `<style>{expression}</style>` or a `dangerouslySetInnerHTML` style — is never an empty, proven stylesheet: the destination is unprovable and the repository receives no source patch. A **runtime-created** style is the same case: a repository script that creates a style element (`createElement('style')`, `insertRule(…)`, `adoptedStyleSheets`, a `style.textContent`/`innerHTML`/`cssText` assignment, a `<style` string) owns CSS the analyser cannot read, because the rule is built at runtime — so the destination is unprovable and no repository write happens. A stylesheet the analyser cannot judge (a preprocessor at-rule, an unknown at-rule, a variable or an interpolation it cannot resolve) fails closed in the same way. The geometry is read the way the browser assigns it: the `inset` shorthand sets its edges the way `margin` does (`inset:0 0` sets the block edges and the inline edges), the logical shorthands (`inset-block`, `inset-inline`) and the logical sizing properties (`inline-size`, `block-size`) are known, and a viewport-unit translation (`translate:-100vw`) or a large negative margin (`margin-left:-10000px`) puts the element off-screen, which hides it. The **effective style** of the patched element is the repository's rules **plus the remediation's own inline declarations** — the inline style is the last word — and the custom properties the fix defines resolve the `var()` references of the repository's rules (`style="--pos:fixed"` activates `position:var(--pos)`). A style attribute that is not a plain CSS declaration list (the JSX object form) cannot be read, so the destination is unprovable. The end state of an animation is what the user sees after it runs: a frame that leaves the element invisible (`opacity:0`, `visibility:hidden`) hides it, whatever the base style says — a **reversed** animation ends at its *first* frame, so the visible frame follows the animation's direction. The paint and the geometry of the repository's own rules are judged the same way: a transparent repository colour (`color:transparent`), a logical margin that moves the element off-screen (`margin-inline-start:-10000px`), a negative positional offset (`left:-9999px`), a single zero dimension (`width:0`), `display:contents` and a size the analyser cannot compute (`9999px`, `200vw`) hide the element or make the destination unprovable — never harmless. A rule the fix **activates** is judged too: a sibling or descendant selector that asks for the attribute the fix adds (`[alt] ~ .overlay`) can take over another element of the customer page, and a network-bearing declaration of such a rule (`background-image:url(…)`) loads a resource in the customer browser, which the verification browser blocks and therefore never sees. The repository's **runtime** is judged as well, because the verification browser does not run the customer's JavaScript: a script that reads an attribute the fix adds and then mutates an element, a script that names the patched element by its id, a **service worker** that delivers stylesheet bytes and a **CSS-in-JS** library all make the destination unprovable, and an unprovable destination never receives a source patch. |
| Destination selectors | A selector identifier is decoded the way the browser decodes it — the attribute **name** included, not only the attribute value. `[a\6ct]` is `[alt]`, so the rule starts matching the moment the fix adds the attribute. A selector that looks absent after a partial decode would hide the takeover from the analyser. |
| Painted box | The **painted** box is judged, not the content box: padding, border, `box-sizing`, `scale` and `transform: scale(…)` are composed into the box the customer sees. A `50vw × 50vh` box with `scale:3` paints `150vw × 150vh`, a `10000px` border paints a box that grows far past the viewport, and a `10000px` padding does the same. A box that **may** cover the viewport is unprovable, never harmless — and a declared size the analyser cannot compute (`200vw`, `9999px`, `100em`) stays unprovable, so it is never reported as a proven overlay. |
| Focus activation | A fix that adds `autofocus` **gives the element the focus**, so every focus rule whose compound can match the patched element is judged too — in any compound of the selector, not only in the subject. `input:focus ~ .overlay` takes the page over as soon as the input is focused, and `input:focus{background-image:url(…)}` makes the **customer browser** request a resource the verification browser blocks. Both make the destination unprovable. |
| Animation play state | The play state decides the frame the customer sees: a **paused** animation stays on its **first** frame (`opacity:0`), so the element is invisible even though the last frame is visible. A running animation is judged on the frame its direction and fill mode end at. |
| Repository runtime | The runtime is read in both carriers. An **inline `<script>`** in the repository HTML is runtime code like a linked script — an unclosed block cannot be followed, so it fails closed. A **DOM property getter** (`img.alt`, `el.className`, `el.dataset.x`) is a state read like `hasAttribute(…)`, because the property reflects the attribute the fix adds. |
| Conversion | HTML attributes are renamed to JSX (`class` → `className`, `for` → `htmlFor`), void elements are self-closed, `style="…"` becomes a style object. Style values are allow-listed: braces, quotes, backslashes, `url()` and `expression()` are dropped so a style attribute cannot break out of the JS expression it is written into. |
| No-op | A patch identical to the original element is not a fix and is not counted. |
| Content loss | A patch that empties an element that had visible text (a link or a button) is rejected — an axe-verified fix must not delete what the user reads. The new text has to **keep** the old text: a fix that reduces "Read more" to "R" passes every rule check and still deletes what the user reads. Text inside a hidden element (`hidden`, `display:none`, `visibility:hidden`, `opacity:0`) is not visible text, so moving the label into a hidden element is a content loss too. The CSS priority suffix is stripped before the check, so `opacity:0!important` is the same declaration as `opacity:0`. `aria-hidden` removes content from the accessibility tree, **not** from the screen: its text counts as visible text, so a fix may not delete it. |
| Placeholder | `TODO`, `FIXME`, `{{…}}`, `YOUR_ALT_TEXT` are rejected before patching. |
| Syntax guard | The patched file is re-parsed; a patch that breaks the file is discarded and reported. |

File types without a parser (`.vue`, `.svelte`, `.astro`) keep the conservative exact
text match. They can miss; they never guess.

### 3.1 The route proves before it mutates

The writer has two phases. `planRepositoryFixes` (`src/lib/github.ts`) reads the
repository, judges every candidate and computes the patched file content
**without writing anything**; `applyRepositoryFixPlan` writes exactly the planned
files. `applyFixesToRepository` keeps its old contract as the two phases in sequence.

The create-PR route runs the plan **before** the first GitHub mutation:

| Candidate | Outcome |
|---|---|
| applied | a provable source file was patched — the file is written and the fix is linked |
| review | the candidate is sound but no source file can be proven (ambiguous match, template file, incomplete scan) — it ships as a review document |
| refused | the destination CSS, the repository runtime or the static safety checks refused it — it gets **no** artifact at all |

A run in which every candidate is refused creates **no branch, no document, no summary
and no pull request**; the route answers `400`. A refused candidate never appears in
the PR body, in the summary or in the linked violations — a pull request that exists
contains no refused candidate.

### 3.2 The audit trail exists before the mutation

The route writes a `github_pr_intent` audit record **before** the branch is created.
The record carries the repository, the branch name, the planned rule ids, the planned
artifacts and the refused ids, so a later pull request can be reconstructed from it.

- If the intent cannot be written, nothing is created at all: no branch, no document,
  no pull request. The route answers `500`.
- The closing `github_pr_created` record is written after the pull request. If that
  write fails, the pull request still exists and the **intent record is its
  recoverable trail**: the response reports `auditRecorded: false` and says so in
  `auditNotice`.

## 4. Verification (`src/lib/fix-verification.ts`)

The remediation snippet is rendered in a headless Chromium page and axe is run against
the single rule the fix claims to fix.

| Outcome | Meaning | Effective confidence |
| --- | --- | --- |
| `verified` | axe reports no violation for that rule on the remediation snippet | `1.0` |
| `failed` | axe still reports the rule, or the patch hides the visible text of the element | `0` |
| `unverified` | the fix was rejected by the safety/rule checks, the browser is unavailable, the rule is unknown, the result was incomplete, or the batch ran out of budget | `null` |

`null` never passes the confidence gate (`MIN_FIX_CONFIDENCE = 0.7`). When verification
cannot run, the route refuses to open a PR and says so — an unverified PR is exactly the
trust failure this pipeline exists to remove.

Browser isolation:

- the verification document carries a restrictive CSP (`default-src 'none'`,
  `connect-src 'none'`, `script-src 'unsafe-inline'` for the axe bundle only), so the
  rendered markup cannot open a connection, a worker or a frame,
- the verification context aborts **every** HTTP request and closes **every**
  WebSocket (`context.routeWebSocket`), and blocks service workers — untrusted markup
  cannot make the AccessGuard host fetch anything (no SSRF through a verification run),
- each render and axe run has a 15 s deadline; a stuck render is abandoned, and a whole
  batch has a 60 s budget,
- at most **two** verification batches (Chromium instances) run at the same time; a
  request that waits more than 30 s for a slot is reported as unverified instead of
  piling up,
- the Chromium sandbox stays on except where it cannot be used (the Docker image runs
  Chromium as root), and
- the browser is resolved in this order: `PUPPETEER_EXECUTABLE_PATH` →
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` → common system Chromium paths → Playwright's
  bundled browser.

The rendered text is part of the verdict: when the original element showed text, the
patched element has to show the **same** text. The text is read from the computed
style, not from `innerText`: a text that is transparent (`opacity:0`) or not
rendered (`display:none`) is still part of `innerText`, while the user cannot see
it. A text without an area (`font-size:0`, `line-height:0`) or one that sits
outside the viewport (`translate:-9999px`) is not readable either, so it does not
count as rendered text. A fix that moves the label into a hidden element passes
axe and still deletes what the user reads, so it fails the verification.

The **patched element** itself is judged from the computed style and the browser's
own geometry as well: it may not be hidden (`display:none`, `visibility:hidden`,
`opacity:0` — the `hidden` attribute included), not painted
(`content-visibility:hidden`, `filter:opacity(0)`, a `scale` of zero, a
transform that collapses the element) and not moved out of the view (a
`translate` with a large negative offset, a large negative margin). It must
also **have an area**: a patched element whose border box is zero wide or zero
high paints nothing, and it must **intersect the viewport** — an element the
browser moved off-screen is not seen by the user. Its text may not be
transparent (`color:transparent`, a colour with an alpha of zero in any modern
syntax, `-webkit-text-fill-color:transparent`) and has to have a painted text
range: a range that reports an area although the element clips it away (a zero
height with `overflow:hidden`) is not painted. The colour alpha is resolved by
the browser itself — a 1×1 canvas reads the alpha byte back — instead of being
guessed from the syntax, and the animations of the snippet reach their **end
state** before the page is judged, because the end state is what the user sees
after the animation runs. The browser is the reference, so the verdict does not
depend on how the hiding or the transparency was written.

## 5. What verification does NOT prove

- It is **rule-level on the remediation snippet**, not a full page re-scan and not a
  re-scan of the patched file. The customer's build is not available to the service.
- It does not prove that the patch landed in the right file — an ambiguous match is
  left to a human.
- It does not prove the surrounding page still works.
- A rule that needs page context (for example `color-contrast` without a background)
  is reported as `unverified` and excluded, rather than being assumed to pass.
- It does not prove the fix matches the intent of the product owner. The PR is still
  reviewed by a human before merge.

## 6. What the user sees

The PR summary states that each fix passed the safety, placeholder and rule checks and
that its remediation snippet was re-scanned with axe-core for the rule it targets. The
API response reports what happened to every selected fix:

| Field | Meaning |
|---|---|
| `verifiedFixes` | fixes included in the PR (and, where the element was found unambiguously, written into the source file) |
| `skippedInvalid` | rejected by the safety, rule or placeholder checks |
| `skippedOverLimit` | fixes beyond the per-request limit (`MAX_FIXES_PER_PR = 25`) |
| `skippedLowConfidence` | verification failed — axe still reports the rule, or the patch hid the visible text |
| `skippedUnverified` | verification could not run (rejected earlier, no browser, rule not evaluable, batch out of budget) |
| `skippedRefused` | candidates the destination CSS, the repository runtime or the static safety checks refused — they carry no artifact at all |
| `filesCreated` | files GitHub actually accepted (fix documents + summary) |
| `violationsUpdated` | violations whose artifact was accepted **and** linked to the PR |
| `fixesWithoutArtifact` | verified fixes that no accepted artifact represents (GitHub refused the write) |
| `auditRecorded` | `false` when the closing audit entry could not be written — the PR exists and the `github_pr_intent` record holds the trail |
| `auditNotice` | states which record holds the trail: the closing entry, or the pre-mutation intent |

At most 10 fixes are written into source files per PR; the remaining verified fixes
still ship in the PR as review files. A violation is linked to the PR only when an
artifact for it was accepted by GitHub — a source file it was patched into, or its own
fix document. Every opened PR writes an audit log entry (`github_pr_created`) with the
verified and skipped counts; the entry is written **before** the violations are linked,
so a later database failure cannot leave an opened PR without a trail. The write is
retried (`createAuditLogWithRetry`, 3 attempts with a growing delay) before the route
reports `auditRecorded: false`, so a transient database error does not leave a
repository mutation without a trail. The **intent** record (`github_pr_intent`) is
written before the branch, so even a persistent database failure cannot leave a
mutation without a trail — it stops the mutation instead (§3.2).

## 7. Limits and operations

- A request may carry at most `MAX_FIXES_PER_PR = 25` violations; the cap is applied
  **before** the browser work, and the route is rate limited per user.
- Verification adds one browser launch per PR request and one axe run per fix. At most
  two batches run at the same time; a request waits at most 30 s for a slot.
- The repository writer reads at most 5 MB of source content per PR and patches at most
  10 source files; the rest remain review files.
- A missing browser shows up as `skippedUnverified` on every fix and as the error
  "Fix verification could not run …". Fix: install Chromium (the Docker image ships
  `/usr/bin/chromium-browser`; CI runs `npx playwright install --with-deps chromium`).
- Repository writes are bounded to 10 source files per PR (the rest remain review files)
  and a file whose write GitHub refused is not reported as modified.

## 8. Untrusted text in the pull request

Descriptions, URLs and explanations come from a scanned page. They are escaped for
Markdown as well as for HTML (`escapeMarkdownText`): a link, an image, a mention or a
heading in a violation description would otherwise become part of the PR body. GFM
also turns a **bare URL** into a link without any Markdown syntax, so the scheme of
a URL is neutralized as well (the text still reads as the URL). Code
samples are wrapped in a code fence that is sized to the content it holds, and an
element selector is written as an inline code span that the value cannot break out of
(the fence is longer than the longest backtick run in the value, and a value that
starts or ends with a backtick is padded). The review comment that is written into a
customer file neutralizes the comment terminator (`*/`, `-->` and the alternate
HTML terminator `--!>`), so untrusted text cannot close the comment and become code.
